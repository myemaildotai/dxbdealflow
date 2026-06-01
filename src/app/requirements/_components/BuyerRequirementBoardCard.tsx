"use client";

import { type ReactNode } from "react";
import type { Requirement } from "@/lib/deal-types";
import { cn, formatDate, formatDealType, formatPropertyType, formatRequirementUrgency } from "@/lib/deal-utils";
import type { RequirementListingMatchSummary } from "@/lib/requirement-matching";
import { formatRequirementBedrooms } from "@/lib/requirements";
import {
  getBuyerBoardRequirementTitle,
  getRequirementBudgetLine,
  getRequirementMatchCount,
  getRequirementMatchedListingsLabel,
  getRequirementMatchLabel,
} from "./buyer-board-utils";

function RequirementBadge({ children }: { children: ReactNode }) {
  return (
    <span
      className="inline-flex items-center rounded-full border border-[#dbe3ec] bg-[#f5f7fa] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-brand-slate sm:text-[11px] xl:px-3 xl:py-1.5 xl:tracking-[0.16em]"
    >
      {children}
    </span>
  );
}

function UrgencyBadge({ urgency }: { urgency: Requirement["urgency"] }) {
  const label = formatRequirementUrgency(urgency);

  const config: Record<Requirement["urgency"], { className: string; icon: ReactNode }> = {
    high: {
      className:
        "bg-red-50 text-red-600 border-red-100 shadow-sm",
      icon: (
        <svg viewBox="0 0 20 20" fill="none" className="h-3.5 w-3.5">
          <path
            d="M10 5v5"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
          <circle cx="10" cy="13.5" r="1" fill="currentColor" />
        </svg>
      ),
    },
    hot: {
      className:
        "bg-red-50 text-red-600 border-red-100 shadow-sm",
      icon: (
        <svg viewBox="0 0 20 20" fill="none" className="h-3.5 w-3.5">
          <path
            d="M10 5v5"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
          <circle cx="10" cy="13.5" r="1" fill="currentColor" />
        </svg>
      ),
    },
    medium: {
      className:
        "bg-amber-50 text-amber-600 border-amber-100 shadow-sm",
      icon: (
        <svg viewBox="0 0 20 20" fill="none" className="h-3.5 w-3.5">
          <circle
            cx="10"
            cy="10"
            r="7"
            stroke="currentColor"
            strokeWidth="1.8"
          />
          <path
            d="M10 6v4l2 2"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        </svg>
      ),
    },
    low: {
      className:
        "bg-emerald-50 text-emerald-600 border-emerald-100 shadow-sm",
      icon: (
        <svg viewBox="0 0 20 20" fill="none" className="h-3.5 w-3.5">
          <path
            d="M6 10l3 3 5-6"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ),
    },
    active: {
      className:
        "bg-sky-50 text-sky-600 border-sky-100 shadow-sm",
      icon: (
        <svg viewBox="0 0 20 20" fill="none" className="h-3.5 w-3.5">
          <circle
            cx="10"
            cy="10"
            r="3"
            fill="currentColor"
          />
        </svg>
      ),
    },
    planning: {
      className:
        "bg-violet-50 text-violet-600 border-violet-100 shadow-sm",
      icon: (
        <svg viewBox="0 0 20 20" fill="none" className="h-3.5 w-3.5">
          <path
            d="M5 14.5h10M6.5 11.5l2.5-5 2 3 2-2 1.5 4"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ),
    },
  };

  const current = config[urgency];

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-medium leading-none sm:text-[11px] xl:px-3",
        "transition-all duration-200",
        current.className
      )}
    >
      <span className="flex items-center justify-center">
        {current.icon}
      </span>
      <span className="tracking-[0.2px]">{label}</span>
    </span>
  );
}

function RequirementMetadataItem({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="min-w-0">
      <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-brand-slate">{label}</p>
      <p className="mt-1 line-clamp-2 break-words text-[13px] font-medium text-brand-ink xl:block xl:truncate xl:text-[14px]">{value}</p>
    </div>
  );
}

