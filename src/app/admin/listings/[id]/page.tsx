"use client";

import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useSnackbar } from "notistack";
import { AppShell } from "@/components/AppShell";
import { AdminBrokerSocialLinks } from "@/app/admin/_components/AdminBrokerSocialLinks";
import { BackButton } from "@/components/BackButton";
import { EmptyState } from "@/components/EmptyState";
import { ListingMediaLinks } from "@/components/ListingMediaLinks";
import { ListingMasonryGallery } from "@/components/ListingMasonryGallery";
import { LoadingScreen } from "@/components/LoadingScreen";
import { useAuth } from "@/auth/useAuth";
import { getSafeAdminReturnHref } from "@/lib/admin-navigation";
import { apiFetch, apiFetchCached } from "@/lib/deal-api";
import { invalidateAdminBrokerActivityCaches, invalidateAdminOverviewCaches, invalidateListingCaches } from "@/lib/client-cache";
import { NEW_DEAL_ALERT_COOLDOWN_DAYS, getNewDealAlertCooldownState } from "@/lib/email-alert-config";
import type { AdminListingDetail } from "@/lib/deal-types";
import {
  cn,
  formatCurrency,
  formatDate,
  formatDateTime,
  formatDealType,
  formatListingDisplayStatus,
  formatPropertyType,
  getFullName,
  initials,
  isActiveListingStatus,
  statusClasses,
} from "@/lib/deal-utils";
import { getDefaultRouteForUser, isAdmin } from "@/lib/route-access";
import { getSessionResourceGeneration } from "@/lib/session-resource";

const APPROVAL_SUCCESS_BAR_DURATION_MS = 10_000;
const LISTING_DETAIL_CACHE_TTL_MS = 5_000;
const RESPONSIVE_SUBTLE_COMPACT_CLASS =
  "min-w-0 max-w-full border-t border-brand-line/80 bg-transparent px-0 py-4 text-brand-ink shadow-none md:rounded-[8px] md:border md:border-brand-line/80 md:bg-brand-panel-soft md:p-4 md:shadow-[0_8px_24px_rgba(15,42,95,0.05)]";
const RESPONSIVE_SUBTLE_ROOMY_CLASS =
  "min-w-0 max-w-full border-t border-brand-line/80 bg-transparent px-0 py-4 text-brand-ink shadow-none md:rounded-[8px] md:border md:border-brand-line/80 md:bg-brand-panel-soft md:p-5 md:shadow-[0_8px_24px_rgba(15,42,95,0.05)]";
const COMPACT_OVERLAY_BADGE_CLASS =
  "px-2 py-1 text-[9px] tracking-[0.12em] md:px-3 md:py-1.5 md:text-[11px] md:tracking-[0.18em]";

type NewDealAlertTriggerResponse = {
  success: boolean;
  result: {
    attempted: number;
    sentOrQueued: number;
    skipped: number;
    failed: number;
    lastSentAt?: string | null;
    availableAt?: string | null;
  };
};

function SectionHeader({
  kicker,
  title,
  description,
}: {
  kicker: string;
  title: string;
  description: ReactNode;
}) {
  return (
    <div>
      <p className="page-kicker text-brand-orange">{kicker}</p>
      <h2 className="mt-2 text-xl font-semibold text-brand-navy md:mt-3 md:text-2xl">{title}</h2>
      <p className="mt-2 text-sm leading-7 text-brand-slate">{description}</p>
    </div>
  );
}

function SummaryMetric({
  label,
  value,
  helper,
}: {
  label: string;
  value: string | number;
  helper: string;
}) {
  return (
    <div className={cn(RESPONSIVE_SUBTLE_COMPACT_CLASS, "h-full")}>
      <p className="micro-copy">{label}</p>
      <p className="mt-2 break-words text-[1.25rem] font-semibold tracking-[-0.03em] text-brand-navy md:mt-3 md:text-[1.45rem]">{value}</p>
      <p className="mt-1.5 break-words text-sm leading-6 text-brand-slate md:mt-2">{helper}</p>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1.5 border-b border-brand-line/80 py-3 first:pt-0 last:border-b-0 last:pb-0 md:flex-row md:items-start md:justify-between md:gap-4">
      <p className="micro-copy shrink-0">{label}</p>
      <p className="min-w-0 break-words text-left text-sm font-semibold leading-6 text-brand-ink md:text-right">{value}</p>
    </div>
  );
}

function DocumentRow({ fileName, href }: { fileName: string; href: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="group flex max-w-full flex-col gap-3 rounded-[10px] border border-brand-line bg-white px-3 py-3 shadow-[0_10px_24px_rgba(15,42,95,0.06)] transition duration-200 hover:-translate-y-0.5 hover:border-brand-blue/25 hover:bg-brand-panel-soft md:flex-row md:items-center md:justify-between md:gap-4 md:rounded-[12px] md:px-4 md:py-4"
    >
      <div className="flex min-w-0 max-w-full items-center gap-3 md:gap-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] border border-brand-line/80 bg-brand-panel-soft text-brand-navy md:h-12 md:w-12 md:rounded-[16px]">
          <svg viewBox="0 0 20 20" fill="none" className="h-5 w-5" aria-hidden="true">
            <path
              d="M6.25 2.5h5.625l3.875 3.875V15a2.5 2.5 0 0 1-2.5 2.5h-7A2.5 2.5 0 0 1 3.75 15V5A2.5 2.5 0 0 1 6.25 2.5Z"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M11.875 2.75V6.25H15.375"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path d="M7 10h6M7 13h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <div className="min-w-0">
          <p className="break-words text-sm font-semibold text-brand-ink line-clamp-2 md:truncate">{fileName}</p>
          <p className="mt-1 break-words text-sm text-brand-slate">Open supporting file</p>
        </div>
      </div>

      <div className="flex w-full shrink-0 items-center justify-between gap-2 text-sm font-semibold text-brand-navy transition group-hover:text-brand-blue md:w-auto md:justify-start">
        <span>Open</span>
        <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4" aria-hidden="true">
          <path
            d="M5.833 14.167 14.167 5.833M7.5 5.833h6.667V12.5"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    </a>
  );
}

type SnapshotStatusKey = "active" | "approved" | "pending" | "rejected" | "inactive" | "expired" | "deleted";

type SnapshotStatusMeta = {
  label: string;
  description: string;
  cardClassName: string;
  eyebrowClassName: string;
  titleClassName: string;
  descriptionClassName: string;
  iconFrameClassName: string;
  icon: ReactNode;
};

function EyeIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path
        d="M2.75 12C4.92 7.92 8.11 5.88 12 5.88C15.89 5.88 19.08 7.92 21.25 12C19.08 16.08 15.89 18.12 12 18.12C8.11 18.12 4.92 16.08 2.75 12Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="12" r="2.85" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

function EyeOffIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path
        d="M3 3L21 21"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M10.6 6.01C11.05 5.92 11.52 5.88 12 5.88C15.89 5.88 19.08 7.92 21.25 12C20.49 13.43 19.61 14.67 18.61 15.7"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M14.12 14.12C13.58 14.67 12.83 15 12 15C10.34 15 9 13.66 9 12C9 11.17 9.33 10.42 9.88 9.88"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M6.28 6.28C4.91 7.46 3.72 9.04 2.75 12C4.92 16.08 8.11 18.12 12 18.12C13.68 18.12 15.22 17.74 16.62 16.98"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CalendarIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path d="M7.75 3.75V6.25" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M16.25 3.75V6.25" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path
        d="M4.75 8.25H19.25"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <rect x="4.75" y="5.75" width="14.5" height="14.5" rx="3" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

function ClockIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <circle cx="12" cy="12" r="8.25" stroke="currentColor" strokeWidth="1.8" />
      <path d="M12 8.25V12.25L14.75 14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CheckCircleIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <circle cx="12" cy="12" r="8.25" stroke="currentColor" strokeWidth="1.8" />
      <path d="M8.35 12.05L10.75 14.45L15.65 9.55" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function PencilIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path
        d="M4.75 19.25L8.59 18.41L17.9 9.1C18.68 8.32 18.68 7.05 17.9 6.27L17.73 6.1C16.95 5.32 15.68 5.32 14.9 6.1L5.59 15.41L4.75 19.25Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M13.75 7.25L16.75 10.25" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function XCircleIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <circle cx="12" cy="12" r="8.25" stroke="currentColor" strokeWidth="1.8" />
      <path d="M9.25 9.25L14.75 14.75" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M14.75 9.25L9.25 14.75" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function PauseCircleIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <circle cx="12" cy="12" r="8.25" stroke="currentColor" strokeWidth="1.8" />
      <path d="M10 9V15" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M14 9V15" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function ExpiredIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path d="M8.5 3.75H15.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M8.5 20.25H15.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path
        d="M9.5 6.25V8.35C9.5 9.44 9.93 10.49 10.7 11.26L12 12.56L13.3 11.26C14.07 10.49 14.5 9.44 14.5 8.35V6.25"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M14.5 17.75V15.65C14.5 14.56 14.07 13.51 13.3 12.74L12 11.44L10.7 12.74C9.93 13.51 9.5 14.56 9.5 15.65V17.75"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function AwardRibbonIcon({ className = "h-6 w-6" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <circle cx="12" cy="9.5" r="5.75" stroke="currentColor" strokeWidth="1.8" />
      <path d="M9.35 15.1L7.75 20.25L12 17.95L16.25 20.25L14.65 15.1" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M12 7.35L12.66 8.68L14.1 8.89L13.05 9.92L13.3 11.35L12 10.67L10.7 11.35L10.95 9.92L9.9 8.89L11.34 8.68L12 7.35Z" fill="currentColor" stroke="currentColor" strokeWidth="0.6" strokeLinejoin="round" />
    </svg>
  );
}

function TrashIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path d="M4.75 7.25H19.25" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M9.25 3.75H14.75" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M7.25 7.25L8 18.25C8.08 19.28 8.93 20.08 9.97 20.08H14.03C15.07 20.08 15.92 19.28 16 18.25L16.75 7.25" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M10 10.5V16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M14 10.5V16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function ApprovalSparkIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path
        d="M12 3.75L13.77 8.23L18.25 10L13.77 11.77L12 16.25L10.23 11.77L5.75 10L10.23 8.23L12 3.75Z"
        fill="currentColor"
      />
      <circle cx="18.25" cy="5.75" r="1.25" fill="currentColor" opacity="0.78" />
      <circle cx="6" cy="18" r="1" fill="currentColor" opacity="0.72" />
    </svg>
  );
}

function DealAlertIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path
        d="M5.5 14.25H4.75A2 2 0 0 1 2.75 12.25V11.75A2 2 0 0 1 4.75 9.75H5.5L17.25 5.25V18.75L5.5 14.25Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M7.25 14.9L8.3 18.1C8.54 18.82 9.2 19.25 9.9 19.25H10.75"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M20.25 9.5V14.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function formatNewDealAlertDateTime(value: string | Date | null | undefined) {
  if (!value) {
    return "TBD";
  }

  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "TBD";
  }

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  })
    .format(date)
    .replace(/\b(am|pm)\b/gi, (match) => match.toUpperCase());
}

function ApprovalSuccessBar() {
  return (
    <div className="mt-5 overflow-hidden rounded-[18px] border border-[#cae8d3] bg-[linear-gradient(180deg,#f4fcf5_0%,#ecf8ef_100%)] shadow-[0_14px_30px_rgba(56,142,93,0.08)]">
      <div className="flex flex-col gap-5 px-4 py-4 sm:px-5 lg:flex-row lg:items-center lg:justify-between lg:gap-6">
        <div className="flex min-w-0 items-center gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] border border-[#c7e6d1] bg-[linear-gradient(180deg,#ffffff_0%,#f3fbf4_100%)] text-[#30a35f] shadow-[0_10px_22px_rgba(56,142,93,0.12)]">
            <ApprovalSparkIcon className="h-6 w-6" />
          </div>
          <div className="min-w-0">
            <p className="text-[1rem] font-semibold leading-6 text-[#227947] sm:text-[1.06rem]">
              This listing is approved and ready to go live.
            </p>
            <p className="mt-1 text-sm leading-6 text-[#79b08c]">
              Great work! Listings like this get more views and responses.
            </p>
          </div>
        </div>

        <div className="relative flex h-[56px] w-full shrink-0 items-center justify-end overflow-hidden rounded-[14px] border border-[#dbeee0] bg-[linear-gradient(180deg,rgba(255,255,255,0.54)_0%,rgba(255,255,255,0.2)_100%)] px-4 sm:h-[60px] lg:w-[144px]">
          <div className="absolute inset-y-0 right-[38px] w-px bg-[#d0e7d8]" />
          <div className="absolute left-6 top-3 text-[#d79f78]">
            <ApprovalSparkIcon className="h-3.5 w-3.5" />
          </div>
          <div className="absolute right-10 top-2 text-[#dfe5df]">
            <ApprovalSparkIcon className="h-3 w-3" />
          </div>
          <div className="absolute bottom-2 left-10 text-[#f0c153]">
            <ApprovalSparkIcon className="h-3.5 w-3.5" />
          </div>
          <div className="absolute bottom-3 right-4 text-[#f0c153]">
            <ApprovalSparkIcon className="h-3 w-3" />
          </div>
          <div className="absolute left-[56px] top-1/2 h-1.5 w-1.5 -translate-y-1/2 rounded-full bg-[#e7ece8]" />
          <div className="relative flex h-11 w-11 items-center justify-center rounded-full bg-[#43b96a] text-white shadow-[0_12px_26px_rgba(67,185,106,0.28)] sm:h-12 sm:w-12">
            <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6" aria-hidden="true">
              <path d="M7.85 12.15L10.6 14.9L16.15 9.35" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}

function SnapshotRow({
  label,
  value,
  icon,
  iconClassName,
}: {
  label: string;
  value: string;
  icon: ReactNode;
  iconClassName: string;
}) {
  return (
    <div className={RESPONSIVE_SUBTLE_COMPACT_CLASS}>
      <div className="flex items-start gap-3">
        <span
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-[8px] border shadow-[0_10px_20px_rgba(15,42,95,0.06)]",
            iconClassName
          )}
        >
          {icon}
        </span>
        <div className="min-w-0">
          <p className="micro-copy">{label}</p>
          <p className="mt-2 text-sm font-semibold leading-6 text-brand-ink">{value}</p>
        </div>
      </div>
    </div>
  );
}

