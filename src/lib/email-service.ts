import type { SupabaseClient } from "@supabase/supabase-js";
import { getBuiltinRequestContext } from "next/dist/server/lib/builtin-request-context";
import { API_CONFIG } from "@/config";
import { getServiceSupabase } from "@/lib/deal-server";
import { isValidEmailAddress, sendEmail, type EmailPayload } from "@/lib/email";
import type { EmailTemplate } from "@/lib/email-templates";

export const EMAIL_TYPES = {
  welcomeEarlyInterest: "welcome_early_interest",
  brokerVerificationSuccess: "broker_verification_success",
  manualReviewPending: "manual_review_pending",
  listingSubmitted: "listing_submitted",
  listingApproved: "listing_approved",
  newDealAlert: "new_deal_alert",
  newMessageReceived: "new_message_received",
  requirementMatchFound: "requirement_match_found",
  weeklyDealDigest: "weekly_deal_digest",
  profileCompletionReminder: "profile_completion_reminder",
  brokerEmailVerificationOtp: "broker_email_verification_otp",
  brokerPublicEnquiryNotification: "broker_public_enquiry_notification",
  enquiryReplyEmail: "enquiry_reply_email",
  maintenanceAvailability: "maintenance_availability",
} as const;

export type EmailType = (typeof EMAIL_TYPES)[keyof typeof EMAIL_TYPES];
export type EmailLogStatus = "pending" | "sent" | "failed" | "skipped";

type SendLoggedEmailInput = {
  emailType: EmailType;
  recipientEmail: string;
  recipientUserId?: string | null;
  relatedEntityType?: string | null;
  relatedEntityId?: string | null;
  template: EmailTemplate;
  metadata?: Record<string, unknown>;
  eventKey?: string | null;
  replyTo?: string | string[] | null;
  background?: boolean;
  supabase?: SupabaseClient;
  enqueue?: boolean;
};

export type LoggedEmailResult = {
  ok: boolean;
  status: EmailLogStatus;
  logId?: string | null;
  eventId?: string | null;
  skipped?: boolean;
  error?: string | null;
};

export type EmailEventRow = {
  id: string;
  status: EmailLogStatus;
};

type EmailLogRow = {
  id: string;
};


function getNodeWaitUntil() {
  try {
    return getBuiltinRequestContext()?.waitUntil || null;
  } catch {
    return null;
  }
}

export function runEmailWorkflowInBackground(task: Promise<unknown>, context: string) {
  const guardedTask = task.catch((error) => {
    console.error("[email] Background email workflow failed.", {
      context,
      error: toErrorMessage(error),
    });
  });
  const waitUntil = getNodeWaitUntil();

  if (!waitUntil) {
    return false;
  }

  waitUntil(guardedTask);
  return true;
}

function toErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === "object" && error !== null && "message" in error) {
    return String((error as { message?: unknown }).message || "Unknown email error.");
  }

  return "Unknown email error.";
}

function normalizeRecipientEmail(value: string) {
  return value.trim().toLowerCase();
}

function normalizeBaseUrl(value: string | null | undefined) {
  const trimmedValue = value?.trim();

  if (!trimmedValue) {
    return "";
  }

  const withProtocol = /^https?:\/\//i.test(trimmedValue) ? trimmedValue : `https://${trimmedValue}`;
  return withProtocol.replace(/\/+$/, "");
}

function buildUrlFromBase(base: string, path: string) {
  const trimmedBase = base.trim().replace(/\/+$/, "");
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  if (!trimmedBase) {
    return normalizedPath;
  }
  return `${trimmedBase}${normalizedPath}`;
}

export function getAppBaseUrl() {
  const explicitBase =
    process.env.NEXT_PUBLIC_API_BASE_URL ||
    API_CONFIG.baseUrl ||
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXT_PUBLIC_SITE_URL;

  const normalizedBase = normalizeBaseUrl(explicitBase);

  if (normalizedBase) {
    return normalizedBase;
  }

  const vercelBase = normalizeBaseUrl(process.env.NEXT_PUBLIC_VERCEL_URL || process.env.VERCEL_URL);

  if (vercelBase) {
    return vercelBase;
  }

  return process.env.NODE_ENV === "production" ? "" : "http://localhost:3000";
}

export function buildAppUrl(path: string) {
  return buildUrlFromBase(getAppBaseUrl(), path);
}


