"use client";

import { type ReactNode, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { createAdminListingDetailHref } from "@/lib/admin-navigation";
import {
  cn,
  formatDateTime,
  formatListingDisplayStatus,
  formatRequirementMatchStatus,
  getFullName,
  statusClasses,
} from "@/lib/deal-utils";
import type { Requirement, RequirementMatch } from "@/lib/deal-types";

const COLLAPSED_MESSAGE_LENGTH = 60;
const UNAVAILABLE_BADGE_CLASS_NAME = "badge border-[#d6dceb] bg-[#f6f8fb] text-[#6b7482]";

function useModalBodyScrollLock(active: boolean) {
  useEffect(() => {
    if (!active) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    const previousPaddingRight = document.body.style.paddingRight;
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;

    document.body.style.overflow = "hidden";

    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }

    return () => {
      document.body.style.overflow = previousOverflow;
      document.body.style.paddingRight = previousPaddingRight;
    };
  }, [active]);
}

function AdminMatchesModalShell({
  children,
  onClose,
}: {
  children: ReactNode;
  onClose: () => void;
}) {
  useModalBodyScrollLock(true);

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [onClose]);

  if (typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center overflow-x-hidden bg-[rgba(15,23,42,0.54)] p-2 backdrop-blur-[7px] sm:items-center sm:p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="w-full max-w-[55rem] overflow-hidden rounded-[14px] border border-[#dfe6f2] bg-[linear-gradient(180deg,#ffffff_0%,#f4f7fc_100%)] shadow-[0_32px_72px_rgba(18,29,53,0.22)] sm:rounded-[16px]">
        <div className="max-h-[calc(100dvh-1rem)] overflow-x-hidden overflow-y-auto sm:max-h-[calc(100vh-2rem)]">{children}</div>
      </div>
    </div>,
    document.body
  );
}

function AdminMatchesPanel({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-[14px] border border-[#e1e7f0] bg-white px-3 py-3 shadow-[0_12px_28px_rgba(30,35,49,0.05)] sm:rounded-[22px] sm:px-4 sm:py-4",
        className
      )}
    >
      {children}
    </div>
  );
}

function getListingActionState(submission: RequirementMatch, listingReturnHref?: string) {
  if (!submission.listing_id || !submission.listing) {
    return {
      disabled: true,
      href: null,
      badgeLabel: "Listing unavailable",
      badgeClassName: UNAVAILABLE_BADGE_CLASS_NAME,
      helperText: "Listing details are unavailable.",
    };
  }

  const listing = submission.listing;
  const listingStatus = listing.deleted_at ? "deleted" : listing.status;

  return {
    disabled: false,
    href: createAdminListingDetailHref(listing.id, listingReturnHref),
    badgeLabel: formatListingDisplayStatus(listing.status, listing.deleted_at),
    badgeClassName: statusClasses(listingStatus),
    helperText: null,
  };
}

function shouldShowMatchStatusBadge(status: RequirementMatch["status"]) {
  return status !== "new" && status !== "read";
}

function ExpandableMatchMessage({
  message,
}: {
  message: string | null | undefined;
}) {
  const [expanded, setExpanded] = useState(false);
  const resolvedMessage = message?.trim() || "No message was included with this submission.";
  const shouldTruncate = resolvedMessage.length > COLLAPSED_MESSAGE_LENGTH;
  const visibleMessage =
    !shouldTruncate || expanded
      ? resolvedMessage
      : `${resolvedMessage.slice(0, COLLAPSED_MESSAGE_LENGTH).trimEnd()}...`;

  return (
    <div className="min-w-0">
      <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#7d879c]">Message</p>
      <p className="mt-1.5 whitespace-pre-wrap break-words text-[14px] leading-5 text-[#5f6b80]">{visibleMessage}</p>
      {shouldTruncate ? (
        <button
          type="button"
          className="mt-1.5 text-[13px] font-semibold text-[#33415f] transition hover:text-[#173972]"
          onClick={() => setExpanded((current) => !current)}
        >
          {expanded ? "See less" : "See more"}
        </button>
      ) : null}
    </div>
  );
}

function MatchActionButtons({
  listingAction,
}: {
  listingAction: ReturnType<typeof getListingActionState>;
}) {
  return (
    <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:justify-end">
      {listingAction.href ? (
        <Link href={listingAction.href} className="btn-secondary !h-10 !px-4 !py-0 text-[14px] sm:min-w-[132px]">
          View Listing
        </Link>
      ) : (
        <button
          type="button"
          className="btn-secondary !h-10 !px-4 !py-0 text-[14px] sm:min-w-[132px]"
          disabled
          title={listingAction.helperText || undefined}
          aria-label={listingAction.helperText ? `View Listing. ${listingAction.helperText}` : "View Listing"}
        >
          View Listing
        </button>
      )}
    </div>
  );
}