function getSnapshotStatusMeta(status: SnapshotStatusKey, isPubliclyVisible: boolean): SnapshotStatusMeta {
  switch (status) {
    case "approved":
      return {
        label: "Approved",
        description: isPubliclyVisible ? "This listing is approved and ready to go live." : "This listing is approved and ready whenever you choose to make it public.",
        cardClassName: "border-[#cfe9d7] bg-[linear-gradient(135deg,#f3fcf5_0%,#e4f7ea_100%)] shadow-[0_18px_40px_rgba(54,138,90,0.12)]",
        eyebrowClassName: "text-[#33a35f]",
        titleClassName: "text-[#1f8a4d]",
        descriptionClassName: "text-[#4b8561]",
        iconFrameClassName: "border-[#b8e2c8] bg-white/86 text-[#209150]",
        icon: <AwardRibbonIcon className="h-10 w-10" />,
      };
    case "active":
      return {
        label: "Active",
        description: isPubliclyVisible ? "This listing is active and visible in Browse Listings." : "This listing is active but currently hidden from public view.",
        cardClassName: "border-[#c8e3ea] bg-[#edf9f2] shadow-[0_18px_40px_rgba(38,121,138,0.1)]",
        eyebrowClassName: "text-[#1f8a4d]",
        titleClassName: "text-[#1f8a4d]",
        descriptionClassName: "text-[#1f8a4d]",
        iconFrameClassName: "border-[#b9dce5] bg-white/86 text-[#217b8b]",
        icon: <CheckCircleIcon className="h-10 w-10" />,
      };
    case "pending":
      return {
        label: "Pending",
        description: "This listing is pending approval.",
        cardClassName: "border-[#efdfb4] bg-[linear-gradient(135deg,#fff9ea_0%,#fff1d1_100%)] shadow-[0_18px_40px_rgba(191,142,39,0.12)]",
        eyebrowClassName: "text-[#c08a17]",
        titleClassName: "text-[#9e6911]",
        descriptionClassName: "text-[#8f722c]",
        iconFrameClassName: "border-[#efd79b] bg-white/86 text-[#b67909]",
        icon: <ClockIcon className="h-10 w-10" />,
      };
    case "rejected":
      return {
        label: "Rejected",
        description: "This listing was rejected and is not live.",
        cardClassName: "border-[#e9c7c0] bg-[linear-gradient(135deg,#fff5f3_0%,#ffe9e5_100%)] shadow-[0_18px_40px_rgba(184,85,70,0.1)]",
        eyebrowClassName: "text-[#c06657]",
        titleClassName: "text-[#b25647]",
        descriptionClassName: "text-[#95625a]",
        iconFrameClassName: "border-[#efc4bd] bg-white/86 text-[#b85546]",
        icon: <XCircleIcon className="h-10 w-10" />,
      };
    case "inactive":
      return {
        label: "Inactive",
        description: "This listing is inactive and currently not live.",
        cardClassName: "border-[#d8dfeb] bg-[linear-gradient(135deg,#fafbfd_0%,#f2f5f9_100%)] shadow-[0_18px_40px_rgba(93,108,136,0.08)]",
        eyebrowClassName: "text-[#7a879c]",
        titleClassName: "text-[#5d6c88]",
        descriptionClassName: "text-[#748095]",
        iconFrameClassName: "border-[#d9e0ea] bg-white/88 text-[#5d6c88]",
        icon: <PauseCircleIcon className="h-10 w-10" />,
      };
    case "expired":
      return {
        label: "Expired",
        description: "This listing has expired and needs attention before it can go live again.",
        cardClassName: "border-[#e4d7bd] bg-[linear-gradient(135deg,#fcfaf4_0%,#f5f1e6_100%)] shadow-[0_18px_40px_rgba(141,106,14,0.08)]",
        eyebrowClassName: "text-[#9a7a2d]",
        titleClassName: "text-[#806429]",
        descriptionClassName: "text-[#8a7752]",
        iconFrameClassName: "border-[#e8dcc0] bg-white/88 text-[#8e6a0e]",
        icon: <ExpiredIcon className="h-10 w-10" />,
      };
    case "deleted":
      return {
        label: "Deleted",
        description: "This listing was deleted and is no longer visible to brokers or the public.",
        cardClassName: "border-[#e5cbc6] bg-[linear-gradient(135deg,#fff6f4_0%,#fbe9e5_100%)] shadow-[0_18px_40px_rgba(184,85,70,0.08)]",
        eyebrowClassName: "text-[#bf6757]",
        titleClassName: "text-[#b25647]",
        descriptionClassName: "text-[#936862]",
        iconFrameClassName: "border-[#e8c2bb] bg-white/88 text-[#b85546]",
        icon: <TrashIcon className="h-10 w-10" />,
      };
  }
}