function resolveEmailEventKey(input: SendLoggedEmailInput) {
  const explicitKey = input.eventKey?.trim();

  if (explicitKey) {
    return explicitKey;
  }

  const relatedEntityType = input.relatedEntityType?.trim();
  const relatedEntityId = input.relatedEntityId?.trim();

  if (!relatedEntityType || !relatedEntityId) {
    return null;
  }

  return [
    "auto",
    input.emailType,
    normalizeRecipientEmail(input.recipientEmail),
    relatedEntityType,
    relatedEntityId,
  ].join(":");
}

async function insertEmailLog(
  supabase: SupabaseClient,
  input: SendLoggedEmailInput,
  status: EmailLogStatus,
  failureReason?: string | null,
): Promise<EmailLogRow | null> {
  const { data, error } = await supabase
    .from("email_logs")
    .insert({
      email_type: input.emailType,
      recipient_email: normalizeRecipientEmail(input.recipientEmail),
      recipient_user_id: input.recipientUserId || null,
      related_entity_type: input.relatedEntityType || null,
      related_entity_id: input.relatedEntityId || null,
      status,
      failure_reason: failureReason || null,
      metadata: {
        ...(input.metadata || {}),
        ...(input.eventKey ? { event_key: input.eventKey } : {}),
      },
      sent_at: status === "sent" ? new Date().toISOString() : null,
    })
    .select("id")
    .single();

  if (error || !data) {
    console.error("[email] Failed to create email log.", {
      emailType: input.emailType,
      recipientEmail: input.recipientEmail,
      error: error?.message || "No email log row returned.",
    });
    return null;
  }

  return data as EmailLogRow;
}


export async function releaseEmailEventReservation(
  supabase: SupabaseClient,
  event: EmailEventRow | null | undefined,
  context: string,
) {
  if (!event) {
    return true;
  }

  const { error } = await supabase
    .from("email_events")
    .delete()
    .eq("id", event.id)
    .neq("status", "sent");

  if (error) {
    console.error("[email] Failed to release email event reservation.", {
      eventId: event.id,
      status: event.status,
      context,
      error: error.message,
    });
    const { error: markRetryableError } = await supabase
      .from("email_events")
      .update({ status: "failed" })
      .eq("id", event.id)
      .neq("status", "sent");

    if (markRetryableError) {
      console.error("[email] Failed to mark email event reservation retryable.", {
        eventId: event.id,
        status: event.status,
        context,
        error: markRetryableError.message,
      });
    }

    return false;
  }

  return true;
}


export async function updateEmailEvent(
  supabase: SupabaseClient,
  eventId: string | null | undefined,
  status: EmailLogStatus,
  emailLogId?: string | null,
  metadata?: Record<string, unknown>,
) {
  if (!eventId) {
    return;
  }

  const { error } = await supabase
    .from("email_events")
    .update({
      status,
      email_log_id: emailLogId || null,
      metadata: metadata || {},
    })
    .eq("id", eventId);

  if (error) {
    console.error("[email] Failed to update email event.", {
      eventId,
      status,
      error: error.message,
    });
  }
}

export async function updateEmailLogAfterSend(
  supabase: SupabaseClient,
  logId: string,
  status: EmailLogStatus,
  payload: {
    providerMessageId?: string | null;
    failureReason?: string | null;
    metadata?: Record<string, unknown>;
  },
) {
  const { error } = await supabase
    .from("email_logs")
    .update({
      status,
      provider_message_id: payload.providerMessageId || null,
      failure_reason: payload.failureReason || null,
      metadata: payload.metadata || {},
      sent_at: status === "sent" ? new Date().toISOString() : null,
    })
    .eq("id", logId);

  if (error) {
    console.error("[email] Failed to update email log.", {
      logId,
      status,
      error: error.message,
    });
  }
}

