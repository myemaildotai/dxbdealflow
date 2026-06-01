"use client";

import { formatCurrency, formatDateTime, formatPropertyType, getFullName } from "@/lib/deal-utils";
import type { RequirementNotification } from "@/lib/deal-types";

export function RequirementNotificationModal({
  notification,
  onClose,
  onChat,
}: {
  notification: RequirementNotification;
  onClose: () => void;
  onChat: (notification: RequirementNotification) => void;
}) {
  const requirementLabel =
    notification.requirement?.title || `Buyer brief in ${notification.requirement?.area || "preferred areas"}`;
  const senderName = notification.match?.sender
    ? getFullName(notification.match.sender.first_name, notification.match.sender.last_name) || "Broker"
    : "Broker";

  return (
    <div className="modal-backdrop">
      <div className="modal-surface max-w-3xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-brand-orange">Match Message</p>
            <h3 className="mt-2 text-2xl font-semibold text-brand-navy">{requirementLabel}</h3>
            <p className="mt-2 text-sm text-brand-slate">
              From {senderName}
              {notification.match?.sender?.email ? ` | ${notification.match.sender.email}` : ""}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="modal-close-button"
            aria-label="Close notification detail"
          >
            <span aria-hidden="true">&times;</span>
          </button>
        </div>

        <div className="mt-4 grid gap-3 sm:mt-6 lg:grid-cols-[1.1fr_0.9fr] lg:gap-5">
          <div className="space-y-3 lg:space-y-5">
            <div className="subtle-panel p-3 sm:p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-slate">Broker message</p>
              <textarea
                className="input mt-3 min-h-[130px] resize-none sm:min-h-[180px]"
                value={notification.match?.message || "Message unavailable."}
                readOnly
              />
            </div>

            {notification.requirement ? (
              <div className="subtle-panel p-3 sm:p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-slate">Requirement</p>
                <p className="mt-3 text-lg font-semibold text-brand-ink">{requirementLabel}</p>
                <p className="mt-2 line-clamp-2 text-sm leading-6 text-brand-slate lg:line-clamp-none">{notification.requirement.description}</p>
              </div>
            ) : null}
          </div>

          <div className="space-y-3 lg:space-y-5">
            <div className="subtle-panel p-3 sm:p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-slate">Attached listing</p>
              {notification.match?.listing ? (
                <>
                  <p className="mt-3 text-lg font-semibold text-brand-ink">{notification.match.listing.title}</p>
                  <div className="mt-3 space-y-2 text-sm text-brand-slate">
                    <p>{notification.match.listing.area?.name || "Area pending"}</p>
                    <p>{formatPropertyType(notification.match.listing.property_type)}</p>
                    <p>{formatCurrency(notification.match.listing.price)}</p>
                    <p className="capitalize">{notification.match.listing.status}</p>
                  </div>
                </>
              ) : (
                <p className="mt-3 text-sm text-brand-slate">Listing details are unavailable for this match.</p>
              )}
            </div>

            <div className="subtle-panel p-3 sm:p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-slate">Received</p>
              <p className="mt-3 text-sm text-brand-slate">{formatDateTime(notification.created_at)}</p>
            </div>
          </div>
        </div>

        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button type="button" className="btn-secondary" onClick={onClose}>
            Close
          </button>
          <button
            type="button"
            className="btn-primary"
            onClick={() => onChat(notification)}
            disabled={!notification.match?.listing_id}
          >
            Chat with Broker
          </button>
        </div>
      </div>
    </div>
  );
}
