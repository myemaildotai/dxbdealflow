"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { createPortal } from "react-dom";
import { Suspense, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useSnackbar } from "notistack";
import { AppShell } from "@/components/AppShell";
import { BrokerDashboardReference } from "@/components/BrokerDashboardReference";
import { BrokerRequirementsWorkspace } from "@/components/BrokerRequirementsWorkspace";
import { EmptyState } from "@/components/EmptyState";
import { ListPaginationControls } from "@/components/ListPaginationControls";
import { LoadingScreen } from "@/components/LoadingScreen";
import { ResponsiveRowActionsMenu, type ResponsiveRowAction } from "@/components/ResponsiveRowActionsMenu";
import { SearchField } from "@/components/SearchField";
import { SkeletonBlock } from "@/components/SkeletonBlock";
import { useAuth } from "@/auth/useAuth";
import { useClientPagination } from "@/hooks/useClientPagination";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { useBrokerNotificationFeed } from "@/hooks/useBrokerNotificationFeed";
import { useSessionQuery } from "@/hooks/useSessionQuery";
import { apiFetch, getApiCacheKey } from "@/lib/deal-api";
import { invalidateListingCaches } from "@/lib/client-cache";
import { BrokerDashboardData, ChatConversationSummary, EnquiryReply, LeadStatus } from "@/lib/deal-types";
import {
  cn,
  formatCurrency,
  formatDate,
  formatDateTime,
  formatListingStatus,
  formatPropertyType,
  getFullName,
  isActiveListingStatus,
} from "@/lib/deal-utils";
import { canAccessBrokerWorkspace, getDefaultRouteForUser } from "@/lib/route-access";
import { buildSearchText, normalizeSearchQuery } from "@/lib/search";
import { buildBrokerOverview } from "@/lib/broker-dashboard";
import {
  addCalendarDays,
  CALENDAR_QUICK_FILTER_OPTIONS,
  CalendarDateRange,
  CalendarQuickFilterId,
  formatCalendarDateRangeLabel,
  getCalendarDateRangeForQuickFilter,
  parseCalendarDateKey,
} from "@/lib/calendar-date";

const BrokerProfileTab = dynamic(() => import("@/components/BrokerProfileTab").then((module) => ({ default: module.BrokerProfileTab })), {
  loading: () => (
    <div className="panel p-4 sm:p-6">
      <SkeletonBlock className="h-8 w-56 rounded-xl" />
      <SkeletonBlock className="mt-4 h-4 w-full rounded-xl" />
      <SkeletonBlock className="mt-2 h-4 w-2/3 rounded-xl" />
      <div className="mt-6 grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-2">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index}>
            <SkeletonBlock className="mb-2 h-3 w-20 rounded-xl" />
            <SkeletonBlock className="h-12 w-full rounded-[12px]" />
          </div>
        ))}
      </div>
    </div>
  ),
});
const CalendarDatePicker = dynamic(() => import("@/components/CalendarDatePicker").then((module) => ({ default: module.CalendarDatePicker })));

type DashboardSectionId = "overview" | "listings" | "enquiries" | "chats" | "requirements" | "profile";
type BrokerListingFilterId = "all" | "active" | "pending" | "rejected" | "inactive";
type DateRangeFilterPresetId = CalendarQuickFilterId;
type DateRangeFilterId = DateRangeFilterPresetId | "custom";
type AppliedCalendarDateRange = {
  startDate: string;
  endDate: string;
};
type DashboardDateFilterValue = {
  id: DateRangeFilterId;
  range: AppliedCalendarDateRange | null;
};
type EnquiryStatusFilterId = "all" | LeadStatus;
type ListingFilterOption = {
  id: BrokerListingFilterId;
  label: string;
  count: number;
};
type DashboardEnquiry = BrokerDashboardData["enquiries"][number];
const DASHBOARD_SECTION_IDS: DashboardSectionId[] = ["overview", "listings", "enquiries", "chats", "requirements", "profile"];
const BROKER_LISTING_FILTER_IDS: BrokerListingFilterId[] = ["all", "active", "pending", "rejected", "inactive"];
const DATE_FILTER_OPTIONS = CALENDAR_QUICK_FILTER_OPTIONS;
const ENQUIRY_REPLY_MESSAGE_MAX_LENGTH = 180;
const ENQUIRY_REPLY_EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const createDefaultDateFilterValue = (): DashboardDateFilterValue => ({ id: "allTime", range: null });
const isDashboardSectionId = (value: string | null): value is DashboardSectionId =>
  value !== null && DASHBOARD_SECTION_IDS.includes(value as DashboardSectionId);
const isBrokerListingFilterId = (value: string | null): value is BrokerListingFilterId =>
  value !== null && BROKER_LISTING_FILTER_IDS.includes(value as BrokerListingFilterId);
const getDashboardSectionFromSearchParam = (value: string | null): DashboardSectionId =>
  isDashboardSectionId(value) ? value : "overview";
const getListingStatusFilterFromSearchParam = (value: string | null): BrokerListingFilterId =>
  isBrokerListingFilterId(value) ? value : "all";

const getInboxHref = (group?: ChatConversationSummary | null) =>
  group?.conversations[0] ? `/dashboard/chats/${group.conversations[0].conversationId}` : null;
const getBrokerListingHref = (listingId: string) => `/dashboard/listings/${listingId}`;
const getPublicListingHref = (listingId: string) => `/listings/${listingId}`;

const getChatLabel = (count: number) => `${count} broker${count === 1 ? "" : "s"}`;

const getMessageLabel = (count: number) => `${count} message${count === 1 ? "" : "s"}`;

const LISTING_FILTER_STYLES: Record<
  BrokerListingFilterId,
  {
    activePill: string;
    inactivePill: string;
    activeIcon: string;
    inactiveIcon: string;
    activeBadge: string;
    inactiveBadge: string;
  }
> = {
  all: {
    activePill: "border-[#4e7dbc] bg-[linear-gradient(180deg,#6b98d0_0%,#4e7dbc_100%)] text-white shadow-[0_14px_28px_rgba(78,125,188,0.24)]",
    inactivePill: "border-[#dfe7f4] bg-[linear-gradient(180deg,#ffffff_0%,#f4f7fc_100%)] text-[#486181] shadow-[0_10px_22px_rgba(61,84,125,0.08)] hover:border-[#cedaf0] hover:bg-[#f7faff]",
    activeIcon: "bg-white/18 text-white",
    inactiveIcon: "bg-[#edf3fb] text-[#6488b5]",
    activeBadge: "bg-white/16 text-white",
    inactiveBadge: "bg-[#eef3fb] text-[#6980a3]",
  },
  active: {
    activePill: "border-[#2f9d6b] bg-[linear-gradient(180deg,#3daa78_0%,#2f9d6b_100%)] text-white shadow-[0_14px_28px_rgba(47,157,107,0.25)]",
    inactivePill: "border-[#d9ecdf] bg-[linear-gradient(180deg,#ffffff_0%,#f4fbf7_100%)] text-[#2b714f] shadow-[0_10px_22px_rgba(51,104,76,0.08)] hover:border-[#c7e3d1] hover:bg-[#f6fdf8]",
    activeIcon: "bg-white/18 text-white",
    inactiveIcon: "bg-[#eaf7ef] text-[#4ca876]",
    activeBadge: "bg-white/16 text-white",
    inactiveBadge: "bg-[#ebf7ef] text-[#4e8b67]",
  },
  pending: {
    activePill: "border-[#e0a53b] bg-[linear-gradient(180deg,#efb64a_0%,#e0a53b_100%)] text-white shadow-[0_14px_28px_rgba(224,165,59,0.26)]",
    inactivePill: "border-[#efdfbf] bg-[linear-gradient(180deg,#ffffff_0%,#fffbf2_100%)] text-[#91651d] shadow-[0_10px_22px_rgba(145,101,29,0.08)] hover:border-[#e7d2a7] hover:bg-[#fff9ec]",
    activeIcon: "bg-white/18 text-white",
    inactiveIcon: "bg-[#fff1d6] text-[#d69425]",
    activeBadge: "bg-white/16 text-white",
    inactiveBadge: "bg-[#fff1d8] text-[#b8842c]",
  },
  rejected: {
    activePill: "border-[#d15858] bg-[linear-gradient(180deg,#de6767_0%,#d15858_100%)] text-white shadow-[0_14px_28px_rgba(209,88,88,0.24)]",
    inactivePill: "border-[#efd8d8] bg-[linear-gradient(180deg,#ffffff_0%,#fff6f6_100%)] text-[#a74d4d] shadow-[0_10px_22px_rgba(132,64,64,0.08)] hover:border-[#e7c3c3] hover:bg-[#fff8f8]",
    activeIcon: "bg-white/18 text-white",
    inactiveIcon: "bg-[#fdeaea] text-[#cb5f5f]",
    activeBadge: "bg-white/16 text-white",
    inactiveBadge: "bg-[#fdecec] text-[#b56767]",
  },
  inactive: {
    activePill: "border-[#95a1b8] bg-[linear-gradient(180deg,#a6afc3_0%,#95a1b8_100%)] text-white shadow-[0_14px_28px_rgba(97,111,138,0.22)]",
    inactivePill: "border-[#e4e8f0] bg-[linear-gradient(180deg,#ffffff_0%,#f7f9fc_100%)] text-[#667389] shadow-[0_10px_22px_rgba(75,89,111,0.08)] hover:border-[#d8deea] hover:bg-[#fafcff]",
    activeIcon: "bg-white/18 text-white",
    inactiveIcon: "bg-[#edf1f6] text-[#8a96ad]",
    activeBadge: "bg-white/16 text-white",
    inactiveBadge: "bg-[#eef2f7] text-[#7a859c]",
  },
};

function ListingFilterIcon({ filterId }: { filterId: BrokerListingFilterId }) {
  switch (filterId) {
    case "all":
      return (
        <svg viewBox="0 0 20 20" fill="none" className="h-[15px] w-[15px]" aria-hidden="true">
          <rect x="3" y="3" width="5" height="5" rx="1.1" stroke="currentColor" strokeWidth="1.8" />
          <rect x="12" y="3" width="5" height="5" rx="1.1" stroke="currentColor" strokeWidth="1.8" />
          <rect x="3" y="12" width="5" height="5" rx="1.1" stroke="currentColor" strokeWidth="1.8" />
          <rect x="12" y="12" width="5" height="5" rx="1.1" stroke="currentColor" strokeWidth="1.8" />
        </svg>
      );
    case "active":
      return (
        <svg viewBox="0 0 20 20" fill="none" className="h-[15px] w-[15px]" aria-hidden="true">
          <path d="m5.8 10.1 2.5 2.7 5.9-6.2" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case "pending":
      return (
        <svg viewBox="0 0 20 20" fill="none" className="h-[15px] w-[15px]" aria-hidden="true">
          <path d="M10 5.3v5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
          <circle cx="10" cy="13.8" r="1.05" fill="currentColor" />
        </svg>
      );
    case "rejected":
      return (
        <svg viewBox="0 0 20 20" fill="none" className="h-[15px] w-[15px]" aria-hidden="true">
          <path d="m6.2 6.2 7.6 7.6M13.8 6.2l-7.6 7.6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
        </svg>
      );
    case "inactive":
      return (
        <svg viewBox="0 0 20 20" fill="none" className="h-[15px] w-[15px]" aria-hidden="true">
          <path d="M7.2 5.8v8.4M12.8 5.8v8.4" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
        </svg>
      );
    default:
      return null;
  }
}

function ListingFilterPill({
  filter,
  active,
  onClick,
}: {
  filter: ListingFilterOption;
  active: boolean;
  onClick: () => void;
}) {
  const styles = LISTING_FILTER_STYLES[filter.id];

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "inline-flex min-h-[40px] max-w-full shrink-0 items-center gap-2 rounded-full border px-3 py-2 text-sm font-semibold tracking-[-0.01em] transition duration-200 sm:min-h-[44px] sm:px-3.5 md:min-h-[48px] md:text-[15px]",
        active ? styles.activePill : styles.inactivePill
      )}
    >
      <span
        className={cn(
          "inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full sm:h-6 sm:w-6",
          active ? styles.activeIcon : styles.inactiveIcon
        )}
      >
        <ListingFilterIcon filterId={filter.id} />
      </span>
      <span className="min-w-0 truncate">{filter.label}</span>
      <span
        className={cn(
          "inline-flex h-6 min-w-6 items-center justify-center rounded-full px-2 text-[12px] font-semibold leading-none",
          active ? styles.activeBadge : styles.inactiveBadge
        )}
      >
        {filter.count}
      </span>
    </button>
  );
}

