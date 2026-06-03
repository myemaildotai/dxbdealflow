import { NextRequest, NextResponse } from "next/server";
import { logActivity } from "@/lib/activity-log";
import { getServiceSupabase, jsonError, requireApprovedBroker, withNoStore } from "@/lib/deal-server";
import { getFullName } from "@/lib/deal-utils";
import { isValidEmailAddress } from "@/lib/email";
import { EMAIL_TYPES, buildAppUrl, sendLoggedEmail } from "@/lib/email-service";
import { enquiryReplyEmailTemplate } from "@/lib/email-templates";

const MAX_REPLY_MESSAGE_LENGTH = 180;

type EnquiryReplyInsert = {
  enquiry_id: string;
  listing_id: string | null;
  broker_id: string;
  enquirer_email: string;
  subject: string;
  message: string;
  status: "pending" | "sent" | "failed";
  sent_at?: string | null;
  failure_reason?: string | null;
};

const REPLY_SELECT =
  "id, enquiry_id, listing_id, broker_id, enquirer_email, subject, message, sent_at, status, failure_reason, created_at";

function normalizeText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function getDefaultReplySubject(listingTitle: string | null | undefined) {
  return `Re: Your enquiry about ${listingTitle?.trim() || "your enquiry"}`;
}

function buildMailtoReplyUrl(email: string | null | undefined, subject: string) {
  const normalizedEmail = normalizeText(email);

  if (!isValidEmailAddress(normalizedEmail)) {
    return null;
  }

  return `mailto:${encodeURIComponent(normalizedEmail)}?subject=${encodeURIComponent(subject)}`;
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireApprovedBroker(request);
  if ("error" in auth) return auth.error;

  const body = await request.json().catch(() => ({}));
  const message = normalizeText(body.message);

  if (!message) {
    return jsonError("Message is required.", 400);
  }

  if (message.length > MAX_REPLY_MESSAGE_LENGTH) {
    return jsonError(`Message must be ${MAX_REPLY_MESSAGE_LENGTH} characters or fewer.`, 400);
  }

  const supabase = getServiceSupabase();
  const { data: lead, error: leadError } = await supabase
    .from("leads")
    .select("id, listing_id, to_user_id, contact_name, contact_email")
    .eq("id", params.id)
    .maybeSingle();

  if (leadError) {
    return jsonError(leadError.message || "Failed to load enquiry.", 400);
  }

  if (!lead) {
    return jsonError("Enquiry not found.", 404);
  }

  if (lead.to_user_id !== auth.user.id) {
    return jsonError("You can only reply to enquiries assigned to you.", 403);
  }

  const enquirerEmail = normalizeText(lead.contact_email);
  if (!enquirerEmail) {
    return jsonError("The enquirer email is missing.", 400);
  }

  if (!isValidEmailAddress(enquirerEmail)) {
    return jsonError("The enquirer email is invalid.", 400);
  }

  const { data: listing } = lead.listing_id
    ? await supabase.from("listings").select("id, title").eq("id", lead.listing_id).maybeSingle()
    : { data: null };
  const listingTitle = normalizeText(listing?.title) || null;
  const subject = normalizeText(body.subject) || getDefaultReplySubject(listingTitle);
  const brokerName = getFullName(auth.user.first_name, auth.user.last_name) || auth.user.email || "Your broker";
  const listingUrl = listing?.id ? buildAppUrl(`/listings/${listing.id}`) : null;
  const replyUrl = buildMailtoReplyUrl(auth.user.email, subject);
  const replyBase: Omit<EnquiryReplyInsert, "status" | "sent_at" | "failure_reason"> = {
    enquiry_id: lead.id,
    listing_id: lead.listing_id || null,
    broker_id: auth.user.id,
    enquirer_email: enquirerEmail,
    subject,
    message,
  };

  const pendingReplyPayload = {
    ...replyBase,
    status: "pending",
    sent_at: null,
    failure_reason: null,
  } satisfies EnquiryReplyInsert;

  const { data: pendingReply, error: pendingReplyError } = await supabase
    .from("enquiry_replies")
    .insert(pendingReplyPayload)
    .select(REPLY_SELECT)
    .single();

  if (pendingReplyError || !pendingReply) {
    console.error("[enquiry-reply] Reply email was not sent because the pending reply could not be saved.", {
      enquiryId: lead.id,
      brokerId: auth.user.id,
      insertPayload: pendingReplyPayload,
      error: pendingReplyError?.message,
      details: pendingReplyError,
    });
    return jsonError("Reply email was not sent because the reply could not be prepared for saving. Please try again.", 500);
  }

  const emailResult = await sendLoggedEmail({
    supabase,
    emailType: EMAIL_TYPES.enquiryReplyEmail,
    recipientEmail: enquirerEmail,
    relatedEntityType: "enquiry_replies",
    relatedEntityId: pendingReply.id,
    template: enquiryReplyEmailTemplate({
      subject,
      brokerName,
      contactName: normalizeText(lead.contact_name) || null,
      listingTitle,
      message,
      listingUrl,
      replyUrl,
    }),
    metadata: {
      enquiryId: lead.id,
      listingId: lead.listing_id || null,
      brokerId: auth.user.id,
    },
    replyTo: auth.user.email,
    background: false,
  });

  if (!emailResult.ok) {
    const failureReason = emailResult.error || "Failed to send reply email.";
    const failedUpdatePayload = {
      status: "failed",
      sent_at: null,
      failure_reason: failureReason,
    } satisfies Pick<EnquiryReplyInsert, "status" | "sent_at" | "failure_reason">;

    const { data: failedReply, error: failedReplyError } = await supabase
      .from("enquiry_replies")
      .update(failedUpdatePayload)
      .eq("id", pendingReply.id)
      .eq("broker_id", auth.user.id)
      .select("id")
      .single();

    if (failedReplyError || !failedReply) {
      console.error("[enquiry-reply] Failed email attempt could not be marked as failed.", {
        enquiryId: lead.id,
        replyId: pendingReply.id,
        brokerId: auth.user.id,
        insertPayload: pendingReplyPayload,
        updatePayload: failedUpdatePayload,
        error: failedReplyError?.message,
        details: failedReplyError,
      });
      return jsonError("Reply email failed, and the failed attempt could not be saved. Please try again.", 500);
    }

    return jsonError(emailResult.error || "Failed to send reply email.", 502);
  }

  const sentAt = new Date().toISOString();
  const sentUpdatePayload = {
    sent_at: sentAt,
    status: "sent",
    failure_reason: null,
  } satisfies Pick<EnquiryReplyInsert, "status" | "sent_at" | "failure_reason">;

  const { data: reply, error: replyError } = await supabase
    .from("enquiry_replies")
    .update(sentUpdatePayload)
    .eq("id", pendingReply.id)
    .eq("broker_id", auth.user.id)
    .select(REPLY_SELECT)
    .single();

  if (replyError || !reply) {
    console.error("[enquiry-reply] Email sent but reply could not be marked as sent.", {
      enquiryId: lead.id,
      replyId: pendingReply.id,
      brokerId: auth.user.id,
      insertPayload: pendingReplyPayload,
      updatePayload: sentUpdatePayload,
      error: replyError?.message,
      details: replyError,
    });
    return jsonError("Reply email was sent, but the reply could not be marked as sent in the database. Please contact support.", 500);
  }

  await logActivity(supabase, auth.user.id, "enquiry_reply_sent", "leads", lead.id, {
    enquiryId: lead.id,
    replyId: reply.id,
    listingId: lead.listing_id || null,
    enquirerEmail,
    subject,
    sentAt,
  });

  return NextResponse.json({ success: true, reply }, withNoStore());
}
