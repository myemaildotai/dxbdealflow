"use client";

import { formatCurrency, formatDateTime, formatPropertyType, formatRequirementMatchStatus, getFullName, statusClasses } from "@/lib/deal-utils";
import type { RequirementMatch } from "@/lib/deal-types";

export function MatchSubmissionDetailModal({
  submission,
  onClose,
  onChat,
}: {
  submission: RequirementMatch;
  onClose: () => void;
  onChat: (submission: RequirementMatch) => void;
}) {
  const requirementLabel =
    submission.requirement?.title || `Buyer brief in ${submission.requirement?.area || "preferred areas"}`;
  const senderName = submission.sender
    ? getFullName(submission.sender.first_name, submission.sender.last_name)
    : "Broker";

  return (
    <div className="modal-backdrop">
      <div className="modal-surface max-w-3xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-brand-orange">Submitted Match</p>
            <h3 className="mt-2 text-2xl font-semibold text-brand-navy">{requirementLabel}</h3>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className={statusClasses(submission.status)}>{formatRequirementMatchStatus(submission.status)}</span>
              <span className="text-sm text-brand-slate">From {senderName}</span>
              {submission.sender?.email ? <span className="text-sm text-brand-slate">| {submission.sender.email}</span> : null}
            </div>
          </div>
          <button type="button" onClick={onClose} className="modal-close-button" aria-label="Close submission detail">
            <span aria-hidden="true">&times;</span>
          </button>
        </div>

        <div className="mt-4 grid gap-3 sm:mt-6 lg:grid-cols-[1.1fr_0.9fr] lg:gap-5">
          <div className="space-y-3 lg:space-y-5">
            <div className="subtle-panel p-3 sm:p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-slate">Broker message</p>
              <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-brand-slate">
                {submission.message || "No message was included with this submission."}
              </p>
            </div>

            {submission.requirement ? (
              <div className="subtle-panel p-3 sm:p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-slate">Requirement</p>
                <p className="mt-3 text-lg font-semibold text-brand-ink">{requirementLabel}</p>
                <p className="mt-2 line-clamp-2 text-sm leading-6 text-brand-slate lg:line-clamp-none">{submission.requirement.description}</p>
              </div>
            ) : null}
          </div>

          <div className="space-y-3 lg:space-y-5">
            <div className="subtle-panel p-3 sm:p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-slate">Attached listing</p>
              {submission.listing ? (
                <>
                  <p className="mt-3 text-lg font-semibold text-brand-ink">{submission.listing.title}</p>
                  <div className="mt-3 space-y-2 text-sm text-brand-slate">
                    <p>{submission.listing.area?.name || "Area pending"}</p>
                    <p>{formatPropertyType(submission.listing.property_type)}</p>
                    <p>{formatCurrency(submission.listing.price)}</p>
                    <p>
                      {submission.listing.bedrooms !== null && submission.listing.bedrooms !== undefined
                        ? `${submission.listing.bedrooms} bedroom${submission.listing.bedrooms === 1 ? "" : "s"}`
                        : "Bedrooms unavailable"}
                    </p>
                  </div>
                </>
              ) : (
                <p className="mt-3 text-sm text-brand-slate">Listing details are unavailable for this submission.</p>
              )}
            </div>

            <div className="subtle-panel p-3 sm:p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-slate">Received</p>
              <p className="mt-3 text-sm text-brand-slate">{formatDateTime(submission.created_at)}</p>
            </div>
          </div>
        </div>

        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button type="button" className="btn-secondary" onClick={onClose}>
            Close
          </button>
          <button type="button" className="btn-primary" onClick={() => onChat(submission)} disabled={!submission.listing_id}>
            Chat with Broker
          </button>
        </div>
      </div>
    </div>
  );
}
