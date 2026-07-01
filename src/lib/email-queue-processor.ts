import { sendEmail, type EmailPayload } from "@/lib/email";
import { getServiceSupabase } from "@/lib/deal-server";
import { 
  updateEmailLogAfterSend, 
  updateEmailEvent, 
  releaseEmailEventReservation,
  type EmailLogStatus,
  type EmailEventRow
} from "@/lib/email-service";

export type QueueProcessorResult = {
  claimed: number;
  sent: number;
  failed: number;
  retried: number;
  skipped: number;
};

interface EmailQueueItem {
  id: string;
  to_email: string;
  subject: string;
  html_body: string | null;
  text_body: string | null;
  reply_to: string | null;
  metadata: Record<string, unknown> | null;
  status: string;
  attempts: number;
  max_attempts: number;
  last_error: string | null;
  locked_at: string | null;
  created_at: string;
  updated_at: string;
}

export async function processEmailQueue(batchSize: number = 25): Promise<QueueProcessorResult> {
  const supabase = getServiceSupabase();

  // 1. Claim a batch of pending/stuck emails using the claim RPC
  const { data: claimed, error: claimError } = await supabase.rpc(
    "claim_email_queue_batch",
    { batch_size: batchSize }
  );

  if (claimError) {
    console.error("[email-queue] Failed to claim email batch:", claimError.message);
    return { claimed: 0, sent: 0, failed: 0, retried: 0, skipped: 0 };
  }

  const items = (claimed as EmailQueueItem[]) || [];
  let sent = 0;
  let failed = 0;
  let retried = 0;
  let skipped = 0;

  for (const item of items) {
    const { id, to_email, subject, html_body, text_body, reply_to, metadata, attempts, max_attempts } = item;
    
    const emailLogId = metadata && typeof metadata === "object" && "email_log_id" in metadata
      ? String(metadata.email_log_id)
      : undefined;

    const emailEventId = metadata && typeof metadata === "object" && "email_event_id" in metadata
      ? String(metadata.email_event_id)
      : undefined;

    try {
      const payload: EmailPayload = {
        to: to_email,
        subject: subject,
        text: text_body || "",
        html: html_body || undefined,
        replyTo: reply_to || undefined,
      };

      // Send the email via SMTP nodemailer
      const result = await sendEmail(payload);

      if (result.ok) {
        sent++;
        // Update the queue status to 'sent'
        await supabase
          .from("email_queue")
          .update({ status: "sent", locked_at: null, updated_at: new Date().toISOString() })
          .eq("id", id);

        // Update the email logs and events using the existing logging system
        if (emailLogId) {
          const logMetadata = {
            ...(metadata || {}),
            provider: result.provider || "smtp",
            subject,
          };
          await updateEmailLogAfterSend(supabase, emailLogId, "sent", {
            providerMessageId: result.messageId || null,
            failureReason: null,
            metadata: logMetadata,
          });

          if (emailEventId) {
            await updateEmailEvent(supabase, emailEventId, "sent", emailLogId, logMetadata);
          }
        }
      } else if (result.skipped) {
        skipped++;
        await supabase
          .from("email_queue")
          .update({ status: "sent", locked_at: null, last_error: result.error || "Skipped", updated_at: new Date().toISOString() })
          .eq("id", id);

        if (emailLogId) {
          await updateEmailLogAfterSend(supabase, emailLogId, "skipped", {
            providerMessageId: null,
            failureReason: result.error || "Skipped",
            metadata: metadata || {},
          });
          if (emailEventId) {
            const mockEvent: EmailEventRow = { id: emailEventId, status: "pending" as EmailLogStatus };
            await releaseEmailEventReservation(supabase, mockEvent, "queue processor skipped");
          }
        }
      } else {
        const errorMsg = result.error || "SMTP send failed.";
        
        if (attempts >= max_attempts) {
          failed++;
          await supabase
            .from("email_queue")
            .update({
              status: "failed",
              locked_at: null,
              last_error: errorMsg,
              updated_at: new Date().toISOString()
            })
            .eq("id", id);

          if (emailLogId) {
            await updateEmailLogAfterSend(supabase, emailLogId, "failed", {
              providerMessageId: null,
              failureReason: errorMsg,
              metadata: metadata || {},
            });
            if (emailEventId) {
              const mockEvent: EmailEventRow = { id: emailEventId, status: "pending" as EmailLogStatus };
              await releaseEmailEventReservation(supabase, mockEvent, "queue processor permanently failed");
            }
          }
        } else {
          retried++;
          await supabase
            .from("email_queue")
            .update({
              status: "pending",
              locked_at: null,
              last_error: errorMsg,
              updated_at: new Date().toISOString()
            })
            .eq("id", id);

          if (emailLogId) {
            await updateEmailLogAfterSend(supabase, emailLogId, "failed", {
              providerMessageId: null,
              failureReason: `Attempt ${attempts} failed: ${errorMsg}`,
              metadata: metadata || {},
            });
          }
        }
      }
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      console.error(`[email-queue] Exception processing email ${id}:`, errorMsg);

      if (attempts >= max_attempts) {
        failed++;
        await supabase
          .from("email_queue")
          .update({
            status: "failed",
            locked_at: null,
            last_error: errorMsg,
            updated_at: new Date().toISOString()
          })
          .eq("id", id);

        if (emailLogId) {
          await updateEmailLogAfterSend(supabase, emailLogId, "failed", {
            providerMessageId: null,
            failureReason: errorMsg,
            metadata: metadata || {},
          });
          if (emailEventId) {
            const mockEvent: EmailEventRow = { id: emailEventId, status: "pending" as EmailLogStatus };
            await releaseEmailEventReservation(supabase, mockEvent, "queue processor exception permanent");
          }
        }
      } else {
        retried++;
        await supabase
          .from("email_queue")
          .update({
            status: "pending",
            locked_at: null,
            last_error: errorMsg,
            updated_at: new Date().toISOString()
          })
          .eq("id", id);

        if (emailLogId) {
          await updateEmailLogAfterSend(supabase, emailLogId, "failed", {
            providerMessageId: null,
            failureReason: errorMsg,
            metadata: metadata || {},
          });
        }
      }
    }
  }

  return {
    claimed: items.length,
    sent,
    failed,
    retried,
    skipped,
  };
}