async function deliverLoggedEmail(
  supabase: SupabaseClient,
  input: SendLoggedEmailInput,
  log: EmailLogRow,
  event: EmailEventRow | null,
): Promise<LoggedEmailResult> {
  try {
    const payload: EmailPayload = {
      to: input.recipientEmail,
      subject: input.template.subject,
      text: input.template.text,
      html: input.template.html,
      replyTo: input.replyTo || undefined,
    };
    const result = await sendEmail(payload);
    const status: EmailLogStatus = result.ok ? "sent" : result.skipped ? "skipped" : "failed";
    const metadata = {
      ...(input.metadata || {}),
      ...(input.eventKey ? { event_key: input.eventKey } : {}),
      provider: result.provider || "smtp",
      subject: input.template.subject,
    };

    await updateEmailLogAfterSend(supabase, log.id, status, {
      providerMessageId: result.messageId || null,
      failureReason: result.ok ? null : result.error || "Email was not sent.",
      metadata,
    });

    if (result.ok) {
      await updateEmailEvent(supabase, event?.id, "sent", log.id, metadata);
    } else {
      await releaseEmailEventReservation(supabase, event, `delivery ${status}`);
    }

    return {
      ok: result.ok,
      status,
      logId: log.id,
      eventId: event?.id || null,
      skipped: result.skipped,
      error: result.ok ? null : result.error || "Email was not sent.",
    };
  } catch (error) {
    const message = toErrorMessage(error);
    const metadata = {
      ...(input.metadata || {}),
      ...(input.eventKey ? { event_key: input.eventKey } : {}),
      subject: input.template.subject,
    };

    await updateEmailLogAfterSend(supabase, log.id, "failed", {
      failureReason: message,
      metadata,
    });
    await releaseEmailEventReservation(supabase, event, "delivery exception");

    return {
      ok: false,
      status: "failed",
      logId: log.id,
      eventId: event?.id || null,
      error: message,
    };
  }
}

export async function sendLoggedEmail(input: SendLoggedEmailInput): Promise<LoggedEmailResult> {
  if (typeof window !== "undefined") {
    return {
      ok: false,
      status: "skipped",
      skipped: true,
      error: "Email notifications can only be sent from the server.",
    };
  }

  const supabase = input.supabase || getServiceSupabase();
  const recipientEmail = normalizeRecipientEmail(input.recipientEmail);
  const normalizedInput = {
    ...input,
    recipientEmail,
    eventKey: resolveEmailEventKey({ ...input, recipientEmail }),
  };

  if (!isValidEmailAddress(recipientEmail)) {
    const reason = "Recipient email is invalid.";
    const skippedLog = await insertEmailLog(supabase, normalizedInput, "skipped", reason);
    return {
      ok: false,
      status: "skipped",
      logId: skippedLog?.id || null,
      skipped: true,
      error: reason,
    };
  }

  const replyToValue = Array.isArray(normalizedInput.replyTo)
    ? normalizedInput.replyTo.join(", ")
    : normalizedInput.replyTo || null;

  const { data: rpcResult, error: rpcError } = await supabase.rpc("enqueue_logged_email", {
    p_email_type: normalizedInput.emailType,
    p_recipient_email: recipientEmail,
    p_recipient_user_id: normalizedInput.recipientUserId || null,
    p_related_entity_type: normalizedInput.relatedEntityType || null,
    p_related_entity_id: normalizedInput.relatedEntityId || null,
    p_template_subject: normalizedInput.template.subject,
    p_template_html: normalizedInput.template.html || null,
    p_template_text: normalizedInput.template.text || null,
    p_reply_to: replyToValue,
    p_metadata: normalizedInput.metadata || {},
    p_event_key: normalizedInput.eventKey || null,
    p_enqueue: normalizedInput.enqueue || false,
  });

  if (rpcError || !rpcResult) {
    console.error("[email] Failed to call enqueue_logged_email RPC:", rpcError?.message);
    return {
      ok: false,
      status: "failed",
      error: rpcError?.message || "Failed to execute email RPC.",
    };
  }

  const result = rpcResult as {
    ok: boolean;
    status: EmailLogStatus;
    log_id?: string | null;
    event_id?: string | null;
    skipped?: boolean;
    error?: string | null;
  };

  if (!result.ok) {
    return {
      ok: false,
      status: result.status,
      logId: result.log_id,
      eventId: result.event_id,
      skipped: result.skipped,
      error: result.error,
    };
  }

  if (normalizedInput.enqueue) {
    return {
      ok: true,
      status: "pending",
      logId: result.log_id,
      eventId: result.event_id,
    };
  }

  const log = { id: result.log_id! };
  const event = result.event_id ? { id: result.event_id!, status: "pending" as EmailLogStatus } : null;

  const delivery = deliverLoggedEmail(supabase, normalizedInput, log, event);
  const waitUntil = normalizedInput.background === false ? null : getNodeWaitUntil();

  if (waitUntil) {
    waitUntil(
      delivery.catch((error) => {
        console.error("[email] Background email task failed.", {
          emailType: normalizedInput.emailType,
          logId: log.id,
          error: toErrorMessage(error),
        });
      }),
    );

    return {
      ok: true,
      status: "pending",
      logId: log.id,
      eventId: event?.id || null,
    };
  }

  return delivery;
}