export default function AdminListingDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { enqueueSnackbar } = useSnackbar();
  const { user, loading } = useAuth();
  const [detail, setDetail] = useState<AdminListingDetail | null>(null);
  const [pageLoading, setPageLoading] = useState(true);
  const [pendingAction, setPendingAction] = useState<{ action: string; label: string; prompt: string } | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [dealAlertConfirmOpen, setDealAlertConfirmOpen] = useState(false);
  const [dealAlertLoading, setDealAlertLoading] = useState(false);
  const [dealAlertNow, setDealAlertNow] = useState(() => new Date());
  const [showApprovalSuccessBar, setShowApprovalSuccessBar] = useState(false);
  const detailRequestIdRef = useRef(0);
  const detailRef = useRef<AdminListingDetail | null>(null);
  const listingId = params?.id;
  const rawReturnTo = searchParams?.get("returnTo") || null;
  const adminReturnHref = useMemo(() => getSafeAdminReturnHref(rawReturnTo, "/admin"), [rawReturnTo]);
  const backToAdminButton = rawReturnTo ? (
    <button type="button" className="btn-secondary inline-flex" onClick={() => router.replace(adminReturnHref)}>
      Back to Admin
    </button>
  ) : (
    <BackButton fallbackHref="/admin" className="btn-secondary inline-flex">
      Back to Admin
    </BackButton>
  );

  const loadDetail = useCallback(async (force = false) => {
    if (!listingId) return null;
    const requestId = detailRequestIdRef.current + 1;
    detailRequestIdRef.current = requestId;
    const payload = await apiFetchCached<AdminListingDetail>(
      `/api/admin/listings/${listingId}`,
      {},
      {
        force,
        ttlMs: LISTING_DETAIL_CACHE_TTL_MS,
      }
    );
    if (detailRequestIdRef.current === requestId) {
      detailRef.current = payload;
      setDetail(payload);
    }
    return payload;
  }, [listingId]);

  useEffect(() => {
    let isActive = true;

    if (!loading && (!user || !isAdmin(user))) {
      detailRequestIdRef.current += 1;
      detailRef.current = null;
      setDetail(null);
      setPendingAction(null);
      setActionLoading(false);
      setDealAlertConfirmOpen(false);
      setDealAlertLoading(false);
      setShowApprovalSuccessBar(false);
      setPageLoading(false);
      router.replace(getDefaultRouteForUser(user));
      return;
    }

    if (!loading && user && listingId) {
      const requestGeneration = getSessionResourceGeneration();
      const isCurrentRequest = () => isActive && requestGeneration === getSessionResourceGeneration();
      const hasCurrentDetail = detailRef.current?.listing.id === listingId;

      if (!hasCurrentDetail) {
        setPageLoading(true);
      } else {
        setPageLoading(false);
      }

      loadDetail()
        .catch((error) => {
          if (!isCurrentRequest()) {
            return;
          }

          enqueueSnackbar(error instanceof Error ? error.message : "Failed to load listing detail.", { variant: "error" });
        })
        .finally(() => {
          if (isCurrentRequest()) {
            setPageLoading(false);
          }
        });
    }

    return () => {
      isActive = false;
    };
  }, [enqueueSnackbar, loadDetail, loading, listingId, router, user]);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setDealAlertNow(new Date());
    }, 30_000);

    return () => window.clearInterval(intervalId);
  }, []);

  const runAction = async (action: string) => {
    if (!detail) return;

    setActionLoading(true);
    try {
      await apiFetch("/api/admin/action", {
        method: "POST",
        body: JSON.stringify({ action, targetId: detail.listing.id }),
      });
      invalidateListingCaches(detail.listing.id);
      invalidateAdminOverviewCaches();
      if (detail.listing.created_by) invalidateAdminBrokerActivityCaches(detail.listing.created_by);
      enqueueSnackbar("Moderation action completed.", { variant: "success" });
      setPendingAction(null);
      await loadDetail(true);
    } catch (error) {
      enqueueSnackbar(error instanceof Error ? error.message : "Moderation action failed.", { variant: "error" });
    } finally {
      setActionLoading(false);
    }
  };

  const sendNewDealAlert = async () => {
    if (!detail) return;

    setDealAlertLoading(true);
    try {
      const response = await apiFetch<NewDealAlertTriggerResponse>("/api/admin/email/deal-alerts", {
        method: "POST",
        body: JSON.stringify({ listingId: detail.listing.id }),
      });

      if (response.result.lastSentAt) {
        setDetail((current) =>
          current
            ? {
                ...current,
                listing: {
                  ...current.listing,
                  last_new_deal_alert_sent_at: response.result.lastSentAt || null,
                },
              }
            : current
        );
      }

      invalidateListingCaches(detail.listing.id);
      invalidateAdminOverviewCaches();
      setDealAlertConfirmOpen(false);
      setDealAlertNow(new Date());

      const brokerCount = response.result.sentOrQueued;
      enqueueSnackbar(
        brokerCount > 0
          ? `New Deal Alert triggered for ${brokerCount} eligible broker${brokerCount === 1 ? "" : "s"}.`
          : "New Deal Alert triggered. No eligible brokers were available.",
        { variant: "success" }
      );

      try {
        await loadDetail(true);
      } catch (refreshError) {
        enqueueSnackbar(
          refreshError instanceof Error ? refreshError.message : "New Deal Alert sent, but listing state could not be refreshed.",
          { variant: "warning" }
        );
      }
    } catch (error) {
      enqueueSnackbar(error instanceof Error ? error.message : "Failed to send Deal Alert.", { variant: "error" });
    } finally {
      setDealAlertLoading(false);
    }
  };

  const listing = detail && detail.listing.id === listingId ? detail.listing : null;
  const moderationButtons = useMemo(() => {
    if (!listing || listing.deleted_at) return [];

    if (listing.status === "pending") {
      return [
        {
          label: "Approve",
          action: "approve_listing",
          className: "btn-primary",
          prompt: "Are you sure you want to approve this listing?",
        },
        {
          label: "Reject",
          action: "reject_listing",
          className: "btn-secondary",
          prompt: "Are you sure you want to reject this listing?",
        },
      ];
    }

    if (listing.status === "rejected") {
      return [
        {
          label: "Approve",
          action: "approve_listing",
          className: "btn-primary",
          prompt: "Are you sure you want to approve this listing?",
        },
      ];
    }

    if (listing.status === "inactive") {
      return [
        {
          label: "Reactivate",
          action: "reactivate_listing",
          className: "btn-secondary",
          prompt: "Are you sure you want to reactivate this listing?",
        },
      ];
    }

    if (isActiveListingStatus(listing.status)) {
      return [
        {
          label: "Deactivate",
          action: "deactivate_listing",
          className: "btn-secondary",
          prompt: "Are you sure you want to deactivate this listing?",
        },
      ];
    }

    return [];
  }, [listing]);

  useEffect(() => {
    const isApprovedListing =
      !!listing &&
      !listing.deleted_at &&
      (listing.status === "active" || listing.status === "approved") &&
      Boolean(listing.approved_at);

    if (!isApprovedListing || !listing?.approved_at) {
      setShowApprovalSuccessBar(false);
      return;
    }

    const storageKey = `admin-listing-approval-success:${listing.id}:${listing.approved_at}`;

    try {
      if (window.localStorage.getItem(storageKey)) {
        setShowApprovalSuccessBar(false);
        return;
      }

      window.localStorage.setItem(storageKey, new Date().toISOString());
    } catch {
      // Keep the banner functional even if storage is unavailable.
    }

    setShowApprovalSuccessBar(true);
    const timeoutId = window.setTimeout(() => {
      setShowApprovalSuccessBar(false);
    }, APPROVAL_SUCCESS_BAR_DURATION_MS);

    return () => window.clearTimeout(timeoutId);
  }, [listing]);

  if (!listing && (loading || pageLoading || !user)) {
    return <LoadingScreen label="Loading listing detail..." />;
  }

  if (!listing) {
    return (
      <AppShell title="Listing Detail" subtitle="Review the listing information and moderation controls." hidePageHeader>
        <div className="pt-6">
          {backToAdminButton}
          <div className="mt-6">
            <EmptyState title="Listing not found" description="The selected listing could not be loaded." />
          </div>
        </div>
      </AppShell>
    );
  }

  const images = listing.listing_images || [];
  const documents = listing.listing_documents || [];
  const statusLabel = formatListingDisplayStatus(listing.status, listing.deleted_at);
  const statusTone = listing.deleted_at ? "deleted" : listing.status;
  const snapshotStatusKey = statusTone as SnapshotStatusKey;
  const visibleInBrowseListings = !listing.deleted_at && listing.is_visible && isActiveListingStatus(listing.status);
  const newDealAlertCooldownState = getNewDealAlertCooldownState(listing.last_new_deal_alert_sent_at, dealAlertNow);
  const canSendNewDealAlert = visibleInBrowseListings && !newDealAlertCooldownState.isCoolingDown;
  const newDealAlertAvailableAtLabel = newDealAlertCooldownState.availableAt
    ? formatNewDealAlertDateTime(newDealAlertCooldownState.availableAt)
    : null;
  const snapshotStatusMeta = getSnapshotStatusMeta(snapshotStatusKey, visibleInBrowseListings);
  const showApprovedTimestamp =
    snapshotStatusKey === "approved" ||
    snapshotStatusKey === "active" ||
    ((snapshotStatusKey === "inactive" || snapshotStatusKey === "expired" || snapshotStatusKey === "deleted") && Boolean(listing.approved_at));
  const moderationTimestampLabel = showApprovedTimestamp ? "Approved on" : "Submitted for approval";
  const moderationTimestampValue = formatDateTime(showApprovedTimestamp ? listing.approved_at || listing.created_at : listing.created_at);
  const ownerName = getFullName(listing.owner?.first_name, listing.owner?.last_name);
  const ownerInitials = initials(ownerName);
  const coverImage = images.find((image) => image.is_cover) || images[0] || null;
  const galleryImages = coverImage ? [coverImage, ...images.filter((image) => image.id !== coverImage.id)] : images;

  const summaryMetrics = [
    {
      label: "Asking Price",
      value: formatCurrency(listing.price),
      helper: "Current published asking price.",
    },
    {
      label: "Bedrooms",
      value: listing.bedrooms ?? "N/A",
      helper: "Configured bedroom count.",
    },
    {
      label: "Built-Up Area",
      value: listing.size_sqft ? `${listing.size_sqft} sqft` : "N/A",
      helper: "Registered size for this unit.",
    },
    {
      label: "Media",
      value: `${images.length} image${images.length === 1 ? "" : "s"}`,
      helper: `${documents.length} document${documents.length === 1 ? "" : "s"} attached.`,
    },
  ];
  const showNewDealAlertAction = visibleInBrowseListings;
  const hasListingActions = showNewDealAlertAction || moderationButtons.length > 0;

  return (
    <AppShell mainClassName="!max-w-[1540px] xl:!px-10">
      <div className="flex min-w-0 items-center gap-3">
        {backToAdminButton}
      </div>

      <div className="mt-5 flex flex-col gap-4 md:gap-5 xl:flex-row xl:items-end xl:justify-between">
        <div className="min-w-0 flex-1">
          <div>
            <p className="page-kicker text-brand-orange">Admin Listing View</p>
            <h1 className="mt-3 page-title max-w-full break-words">{listing.title}</h1>
          </div>
          <p className="mt-3 max-w-3xl break-words text-sm leading-7 text-brand-slate sm:text-base">
            {listing.area?.name || "Area pending"} | Added {formatDate(listing.created_at)}
          </p>
        </div>

        <div className="flex w-full min-w-0 flex-col gap-3 items-start xl:w-auto xl:items-end">
          {/* Badges container */}
          <div className="flex min-w-0 max-w-full flex-wrap items-center gap-2 xl:justify-end">
            <span className={statusClasses(statusTone)}>{statusLabel}</span>
            <span className="badge border-[#e0e7f1] bg-white text-brand-navy xl:hidden">{formatCurrency(listing.price)}</span>
            <span className="badge border-[#d5deed] bg-brand-panel-soft text-brand-navy">{formatPropertyType(listing.property_type)}</span>
            <span className="badge border-[#ead8a7] bg-[#fff8e2] text-[#8b6305]">{formatDealType(listing.deal_type)}</span>
            <span
              className={cn(
                "badge",
                listing.is_visible
                  ? "border-[#bfe9d1] bg-[#edf9f2] text-[#1f8a4d]"
                  : "border-[#d6dceb] bg-[#f6f8fb] text-[#6b7482]"
              )}
            >
              {listing.is_visible ? "Visible" : "Hidden"}
            </span>
          </div>

          {hasListingActions ? (
            <div className="flex w-full min-w-0 flex-col gap-2 md:items-start xl:w-auto xl:items-end">
              <div className="grid w-full gap-2 md:flex md:flex-wrap md:gap-3 xl:w-auto xl:justify-end">
                {showNewDealAlertAction ? (
                  <button
                    type="button"
                    className="btn-primary w-full max-w-full md:w-auto gap-2"
                    onClick={() => setDealAlertConfirmOpen(true)}
                    disabled={!canSendNewDealAlert || dealAlertLoading}
                  >
                    <DealAlertIcon className="h-4 w-4 shrink-0" />
                    <span>{dealAlertLoading ? "Sending..." : "Send Deal Alert"}</span>
                  </button>
                ) : null}

                {moderationButtons.map((button) => (
                  <button
                    key={button.action}
                    type="button"
                    className={cn(button.className, "w-full max-w-full md:w-auto")}
                    onClick={() => setPendingAction({ action: button.action, label: button.label, prompt: button.prompt })}
                    disabled={actionLoading}
                  >
                    {button.label}
                  </button>
                ))}
              </div>

              {showNewDealAlertAction ? (
                <p className="max-w-full break-words text-xs font-medium leading-5 text-brand-slate md:pl-1 xl:text-right">{newDealAlertCooldownState.isCoolingDown && newDealAlertAvailableAtLabel ? (
                    <span className="text-[#875f0f]">Available on: {newDealAlertAvailableAtLabel}</span>
                  ) : null}
                </p>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>

      {listing.deleted_at ? (
        <div className="mt-5 rounded-[12px] border border-[#f0d8a8] bg-[#fff8e7] px-4 py-4 text-sm leading-6 text-[#875f0f] shadow-[0_12px_28px_rgba(145,101,29,0.08)] md:mt-6 md:px-5">
          This listing was deleted on {formatDateTime(listing.deleted_at)}. Admin detail remains available, but broker access and public visibility are disabled.
        </div>
      ) : null}

      <div className="mt-6 grid gap-4 md:mt-8 md:gap-5 xl:grid-cols-[minmax(0,1.38fr)_23rem] xl:gap-6">
        <div className="space-y-4 md:space-y-5 xl:space-y-6">
          {showApprovalSuccessBar ? <ApprovalSuccessBar /> : null}
          <section className="panel overflow-hidden">
            <div className="relative overflow-hidden bg-[linear-gradient(135deg,#E7EDF4_0%,#DCE5EF_100%)]">
              {coverImage ? (
                <>
                  <div className="absolute inset-0" />
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={coverImage.public_url} alt={listing.title} className="aspect-[4/3] w-full object-cover sm:aspect-[16/9] xl:aspect-[1.78]" />
                </>
              ) : (
                <div className="flex aspect-[4/3] items-center justify-center bg-[linear-gradient(135deg,#EEF2F6_0%,#DCE4EE_100%)] px-6 text-center text-sm font-medium text-brand-slate sm:aspect-[16/9] xl:aspect-[1.78]">
                  No cover image uploaded yet
                </div>
              )}

              <div className="absolute inset-x-0 top-0 flex flex-wrap items-start justify-between gap-2 p-3 sm:p-4 md:gap-3 md:p-6">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={cn("badge border-white/40 bg-[#0F2A5F]/85 text-white", COMPACT_OVERLAY_BADGE_CLASS)}>{images.length} Photos</span>
                  <span className={cn("badge border-white/40 bg-[#0F2A5F]/85 text-white", COMPACT_OVERLAY_BADGE_CLASS)}>
                    {documents.length} Document{documents.length === 1 ? "" : "s"}
                  </span>
                </div>
                {coverImage ? <span className={cn("badge border-white/40 bg-[#0F2A5F]/85 text-white", COMPACT_OVERLAY_BADGE_CLASS)}>Cover Image</span> : null}
              </div>

              <div className="absolute inset-x-0 bottom-0 p-4 sm:p-5 md:p-6">
                <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/72 md:text-[11px] md:tracking-[0.28em]">
                  {listing.agency?.name || ownerName || "Admin workspace"}
                </p>
                <p className="mt-2 text-sm text-white/92">{listing.area?.name || "Area pending"}</p>
              </div>
            </div>

            <div className="grid gap-5 p-4 md:gap-6 md:p-6 lg:grid-cols-[minmax(0,1.08fr)_minmax(0,0.92fr)] xl:p-8">
              <div>
                <SectionHeader kicker="Listing Overview" title="Property narrative and top-line details" description="" />
                <div className={cn(RESPONSIVE_SUBTLE_ROOMY_CLASS, "mt-4")}>
                  <p className="micro-copy">Description</p>
                  <p className="mt-3 break-words text-sm leading-7 text-brand-slate">{listing.description || "No description provided for this listing yet."}</p>
                </div>
              </div>

              <div className="grid gap-0 md:grid-cols-2 md:gap-3">
                {summaryMetrics.map((metric) => (
                  <SummaryMetric key={metric.label} label={metric.label} value={metric.value} helper={metric.helper} />
                ))}
              </div>
            </div>
          </section>

          <section className="panel p-4 md:p-6 xl:p-8">
            <SectionHeader
              kicker="Media Gallery"
              title="Uploaded images"
              description={images.length ? "" : "Images added to this listing will appear here once uploaded."}
            />

            {galleryImages.length ? (
              <>
                <div className="mt-4 grid min-w-0 gap-3 md:grid-cols-2 lg:grid-cols-3 xl:hidden">
                  {galleryImages.map((image, index) => (
                    <div
                      key={image.id}
                      className="group relative min-w-0 overflow-hidden rounded-[10px] border border-brand-line/80 bg-white shadow-[0_10px_24px_rgba(15,42,95,0.08)] md:rounded-[12px]"
                    >
                      <div className="overflow-hidden bg-[linear-gradient(135deg,#EEF2F6_0%,#DCE4EE_100%)]">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={image.public_url}
                          alt={`${listing.title} image ${index + 1}`}
                          loading="lazy"
                          className="aspect-[4/3] w-full object-cover transition duration-500 group-hover:scale-[1.015]"
                        />
                      </div>
                      {image.is_cover ? (
                        <div className="pointer-events-none absolute inset-x-0 top-0 flex justify-end p-2 md:p-3">
                          <span className={cn("badge border-white/45 bg-[#0F2A5F]/78 text-white", COMPACT_OVERLAY_BADGE_CLASS)}>Cover</span>
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
                <div className="hidden xl:block">
                  <ListingMasonryGallery images={galleryImages} listingTitle={listing.title} />
                </div>
              </>
            ) : (
              <div className="mt-6 rounded-[12px] border border-dashed border-brand-line bg-brand-panel-soft px-6 py-16 text-center text-sm text-brand-slate">
                No images uploaded for this listing.
              </div>
            )}
          </section>

          {listing.property_video_url ? (
            <ListingMediaLinks
              url={listing.property_video_url}
              className="p-4 md:p-6 xl:p-8"
            />
          ) : null}

          <section className="panel p-4 md:p-6 xl:p-8">
            <SectionHeader kicker="Listing Details" title="Property profile and commercial structure" description="" />

            <div className="mt-5 grid gap-0 md:mt-6 md:grid-cols-2 md:gap-4">
              <div className={RESPONSIVE_SUBTLE_ROOMY_CLASS}>
                <p className="micro-copy">Property Profile</p>
                <div className="mt-4">
                  <DetailRow label="Property Type" value={formatPropertyType(listing.property_type)} />
                  <DetailRow label="Deal Type" value={formatDealType(listing.deal_type)} />
                  <DetailRow label="Area" value={listing.area?.name || "Area pending"} />
                  <DetailRow label="Bedrooms" value={listing.bedrooms !== null ? `${listing.bedrooms}` : "Not provided"} />
                  <DetailRow label="Built-Up Area" value={listing.size_sqft ? `${listing.size_sqft} sqft` : "Not provided"} />
                </div>
              </div>

              <div className={RESPONSIVE_SUBTLE_ROOMY_CLASS}>
                <p className="micro-copy">Commercial Structure</p>
                <div className="mt-4">
                  <DetailRow label="Developer" value={listing.developer || "Not provided"} />
                  <DetailRow label="Payment Plan" value={listing.payment_plan || "Not provided"} />
                  <DetailRow label="Handover Date" value={formatDate(listing.handover_date)} />
                  <DetailRow label="Yield Percent" value={listing.yield_percent ? `${listing.yield_percent}%` : "Not provided"} />
                  <DetailRow label="Credits Used" value={`${listing.credits_used}`} />
                </div>
              </div>

              <div className={cn(RESPONSIVE_SUBTLE_ROOMY_CLASS, "md:col-span-2")}>
                <p className="micro-copy">Internal Notes</p>
                <p className="mt-3 break-words text-sm leading-7 text-brand-slate">{listing.notes || "No internal notes provided."}</p>
              </div>
            </div>
          </section>

          <section className="panel p-4 md:p-6 xl:p-8">
            <SectionHeader
              kicker="Documents"
              title="Supporting files"
              description={documents.length ? "" : "Supporting files uploaded for this listing will be shown here."}
            />

            {documents.length ? (
              <div className="mt-5 space-y-3 md:mt-6">
                {documents.map((document) => (
                  <DocumentRow key={document.id} fileName={document.file_name} href={document.public_url} />
                ))}
              </div>
            ) : (
              <div className="mt-5 rounded-[12px] border border-dashed border-brand-line bg-brand-panel-soft px-4 py-10 text-center text-sm text-brand-slate md:mt-6 md:px-6 md:py-12">
                No documents uploaded.
              </div>
            )}
          </section>
        </div>

        <aside className="grid gap-4 md:grid-cols-2 md:gap-5 xl:sticky xl:top-28 xl:block xl:space-y-6 xl:self-start">
          <section className="panel p-4 md:col-span-2 md:p-6 xl:col-span-1">
            <SectionHeader kicker="Snapshot" title="Lifecycle and visibility" description="" />

            <div className={cn("mt-4 overflow-hidden rounded-[8px] border p-3 md:mt-6", snapshotStatusMeta.cardClassName)}>
              <p className={cn("text-[11px] font-semibold uppercase tracking-[0.22em]", snapshotStatusMeta.eyebrowClassName)}>Current Status</p>
              <div className="mt-4 flex items-start gap-3 md:gap-4">
                <span
                  className={cn(
                    "flex h-14 w-14 shrink-0 items-center justify-center rounded-[18px] border shadow-[0_12px_26px_rgba(15,42,95,0.08)]",
                    snapshotStatusMeta.iconFrameClassName
                  )}
                >
                  {snapshotStatusMeta.icon}
                </span>
                <div className="min-w-0">
                  <p className={cn("text-[1.35rem] font-semibold tracking-[-0.03em] md:text-[1.60rem]", snapshotStatusMeta.titleClassName)}>{snapshotStatusMeta.label}</p>
                  <p className={cn("mt-1 text-sm leading-6", snapshotStatusMeta.descriptionClassName)}>{snapshotStatusMeta.description}</p>
                </div>
              </div>
            </div>

            <div className="mt-3 space-y-0 md:mt-4 md:space-y-3">
              <SnapshotRow
                label="Visibility"
                value={visibleInBrowseListings ? "Publicly visible" : "Hidden from public view"}
                icon={visibleInBrowseListings ? <EyeIcon /> : <EyeOffIcon />}
                iconClassName={visibleInBrowseListings ? "border-[#c8e6d3] bg-[#edf9f2] text-[#1f8a4d]" : "border-[#d9e0ea] bg-[#f6f8fb] text-[#5d6c88]"}
              />
              <SnapshotRow
                label="Created"
                value={formatDateTime(listing.created_at)}
                icon={<CalendarIcon />}
                iconClassName="border-[#d9e0ea] bg-white text-[#243b73]"
              />
              <SnapshotRow
                label={moderationTimestampLabel}
                value={moderationTimestampValue}
                icon={showApprovedTimestamp ? <CheckCircleIcon /> : <ClockIcon />}
                iconClassName={showApprovedTimestamp ? "border-[#c8e6d3] bg-[#edf9f2] text-[#1f8a4d]" : "border-[#efdfb4] bg-[#fff7e7] text-[#b97805]"}
              />
              <SnapshotRow
                label="Last updated"
                value={formatDateTime(listing.updated_at)}
                icon={<PencilIcon />}
                iconClassName="border-[#d9e0ea] bg-white text-[#243b73]"
              />
              {listing.deleted_at ? (
                <SnapshotRow
                  label="Deleted"
                  value={formatDateTime(listing.deleted_at)}
                  icon={<TrashIcon />}
                  iconClassName="border-[#efc4bd] bg-[#fff1ee] text-[#b85546]"
                />
              ) : null}
            </div>
          </section>

          <section className="panel p-4 md:p-6">
            <SectionHeader kicker="Ownership" title="Broker and agency" description="" />

            <div className="mt-4 border-t border-brand-line/80 pt-4 md:mt-6 md:rounded-[24px] md:border md:border-brand-line md:bg-[linear-gradient(180deg,#ffffff_0%,#f7f9fc_100%)] md:p-5 md:shadow-[0_14px_32px_rgba(15,42,95,0.08)]">
              <div className="flex items-start gap-3 md:gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-brand-navy text-sm font-semibold uppercase tracking-[0.16em] text-white md:h-14 md:w-14">
                  {ownerInitials}
                </div>
                <div className="min-w-0">
                  <p className="text-base font-semibold text-brand-navy md:text-lg">{ownerName}</p>
                  <p className="mt-2 break-words text-sm text-brand-slate">{listing.owner?.email || "Email unavailable"}</p>
                  <p className="mt-1 break-words text-sm text-brand-slate">{listing.owner?.phone || "Phone unavailable"}</p>
                </div>
              </div>

              <div className="mt-5 border-t border-brand-line/80 pt-5">
                <DetailRow label="Agency" value={listing.agency?.name || "Agency not set"} />
                <DetailRow label="RERA BRN" value={listing.agency?.rera_brn || "Not provided"} />
                <DetailRow
                  label="Owner Inventory"
                  value={
                    listing.owner_active_listings_count !== null && listing.owner_active_listings_count !== undefined
                      ? `${listing.owner_active_listings_count} active listing${listing.owner_active_listings_count === 1 ? "" : "s"}`
                      : "Not available"
                  }
                />
              </div>

            </div>
              <AdminBrokerSocialLinks
                whatsappNumber={listing.ownerBrokerProfile?.whatsapp_number || null}
                instagramUrl={listing.ownerBrokerProfile?.instagram_profile || null}
                linkedinUrl={listing.ownerBrokerProfile?.linkedin_profile || null}
                className="mt-4 border-0 bg-transparent p-0 shadow-none md:mt-5 md:border md:border-[#f0dfb0] md:bg-[linear-gradient(180deg,#fffdfa_0%,#fff8e8_100%)] md:p-4 md:shadow-[0_14px_30px_rgba(153,118,43,0.08)]"
              />
          </section>

          <section className="panel p-4 md:p-6">
            <SectionHeader kicker="Commission" title="Co-broke terms" description="" />

            <div className="mt-4 grid gap-0 md:mt-6 md:gap-3">
              <div className={RESPONSIVE_SUBTLE_ROOMY_CLASS}>
                <p className="micro-copy">Co-Broke Percent</p>
                <p className="mt-3 text-2xl font-semibold tracking-[-0.04em] text-brand-navy md:text-3xl">
                  {listing.commission_terms?.co_broke_percent ? `${listing.commission_terms.co_broke_percent}%` : "TBD"}
                </p>
              </div>
              <div className={RESPONSIVE_SUBTLE_ROOMY_CLASS}>
                <p className="micro-copy">Payment Terms</p>
                <p className="mt-3 break-words text-sm leading-7 text-brand-slate">{listing.commission_terms?.payment_terms || "Not provided"}</p>
              </div>
              <div className={RESPONSIVE_SUBTLE_ROOMY_CLASS}>
                <p className="micro-copy">Commission Notes</p>
                <p className="mt-3 break-words text-sm leading-7 text-brand-slate">{listing.commission_terms?.notes || "No commission notes provided."}</p>
              </div>
            </div>
          </section>
        </aside>
      </div>

      {dealAlertConfirmOpen ? (
        <div className="fixed inset-0 z-[100] flex items-end justify-center overflow-x-hidden bg-slate-950/60 p-2 sm:items-center sm:p-4">
          <div className="panel max-h-[calc(100dvh-1rem)] w-full max-w-lg overflow-x-hidden overflow-y-auto p-3 sm:max-h-[calc(100vh-2rem)] sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.3em] text-brand-orange">Confirm Email Alert</p>
                <h3 className="mt-2 text-2xl font-semibold text-brand-navy">Send Deal Alert to eligible brokers</h3>
                <p className="mt-2 text-sm leading-6 text-brand-slate">
                  The alert will be available again after {NEW_DEAL_ALERT_COOLDOWN_DAYS} days.
                </p>
              </div>
              <button
                type="button"
                onClick={() => (!dealAlertLoading ? setDealAlertConfirmOpen(false) : null)}
                className="modal-close-button"
                disabled={dealAlertLoading}
                aria-label="Close New Deal Alert confirmation"
              >
                <span aria-hidden="true">&times;</span>
              </button>
            </div>

            <div className="mt-6 flex flex-col-reverse gap-3 md:flex-row md:justify-end">
              <button type="button" className="btn-secondary w-full md:w-auto" onClick={() => setDealAlertConfirmOpen(false)} disabled={dealAlertLoading}>
                Cancel
              </button>
              <button type="button" className="btn-primary w-full gap-2 md:w-auto" onClick={sendNewDealAlert} disabled={dealAlertLoading || !canSendNewDealAlert}>
                <DealAlertIcon className="h-4 w-4 shrink-0" />
                <span>{dealAlertLoading ? "Sending..." : "Send Alert"}</span>
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {pendingAction ? (
        <div className="fixed inset-0 z-[100] flex items-end justify-center overflow-x-hidden bg-slate-950/60 p-2 sm:items-center sm:p-4">
          <div className="panel max-h-[calc(100dvh-1rem)] w-full max-w-lg overflow-x-hidden overflow-y-auto p-3 sm:max-h-[calc(100vh-2rem)] sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.3em] text-brand-orange">Confirm Listing Action</p>
                <h3 className="mt-2 text-2xl font-semibold text-brand-navy">{pendingAction.label} Listing</h3>
                <p className="mt-2 text-sm leading-6 text-brand-slate">{pendingAction.prompt}</p>
              </div>
              <button
                type="button"
                onClick={() => (!actionLoading ? setPendingAction(null) : null)}
                className="modal-close-button"
                disabled={actionLoading}
                aria-label="Close confirmation"
              >
                <span aria-hidden="true">&times;</span>
              </button>
            </div>

            <div className="mt-6 flex flex-col-reverse gap-3 md:flex-row md:justify-end">
              <button type="button" className="btn-secondary w-full md:w-auto" onClick={() => setPendingAction(null)} disabled={actionLoading}>
                Cancel
              </button>
              <button type="button" className="btn-primary w-full md:w-auto" onClick={() => runAction(pendingAction.action)} disabled={actionLoading}>
                {actionLoading ? "Confirming..." : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </AppShell>
  );
}