function RequirementActionButton({
  label,
  variant = "secondary",
  onClick,
}: {
  label: string;
  variant?: "primary" | "secondary";
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex min-h-[40px] w-auto items-center justify-center rounded-full px-3 text-sm font-semibold transition lg:whitespace-nowrap xl:min-h-[48px] xl:px-4 xl:text-[15px]",
        variant === "primary"
          ? "border border-[#d4af37] bg-[#d4af37] text-brand-white shadow-[0_14px_24px_rgba(212,175,55,0.18)] hover:bg-[#c8a42f]"
          : "border border-brand-line bg-white text-brand-navy shadow-[0_10px_22px_rgba(15,42,95,0.05)] hover:border-brand-blue/30 hover:bg-brand-panel-soft"
      )}
    >
      <span>{label}</span>
    </button>
  );
}

function RequirementMatchPanel({ matchSummary }: { matchSummary: RequirementListingMatchSummary }) {
  const progressValue = Math.max(0, Math.min(matchSummary.bestMatchPercentage, 100));
  const progressColor =
    progressValue >= 80 ? "#5f9d79" : progressValue >= 40 ? "#d4af37" : progressValue > 0 ? "#ef4444" : "#94a3b8";

  return (
    <div className="w-full min-w-0 px-1 py-1 sm:min-w-[216px] lg:w-auto xl:px-2">
      <div className="mt-1 flex min-w-0 items-center justify-between gap-3 lg:justify-start xl:mt-2">
        <div className="min-w-0">
          <p className="line-clamp-2 max-w-[12.75rem] break-words text-[13px] leading-5 text-brand-slate">
            {getRequirementMatchedListingsLabel(matchSummary.matchedListingsCount)}
          </p>
        </div>

        <div
          className="relative flex h-[56px] w-[56px] shrink-0 items-center justify-center rounded-full"
          style={{
            background: `conic-gradient(${progressColor} ${progressValue}%, #dbe4ef ${progressValue}% 100%)`,
          }}
          aria-label={`Best listing match: ${progressValue}%`}
        >
          <div className="flex h-[44px] w-[44px] items-center justify-center rounded-full bg-white shadow-[inset_0_1px_0_rgba(255,255,255,0.95),0_8px_18px_rgba(15,42,95,0.08)]">
            <span className="text-[15px] font-semibold tracking-[-0.03em] text-brand-ink">
              {progressValue}%
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export function BuyerRequirementBoardCard({
  requirement,
  matchSummary,
  canMatch,
  showMatchSummary = true,
  onView,
  onMatch,
}: {
  requirement: Requirement;
  matchSummary: RequirementListingMatchSummary;
  canMatch: boolean;
  showMatchSummary?: boolean;
  onView: () => void;
  onMatch: () => void;
}) {
  const requirementTitle = getBuyerBoardRequirementTitle(requirement);
  const totalMatches = getRequirementMatchCount(requirement);
  const footerMetadata = [
    { label: "Budget", value: getRequirementBudgetLine(requirement) },
    { label: "Deal", value: formatDealType(requirement.deal_type) },
    { label: "Posted", value: formatDate(requirement.created_at) },
  ];

  return (
    <article className="w-full min-w-0 rounded-[14px] border border-[#dbe4ef] bg-white px-3 py-3 text-brand-ink shadow-[0_24px_54px_rgba(15,42,95,0.08)] sm:px-4 sm:py-4 lg:px-6 lg:py-5 xl:rounded-[18px]">
      <div className="flex min-w-0 flex-col gap-3 lg:flex-row lg:items-start lg:justify-between xl:gap-5">
        <div className="flex min-w-0 flex-1 gap-3 xl:gap-4">
          {/* <BrokerAvatar
            alt={`${requirementTitle} requirement`}
            className="h-[68px] w-[68px] shrink-0 rounded-[22px] border border-brand-line bg-brand-panel-soft shadow-[0_10px_24px_rgba(15,42,95,0.06)]"
            imageClassName="rounded-[22px]"
          /> */}

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="line-clamp-2 min-w-0 basis-full break-words text-[18px] font-semibold tracking-[-0.03em] text-brand-ink sm:basis-auto sm:text-[20px] xl:block xl:truncate xl:text-[25px]">{requirementTitle}</h3>
              <UrgencyBadge urgency={requirement.urgency} />
              {showMatchSummary ? <RequirementBadge>{getRequirementMatchLabel(totalMatches)}</RequirementBadge> : null}
            </div>

            <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1.5 text-[13px] font-medium text-brand-slate sm:gap-3 sm:text-[14px]">
              <span className="inline-flex items-center gap-1.5">
                <svg
  viewBox="0 0 24 24"
  fill="none"
  className="h-5 w-5 sm:h-6 sm:w-6"
>
  <path
    d="M3 11v6M21 11v6"
    stroke="currentColor"
    strokeWidth="1.2"
    strokeLinecap="round"
  />
  <path
    d="M3 11h18"
    stroke="currentColor"
    strokeWidth="1.2"
    strokeLinecap="round"
  />
  <path
    d="M5 11V7a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2v4"
    stroke="currentColor"
    strokeWidth="1.2"
    strokeLinecap="round"
  />
  <path
    d="M12 11V8a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2v3"
    stroke="currentColor"
    strokeWidth="1.2"
    strokeLinecap="round"
  />
</svg>
                {formatRequirementBedrooms(requirement.bedrooms) || "Open"}
              </span>

              <span className="text-brand-slate/40">|</span>

              <span className="inline-flex items-center gap-1.5">
                <svg className="h-5 w-5 text-brand-slate/70 sm:h-6 sm:w-6" viewBox="0 0 20 20" fill="none">
                  <path d="M4 16v-7l6-4 6 4v7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                  <path d="M9 16v-4h2v4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
                </svg>
                {formatPropertyType(requirement.property_type)}
              </span>

              <span className="text-brand-slate/40">|</span>

              <span className="inline-flex items-center gap-1.5">
                <svg className="h-5 w-5 text-brand-slate/70 sm:h-6 sm:w-6" viewBox="0 0 20 20" fill="none">
                  <path d="M10 3l6 6-6 8-6-8 6-6z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/>
                </svg>
                {requirement.area || "Flexible"}
              </span>

            </div>
          </div>
        </div>

        {showMatchSummary ? (
          <div className="w-full min-w-0 shrink-0 lg:w-auto lg:pl-4">
            <RequirementMatchPanel matchSummary={matchSummary} />
          </div>
        ) : null}
      </div>

      <div className="mt-3 flex min-w-0 flex-col gap-2 border-t border-brand-line/80 pt-3 lg:flex-row lg:items-center lg:justify-between xl:gap-4 xl:pt-4">
        <div className="flex w-full min-w-0 flex-wrap items-center gap-x-3 gap-y-2 xl:gap-x-4 xl:gap-y-3">
          {footerMetadata.map((item, index) => (
            <div key={item.label} className="flex min-w-0 flex-1 basis-[calc(50%-0.375rem)] items-center gap-3 sm:basis-auto xl:flex-none xl:gap-4">
              {index > 0 ? <span className="hidden h-10 w-px bg-[#dbe4ef] md:block" aria-hidden="true" /> : null}
              <RequirementMetadataItem label={item.label} value={item.value} />
            </div>
          ))}
        </div>
        <div className="flex w-full flex-wrap items-center justify-end gap-2 sm:gap-3 lg:w-auto lg:flex-nowrap lg:shrink-0 xl:ml-auto xl:gap-4">
          <RequirementActionButton label="View" onClick={onView} />
          {canMatch ? <RequirementActionButton label="I Have a Match" variant="primary" onClick={onMatch} /> : null}
        </div>
      </div>
    </article>
  );
}
