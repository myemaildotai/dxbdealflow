"use client";

import { FormEvent, useMemo, useState } from "react";
import { useSnackbar } from "notistack";
import { apiFetch } from "@/lib/deal-api";
import { Requirement, Listing } from "@/lib/deal-types";
import { getMailtoLink, getWhatsappLink } from "@/lib/deal-utils";
import {
  normalizeEnquiryFormValues,
  validateEnquiryField as getEnquiryFieldValidationError,
  validateEnquiryFormValues,
  type EnquiryField,
  type EnquiryFieldErrors,
} from "@/lib/enquiry-validation";

type Subject =
  | { kind: "listing"; listing: Listing }
  | { kind: "requirement"; requirement: Requirement };

function FieldError({ message }: { message?: string }) {
  if (!message) {
    return null;
  }

  return <p className="mt-1.5 break-words text-sm text-[#b24b40]">{message}</p>;
}

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
  const [fieldErrors, setFieldErrors] = useState<EnquiryFieldErrors>({});

  const target = useMemo(() => {
    if (!subject) return null;
    return subject.kind === "listing" ? subject.listing.owner : null;
  }, [subject]);

  if (!open || !subject) return null;

  const title = subject.kind === "listing" ? subject.listing.title : subject.requirement.title || "Buyer requirement";
  const enquiryForm = { contactName, contactEmail, contactPhone, message };

  const validateEnquiryField = (field: EnquiryField, nextForm = enquiryForm) => {
    return getEnquiryFieldValidationError(field, normalizeEnquiryFormValues(nextForm));
  };

  const updateEnquiryFieldError = (field: EnquiryField, nextForm: typeof enquiryForm) => {
    setFieldErrors((current) => {
      const nextErrors = { ...current };
      const error = validateEnquiryField(field, nextForm);

      if (error) {
        nextErrors[field] = error;
      } else {
        delete nextErrors[field];
      }

      return nextErrors;
    });
  };

  const setEnquiryFieldValue = (field: EnquiryField, value: string) => {
    switch (field) {
      case "contactName":
        setContactName(value);
        return;
      case "contactEmail":
        setContactEmail(value);
        return;
      case "contactPhone":
        setContactPhone(value);
        return;
      case "message":
        setMessage(value);
        return;
      default:
        return;
    }
  };

  const handleEnquiryFieldChange = (field: EnquiryField, value: string) => {
    const nextForm = { ...enquiryForm, [field]: value };
    setEnquiryFieldValue(field, value);

    if (fieldErrors[field]) {
      updateEnquiryFieldError(field, nextForm);
    }
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();

    const nextForm = normalizeEnquiryFormValues(enquiryForm);
    const validation = validateEnquiryFormValues(nextForm);

    setContactName(nextForm.contactName);
    setContactEmail(nextForm.contactEmail);
    setContactPhone(nextForm.contactPhone);
    setMessage(nextForm.message);

    if (!validation.isValid) {
      setFieldErrors(validation.errors);
      enqueueSnackbar("Please correct the highlighted fields before submitting.", { variant: "error" });
      return;
    }

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
          contactName: nextForm.contactName,
          contactEmail: nextForm.contactEmail,
          contactPhone: nextForm.contactPhone,
          preferredChannel,
          message: nextForm.message,
        }),
      });

      const outboundMessage = `${nextForm.contactName} (${nextForm.contactEmail}${nextForm.contactPhone ? `, ${nextForm.contactPhone}` : ""}) sent an enquiry about ${title}.\n\n${nextForm.message}`;
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
      setFieldErrors({});
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
              <input
                className="input"
                value={contactName}
                onChange={(event) => handleEnquiryFieldChange("contactName", event.target.value)}
                onBlur={() => updateEnquiryFieldError("contactName", enquiryForm)}
                aria-invalid={fieldErrors.contactName ? "true" : "false"}
                required
              />
              <FieldError message={fieldErrors.contactName} />
            </div>
            <div>
              <label className="label">Email</label>
              <input
                className="input"
                type="email"
                value={contactEmail}
                onChange={(event) => handleEnquiryFieldChange("contactEmail", event.target.value)}
                onBlur={() => updateEnquiryFieldError("contactEmail", enquiryForm)}
                aria-invalid={fieldErrors.contactEmail ? "true" : "false"}
                required
              />
              <FieldError message={fieldErrors.contactEmail} />
            </div>
          </div>
          <div className="grid gap-3 md:grid-cols-2 md:gap-4">
            <div>
              <label className="label">Phone</label>
              <input
                className="input"
                value={contactPhone}
                onChange={(event) => handleEnquiryFieldChange("contactPhone", event.target.value)}
                onBlur={() => updateEnquiryFieldError("contactPhone", enquiryForm)}
                aria-invalid={fieldErrors.contactPhone ? "true" : "false"}
              />
              <FieldError message={fieldErrors.contactPhone} />
            </div>
          </div>
          <div>
            <label className="label">Message</label>
            <textarea
              className="input min-h-[120px] sm:min-h-[140px]"
              value={message}
              onChange={(event) => handleEnquiryFieldChange("message", event.target.value)}
              onBlur={() => updateEnquiryFieldError("message", enquiryForm)}
              placeholder="Share your buyer brief, deal structure, and close timeline."
              aria-invalid={fieldErrors.message ? "true" : "false"}
              required
            />
            <FieldError message={fieldErrors.message} />
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
