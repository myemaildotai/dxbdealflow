"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  RequirementModalPanel,
  RequirementModalShell,
} from "@/components/RequirementModalPrimitives";
import {
  cn,
  formatDateTime,
  formatListingStatus,
  formatRequirementMatchStatus,
  getFullName,
  isActiveListingStatus,
  statusClasses,
} from "@/lib/deal-utils";
import type { Requirement, RequirementMatch } from "@/lib/deal-types";

const COLLAPSED_MESSAGE_LENGTH = 60;
const UNAVAILABLE_BADGE_CLASS_NAME = "badge border-[#e5ddd4] bg-[#f7f3ee] text-[#6d717a]";

function getBrowseListingHref(listingId: string) {
  return `/listings/${listingId}`;
}

function getListingActionState(submission: RequirementMatch) {
  if (!submission.listing_id) {
    return {
      disabled: true,
      href: null,
      badgeLabel: "Listing unavailable",
      badgeClassName: UNAVAILABLE_BADGE_CLASS_NAME,
      helperText: "Listing unavailable",
    };
  }

  const listing = submission.listing;

  if (!listing) {
    return {
      disabled: true,
      href: null,
      badgeLabel: "Listing unavailable",
      badgeClassName: UNAVAILABLE_BADGE_CLASS_NAME,
      helperText: "Listing unavailable",
    };
  }

  if (listing.deleted_at) {
    return {
      disabled: true,
      href: null,
      badgeLabel: "Listing unavailable",
      badgeClassName: UNAVAILABLE_BADGE_CLASS_NAME,
      helperText: "Listing unavailable",
    };
  }

  if (!listing.is_visible) {
    return {
      disabled: true,
      href: null,
      badgeLabel: "Listing hidden",
      badgeClassName: UNAVAILABLE_BADGE_CLASS_NAME,
      helperText: "Listing unavailable",
    };
  }

  if (!isActiveListingStatus(listing.status)) {
    const helperText =
      listing.status === "inactive" ? "Listing deactivated" : "Listing unavailable";

    return {
      disabled: true,
      href: null,
      badgeLabel: formatListingStatus(listing.status),
      badgeClassName: statusClasses(listing.status),
      helperText,
    };
  }

  return {
    disabled: false,
    href: getBrowseListingHref(listing.id),
    badgeLabel: formatListingStatus(listing.status),
    badgeClassName: statusClasses(listing.status),
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

  const resolvedMessage =
    message?.trim() || "No message was included with this submission.";
  const shouldTruncate = resolvedMessage.length > COLLAPSED_MESSAGE_LENGTH;
  const visibleMessage =
    !shouldTruncate || expanded
      ? resolvedMessage
      : `${resolvedMessage.slice(0, COLLAPSED_MESSAGE_LENGTH).trimEnd()}...`;

  return (
    <div className="min-w-0">
      <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#a08c6e]">
        Message
      </p>
      <p className="mt-1.5 whitespace-pre-wrap break-words text-[14px] leading-5 text-[#5f6675]">
        {visibleMessage}
      

      {shouldTruncate ? (
        <button
          type="button"
          className="mt-1.5 text-[13px] font-semibold text-[#2d3343] transition hover:text-[#b48a40]"
          onClick={() => setExpanded((current) => !current)}
        >
          {expanded ? "See less" : "See more"}
        </button>
      ) : null}
      </p>
    </div>
  );
}

function MatchActionButtons({
  submission,
  listingAction,
  actionMatchId,
  onOpenListing,
  onChatSubmission,
}: {
  submission: RequirementMatch;
  listingAction: ReturnType<typeof getListingActionState>;
  actionMatchId: string | null;
  onOpenListing: (href: string) => void;
  onChatSubmission: (submission: RequirementMatch) => void;
}) {
  return (
    <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:justify-end">
      <button
        type="button"
        className="btn-secondary !h-10 !px-4 !py-0 text-[14px] sm:min-w-[132px]"
        onClick={() => {
          if (listingAction.href) {
            onOpenListing(listingAction.href);
          }
        }}
        disabled={listingAction.disabled}
        title={listingAction.helperText || undefined}
        aria-label={
          listingAction.helperText
            ? `View Listing. ${listingAction.helperText}.`
            : "View Listing"
        }
      >
        View Listing
      </button>

      <button
        type="button"
        className="btn-primary !h-10 !px-4 !py-0 text-[14px] sm:min-w-[132px]"
        onClick={() => onChatSubmission(submission)}
        disabled={!submission.listing_id || actionMatchId === submission.id}
      >
        {actionMatchId === submission.id ? "Opening..." : "Chat"}
      </button>
    </div>
  );
}

function MatchCard({
  submission,
  actionMatchId,
  onChatSubmission,
  onOpenListing,
}: {
  submission: RequirementMatch;
  actionMatchId: string | null;
  onChatSubmission: (submission: RequirementMatch) => void;
  onOpenListing: (href: string) => void;
}) {
  const senderName = submission.sender
    ? getFullName(submission.sender.first_name, submission.sender.last_name)
    : "Broker";
  const matchStatusLabel = shouldShowMatchStatusBadge(submission.status)
    ? formatRequirementMatchStatus(submission.status)
    : null;
  const listingAction = getListingActionState(submission);

  return (
    <RequirementModalPanel className="rounded-[22px] border border-[#e8ddd0] bg-white px-4 py-4 shadow-[0_12px_28px_rgba(32,39,56,0.04)]">
      <article className="flex flex-col gap-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h4 className="min-w-0 break-words text-[18px] font-semibold tracking-[-0.03em] text-[#242c3d]">
                {submission.listing?.title || "Listing details unavailable"}
              </h4>

              {listingAction.badgeLabel && listingAction.badgeClassName ? (
                <span className={cn(listingAction.badgeClassName, "max-w-full shrink-0")}>
                  {listingAction.badgeLabel}
                </span>
              ) : null}

              {matchStatusLabel ? (
              <span className={statusClasses(submission.status)}>{matchStatusLabel}</span>
            ) : null}
            </div>
          </div>

          <div className="flex shrink-0 flex-col items-start gap-2 sm:items-end sm:text-right">
            <p className="text-[13px] font-medium leading-5 text-[#697080]">
              {formatDateTime(submission.created_at)}
            </p>
            
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-start">
          <div className="min-w-0">
            <p className="text-[15px] font-semibold text-[#2d3343]">{senderName}</p>
            <p className="mt-0.5 break-all text-[13px] leading-5 text-[#697080]">
              {submission.sender?.email || "Email unavailable"}
            </p>
            <div className="mt-2">
              <ExpandableMatchMessage message={submission.message} />
            </div>
          </div>

          <div className="flex flex-col gap-1.5 md:items-end">
            <MatchActionButtons
              submission={submission}
              listingAction={listingAction}
              actionMatchId={actionMatchId}
              onOpenListing={onOpenListing}
              onChatSubmission={onChatSubmission}
            />

            {listingAction.disabled && listingAction.helperText ? (
              <p className="text-[12px] leading-5 text-[#8a8f98] md:max-w-[220px] md:text-right">
                {listingAction.helperText}
              </p>
            ) : null}
          </div>
        </div>
      </article>
    </RequirementModalPanel>
  );
}

export function RequirementMatchesBrokerModal({
  requirement,
  submittedMatches,
  loading = false,
  actionMatchId = null,
  onClose,
  onViewSubmission,
  onChatSubmission,
  onMarkSubmissionRead,
}: {
  requirement: Requirement;
  submittedMatches: RequirementMatch[];
  loading?: boolean;
  actionMatchId?: string | null;
  onClose: () => void;
  onViewSubmission: (submission: RequirementMatch) => void;
  onChatSubmission: (submission: RequirementMatch) => void;
  onMarkSubmissionRead: (submission: RequirementMatch) => void;
}) {
  const router = useRouter();
  const requirementLabel =
    requirement.title || `Buyer brief in ${requirement.area || "preferred areas"}`;
  void onViewSubmission;

  return (
    <RequirementModalShell onClose={onClose} maxWidthClassName="lg:max-w-[55rem]">
      <div className="border-b border-[#ece2d6] bg-[linear-gradient(180deg,#fbf7f2_0%,#f4ede5_100%)] px-4 py-4 sm:px-6 sm:py-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[#b48a40]">
              Requirement Matches
            </p>
            <h3 className="mt-2 text-lg font-semibold tracking-[-0.04em] text-[#202738] sm:text-xl md:text-2xl">
              {requirementLabel}
            </h3>
            <p className="mt-2 max-w-3xl text-[15px] text-[#6b7281]">
              Review the broker-submitted listings and messages received for this
              requirement.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="modal-close-button"
            aria-label="Close requirement matches"
          >
            <span aria-hidden="true">&times;</span>
          </button>
        </div>
      </div>

      <div className="px-3 py-3 sm:px-6 sm:py-5">
        {loading ? (
          <RequirementModalPanel className="flex min-h-[220px] items-center justify-center">
            <p className="text-[15px] text-[#697080]">Loading matches...</p>
          </RequirementModalPanel>
        ) : submittedMatches.length ? (
          <div className="space-y-3">
            {submittedMatches.map((submission) => (
              <MatchCard
                key={submission.id}
                submission={submission}
                actionMatchId={actionMatchId}
                onChatSubmission={onChatSubmission}
                onOpenListing={(href) => {
                  onMarkSubmissionRead(submission);
                  router.push(href);
                }}
              />
            ))}
          </div>
        ) : (
          <RequirementModalPanel className="flex min-h-[220px] flex-col items-center justify-center text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full border border-[#ebe4d8] bg-[linear-gradient(180deg,#fffdfb_0%,#f8f4ef_100%)] shadow-[0_10px_24px_rgba(37,41,57,0.05)]">
              <div className="h-6 w-6 rounded-full bg-[radial-gradient(circle,rgba(212,175,55,0.85)_0%,rgba(212,175,55,0.15)_70%)]" />
            </div>
            <p className="mt-5 text-[20px] font-semibold tracking-[-0.03em] text-[#242c3d]">
              No broker responses yet
            </p>
            <p className="mt-2 max-w-xl text-[15px] leading-7 text-[#697080]">
              Submitted matches from other brokers will appear here once they share
              a listing against this requirement.
            </p>
          </RequirementModalPanel>
        )}

        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" className="btn-secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </RequirementModalShell>
  );
}