const LISTING_STATUS_PILL_STYLES: Record<
  BrokerListingFilterId,
  {
    pill: string;
    icon: string;
    detail: string;
  }
> = {
  all: {
    pill: "border-[#cfd9eb] bg-[linear-gradient(180deg,#f6f9ff_0%,#e9f0fb_100%)] text-[#315786] shadow-[0_10px_22px_rgba(74,102,154,0.14)]",
    icon: "bg-white/75 text-[#5d81b0]",
    detail: "text-[#7b8ba3]",
  },
  active: {
    pill: "border-[#2f9d6b] bg-[linear-gradient(180deg,#3daa78_0%,#2f9d6b_100%)] text-white shadow-[0_12px_24px_rgba(47,157,107,0.2)]",
    icon: "bg-white/18 text-white",
    detail: "text-[#7b8ba3]",
  },
  pending: {
    pill: "border-[#e3c481] bg-[linear-gradient(180deg,#fff1ca_0%,#f6df9f_100%)] text-[#9b6a10] shadow-[0_12px_24px_rgba(201,156,60,0.16)]",
    icon: "bg-white/75 text-[#d39a2f]",
    detail: "text-[#8c93a4]",
  },
  rejected: {
    pill: "border-[#e8c1c1] bg-[linear-gradient(180deg,#fff1f1_0%,#f8dddd_100%)] text-[#b54b4b] shadow-[0_12px_24px_rgba(181,75,75,0.14)]",
    icon: "bg-white/75 text-[#c85d5d]",
    detail: "text-[#8c93a4]",
  },
  inactive: {
    pill: "border-[#d8deea] bg-[linear-gradient(180deg,#f6f8fc_0%,#e8edf5_100%)] text-[#677388] shadow-[0_12px_24px_rgba(100,114,139,0.12)]",
    icon: "bg-white/75 text-[#8b96ab]",
    detail: "text-[#8c93a4]",
  },
};

function getListingStatusVisualId(status: string): BrokerListingFilterId {
  if (status === "pending") return "pending";
  if (status === "rejected") return "rejected";
  if (status === "inactive" || status === "expired") return "inactive";
  return "active";
}