function MatchCard({
  submission,
  listingReturnHref,
}: {
  submission: RequirementMatch;
  listingReturnHref?: string;
}) {
  const senderName = submission.sender
    ? getFullName(submission.sender.first_name, submission.sender.last_name)
    : "Broker";
  const matchStatusLabel = shouldShowMatchStatusBadge(submission.status)
    ? formatRequirementMatchStatus(submission.status)
    : null;
  const listingAction = getListingActionState(submission, listingReturnHref);

  return (
    <AdminMatchesPanel>
      <article className="flex flex-col gap-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h4 className="min-w-0 break-words text-[18px] font-semibold tracking-[-0.03em] text-[#1f2940]">
                {submission.listing?.title || "Listing details unavailable"}
              </h4>

              <span className={cn(listingAction.badgeClassName, "max-w-full shrink-0")}>{listingAction.badgeLabel}</span>

              {matchStatusLabel ? <span className={statusClasses(submission.status)}>{matchStatusLabel}</span> : null}
            </div>
          </div>

          <div className="flex shrink-0 flex-col items-start gap-2 sm:items-end sm:text-right">
            <p className="text-[13px] font-medium leading-5 text-[#657186]">{formatDateTime(submission.created_at)}</p>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-start">
          <div className="min-w-0">
            <p className="text-[15px] font-semibold text-[#28324a]">{senderName}</p>
            <p className="mt-0.5 break-all text-[13px] leading-5 text-[#657186]">
              {submission.sender?.email || "Email unavailable"}
            </p>
            <div className="mt-2">
              <ExpandableMatchMessage message={submission.message} />
            </div>
          </div>

          <div className="flex flex-col gap-1.5 md:items-end">
            <MatchActionButtons listingAction={listingAction} />

            {listingAction.disabled && listingAction.helperText ? (
              <p className="text-[12px] leading-5 text-[#8a93a6] md:max-w-[220px] md:text-right">{listingAction.helperText}</p>
            ) : null}
          </div>
        </div>
      </article>
    </AdminMatchesPanel>
  );
}

export function RequirementMatchesAdminModal({
  requirement,
  matches,
  loading = false,
  listingReturnHref,
  onClose,
}: {
  requirement: Requirement;
  matches: RequirementMatch[];
  loading?: boolean;
  listingReturnHref?: string;
  onClose: () => void;
}) {
  const requirementLabel = requirement.title || `Buyer brief in ${requirement.area || "preferred areas"}`;
  const totalMatches =
    typeof requirement.submitted_match_count === "number" ? requirement.submitted_match_count : matches.length;

  return (
    <AdminMatchesModalShell onClose={onClose}>
      <div className="border-b border-[#e5ebf4] bg-[linear-gradient(180deg,#f9fbff_0%,#edf3fb_100%)] px-4 py-4 sm:px-6 sm:py-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[#6f82a0]">Requirement Matches</p>
            <h3 className="mt-2 text-lg font-semibold tracking-[-0.04em] text-[#1f2940] sm:text-xl md:text-2xl">{requirementLabel}</h3>
            <p className="mt-2 max-w-3xl text-[15px] text-[#657186]">
              Review {totalMatches} broker-submitted listing{totalMatches === 1 ? "" : "s"} and message
              {totalMatches === 1 ? "" : "s"} received for this requirement.
            </p>
          </div>

          <button type="button" onClick={onClose} className="modal-close-button" aria-label="Close requirement matches">
            <span aria-hidden="true">&times;</span>
          </button>
        </div>
      </div>

      <div className="px-3 py-3 sm:px-6 sm:py-5">
        {loading ? (
          <AdminMatchesPanel className="flex min-h-[220px] items-center justify-center">
            <p className="text-[15px] text-[#657186]">Loading matches...</p>
          </AdminMatchesPanel>
        ) : matches.length ? (
          <div className="space-y-3">
            {matches.map((submission) => (
              <MatchCard key={submission.id} submission={submission} listingReturnHref={listingReturnHref} />
            ))}
          </div>
        ) : (
          <AdminMatchesPanel className="flex min-h-[220px] flex-col items-center justify-center text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full border border-[#e1e7f0] bg-[linear-gradient(180deg,#ffffff_0%,#f4f7fc_100%)] shadow-[0_10px_24px_rgba(35,41,70,0.06)]">
              <div className="h-6 w-6 rounded-full bg-[radial-gradient(circle,rgba(78,125,188,0.75)_0%,rgba(78,125,188,0.14)_70%)]" />
            </div>
            <p className="mt-5 text-[20px] font-semibold tracking-[-0.03em] text-[#1f2940]">No broker responses yet</p>
            <p className="mt-2 max-w-xl text-[15px] leading-7 text-[#657186]">
              Submitted matches from brokers will appear here once they share a listing against this requirement.
            </p>
          </AdminMatchesPanel>
        )}

        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" className="btn-secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </AdminMatchesModalShell>
  );
}
