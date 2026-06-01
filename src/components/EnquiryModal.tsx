"use client";

import { FormEvent, useMemo, useState } from "react";
import { useSnackbar } from "notistack";
import { apiFetch } from "@/lib/deal-api";
import { Requirement, Listing } from "@/lib/deal-types";
import { getMailtoLink, getWhatsappLink } from "@/lib/deal-utils";

type Subject =
  | { kind: "listing"; listing: Listing }
  | { kind: "requirement"; requirement: Requirement };

export function EnquiryModal({
  open,
  onClose,
  subject,
}: {
  open: boolean;
  onClose: () => void;
  subject: Subject | null;
}) {
  const { enqueueSnackbar } = useSnackbar();
  const [loading, setLoading] = useState(false);
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [preferredChannel, setPreferredChannel] = useState<"both" | "email" | "whatsapp">("both");
  const [message, setMessage] = useState("");

  const target = useMemo(() => {
    if (!subject) return null;
    return subject.kind === "listing" ? subject.listing.owner : null;
  }, [subject]);

  if (!open || !subject) return null;

  const title = subject.kind === "listing" ? subject.listing.title : subject.requirement.title || "Buyer requirement";

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    try {
      const targetUserId =
        subject.kind === "listing" ? subject.listing.created_by : subject.requirement.broker_profile?.user_id || null;

      if (!targetUserId) {
        throw new Error("Requirement owner contact is not available.");
      }

      await apiFetch("/api/leads", {
        method: "POST",
        body: JSON.stringify({
          listingId: subject.kind === "listing" ? subject.listing.id : null,
          requirementId: subject.kind === "requirement" ? subject.requirement.id : null,
          targetUserId,
          leadType: subject.kind === "listing" ? "listing_enquiry" : "requirement_match",
          contactName,
          contactEmail,
          contactPhone,
          preferredChannel,
          message,
        }),
      });

      const outboundMessage = `${contactName} (${contactEmail}${contactPhone ? `, ${contactPhone}` : ""}) sent an enquiry about ${title}.\n\n${message}`;
      if ((preferredChannel === "email" || preferredChannel === "both") && target?.email) {
        window.open(getMailtoLink(target.email, `Deal Exchange enquiry: ${title}`, outboundMessage), "_blank", "noopener,noreferrer");
      }
      if ((preferredChannel === "whatsapp" || preferredChannel === "both") && target?.phone) {
        window.open(getWhatsappLink(target.phone, outboundMessage), "_blank", "noopener,noreferrer");
      }

      enqueueSnackbar("Enquiry sent and handoff opened for the selected contact channel.", { variant: "success" });
      onClose();
      setContactName("");
      setContactEmail("");
      setContactPhone("");
      setPreferredChannel("both");
      setMessage("");
    } catch (error) {
      enqueueSnackbar(error instanceof Error ? error.message : "Failed to send enquiry.", { variant: "error" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-surface max-w-2xl">
        <div className="flex flex-wrap items-start justify-between gap-3 sm:gap-4">
          <div className="min-w-0">
            <p className="page-kicker text-brand-gold">Connect Broker</p>
            <h3 className="mt-2 break-words font-heading text-xl font-semibold text-brand-navy sm:text-2xl">{title}</h3>
            <p className="mt-2 break-words text-sm text-brand-slate">Lead capture is stored in the admin log, then handed off through email, WhatsApp, or both.</p>
          </div>
          <button onClick={onClose} className="btn-secondary w-full sm:w-auto">
            Close
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 grid gap-3 sm:mt-6 sm:gap-4">
          <div className="grid gap-3 md:grid-cols-2 md:gap-4">
            <div>
              <label className="label">Your name</label>
              <input className="input" value={contactName} onChange={(event) => setContactName(event.target.value)} required />
            </div>
            <div>
              <label className="label">Email</label>
              <input className="input" type="email" value={contactEmail} onChange={(event) => setContactEmail(event.target.value)} required />
            </div>
          </div>
          <div className="grid gap-3 md:grid-cols-2 md:gap-4">
            <div>
              <label className="label">Phone</label>
              <input className="input" value={contactPhone} onChange={(event) => setContactPhone(event.target.value)} />
            </div>
          </div>
          <div>
            <label className="label">Message</label>
            <textarea className="input min-h-[120px] sm:min-h-[140px]" value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Share your buyer brief, deal structure, and close timeline." required />
          </div>
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button type="submit" className="btn-primary w-full sm:w-auto" disabled={loading}>
              {loading ? "Sending..." : "Send Enquiry"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