function ListingStatusIcon({ statusId }: { statusId: BrokerListingFilterId }) {
  switch (statusId) {
    case "pending":
      return (
        <svg viewBox="0 0 20 20" fill="none" className="h-[14px] w-[14px]" aria-hidden="true">
          <path d="M10 5.4v5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
          <circle cx="10" cy="13.8" r="1.05" fill="currentColor" />
        </svg>
      );
    case "rejected":
      return (
        <svg viewBox="0 0 20 20" fill="none" className="h-[14px] w-[14px]" aria-hidden="true">
          <path d="m6.1 6.1 7.8 7.8M13.9 6.1l-7.8 7.8" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
        </svg>
      );
    case "inactive":
      return (
        <svg viewBox="0 0 20 20" fill="none" className="h-[14px] w-[14px]" aria-hidden="true">
          <path d="M7.3 5.8v8.4M12.7 5.8v8.4" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
        </svg>
      );
    case "active":
    default:
      return (
        <svg viewBox="0 0 20 20" fill="none" className="h-[14px] w-[14px]" aria-hidden="true">
          <path d="m5.8 10.1 2.5 2.7 5.9-6.2" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
  }
}

function ListingStatusDisplay({
  status,
  detail,
}: {
  status: string;
  detail: string;
}) {
  const statusId = getListingStatusVisualId(status);
  const styles = LISTING_STATUS_PILL_STYLES[statusId];

  return (
    <div className="mt-2 xl:mt-0">
      <span
        className={cn(
          "inline-flex min-h-[34px] items-center gap-2 rounded-full border px-2 py-1 text-[14px] font-semibold tracking-[-0.01em]",
          styles.pill
        )}
      >
        <span className={cn("inline-flex h-4 w-4 items-center justify-center rounded-full", styles.icon)}>
          <ListingStatusIcon statusId={statusId} />
        </span>
        <span>{formatListingStatus(status)}</span>
      </span>
      <p className={cn("mt-2 pl-1 text-[13px]", styles.detail)}>{detail}</p>
    </div>
  );
}

function ListingStatusCompactPill({ status }: { status: string }) {
  const statusId = getListingStatusVisualId(status);
  const styles = LISTING_STATUS_PILL_STYLES[statusId];

  return (
    <span
      className={cn(
        "inline-flex min-h-[30px] items-center gap-1.5 rounded-full border px-2.5 py-1 text-[12px] font-semibold tracking-[-0.01em]",
        styles.pill
      )}
    >
      <span className={cn("inline-flex h-3.5 w-3.5 items-center justify-center rounded-full", styles.icon)}>
        <ListingStatusIcon statusId={statusId} />
      </span>
      <span>{formatListingStatus(status)}</span>
    </span>
  );
}

const LISTING_ACTION_BUTTON_BASE =
  "inline-flex min-h-[40px] max-w-full items-center justify-center rounded-full border px-3 py-2 text-center text-sm font-semibold tracking-[-0.01em] shadow-[0_8px_18px_rgba(50,62,92,0.08)] transition sm:px-4 sm:py-2 md:px-5 md:py-3 md:text-base lg:text-[14px] lg:whitespace-nowrap";
const LISTING_ACTION_BUTTON_NEUTRAL =
  "border-[#d9dfeb] bg-[linear-gradient(180deg,#ffffff_0%,#f5f7fb_100%)] text-[#32415f] hover:border-[#cdd6e5] hover:bg-[#fbfcff]";
const LISTING_ACTION_BUTTON_DANGER =
  "border-[#ecd9d6] bg-[linear-gradient(180deg,#ffffff_0%,#fdf5f4_100%)] text-[#ba5447] hover:border-[#e1c5bf] hover:bg-[#fff8f7]";
const LISTING_ACTION_BUTTON_PRIMARY =
  "border-[#d7deec] bg-[linear-gradient(180deg,#f8faff_0%,#eef2fa_100%)] text-[#334669] hover:border-[#c7d2e6] hover:bg-[#f9fbff]";
const LISTINGS_TABLE_DESKTOP_LAYOUT =
  "xl:grid-cols-[minmax(0,2.75fr)_minmax(152px,0.86fr)_minmax(248px,1.14fr)_minmax(124px,0.82fr)_minmax(360px,1.52fr)] xl:gap-x-5 xl:gap-y-6";
const BROKER_DATE_FILTER_MOBILE_MAX_WIDTH = 767;

type DashboardDateFilterMenuPosition = {
  top: number;
  left: number;
  width: number;
  maxHeight: number;
};

const DEFAULT_DATE_FILTER_MENU_POSITION: DashboardDateFilterMenuPosition = {
  top: 0,
  left: 0,
  width: 320,
  maxHeight: 420,
};

function resolveDateFilterMenuPosition(
  triggerElement: HTMLDivElement | null,
  menuElement: HTMLDivElement | null
): DashboardDateFilterMenuPosition {
  if (!triggerElement || typeof window === "undefined") {
    return DEFAULT_DATE_FILTER_MENU_POSITION;
  }

  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const isMobileViewport = viewportWidth < 640;
  const viewportPadding = isMobileViewport ? 8 : 16;
  const triggerBounds = triggerElement.getBoundingClientRect();
  const desiredMenuWidth = isMobileViewport
    ? Math.min(384, viewportWidth - viewportPadding * 2)
    : Math.min(560, viewportWidth - viewportPadding * 2);
  const measuredMenuHeight = menuElement?.offsetHeight ?? (isMobileViewport ? 520 : 560);
  const menuOffset = 8;
  const availableBelow = viewportHeight - triggerBounds.bottom - menuOffset - viewportPadding;
  const availableAbove = triggerBounds.top - menuOffset - viewportPadding;
  const openAbove = availableBelow < Math.min(measuredMenuHeight, 360) && availableAbove > availableBelow;
  const preferredAvailableHeight = openAbove ? availableAbove : availableBelow;
  const maxHeight = Math.max(180, Math.min(viewportHeight - viewportPadding * 2, preferredAvailableHeight));
  const resolvedHeight = Math.min(measuredMenuHeight, maxHeight);
  const unclampedLeft = isMobileViewport
    ? triggerBounds.left + triggerBounds.width / 2 - desiredMenuWidth / 2
    : triggerBounds.right - desiredMenuWidth;
  const left = Math.max(viewportPadding, Math.min(unclampedLeft, viewportWidth - desiredMenuWidth - viewportPadding));
  const top = openAbove
    ? Math.max(viewportPadding, triggerBounds.top - menuOffset - resolvedHeight)
    : Math.min(triggerBounds.bottom + menuOffset, viewportHeight - resolvedHeight - viewportPadding);

  return {
    top,
    left,
    width: desiredMenuWidth,
    maxHeight,
  };
}

const resolveDateFilterMenuAlignment = (element: HTMLDivElement | null): "left" | "right" => {
  if (!element || typeof window === "undefined") {
    return "left";
  }

  const triggerBounds = element.getBoundingClientRect();
  const desiredMenuWidth = Math.min(560, window.innerWidth - 24);
  const wouldOverflowRight = triggerBounds.left + desiredMenuWidth > window.innerWidth - 16;
  const wouldOverflowLeft = triggerBounds.right - desiredMenuWidth < 16;

  return wouldOverflowRight && !wouldOverflowLeft ? "right" : "left";
};

const matchesDateRange = (value: string | null | undefined, filter: DashboardDateFilterValue) => {
  if (!value) return false;

  const timestamp = new Date(value);
  if (Number.isNaN(timestamp.getTime())) {
    return false;
  }

  if (filter.id === "allTime") {
    return true;
  }

  const activeRange = filter.id === "custom" ? filter.range : getCalendarDateRangeForQuickFilter(filter.id);
  const startDate = parseCalendarDateKey(activeRange?.startDate);
  const endDate = parseCalendarDateKey(activeRange?.endDate);

  if (!startDate || !endDate) {
    return true;
  }

  const endOfRangeExclusive = addCalendarDays(endDate, 1);
  return timestamp >= startDate && timestamp < endOfRangeExclusive;
};

function getBrokerDashboardListingSearchText(listing: BrokerDashboardData["listings"][number]) {
  return buildSearchText([
    listing.title,
    listing.area?.name,
    listing.area?.city,
    listing.developer,
    formatPropertyType(listing.property_type),
    formatListingStatus(listing.status),
    listing.status,
    listing.description,
    listing.notes,
  ]);
}

function getBrokerDashboardEnquirySearchText(enquiry: BrokerDashboardData["enquiries"][number]) {
  return buildSearchText([
    enquiry.contact_name,
    enquiry.contact_email,
    enquiry.contact_phone,
    enquiry.message,
    enquiry.listing?.title,
    enquiry.listing?.property_type ? formatPropertyType(enquiry.listing.property_type) : null,
    enquiry.listing?.status,
  ]);
}

function getDefaultEnquiryReplySubject(enquiry: DashboardEnquiry | null) {
  return `Re: Your enquiry about ${enquiry?.listing?.title?.trim() || "your enquiry"}`;
}

function getEnquiryReplyEmailError(enquiry: DashboardEnquiry | null) {
  const email = enquiry?.contact_email?.trim() || "";

  if (!email) {
    return "The enquirer email is missing.";
  }

  return ENQUIRY_REPLY_EMAIL_REGEX.test(email) ? "" : "The enquirer email is invalid.";
}

function getEnquiryReplyMessageError(message: string) {
  if (!message.trim()) {
    return "Message is required.";
  }

  return message.length <= ENQUIRY_REPLY_MESSAGE_MAX_LENGTH
    ? ""
    : `Message must be ${ENQUIRY_REPLY_MESSAGE_MAX_LENGTH} characters or fewer.`;
}

function getEnquiryReplyActivityDate(reply: Pick<EnquiryReply, "sent_at" | "created_at">) {
  return reply.sent_at || reply.created_at;
}

function formatEnquiryReplyStatus(status: EnquiryReply["status"]) {
  switch (status) {
    case "pending":
      return "Pending";
    case "failed":
      return "Failed";
    case "sent":
    default:
      return "Sent";
  }
}

function getBrokerDashboardChatSearchText(group: ChatConversationSummary) {
  return buildSearchText([
    group.listing.title,
    group.listing.area?.name,
    group.listing.area?.city,
    group.listing.status,
    group.conversations.map((conversation) => [
      conversation.participant ? getFullName(conversation.participant.first_name, conversation.participant.last_name) : null,
      conversation.participant?.email,
      conversation.lastMessage?.content,
    ]),
  ]);
}

function DashboardDateFilter({
  value,
  onSelectFilter,
  ariaLabel,
}: {
  value: DashboardDateFilterValue;
  onSelectFilter: (filter: DashboardDateFilterValue) => void;
  ariaLabel: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [menuAlignment, setMenuAlignment] = useState<"left" | "right">("left");
  const [isMobileMenu, setIsMobileMenu] = useState(false);
  const [menuPosition, setMenuPosition] = useState<DashboardDateFilterMenuPosition>(DEFAULT_DATE_FILTER_MENU_POSITION);
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const selectedOption = DATE_FILTER_OPTIONS.find((option) => option.id === value.id) || DATE_FILTER_OPTIONS[0];
  const selectedLabel = value.id === "custom" ? formatCalendarDateRangeLabel(value.range) : selectedOption.label;

  const updateMenuPlacement = useCallback(() => {
    if (typeof window === "undefined") {
      return;
    }

    const shouldUseMobileMenu = window.innerWidth <= BROKER_DATE_FILTER_MOBILE_MAX_WIDTH;
    setIsMobileMenu(shouldUseMobileMenu);

    if (shouldUseMobileMenu) {
      setMenuPosition(resolveDateFilterMenuPosition(dropdownRef.current, menuRef.current));
      return;
    }

    setMenuAlignment(resolveDateFilterMenuAlignment(dropdownRef.current));
  }, []);

  useLayoutEffect(() => {
    if (!isOpen) return;

    updateMenuPlacement();
    window.addEventListener("resize", updateMenuPlacement);
    window.addEventListener("scroll", updateMenuPlacement, true);

    return () => {
      window.removeEventListener("resize", updateMenuPlacement);
      window.removeEventListener("scroll", updateMenuPlacement, true);
    };
  }, [isOpen, updateMenuPlacement]);

  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node;

      if (dropdownRef.current?.contains(target) || menuRef.current?.contains(target)) {
        return;
      }

      setIsOpen(false);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const handleQuickFilterSelect = (filterId: CalendarQuickFilterId) => {
    onSelectFilter({ id: filterId, range: null });
    setIsOpen(false);
  };

  const handleCustomRangeChange = (nextRange: CalendarDateRange) => {
    if (nextRange.startDate && nextRange.endDate) {
      onSelectFilter({
        id: "custom",
        range: {
          startDate: nextRange.startDate,
          endDate: nextRange.endDate,
        },
      });
      setIsOpen(false);
    }
  };

  const handleClearFilters = () => {
    onSelectFilter(createDefaultDateFilterValue());
    setIsOpen(false);
  };

  const handleToggleOpen = () => {
    if (!isOpen) {
      updateMenuPlacement();
    }

    setIsOpen((current) => !current);
  };

  const menuMarkup = (
    <div
      ref={menuRef}
      className={cn(
        "dashboard-date-filter__menu",
        isMobileMenu ? "dashboard-date-filter__menu--anchored" : menuAlignment === "right" ? "align-right" : "align-left"
      )}
      role="dialog"
      aria-label={ariaLabel}
      style={
        isMobileMenu
          ? {
              top: menuPosition.top,
              left: menuPosition.left,
              width: menuPosition.width,
              maxHeight: menuPosition.maxHeight,
            }
          : undefined
      }
    >
      <CalendarDatePicker
        selectionMode="range"
        selectedQuickFilterId={value.id === "custom" ? null : value.id}
        selectedRange={value.id === "custom" ? value.range : null}
        quickFilters={DATE_FILTER_OPTIONS}
        onSelectQuickFilter={handleQuickFilterSelect}
        onSelectRange={handleCustomRangeChange}
        onClearRange={handleClearFilters}
        clearActionLabel="Clear"
        ariaLabel={`${ariaLabel} custom range calendar`}
        className="border-0 bg-transparent p-0 shadow-none sm:p-0"
      />
    </div>
  );

  return (
    <div ref={dropdownRef} className="dashboard-date-filter broker-dashboard-date-filter" role="group" aria-label={ariaLabel}>
      <button
        type="button"
        onClick={handleToggleOpen}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        className={cn("dashboard-date-filter__trigger", isOpen && "is-open")}
      >
        <span className="dashboard-date-filter__icon" aria-hidden="true">
          <svg viewBox="0 0 20 20" fill="none" className="h-5 w-5">
            <path
              d="M6.667 1.667v2.5M13.333 1.667v2.5M2.917 7.083h14.166M5.833 10h1.25M9.375 10h1.25M12.917 10h1.25M5.833 13.333h1.25M9.375 13.333h1.25"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <rect x="2.917" y="4.167" width="14.166" height="12.916" rx="2.5" stroke="currentColor" strokeWidth="1.7" />
          </svg>
        </span>
        <span className="dashboard-date-filter__label">{selectedLabel}</span>
        <span className="dashboard-date-filter__chevron" aria-hidden="true">
          <svg viewBox="0 0 16 16" fill="none" className="h-4 w-4">
            <path d="m4 6 4 4 4-4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      </button>
      {isOpen ? (isMobileMenu && typeof document !== "undefined" ? createPortal(menuMarkup, document.body) : menuMarkup) : null}
    </div>
  );
}

function EnquiryReplyModal({
  enquiry,
  subject,
  message,
  messageTouched,
  submitError,
  sending,
  onClose,
  onSubjectChange,
  onMessageChange,
  onMessageBlur,
  onSend,
}: {
  enquiry: DashboardEnquiry;
  subject: string;
  message: string;
  messageTouched: boolean;
  submitError: string;
  sending: boolean;
  onClose: () => void;
  onSubjectChange: (value: string) => void;
  onMessageChange: (value: string) => void;
  onMessageBlur: () => void;
  onSend: () => Promise<void>;
}) {
  const emailError = getEnquiryReplyEmailError(enquiry);
  const messageError = getEnquiryReplyMessageError(message);
  const showMessageError = messageTouched || message.length > ENQUIRY_REPLY_MESSAGE_MAX_LENGTH;
  const sendDisabled = sending || Boolean(emailError || messageError);
  const remainingCharacters = ENQUIRY_REPLY_MESSAGE_MAX_LENGTH - message.length;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center overflow-x-hidden bg-slate-950/60 p-2 sm:items-center sm:p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !sending) {
          onClose();
        }
      }}
    >
      <form
        className="panel max-h-[calc(100dvh-1rem)] w-full max-w-xl overflow-x-hidden overflow-y-auto p-3 sm:max-h-[calc(100vh-2rem)] sm:p-6"
        onSubmit={(event) => {
          event.preventDefault();
          if (!sendDisabled) {
            void onSend();
          }
        }}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-brand-orange">Reply</p>
            <h3 className="mt-2 text-2xl font-semibold text-brand-navy">Reply to Enquiry</h3>
            <p className="mt-2 break-words text-sm leading-6 text-brand-slate">
              Replying to {enquiry.contact_name} about Modi fugiat ipsum
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="modal-close-button"
            disabled={sending}
            aria-label="Close reply modal"
          >
            <span aria-hidden="true">&times;</span>
          </button>
        </div>

        <div className="mt-6 grid gap-4">
          <div>
            <label className="label" htmlFor="enquiry-reply-email">
              Recipient Email
            </label>
            <input
              id="enquiry-reply-email"
              type="email"
              className={cn("input mt-2 break-all", emailError && "border-[#d37b72] focus:border-[#d37b72] focus:ring-[#f1d1cd]")}
              value={enquiry.contact_email || ""}
              disabled
              readOnly
              aria-invalid={emailError ? "true" : "false"}
              aria-describedby={emailError ? "enquiry-reply-email-error" : undefined}
            />
            {emailError ? (
              <p id="enquiry-reply-email-error" className="mt-2 text-sm font-semibold text-[#ba5447]">
                {emailError}
              </p>
            ) : null}
          </div>

          <div>
            <label className="label" htmlFor="enquiry-reply-subject">
              Subject
            </label>
            <input
              id="enquiry-reply-subject"
              type="text"
              className="input mt-2"
              value={subject}
              onChange={(event) => onSubjectChange(event.target.value)}
              disabled={sending}
            />
          </div>

          <div>
            <div className="flex items-center justify-between gap-3">
              <label className="label" htmlFor="enquiry-reply-message">
                Your Message
              </label>
              <span
                className={cn(
                  "text-xs font-semibold",
                  remainingCharacters < 0 ? "text-[#ba5447]" : remainingCharacters <= 20 ? "text-[#9b6a17]" : "text-[#6c778d]"
                )}
              >
                {message.length}/{ENQUIRY_REPLY_MESSAGE_MAX_LENGTH}
              </span>
            </div>
            <textarea
              id="enquiry-reply-message"
              className={cn("input mt-2 min-h-[128px]", showMessageError && messageError && "border-[#d37b72] focus:border-[#d37b72] focus:ring-[#f1d1cd]")}
              value={message}
              onChange={(event) => onMessageChange(event.target.value)}
              onBlur={onMessageBlur}
              disabled={sending}
              required
              maxLength={ENQUIRY_REPLY_MESSAGE_MAX_LENGTH}
              aria-invalid={showMessageError && messageError ? "true" : "false"}
              aria-describedby={showMessageError && messageError ? "enquiry-reply-message-error" : undefined}
            />
            {showMessageError && messageError ? (
              <p id="enquiry-reply-message-error" className="mt-2 text-sm font-semibold text-[#ba5447]">
                {messageError}
              </p>
            ) : null}
          </div>
        </div>

        {submitError ? (
          <div className="mt-5 rounded-[12px] border border-[#f0c6bf] bg-[#fff7f5] px-4 py-3 text-sm font-semibold text-[#a7473b]">
            {submitError}
          </div>
        ) : null}

        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button type="button" className="btn-secondary w-full sm:w-auto" onClick={onClose} disabled={sending}>
            Cancel
          </button>
          <button type="submit" className="btn-primary w-full sm:w-auto" disabled={sendDisabled} aria-disabled={sendDisabled}>
            {sending ? "Sending..." : "Send Reply"}
          </button>
        </div>
      </form>
    </div>
  );
}

