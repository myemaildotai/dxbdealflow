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
};

export type LoggedEmailResult = {
  ok: boolean;
  status: EmailLogStatus;
  logId?: string | null;
  eventId?: string | null;
  skipped?: boolean;
  error?: string | null;
};

type EmailEventRow = {
  id: string;
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

function isDuplicateEventError(error: { code?: string; message?: string; details?: string } | null | undefined) {
  const combined = `${error?.message || ""} ${error?.details || ""}`.toLowerCase();
  return error?.code === "23505" || combined.includes("duplicate") || combined.includes("unique");
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

async function reserveEmailEvent(supabase: SupabaseClient, input: SendLoggedEmailInput): Promise<EmailEventRow | "duplicate" | null> {
  if (!input.eventKey) {
    return null;
  }

  const { data, error } = await supabase
    .from("email_events")
    .insert({
      event_key: input.eventKey,
      email_type: input.emailType,
      recipient_email: normalizeRecipientEmail(input.recipientEmail),
      recipient_user_id: input.recipientUserId || null,
      related_entity_type: input.relatedEntityType || null,
      related_entity_id: input.relatedEntityId || null,
      status: "pending",
      metadata: input.metadata || {},
    })
    .select("id")
    .single();

  if (error) {
    if (isDuplicateEventError(error)) {
      return "duplicate";
    }

    console.error("[email] Failed to reserve email event.", {
      eventKey: input.eventKey,
      emailType: input.emailType,
      error: error.message,
    });
    return null;
  }

  return data as EmailEventRow;
}

async function updateEmailEvent(
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

async function updateEmailLogAfterSend(
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
    await updateEmailEvent(supabase, event?.id, status, log.id, metadata);

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
    await updateEmailEvent(supabase, event?.id, "failed", log.id, metadata);

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
  const normalizedInput = { ...input, recipientEmail };

  const event = await reserveEmailEvent(supabase, normalizedInput);
  if (event === "duplicate") {
    const reason = "Duplicate email event already exists.";
    const skippedLog = await insertEmailLog(supabase, normalizedInput, "skipped", reason);
    return {
      ok: false,
      status: "skipped",
      logId: skippedLog?.id || null,
      skipped: true,
      error: reason,
    };
  }

  if (!isValidEmailAddress(recipientEmail)) {
    const reason = "Recipient email is invalid.";
    const skippedLog = await insertEmailLog(supabase, normalizedInput, "skipped", reason);
    await updateEmailEvent(supabase, event?.id, "skipped", skippedLog?.id || null, normalizedInput.metadata);
    return {
      ok: false,
      status: "skipped",
      logId: skippedLog?.id || null,
      eventId: event?.id || null,
      skipped: true,
      error: reason,
    };
  }

  const log = await insertEmailLog(supabase, normalizedInput, "pending");
  if (!log) {
    await updateEmailEvent(supabase, event?.id, "failed", null, normalizedInput.metadata);
    return {
      ok: false,
      status: "failed",
      eventId: event?.id || null,
      error: "Email log could not be created.",
    };
  }

  await updateEmailEvent(supabase, event?.id, "pending", log.id, normalizedInput.metadata);

  const delivery = deliverLoggedEmail(supabase, normalizedInput, log, event || null);
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