function EnquiryReplyStatusBadge({ status }: { status: EnquiryReply["status"] }) {
  return (
    <span
      className={cn(
        "inline-flex min-h-[28px] items-center rounded-full border px-3 py-1 text-xs font-semibold",
        status === "sent" && "border-[#c8e4d2] bg-[#eef9f2] text-[#2f7a53]",
        status === "pending" && "border-[#ead38f] bg-[#fff7dc] text-[#9b6a10]",
        status === "failed" && "border-[#efc6c0] bg-[#fff3f1] text-[#b34e43]"
      )}
    >
      {formatEnquiryReplyStatus(status)}
    </span>
  );
}

function EnquiryReplyHistoryModal({
  enquiry,
  onClose,
}: {
  enquiry: DashboardEnquiry;
  onClose: () => void;
}) {
  const orderedReplies = [...(enquiry.replies || [])].sort((left, right) =>
    getEnquiryReplyActivityDate(right).localeCompare(getEnquiryReplyActivityDate(left))
  );

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center overflow-x-hidden bg-slate-950/60 p-2 sm:items-center sm:p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="panel max-h-[calc(100dvh-1rem)] w-full max-w-3xl overflow-x-hidden overflow-y-auto p-3 sm:max-h-[calc(100vh-2rem)] sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-brand-orange">Reply History</p>
            <h3 className="mt-2 break-words text-2xl font-semibold text-brand-navy">{enquiry.contact_name}</h3>
            <p className="mt-2 break-all text-sm leading-6 text-brand-slate">{enquiry.contact_email}</p>
          </div>
          <button type="button" onClick={onClose} className="modal-close-button" aria-label="Close reply history">
            <span aria-hidden="true">&times;</span>
          </button>
        </div>

        <div className="mt-6 space-y-3">
          {orderedReplies.length ? (
            orderedReplies.map((reply) => (
              <div key={reply.id} className="rounded-[12px] border border-[#e5e9f2] bg-[linear-gradient(180deg,#ffffff_0%,#f8faff_100%)] p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <p className="break-words text-base font-semibold tracking-[-0.02em] text-[#1f2940]">{reply.subject}</p>
                    <p className="mt-1 break-all text-sm text-[#5c6780]">To {reply.enquirer_email}</p>
                  </div>
                  <div className="flex shrink-0 flex-wrap items-center gap-2 sm:justify-end">
                    <EnquiryReplyStatusBadge status={reply.status} />
                    <span className="rounded-full border border-[#e2e7f0] bg-white px-3 py-1 text-xs font-semibold text-[#5c6780]">
                      {formatDateTime(getEnquiryReplyActivityDate(reply))}
                    </span>
                  </div>
                </div>
                <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-7 text-[#384255]">{reply.message}</p>
                {reply.failure_reason ? (
                  <div className="mt-3 rounded-[10px] border border-[#f0c6bf] bg-[#fff7f5] px-3 py-2 text-sm font-semibold text-[#a7473b]">
                    {reply.failure_reason}
                  </div>
                ) : null}
              </div>
            ))
          ) : (
            <EmptyState title="No replies yet" description="Reply history will appear here after you send an email response." />
          )}
        </div>
      </div>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <AppShell hidePageHeader mainClassName="!max-w-none !px-0 !pt-0">
      <div className="shell py-8">
        <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="panel p-4 sm:p-6">
              <SkeletonBlock className="h-3 w-24 rounded-xl" />
              <SkeletonBlock className="mt-4 h-10 w-20 rounded-xl" />
              <SkeletonBlock className="mt-4 h-4 w-full rounded-xl" />
            </div>
          ))}
        </div>

        <div className="mt-8 panel overflow-x-hidden p-4 sm:p-6">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:flex xl:flex-wrap xl:gap-3">
              {Array.from({ length: 6 }).map((_, index) => (
                <SkeletonBlock key={index} className="h-10 w-full rounded-full xl:h-11 xl:w-28 xl:shrink-0" />
              ))}
          </div>

          <div className="mt-8 grid gap-6 xl:grid-cols-[1.4fr_0.9fr]">
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="subtle-panel p-5">
                  <SkeletonBlock className="h-6 w-2/3 rounded-xl" />
                  <SkeletonBlock className="mt-4 h-4 w-full rounded-xl" />
                  <SkeletonBlock className="mt-2 h-4 w-5/6 rounded-xl" />
                </div>
              ))}
            </div>
            <div className="subtle-panel p-5">
              <SkeletonBlock className="h-6 w-1/2 rounded-xl" />
              <SkeletonBlock className="mt-4 h-40 w-full rounded-[12px]" />
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<LoadingScreen label="Loading broker dashboard..." />}>
      <DashboardPageContent />
    </Suspense>
  );
}

function DashboardPageContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const resolvedPathname = pathname || "/dashboard";
  const resolvedSearchParams = useMemo(() => searchParams ?? new URLSearchParams(), [searchParams]);
  const requestedSection = resolvedSearchParams.get("section");
  const requestedListingStatus = resolvedSearchParams.get("listingStatus");
  const { enqueueSnackbar } = useSnackbar();
  const { user, loading, setUser } = useAuth();
  const [activeSection, setActiveSection] = useState<DashboardSectionId>(() => getDashboardSectionFromSearchParam(requestedSection));
  const [listingStatusFilter, setListingStatusFilter] = useState<BrokerListingFilterId>(() =>
    getListingStatusFilterFromSearchParam(requestedListingStatus)
  );
  const [listingSearchQuery, setListingSearchQuery] = useState("");
  const [listingDateFilter, setListingDateFilter] = useState<DashboardDateFilterValue>(() => createDefaultDateFilterValue());
  const [enquirySearchQuery, setEnquirySearchQuery] = useState("");
  const [enquiryStatusFilter] = useState<EnquiryStatusFilterId>("all");
  const [enquiryDateFilter, setEnquiryDateFilter] = useState<DashboardDateFilterValue>(() => createDefaultDateFilterValue());
  const [expandedEnquiryIds, setExpandedEnquiryIds] = useState<string[]>([]);
  const [chatSearchQuery, setChatSearchQuery] = useState("");
  const [chatDateFilter, setChatDateFilter] = useState<DashboardDateFilterValue>(() => createDefaultDateFilterValue());
  const [expandedChatGroupIds, setExpandedChatGroupIds] = useState<string[]>([]);
  const [pendingListingDelete, setPendingListingDelete] = useState<{ id: string; title: string } | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [replyEnquiry, setReplyEnquiry] = useState<DashboardEnquiry | null>(null);
  const [replyHistoryEnquiry, setReplyHistoryEnquiry] = useState<DashboardEnquiry | null>(null);
  const [replySubject, setReplySubject] = useState("");
  const [replyMessage, setReplyMessage] = useState("");
  const [replyMessageTouched, setReplyMessageTouched] = useState(false);
  const [replySubmitError, setReplySubmitError] = useState("");
  const [replySending, setReplySending] = useState(false);
  const replySendingRef = useRef(false);
  const debouncedListingSearchQuery = useDebouncedValue(listingSearchQuery, 250);
  const debouncedEnquirySearchQuery = useDebouncedValue(enquirySearchQuery, 250);
  const debouncedChatSearchQuery = useDebouncedValue(chatSearchQuery, 250);
  const normalizedListingSearchQuery = normalizeSearchQuery(debouncedListingSearchQuery);
  const normalizedEnquirySearchQuery = normalizeSearchQuery(debouncedEnquirySearchQuery);
  const normalizedChatSearchQuery = normalizeSearchQuery(debouncedChatSearchQuery);
  const normalizedListingCountSearchQuery = normalizeSearchQuery(listingSearchQuery);
  const canViewDashboard = !!user && canAccessBrokerWorkspace(user);
  const sessionUserId = user?.uid ?? null;
  const previousSessionUserIdRef = useRef<string | null>(sessionUserId);
  const fetchDashboard = useCallback(() => apiFetch<BrokerDashboardData>("/api/dashboard"), []);
  const {
    data: dashboard,
    loading: pageLoading,
    refresh: refreshDashboard,
    setData: setDashboard,
  } = useSessionQuery<BrokerDashboardData>(getApiCacheKey("/api/dashboard"), fetchDashboard, {
    enabled: !loading && canViewDashboard,
    ttlMs: 45_000,
    onError: (error) => enqueueSnackbar(error instanceof Error ? error.message : "Failed to load dashboard.", { variant: "error" }),
  });

  const loadDashboard = useCallback(async () => {
    const payload = await refreshDashboard();
    if (!payload) {
      throw new Error("Failed to load dashboard.");
    }

    return payload;
  }, [refreshDashboard]);

  const handleSelectSection = useCallback(
    (section: DashboardSectionId) => {
      setActiveSection(section);

      const nextParams = new URLSearchParams(resolvedSearchParams.toString());
      nextParams.set("section", section);
      if (section !== "listings") {
        nextParams.delete("listingStatus");
      }

      const currentQuery = resolvedSearchParams.toString();
      const nextQuery = nextParams.toString();
      const currentHref = currentQuery ? `${resolvedPathname}?${currentQuery}` : resolvedPathname;
      const nextHref = nextQuery ? `${resolvedPathname}?${nextQuery}` : resolvedPathname;

      if (nextHref !== currentHref) {
        router.replace(nextHref, { scroll: false });
      }
    },
    [resolvedPathname, resolvedSearchParams, router]
  );

  const handleSelectListingStatusFilter = (filter: BrokerListingFilterId) => {
    setListingStatusFilter(filter);

    const nextParams = new URLSearchParams(resolvedSearchParams.toString());
    nextParams.set("section", "listings");

    if (filter === "all") {
      nextParams.delete("listingStatus");
    } else {
      nextParams.set("listingStatus", filter);
    }

    const currentQuery = resolvedSearchParams.toString();
    const nextQuery = nextParams.toString();
    const currentHref = currentQuery ? `${resolvedPathname}?${currentQuery}` : resolvedPathname;
    const nextHref = nextQuery ? `${resolvedPathname}?${nextQuery}` : resolvedPathname;

    if (nextHref !== currentHref) {
      router.replace(nextHref, { scroll: false });
    }
  };

  const {
    markNotificationRead: handleMarkNotificationRead,
    notifications: priorityNotifications,
    openNotificationPrimaryAction: handleOpenNotificationPrimaryAction,
  } = useBrokerNotificationFeed({
    dashboard,
    onSelectSection: handleSelectSection,
    setDashboard,
  });

  const handleProfileSaved = (nextProfile: Pick<BrokerDashboardData, "profile" | "brokerProfile" | "agency">) => {
    setDashboard((current) =>
      current
        ? {
            ...current,
            profile: nextProfile.profile,
            brokerProfile: nextProfile.brokerProfile,
            agency: nextProfile.agency,
          }
        : current
    );

    if (!user || !nextProfile.profile) {
      return;
    }

    const nextDisplayName =
      [nextProfile.profile.first_name, nextProfile.profile.last_name].filter(Boolean).join(" ") || user.displayName || user.email;

    setUser({
      ...user,
      displayName: nextDisplayName,
      photoURL: nextProfile.brokerProfile?.profile_photo ?? user.photoURL,
      firstName: nextProfile.profile.first_name,
      lastName: nextProfile.profile.last_name,
      platformUser: nextProfile.profile,
      brokerProfile: nextProfile.brokerProfile,
      agency: nextProfile.agency,
    });
  };

  useEffect(() => {
    if (!loading && !canViewDashboard) {
      router.replace(getDefaultRouteForUser(user));
    }
  }, [canViewDashboard, loading, router, user]);

  const deleteListing = async () => {
    if (!pendingListingDelete) return;

    setActionLoading(true);
    try {
      await apiFetch(`/api/listings/${pendingListingDelete.id}`, { method: "DELETE" });
      invalidateListingCaches(pendingListingDelete.id);
      await loadDashboard();
      setPendingListingDelete(null);
      enqueueSnackbar("Listing deleted.", { variant: "success" });
    } catch (error) {
      enqueueSnackbar(error instanceof Error ? error.message : "Failed to delete listing.", { variant: "error" });
    } finally {
      setActionLoading(false);
    }
  };

  const toggleEnquiryExpansion = (enquiryId: string) => {
    setExpandedEnquiryIds((current) =>
      current.includes(enquiryId) ? current.filter((id) => id !== enquiryId) : [...current, enquiryId]
    );
  };

  const openEnquiryReplyModal = (enquiry: DashboardEnquiry) => {
    setReplyHistoryEnquiry(null);
    setReplyEnquiry(enquiry);
    setReplySubject(getDefaultEnquiryReplySubject(enquiry));
    setReplyMessage("");
    setReplyMessageTouched(false);
    setReplySubmitError("");
  };

  const openEnquiryReplyHistoryModal = (enquiry: DashboardEnquiry) => {
    if (!enquiry.replies?.length) {
      return;
    }

    if (replySending) {
      return;
    }

    setReplyEnquiry(null);
    setReplyHistoryEnquiry(enquiry);
  };

  const closeEnquiryReplyModal = () => {
    if (replySending) {
      return;
    }

    setReplyEnquiry(null);
    setReplySubject("");
    setReplyMessage("");
    setReplyMessageTouched(false);
    setReplySubmitError("");
  };

  const sendEnquiryReply = async () => {
    if (!replyEnquiry || replySendingRef.current) {
      return;
    }

    const emailError = getEnquiryReplyEmailError(replyEnquiry);
    const messageError = getEnquiryReplyMessageError(replyMessage);

    if (emailError || messageError) {
      setReplyMessageTouched(true);
      return;
    }

    const subject = replySubject.trim() || getDefaultEnquiryReplySubject(replyEnquiry);
    setReplySubject(subject);
    replySendingRef.current = true;
    setReplySending(true);
    setReplySubmitError("");

    try {
      const response = await apiFetch<{ success: boolean; reply: EnquiryReply }>(`/api/leads/${replyEnquiry.id}/reply`, {
        method: "POST",
        body: JSON.stringify({
          subject,
          message: replyMessage.trim(),
        }),
      });
      setDashboard((current) => {
        if (!current || !response.reply) {
          return current;
        }

        return {
          ...current,
          enquiries: current.enquiries.map((enquiry) => {
            if (enquiry.id !== replyEnquiry.id) {
              return enquiry;
            }

            const existingReplies = enquiry.replies || [];
            const nextReplies = [response.reply, ...existingReplies.filter((reply) => reply.id !== response.reply.id)];

            return {
              ...enquiry,
              replies: nextReplies,
              reply_count: nextReplies.length,
              latest_reply_at: getEnquiryReplyActivityDate(response.reply),
              latest_reply_status: response.reply.status,
            };
          }),
        };
      });
      enqueueSnackbar("Reply email sent.", { variant: "success" });
      setReplyEnquiry(null);
      setReplySubject("");
      setReplyMessage("");
      setReplyMessageTouched(false);
      setReplySubmitError("");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to send reply email.";
      setReplySubmitError(message);
      enqueueSnackbar(message, { variant: "error" });
    } finally {
      replySendingRef.current = false;
      setReplySending(false);
    }
  };

  const toggleChatExpansion = (groupId: string) => {
    setExpandedChatGroupIds((current) =>
      current.includes(groupId) ? current.filter((id) => id !== groupId) : [...current, groupId]
    );
  };

  const chatGroups = useMemo(() => dashboard?.chats ?? [], [dashboard?.chats]);
  const chatGroupMap = useMemo(() => new Map(chatGroups.map((group) => [group.listing.id, group])), [chatGroups]);
  const overview = useMemo(() => (dashboard ? buildBrokerOverview(dashboard) : null), [dashboard]);
  const allListings = useMemo(() => dashboard?.listings ?? [], [dashboard?.listings]);
  const allEnquiries = useMemo(() => dashboard?.enquiries ?? [], [dashboard?.enquiries]);
  const listingCountSourceListings = useMemo(
    () =>
      allListings.filter((listing) => {
        if (!matchesDateRange(listing.updated_at, listingDateFilter)) {
          return false;
        }

        return normalizedListingCountSearchQuery
          ? getBrokerDashboardListingSearchText(listing).includes(normalizedListingCountSearchQuery)
          : true;
      }),
    [allListings, listingDateFilter, normalizedListingCountSearchQuery]
  );
  const listingFilters = useMemo<ListingFilterOption[]>(
    () => [
      { id: "all" as const, label: "All", count: listingCountSourceListings.length },
      {
        id: "active" as const,
        label: "Active",
        count: listingCountSourceListings.filter((listing) => listing.status === "active" || listing.status === "approved").length,
      },
      { id: "pending" as const, label: "Pending", count: listingCountSourceListings.filter((listing) => listing.status === "pending").length },
      { id: "rejected" as const, label: "Rejected", count: listingCountSourceListings.filter((listing) => listing.status === "rejected").length },
      { id: "inactive" as const, label: "Inactive", count: listingCountSourceListings.filter((listing) => listing.status === "inactive").length },
    ],
    [listingCountSourceListings]
  );
  const filteredListings = useMemo(() => {
    if (!allListings.length) return [];

    return allListings.filter((listing) => {
      const matchesStatus =
        listingStatusFilter === "all"
          ? true
          : listingStatusFilter === "active"
            ? listing.status === "active" || listing.status === "approved"
            : listing.status === listingStatusFilter;

      if (!matchesStatus) {
        return false;
      }

      if (!matchesDateRange(listing.updated_at, listingDateFilter)) {
        return false;
      }

      return normalizedListingSearchQuery ? getBrokerDashboardListingSearchText(listing).includes(normalizedListingSearchQuery) : true;
    });
  }, [allListings, listingDateFilter, listingStatusFilter, normalizedListingSearchQuery]);
  const filteredEnquiries = useMemo(() => {
    if (!allEnquiries.length) return [];

    return allEnquiries.filter((enquiry) => {
      const matchesStatus = enquiryStatusFilter === "all" ? true : enquiry.lead_status === enquiryStatusFilter;

      if (!matchesStatus) {
        return false;
      }

      if (!matchesDateRange(enquiry.created_at, enquiryDateFilter)) {
        return false;
      }

      return normalizedEnquirySearchQuery ? getBrokerDashboardEnquirySearchText(enquiry).includes(normalizedEnquirySearchQuery) : true;
    });
  }, [allEnquiries, enquiryDateFilter, enquiryStatusFilter, normalizedEnquirySearchQuery]);
  const filteredChatGroups = useMemo(() => {
    if (!chatGroups.length) return [];

    return chatGroups.filter((group) => {
      const latestMessageAt = group.conversations[0]?.lastMessage?.created_at;
      if (!matchesDateRange(latestMessageAt, chatDateFilter)) {
        return false;
      }

      return normalizedChatSearchQuery ? getBrokerDashboardChatSearchText(group).includes(normalizedChatSearchQuery) : true;
    });
  }, [chatDateFilter, chatGroups, normalizedChatSearchQuery]);
  const {
    paginatedItems: paginatedListings,
    pagination: listingsPagination,
    pageSizeOptions: listingPageSizeOptions,
    setPage: setListingsPage,
    setPageSize: setListingsPageSize,
  } = useClientPagination(filteredListings, {
    resetKey: `${activeSection}|${listingStatusFilter}|${normalizedListingSearchQuery}|${listingDateFilter.id}|${listingDateFilter.range?.startDate || ""}|${listingDateFilter.range?.endDate || ""}|${filteredListings.length}`,
  });
  const {
    paginatedItems: paginatedEnquiries,
    pagination: enquiriesPagination,
    pageSizeOptions: enquiryPageSizeOptions,
    setPage: setEnquiriesPage,
    setPageSize: setEnquiriesPageSize,
  } = useClientPagination(filteredEnquiries, {
    resetKey: `${activeSection}|${normalizedEnquirySearchQuery}|${enquiryDateFilter.id}|${enquiryDateFilter.range?.startDate || ""}|${enquiryDateFilter.range?.endDate || ""}|${filteredEnquiries.length}`,
  });
  const {
    paginatedItems: paginatedChatGroups,
    pagination: chatsPagination,
    pageSizeOptions: chatPageSizeOptions,
    setPage: setChatsPage,
    setPageSize: setChatsPageSize,
  } = useClientPagination(filteredChatGroups, {
    resetKey: `${activeSection}|${normalizedChatSearchQuery}|${chatDateFilter.id}|${chatDateFilter.range?.startDate || ""}|${chatDateFilter.range?.endDate || ""}|${filteredChatGroups.length}`,
  });

  useEffect(() => {
    setActiveSection(getDashboardSectionFromSearchParam(requestedSection));
  }, [requestedSection]);

  useEffect(() => {
    setListingStatusFilter(getListingStatusFilterFromSearchParam(requestedListingStatus));
  }, [requestedListingStatus]);

  useEffect(() => {
    if (previousSessionUserIdRef.current === sessionUserId) {
      return;
    }

    previousSessionUserIdRef.current = sessionUserId;
    setActiveSection(getDashboardSectionFromSearchParam(requestedSection));
    setListingStatusFilter(getListingStatusFilterFromSearchParam(requestedListingStatus));
    setListingSearchQuery("");
    setListingDateFilter(createDefaultDateFilterValue());
    setEnquirySearchQuery("");
    setEnquiryDateFilter(createDefaultDateFilterValue());
    setExpandedEnquiryIds([]);
    setChatSearchQuery("");
    setChatDateFilter(createDefaultDateFilterValue());
    setExpandedChatGroupIds([]);
    setPendingListingDelete(null);
    setActionLoading(false);
    setReplyEnquiry(null);
    setReplyHistoryEnquiry(null);
    setReplySubject("");
    setReplyMessage("");
    setReplyMessageTouched(false);
    setReplySubmitError("");
    replySendingRef.current = false;
    setReplySending(false);
  }, [requestedListingStatus, requestedSection, sessionUserId]);

  if (loading || !user) {
    return <LoadingScreen label="Loading broker dashboard..." />;
  }

  if (pageLoading && !dashboard) {
    return <DashboardSkeleton />;
  }

  if (!dashboard || !overview) {
    return <DashboardSkeleton />;
  }

  return (
    <AppShell hidePageHeader mainClassName="!max-w-none !px-0 !pt-0">
      <BrokerDashboardReference
        dashboard={dashboard}
        overview={overview}
        activeSection={activeSection}
        priorityNotifications={priorityNotifications}
        onSelectSection={handleSelectSection}
        onMarkNotificationRead={handleMarkNotificationRead}
        onOpenNotificationPrimaryAction={handleOpenNotificationPrimaryAction}
      >
        {activeSection === "listings" ? (
          <section className="mt-6 panel p-4 sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.3em] text-brand-orange">My listings</p>
                <h2 className="mt-2 text-2xl font-bold text-brand-navy">Manage inventory with direct edit, detail view, and inbox access</h2>
              </div>
              <div className="flex flex-wrap">
                <Link href="/post-listing" className="btn-primary text-white rounded-[8px]">
                  Create Listing
                </Link>
              </div>
            </div>

            <div className="mt-6 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div className="-mx-4 overflow-x-auto px-4 pb-1 sm:-mx-6 sm:px-6 xl:mx-0 xl:px-0">
                <div className="flex min-w-max gap-3 xl:min-w-0 xl:flex-wrap">
                  {listingFilters.map((filter) => (
                    <ListingFilterPill
                      key={filter.id}
                      filter={filter}
                      active={listingStatusFilter === filter.id}
                      onClick={() => handleSelectListingStatusFilter(filter.id)}
                    />
                  ))}
                </div>
              </div>

              <div className="flex w-full flex-col gap-3 sm:flex-row xl:w-auto xl:justify-end">
                <SearchField
                  ariaLabel="Search listings"
                  value={listingSearchQuery}
                  onChange={setListingSearchQuery}
                  placeholder="Search title, area, developer, status"
                  className="w-full sm:min-w-[18rem] xl:w-[22rem]"
                />
                <DashboardDateFilter
                  value={listingDateFilter}
                  onSelectFilter={setListingDateFilter}
                  ariaLabel="Filter listings by updated date"
                />
              </div>
            </div>

            <div className="mt-6">
              {filteredListings.length ? (
                <>
                  <div className="table-surface w-full rounded-[12px] border-[#ebeef5] shadow-[0_22px_48px_rgba(28,40,68,0.08)]">
                    <div className={cn("hidden xl:grid xl:items-center xl:bg-[#fbfcff] xl:px-8 xl:py-5", LISTINGS_TABLE_DESKTOP_LAYOUT)}>
                      <p className="text-[12px] font-semibold uppercase tracking-[0.24em] text-[#7d879c]">Listing</p>
                      <p className="text-[12px] font-semibold uppercase tracking-[0.24em] text-[#7d879c]">Price</p>
                      <p className="text-[12px] font-semibold uppercase tracking-[0.24em] text-[#7d879c]">Status</p>
                      <p className="text-[12px] font-semibold uppercase tracking-[0.24em] text-[#7d879c]">Chats</p>
                      <p className="text-right text-[12px] font-semibold uppercase tracking-[0.24em] text-[#7d879c] xl:justify-self-end">Action</p>
                    </div>

                    <div className="divide-y divide-[#edf1f6]">
                      {paginatedListings.map((listing) => {
                      const listingChatGroup = chatGroupMap.get(listing.id);
                      const inboxHref = getInboxHref(listingChatGroup);
                      const chatCount = listingChatGroup?.conversations.length || 0;
                      const statusDetail =
                        listing.status === "pending"
                          ? "Awaiting review"
                          : listing.status === "rejected"
                            ? "Needs changes before relisting"
                            : listing.status === "inactive" || listing.status === "expired"
                              ? "Not visible to buyers"
                              : isActiveListingStatus(listing.status)
                                ? listing.is_visible
                                ? "Live on marketplace"
                                : "Active but hidden"
                              : "Status update pending";
                      const listingRowActions: ResponsiveRowAction[] = [
                        ...(inboxHref ? [{ label: "Inbox", href: inboxHref, tone: "primary" as const }] : []),
                        { label: "View", href: getBrokerListingHref(listing.id) },
                        { label: "Edit", href: `/post-listing?id=${listing.id}` },
                        {
                          label: "Delete",
                          tone: "danger",
                          onClick: () => setPendingListingDelete({ id: listing.id, title: listing.title }),
                        },
                      ];

                      return (
                        <div
                          key={listing.id}
                          className="w-full min-w-0 bg-white px-3 py-3 transition hover:bg-[#fcfdff] sm:px-4 sm:py-4 xl:px-8 xl:py-6"
                        >
                          <div className={cn("grid grid-cols-[minmax(0,1fr)_auto] items-start gap-2 sm:gap-3 xl:items-center xl:gap-y-6", LISTINGS_TABLE_DESKTOP_LAYOUT)}>
                            <div className="min-w-0">
                              <p className="text-[12px] font-semibold uppercase tracking-[0.2em] text-[#8c95a9] xl:hidden">Listing</p>
                              <div className="mt-1 flex items-start gap-3 xl:mt-0 xl:gap-4">
                                <div className="min-w-0 max-w-full">
                                  <p className="line-clamp-2 max-w-full break-words text-base font-semibold tracking-[-0.02em] text-[#1f2940] sm:text-[17px] xl:block xl:truncate xl:text-[19px]">{listing.title}</p>
                                  <p className="mt-0.5 break-words text-[13px] leading-5 text-[#5c6780] xl:mt-1 xl:text-[14px]">
                                    {listing.area?.name || "Area pending"} | {formatPropertyType(listing.property_type)}
                                  </p>
                                  <p className="mt-0.5 text-[12px] leading-5 text-[#8a93a6] xl:mt-1 xl:text-[13px]">Updated {formatDate(listing.updated_at)}</p>
                                  <div className="mt-2 flex min-w-0 flex-wrap items-center gap-1.5 xl:hidden">
                                    <span className="inline-flex min-h-[30px] items-center rounded-full border border-[#e2e7f0] bg-[#f8fafc] px-2.5 py-1 text-[12px] font-semibold text-[#1f2940]">
                                      {formatCurrency(listing.price)}
                                    </span>
                                    <ListingStatusCompactPill status={listing.status} />
                                    <span className="inline-flex min-h-[30px] items-center rounded-full border border-[#e2e7f0] bg-white px-2.5 py-1 text-[12px] font-semibold text-[#5c6780]">
                                      {chatCount ? getChatLabel(chatCount) : "No chats"}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>

                            <div className="hidden min-w-0 xl:col-span-1 xl:block xl:min-w-0">
                              <p className="text-[12px] font-semibold uppercase tracking-[0.2em] text-[#8c95a9] xl:hidden">Price</p>
                              <div className="mt-1 xl:mt-0">
                                <p className="break-words text-[17px] font-semibold tracking-[-0.03em] text-[#1f2940] xl:whitespace-nowrap xl:text-[21px]">
                                  {formatCurrency(listing.price)}
                                </p>
                              </div>
                            </div>

                            <div className="hidden min-w-0 xl:col-span-1 xl:block xl:min-w-0">
                              <p className="text-[12px] font-semibold uppercase tracking-[0.2em] text-[#8c95a9] xl:hidden">Status</p>
                              <ListingStatusDisplay status={listing.status} detail={statusDetail} />
                            </div>

                            <div className="hidden min-w-0 xl:col-span-1 xl:block xl:min-w-0">
                              <p className="text-[12px] font-semibold uppercase tracking-[0.2em] text-[#8c95a9] xl:hidden">Chats</p>
                              <div className="mt-1 xl:mt-0">
                                <p className="text-[18px] font-semibold tracking-[-0.03em] text-[#1f2940] xl:text-[21px]">{chatCount}</p>
                                <p className="mt-0.5 text-[12px] leading-5 text-[#8a93a6] xl:mt-1 xl:text-[13px]">
                                  {chatCount ? getChatLabel(chatCount) : "No conversations yet"}
                                </p>
                              </div>
                            </div>

                            <div className="col-start-2 row-start-1 w-auto justify-self-end xl:col-start-auto xl:row-start-auto xl:w-full xl:min-w-0 xl:justify-self-end">
                              <div className="flex justify-end xl:hidden">
                                <ResponsiveRowActionsMenu actions={listingRowActions} label={`Open actions for ${listing.title}`} />
                              </div>
                              <div className="hidden xl:mt-0 xl:flex xl:w-auto xl:flex-nowrap xl:justify-end xl:gap-2">
                                {inboxHref ? (
                                  <Link
                                    href={inboxHref}
                                    className={cn(LISTING_ACTION_BUTTON_BASE, LISTING_ACTION_BUTTON_PRIMARY)}
                                  >
                                    Inbox
                                  </Link>
                                ) : null}
                                <Link
                                  href={getBrokerListingHref(listing.id)}
                                  className={cn(LISTING_ACTION_BUTTON_BASE, LISTING_ACTION_BUTTON_NEUTRAL)}
                                >
                                  View
                                </Link>
                                <Link
                                  href={`/post-listing?id=${listing.id}`}
                                  className={cn(LISTING_ACTION_BUTTON_BASE, LISTING_ACTION_BUTTON_NEUTRAL)}
                                >
                                  Edit
                                </Link>
                                <button
                                  type="button"
                                  className={cn(LISTING_ACTION_BUTTON_BASE, LISTING_ACTION_BUTTON_DANGER)}
                                  onClick={() => setPendingListingDelete({ id: listing.id, title: listing.title })}
                                >
                                  Delete
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                      })}
                    </div>
                  </div>

                  <ListPaginationControls
                    pagination={listingsPagination}
                    pageSizeOptions={listingPageSizeOptions}
                    itemLabel="listings"
                    onPageChange={setListingsPage}
                    onPageSizeChange={setListingsPageSize}
                  />
                </>
              ) : (
                <EmptyState
                  title={normalizedListingSearchQuery ? "No results found" : dashboard.listings.length ? "No listings match this filter" : "No listings yet"}
                  description={
                    normalizedListingSearchQuery
                      ? "No listings match your search with the current status and date filters."
                      : dashboard.listings.length
                        ? "Try another status or date range to review the rest of your inventory."
                        : "Create your first listing once you have credits available."
                  }
                />
              )}
            </div>
          </section>
        ) : null}

        {activeSection === "enquiries" ? (
          <section className="mt-6 panel p-4 sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.3em] text-brand-orange">Public enquiries</p>
                <h2 className="mt-2 text-2xl font-bold text-brand-navy">Review incoming leads</h2>
              </div>
              <div className="flex w-full flex-col gap-3 sm:flex-row xl:w-auto xl:justify-end">
                <SearchField
                  ariaLabel="Search enquiries"
                  value={enquirySearchQuery}
                  onChange={setEnquirySearchQuery}
                  placeholder="Search name, email, listing, message"
                  className="w-full sm:min-w-[18rem] xl:w-[22rem]"
                />
                <DashboardDateFilter
                  value={enquiryDateFilter}
                  onSelectFilter={setEnquiryDateFilter}
                  ariaLabel="Filter enquiries by received date"
                />
              </div>
            </div>

            <div className="mt-6">
              {filteredEnquiries.length ? (
                <>
                  <div className="table-surface w-full rounded-[12px] border-[#ebeef5] shadow-[0_22px_48px_rgba(28,40,68,0.08)]">
                    <div className="hidden xl:grid xl:grid-cols-[1.45fr_1.05fr_1.5fr_0.95fr_1.15fr] xl:items-center xl:gap-6 xl:bg-[#fbfcff] xl:px-8 xl:py-5">
                      <p className="text-[12px] font-semibold uppercase tracking-[0.24em] text-[#7d879c]">Enquiry</p>
                      <p className="text-[12px] font-semibold uppercase tracking-[0.24em] text-[#7d879c]">Listing</p>
                      <p className="text-[12px] font-semibold uppercase tracking-[0.24em] text-[#7d879c]">Message</p>
                      <p className="text-[12px] font-semibold uppercase tracking-[0.24em] text-[#7d879c]">Received</p>
                      <p className="text-right text-[12px] font-semibold uppercase tracking-[0.24em] text-[#7d879c]">Action</p>
                    </div>

                    <div className="divide-y divide-[#edf1f6]">
                      {paginatedEnquiries.map((enquiry) => {
                        const isExpanded = expandedEnquiryIds.includes(enquiry.id);
                        const enquiryReplies = enquiry.replies || [];
                        const listingHref = enquiry.listing?.id && !enquiry.listing.deleted_at ? getBrokerListingHref(enquiry.listing.id) : null;
                        const enquiryRowActions: ResponsiveRowAction[] = [
                          {
                            label: "View Reply",
                            onClick: () => openEnquiryReplyHistoryModal(enquiry),
                            disabled: !enquiryReplies.length,
                          },
                          listingHref
                            ? { label: "View Listing", href: listingHref }
                            : { label: "View Listing", disabled: true },
                        ];

                        return (
                          <div
                            key={enquiry.id}
                            className="w-full min-w-0 bg-white px-3 py-3 transition hover:bg-[#fcfdff] sm:px-4 sm:py-4 xl:px-8 xl:py-6"
                          >
                            <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-2 sm:gap-3 xl:grid-cols-[1.45fr_1.05fr_1.5fr_0.95fr_1.15fr] xl:items-start xl:gap-6">
                              <div className="min-w-0">
                                <p className="text-[12px] font-semibold uppercase tracking-[0.2em] text-[#8c95a9] xl:hidden">Enquiry</p>
                                <div className="mt-1 min-w-0 xl:mt-0">
                                  <p className="line-clamp-2 break-words text-base font-semibold tracking-[-0.02em] text-[#1f2940] sm:text-[17px] xl:block xl:truncate xl:text-[19px]">{enquiry.contact_name}</p>
                                  <p className="mt-0.5 break-all text-[13px] leading-5 text-[#5c6780] xl:mt-1 xl:truncate xl:text-[14px]">
                                    {enquiry.contact_email}
                                    {enquiry.contact_phone ? ` | ${enquiry.contact_phone}` : ""}
                                  </p>
                                  <div className="mt-2 min-w-0 space-y-1.5 xl:hidden">
                                    <p className="line-clamp-2 break-words text-[13px] font-semibold leading-5 text-[#27314a]">
                                      {enquiry.listing?.title || "General enquiry"}
                                    </p>
                                    <p className={cn("break-words text-[12px] leading-5 text-[#7d8794]", !isExpanded && "line-clamp-2")}>
                                      {enquiry.message || "No message provided."}
                                    </p>
                                    {enquiry.message && enquiry.message.length > 140 ? (
                                      <button
                                        type="button"
                                        onClick={() => toggleEnquiryExpansion(enquiry.id)}
                                        className="text-[12px] font-semibold text-[#24314c] transition hover:text-brand-orange"
                                      >
                                        {isExpanded ? "See less" : "See more"}
                                      </button>
                                    ) : null}
                                    <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                                      {enquiry.lead_status === "new" ? (
                                        <span className="inline-flex min-h-[26px] items-center rounded-full bg-[#f6ead7] px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#b77d1a]">
                                          New
                                        </span>
                                      ) : null}
                                      <span className="inline-flex min-h-[26px] items-center rounded-full border border-[#e2e7f0] bg-white px-2 py-0.5 text-[11px] font-semibold text-[#5c6780]">
                                        {formatDateTime(enquiry.created_at)}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              </div>

                            <div className="hidden min-w-0 xl:col-span-1 xl:block xl:min-w-0">
                              <p className="text-[12px] font-semibold uppercase tracking-[0.2em] text-[#8c95a9] xl:hidden">Listing</p>
                              <div className="mt-1 xl:mt-0">
                                <p className="line-clamp-2 break-words text-base font-semibold tracking-[-0.02em] text-[#1f2940] xl:block xl:truncate xl:text-[18px]">
                                  {enquiry.listing?.title || "General enquiry"}
                                </p>
                                <p className="mt-0.5 break-words text-[13px] leading-5 text-[#5c6780] xl:mt-1">
                                  {enquiry.listing?.property_type ? formatPropertyType(enquiry.listing.property_type) : "Listing not attached"} | {enquiry.listing?.price ? formatCurrency(enquiry.listing.price) : "No asking price shared"}
                                </p>
                              </div>
                            </div>

                            <div className="hidden min-w-0 xl:col-span-1 xl:block xl:min-w-0">
                              <p className="text-[12px] font-semibold uppercase tracking-[0.2em] text-[#8c95a9] xl:hidden">Message</p>
                              <div className="mt-1 xl:mt-0">
                                <p className={cn("break-words text-[13px] leading-5 text-[#8a93a6] xl:leading-6", !isExpanded && "line-clamp-2")}>
                                  {enquiry.message || "No message provided."}
                                </p>
                                {enquiry.message && enquiry.message.length > 140 ? (
                                  <button
                                    type="button"
                                    onClick={() => toggleEnquiryExpansion(enquiry.id)}
                                    className="mt-2 text-[13px] font-semibold text-[#24314c] transition hover:text-brand-orange"
                                  >
                                    {isExpanded ? "See less" : "See more"}
                                  </button>
                                ) : null}
                              </div>
                            </div>

                            <div className="hidden min-w-0 xl:col-span-1 xl:block xl:min-w-0">
                              <p className="text-[12px] font-semibold uppercase tracking-[0.2em] text-[#8c95a9] xl:hidden">Received</p>
                              <div className="mt-1 xl:mt-0">
                                <p className="break-words text-[14px] font-semibold tracking-[-0.02em] text-[#1f2940] xl:text-[16px]">{formatDateTime(enquiry.created_at)}</p>
                              </div>
                            </div>

                            <div className="col-start-2 row-start-1 w-auto justify-self-end xl:col-start-auto xl:row-start-auto xl:w-full">
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  type="button"
                                  className="inline-flex min-h-[40px] items-center justify-center rounded-full border border-[#20345b] bg-[linear-gradient(180deg,#2b4573_0%,#20345b_100%)] px-3 text-[13px] font-semibold text-white shadow-[0_10px_22px_rgba(31,47,82,0.18)] transition hover:brightness-105 sm:px-4 sm:text-[14px] xl:min-h-[44px]"
                                  onClick={() => openEnquiryReplyModal(enquiry)}
                                >
                                  Reply
                                </button>
                                <ResponsiveRowActionsMenu
                                  actions={enquiryRowActions}
                                  label={`Open actions for enquiry from ${enquiry.contact_name}`}
                                  menuGroup="broker-dashboard-enquiries"
                                />
                              </div>
                            </div>
                          </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <ListPaginationControls
                    pagination={enquiriesPagination}
                    pageSizeOptions={enquiryPageSizeOptions}
                    itemLabel="enquiries"
                    onPageChange={setEnquiriesPage}
                    onPageSizeChange={setEnquiriesPageSize}
                  />
                </>
              ) : (
                <EmptyState
                  title={normalizedEnquirySearchQuery ? "No results found" : allEnquiries.length ? "No enquiries match this filter" : "No enquiries yet"}
                  description={
                    normalizedEnquirySearchQuery
                      ? "No enquiries match your search with the current date filter."
                      : allEnquiries.length
                        ? "Try another date range to review the rest of your incoming leads."
                        : "Public listing enquiries will appear here."
                  }
                />
              )}
            </div>
          </section>
        ) : null}

        {activeSection === "chats" ? (
          <section className="mt-6 panel p-4 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.3em] text-brand-orange">Listing chats</p>
                <h2 className="mt-2 text-2xl font-bold text-brand-navy">Open listing inboxes directly from a conversation list</h2>
              </div>

              <div className="flex w-full flex-col gap-3 sm:flex-row xl:w-auto">

                <SearchField
                  ariaLabel="Search chat listings"
                  value={chatSearchQuery}
                  onChange={setChatSearchQuery}
                  placeholder="Search listing, broker, latest message"
                  className="w-full sm:min-w-[18rem] xl:w-[22rem]"
                />

                <DashboardDateFilter
                  value={chatDateFilter}
                  onSelectFilter={setChatDateFilter}
                  ariaLabel="Filter chats by latest message date"
                />
              </div>
            </div>

            <div className="mt-6">
              {filteredChatGroups.length ? (
                <>
                  <div className="table-surface w-full rounded-[12px] border-[#ebeef5] shadow-[0_22px_48px_rgba(28,40,68,0.08)]">
                    <div className="hidden xl:grid xl:grid-cols-[1.45fr_1.05fr_1.5fr_0.95fr_1.15fr] xl:items-center xl:gap-6 xl:bg-[#fbfcff] xl:px-8 xl:py-5">
                      <p className="text-[12px] font-semibold uppercase tracking-[0.24em] text-[#7d879c]">Listing</p>
                      <p className="text-[12px] font-semibold uppercase tracking-[0.24em] text-[#7d879c]">Broker</p>
                      <p className="text-[12px] font-semibold uppercase tracking-[0.24em] text-[#7d879c]">Latest Message</p>
                      <p className="text-[12px] font-semibold uppercase tracking-[0.24em] text-[#7d879c]">Received</p>
                      <p className="text-right text-[12px] font-semibold uppercase tracking-[0.24em] text-[#7d879c]">Action</p>
                    </div>

                    <div className="divide-y divide-[#edf1f6]">
                      {paginatedChatGroups.map((group) => {
                      const inboxHref = getInboxHref(group);
                      const latestConversation = group.conversations[0];
                      const latestMessage = latestConversation?.lastMessage;
                      const totalMessages = group.conversations.reduce((sum, conversation) => sum + conversation.messageCount, 0);
                      const canViewListing = !group.listing.deleted_at && (!!group.listing.isOwner || (group.listing.is_visible && isActiveListingStatus(group.listing.status)));
                      const listingHref = group.listing.isOwner ? getBrokerListingHref(group.listing.id) : getPublicListingHref(group.listing.id);
                      const latestParticipant = latestConversation?.participant
                        ? getFullName(latestConversation.participant.first_name, latestConversation.participant.last_name)
                        : "Broker";
                      const unreadThreadCount = group.conversations.filter((conversation) => conversation.hasUnread).length;
                      const hasUnreadMessages = unreadThreadCount > 0;
                      const isExpanded = expandedChatGroupIds.includes(group.listing.id);
                      const chatRowActions: ResponsiveRowAction[] = [
                        ...(inboxHref ? [{ label: "Open Inbox", href: inboxHref, tone: "primary" as const }] : []),
                        canViewListing ? { label: "View Listing", href: listingHref } : { label: "View Listing", disabled: true },
                      ];

                      return (
                        <div
                          key={group.listing.id}
                          className={cn(
                            "relative w-full min-w-0 bg-white px-3 py-3 transition hover:bg-[#fcfdff] sm:px-4 sm:py-4 xl:px-8 xl:py-6",
                            hasUnreadMessages && "bg-[#fbfffd] shadow-[inset_3px_0_0_#22c55e] hover:bg-[#f7fffb]"
                          )}
                        >
                          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-2 sm:gap-3 xl:grid-cols-[1.45fr_1.05fr_1.5fr_0.95fr_1.15fr] xl:items-start xl:gap-6">
                            <div className="min-w-0">
                              <p className="text-[12px] font-semibold uppercase tracking-[0.2em] text-[#8c95a9] xl:hidden">Listing</p>
                              <div className="mt-1 xl:mt-0">
                                <p className="line-clamp-2 break-words text-base font-semibold tracking-[-0.02em] text-[#1f2940] sm:text-[17px] xl:block xl:truncate xl:text-[19px]">{group.listing.title}</p>
                                <p className="mt-0.5 break-words text-[13px] leading-5 text-[#5c6780] xl:mt-1 xl:text-[14px]">
                                  {group.listing.area?.name || "Area pending"} | {formatListingStatus(group.listing.status)}
                                </p>
                                <div className="mt-2 min-w-0 space-y-1.5 xl:hidden">
                                  <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                                    <span className={cn("line-clamp-1 min-w-0 text-[13px] font-semibold", hasUnreadMessages ? "text-[#122d1f]" : "text-[#27314a]")}>
                                      {latestParticipant}
                                    </span>
                                    {hasUnreadMessages ? (
                                      <span className="inline-flex min-h-[22px] shrink-0 items-center gap-1 rounded-full border border-[#9fe7b7] bg-[#dffbea] px-2 py-0.5 text-[11px] font-bold text-[#178847] shadow-[0_8px_16px_rgba(34,197,94,0.12)]">
                                        <span className="h-1.5 w-1.5 rounded-full bg-[#22c55e]" aria-hidden="true" />
                                        {unreadThreadCount}
                                      </span>
                                    ) : null}
                                  </div>
                                  <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                                    <span className="inline-flex min-h-[22px] shrink-0 items-center rounded-full border border-[#dfe7f0] bg-white px-2 py-0.5 text-[11px] font-semibold text-[#4f6280]">
                                      {getChatLabel(group.conversations.length)}
                                    </span>
                                    <span className={cn(
                                      "inline-flex min-h-[22px] shrink-0 items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold",
                                      hasUnreadMessages ? "border-[#b8edc8] bg-[#ecfff3] text-[#168344]" : "border-[#e2e7f0] bg-white text-[#5c6780]"
                                    )}>
                                      {getMessageLabel(totalMessages)}
                                    </span>
                                  </div>
                                  <p className={cn("break-words text-[12px] leading-5", hasUnreadMessages ? "font-semibold text-[#344234]" : "text-[#7d8794]", !isExpanded && "line-clamp-2")}>
                                    {latestMessage?.content || "No messages yet."}
                                  </p>
                                  {latestMessage?.content && latestMessage.content.length > 140 ? (
                                    <button
                                      type="button"
                                      onClick={() => toggleChatExpansion(group.listing.id)}
                                      className="text-[12px] font-semibold text-[#24314c] transition hover:text-brand-orange"
                                    >
                                      {isExpanded ? "See less" : "See more"}
                                    </button>
                                  ) : null}
                                  <div className="flex min-w-0 flex-wrap items-center gap-1.5 text-[11px] font-semibold text-[#8a93a6]">
                                    <span className="inline-flex min-h-[24px] items-center rounded-full border border-[#e2e7f0] bg-white px-2 py-0.5">
                                      {latestMessage?.created_at ? formatDateTime(latestMessage.created_at) : "No activity yet"}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>

                            <div className="hidden min-w-0 xl:col-span-1 xl:block xl:min-w-0">
                              <p className="text-[12px] font-semibold uppercase tracking-[0.2em] text-[#8c95a9] xl:hidden">Broker</p>
                              <div className="mt-1 xl:mt-0">
                                <div className="flex min-w-0 items-center gap-2">
                                  <p className={cn("line-clamp-2 min-w-0 break-words text-base font-semibold tracking-[-0.02em] xl:block xl:truncate xl:text-[18px]", hasUnreadMessages ? "text-[#122d1f]" : "text-[#1f2940]")}>
                                    {latestParticipant}
                                  </p>
                                  {hasUnreadMessages ? (
                                    <span className="inline-flex h-[22px] min-w-[34px] items-center justify-center gap-[4px] rounded-[6px] border border-[#8BE6AD] bg-[#73E7A2] px-[6px] text-[13px] font-semibold leading-none text-[#16804B] shadow-[0_1px_2px_rgba(34,197,94,0.18)]">
                                      <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        className="h-[17px] w-[17px] shrink-0"
                                        aria-hidden="true"
                                      >
                                        <path
                                          d="M20 11.5C20 15.1 16.42 18 12 18C10.72 18 9.5 17.76 8.43 17.32L4 19L5.3 15.58C4.48 14.55 4 13.32 4 11.5C4 7.9 7.58 5 12 5C16.42 5 20 7.9 20 11.5Z"
                                          stroke="#16804B"
                                          strokeWidth="2"
                                          strokeLinecap="round"
                                          strokeLinejoin="round"
                                        />
                                      </svg>

                                      <span className="translate-y-[0.5px]">{unreadThreadCount}</span>
                                    </span>
                                  ) : null}
                                </div>
                                <div className="mt-2 flex min-w-0 flex-wrap items-center gap-1.5">
                                  <span className="inline-flex min-h-[22px] shrink-0 items-center rounded-full border border-[#dfe7f0] bg-white px-2 py-0.5 text-[11px] font-semibold text-[#4f6280]">
                                    {getChatLabel(group.conversations.length)}
                                  </span>
                                  <span className={cn(
                                    "inline-flex min-h-[22px] shrink-0 items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold",
                                    hasUnreadMessages ? "border-[#b8edc8] bg-[#ecfff3] text-[#168344]" : "border-[#e2e7f0] bg-white text-[#5c6780]"
                                  )}>
                                    {getMessageLabel(totalMessages)}
                                  </span>
                                </div>
                              </div>
                            </div>

                            <div className="hidden min-w-0 xl:col-span-1 xl:block xl:min-w-0">
                              <p className="text-[12px] font-semibold uppercase tracking-[0.2em] text-[#8c95a9] xl:hidden">Message</p>
                              <div className="mt-1 xl:mt-0">
                                <p className={cn("break-words text-[13px] leading-5 xl:leading-6", hasUnreadMessages ? "font-semibold text-[#3a493a]" : "text-[#8a93a6]", !isExpanded && "line-clamp-2")}>
                                  {latestMessage?.content || "No messages yet."}
                                </p>
                                {latestMessage?.content && latestMessage.content.length > 140 ? (
                                  <button
                                    type="button"
                                    onClick={() => toggleChatExpansion(group.listing.id)}
                                    className="mt-2 text-[13px] font-semibold text-[#24314c] transition hover:text-brand-orange"
                                  >
                                    {isExpanded ? "See less" : "See more"}
                                  </button>
                                ) : null}
                              </div>
                            </div>

                            <div className="hidden min-w-0 xl:col-span-1 xl:block xl:min-w-0">
                              <p className="text-[12px] font-semibold uppercase tracking-[0.2em] text-[#8c95a9] xl:hidden">Received</p>
                              <div className="mt-1 xl:mt-0">
                                <p className="break-words text-[14px] font-semibold tracking-[-0.02em] text-[#1f2940] xl:text-[16px]">
                                  {latestMessage?.created_at ? formatDateTime(latestMessage.created_at) : "No activity yet"}
                                </p>
                              </div>
                            </div>

                            <div className="col-start-2 row-start-1 w-auto justify-self-end xl:col-start-auto xl:row-start-auto xl:w-full">
                              <div className="flex justify-end xl:hidden">
                                <ResponsiveRowActionsMenu actions={chatRowActions} label={`Open actions for ${group.listing.title}`} />
                              </div>
                              <div className="hidden xl:mt-0 xl:flex xl:w-full xl:flex-wrap xl:justify-end xl:gap-2">
                                {inboxHref ? (
                                  <Link
                                    href={inboxHref}
                                    className="inline-flex min-h-[44px] items-center justify-center rounded-full border border-[#20345b] bg-[linear-gradient(180deg,#2b4573_0%,#20345b_100%)] px-4 text-[14px] font-semibold text-white shadow-[0_10px_22px_rgba(31,47,82,0.18)] transition hover:brightness-105"
                                  >
                                    Inbox
                                  </Link>
                                ) : null}
                                {canViewListing ? (
                                  <Link
                                    href={listingHref}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex min-h-[44px] items-center justify-center rounded-full border border-[#e2e7f0] bg-white px-4 text-[14px] font-semibold text-[#24314c] shadow-[0_8px_16px_rgba(31,47,82,0.06)] transition hover:border-[#d2d9e7] hover:bg-[#fbfcff]"
                                  >
                                    View Listing
                                  </Link>
                                ) : (
                                  <button
                                    type="button"
                                    className="inline-flex min-h-[44px] cursor-not-allowed items-center justify-center rounded-full border border-[#e2e7f0] bg-white px-4 text-[14px] font-semibold text-[#98a1b5] shadow-[0_8px_16px_rgba(31,47,82,0.04)]"
                                    disabled
                                    aria-disabled="true"
                                    title="Listing unavailable"
                                  >
                                    View Listing
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                      })}
                    </div>
                  </div>

                  <ListPaginationControls
                    pagination={chatsPagination}
                    pageSizeOptions={chatPageSizeOptions}
                    itemLabel="chat groups"
                    onPageChange={setChatsPage}
                    onPageSizeChange={setChatsPageSize}
                  />
                </>
              ) : (
                <EmptyState
                  title={normalizedChatSearchQuery ? "No results found" : chatGroups.length ? "No chats match this filter" : "No chats yet"}
                  description={
                    normalizedChatSearchQuery
                      ? "No chat listings match your search with the current date filter."
                      : chatGroups.length
                        ? "Try another date range to review the rest of your listing conversations."
                        : "Listing conversations will appear here when brokers start messaging."
                  }
                />
              )}
            </div>
          </section>
        ) : null}

        {activeSection === "requirements" ? (
          <BrokerRequirementsWorkspace
            chatGroups={dashboard.chats}
            requirements={dashboard.requirements}
            onRefresh={loadDashboard}
          />
        ) : null}

        {activeSection === "profile" ? <BrokerProfileTab dashboard={dashboard} onProfileSaved={handleProfileSaved} /> : null}
      </BrokerDashboardReference>

      {pendingListingDelete ? (
        <div className="fixed inset-0 z-[100] flex items-end justify-center overflow-x-hidden bg-slate-950/60 p-2 sm:items-center sm:p-4">
          <div className="panel max-h-[calc(100dvh-1rem)] w-full max-w-lg overflow-x-hidden overflow-y-auto p-3 sm:max-h-[calc(100vh-2rem)] sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.3em] text-brand-orange">Confirm Listing Action</p>
                <h3 className="mt-2 text-2xl font-semibold text-brand-navy">Delete Listing</h3>
                <p className="mt-2 text-sm leading-6 text-brand-slate">
                  Are you sure you want to delete &quot;{pendingListingDelete.title}&quot;? This action cannot be undone.
                </p>
              </div>
              <button
                type="button"
                onClick={() => (!actionLoading ? setPendingListingDelete(null) : null)}
                className="modal-close-button"
                disabled={actionLoading}
                aria-label="Close confirmation"
              >
                <span aria-hidden="true">&times;</span>
              </button>
            </div>

            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button type="button" className="btn-secondary w-full sm:w-auto" onClick={() => setPendingListingDelete(null)} disabled={actionLoading}>
                Cancel
              </button>
              <button type="button" className="btn-primary w-full sm:w-auto" onClick={deleteListing} disabled={actionLoading}>
                {actionLoading ? "Confirming..." : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {replyEnquiry ? (
        <EnquiryReplyModal
          enquiry={replyEnquiry}
          subject={replySubject}
          message={replyMessage}
          messageTouched={replyMessageTouched}
          submitError={replySubmitError}
          sending={replySending}
          onClose={closeEnquiryReplyModal}
          onSubjectChange={setReplySubject}
          onMessageChange={(value) => {
            setReplyMessage(value);
            if (replySubmitError) {
              setReplySubmitError("");
            }
          }}
          onMessageBlur={() => setReplyMessageTouched(true)}
          onSend={sendEnquiryReply}
        />
      ) : null}

      {replyHistoryEnquiry ? (
        <EnquiryReplyHistoryModal
          enquiry={replyHistoryEnquiry}
          onClose={() => setReplyHistoryEnquiry(null)}
        />
      ) : null}
    </AppShell>
  );
}
