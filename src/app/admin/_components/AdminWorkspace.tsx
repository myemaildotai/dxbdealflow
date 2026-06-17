"use client";

import { Suspense, useCallback, useEffect, useMemo, useState, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useSnackbar } from "notistack";
import {
  AdminDashboardDateFilter,
  createAdminDashboardDateFilterValue,
  getAdminDashboardDateFilterBounds,
  type AdminDashboardDateFilterValue,
} from "@/app/admin/_components/AdminDashboardDateFilter";
import {
  AdminActivityCard,
  resolveAdminActivityLog,
  type AdminActivityListingSummary,
  type AdminActivityRequirementSummary,
  type AdminActivityUserSummary,
} from "@/app/admin/_components/AdminActivityFeed";
import { AdminChatWorkspace } from "@/app/admin/_components/AdminChatWorkspace";
import { AdminEnquiriesWorkspace } from "@/app/admin/_components/AdminEnquiriesWorkspace";
import {
  ADMIN_TABLE_ACTION_BUTTON_BASE,
  ADMIN_TABLE_ACTION_BUTTON_NEUTRAL,
  ADMIN_TABLE_ACTION_BUTTON_PRIMARY,
  ADMIN_TABLE_BODY_TEXT_CLASS,
  ADMIN_TABLE_HEADER_CELL_CLASS,
  ADMIN_TABLE_HEADER_CLASS,
  ADMIN_TABLE_META_TEXT_CLASS,
  ADMIN_TABLE_MOBILE_LABEL_CLASS,
  ADMIN_TABLE_ROW_CLASS,
  ADMIN_TABLE_ROW_GROUP_CLASS,
  ADMIN_TABLE_SURFACE_CLASS,
  ADMIN_TABLE_TITLE_CLASS,
  ADMIN_TABLE_VALUE_CLASS,
  AdminBlankState,
  AdminSectionCard,
  AdminStatusBadge,
  AdminSubTabPill,
} from "@/app/admin/_components/AdminPanelUi";
import { AdminPriorityQueue } from "@/app/admin/_components/AdminPriorityQueue";
import { AdminRequirementsWorkspace } from "@/app/admin/_components/AdminRequirementsWorkspace";
import { useAuth } from "@/auth/useAuth";
import { AppShell } from "@/components/AppShell";
import { BrokerAvatar } from "@/components/BrokerAvatar";
import { ListPaginationControls } from "@/components/ListPaginationControls";
import { LoadingScreen } from "@/components/LoadingScreen";
import { SearchField } from "@/components/SearchField";
import { SkeletonBlock } from "@/components/SkeletonBlock";
import { useAdminPriorityNotifications } from "@/hooks/useAdminPriorityNotifications";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { useSessionQuery } from "@/hooks/useSessionQuery";
import { createAdminListingDetailHref } from "@/lib/admin-navigation";
import { getAdminTabFromPathname, getAdminTabHref, type AdminTabId } from "@/lib/admin-routes";
import { apiFetch, getApiCacheKey } from "@/lib/deal-api";
import {
  type AdminActivityResponse,
  type AdminBrokerListCounts,
  type AdminBrokerListItem,
  type AdminChatGroup,
  type AdminChatConversationCursor,
  type AdminChatPage,
  type AdminComingSoonListItem,
  type AdminEnquiryListCounts,
  type AdminEnquiryListItem,
  type AdminListingListCounts,
  type AdminListingListItem,
  type AdminOverview,
  type AdminPaginatedResponse,
  type AdminRequirementListCounts,
  type AdminRequirementListItem,
  type ComingSoonModeState,
  type MaintenanceModeState,
} from "@/lib/deal-types";
import {
  cn,
  formatCurrency,
  formatDate,
  formatDateTime,
  formatListingDisplayStatus,
  formatPropertyType,
  formatUserStatus,
  getFullName,
} from "@/lib/deal-utils";
import { buildPaginationMeta, PAGE_SIZE_OPTIONS } from "@/lib/pagination";
import { setPublicSiteModeState } from "@/lib/public-site-modes";
import { getDefaultRouteForUser, isAdmin } from "@/lib/route-access";
import { normalizeSearchQuery } from "@/lib/search";

type BrokerFilterId = "all" | "approved" | "pending" | "rejected" | "deactivated";
type ListingFilterId = "all" | "pending" | "approved" | "rejected" | "inactive" | "deleted";
type RequirementFilterId = "all" | "active" | "inactive" | "deleted";
type EnquiryFilterId = "all" | "unreplied" | "replied" | "failed";
type ActivityFilterId = "all" | "listings" | "brokers" | "credits" | "requirements" | "system";
type ComingSoonListCounts = {
  all: number;
};

const ACTIVITY_PAGE_SIZE = 10;
const ADMIN_CHAT_PAGE_SIZE = 20;
const ADMIN_TAB_PAGE_SIZE = PAGE_SIZE_OPTIONS[0];
const BROKERS_TABLE_DESKTOP_LAYOUT =
  "xl:grid-cols-[minmax(0,2.9fr)_minmax(140px,1fr)_minmax(220px,1.1fr)_minmax(128px,0.72fr)_minmax(136px,0.82fr)] xl:gap-x-2 xl:gap-y-6";
const LEADS_TABLE_DESKTOP_LAYOUT =
  "xl:grid-cols-[minmax(0,1.45fr)_minmax(0,1.15fr)_minmax(0,1fr)_minmax(0,0.75fr)] xl:gap-4";
const EMPTY_ACTIVITY_CATEGORY_COUNTS: AdminActivityResponse["categoryCounts"] = {
  all: 0,
  listings: 0,
  brokers: 0,
  credits: 0,
  requirements: 0,
  system: 0,
};

function buildActivityRequestPath({
  category,
  endDate,
  page,
  pageSize,
  search,
  startDate,
}: {
  category: ActivityFilterId;
  endDate?: string | null;
  page: number;
  pageSize: number;
  search?: string;
  startDate?: string | null;
}) {
  const params = new URLSearchParams({
    page: String(page),
    pageSize: String(pageSize),
    category,
  });

  if (startDate) {
    params.set("startDate", startDate);
  }

  if (endDate) {
    params.set("endDate", endDate);
  }

  if (search) {
    params.set("search", search);
  }

  return `/api/admin/activity?${params.toString()}`;
}

function buildAdminChatsRequestPath({
  cursor,
  endDate,
  limit,
  startDate,
}: {
  cursor?: AdminChatConversationCursor | null;
  endDate?: string | null;
  limit: number;
  startDate?: string | null;
}) {
  const params = new URLSearchParams({
    limit: String(limit),
  });

  if (cursor) {
    params.set("cursor", JSON.stringify(cursor));
  }

  if (startDate) {
    params.set("startDate", startDate);
  }

  if (endDate) {
    params.set("endDate", endDate);
  }

  return `/api/admin/chats?${params.toString()}`;
}

function buildAdminListRequestPath({
  endpoint,
  endDate,
  page,
  pageSize,
  search,
  startDate,
  status,
}: {
  endpoint: string;
  endDate?: string | null;
  page: number;
  pageSize: number;
  search?: string;
  startDate?: string | null;
  status?: string;
}) {
  const params = new URLSearchParams({
    page: String(page),
    pageSize: String(pageSize),
  });

  if (status && status !== "all") {
    params.set("status", status);
  }

  if (search) {
    params.set("search", search);
  }

  if (startDate) {
    params.set("startDate", startDate);
  }

  if (endDate) {
    params.set("endDate", endDate);
  }

  return `${endpoint}?${params.toString()}`;
}

function mergeAdminChatGroups(currentGroups: AdminChatGroup[], incomingGroups: AdminChatGroup[]) {
  const groupMap = new Map<string, AdminChatGroup>();

  currentGroups.forEach((group) => {
    groupMap.set(group.listing.id, {
      ...group,
      conversations: [...group.conversations],
    });
  });

  incomingGroups.forEach((incomingGroup) => {
    const group = groupMap.get(incomingGroup.listing.id) || {
      ...incomingGroup,
      conversations: [],
    };

    group.listing = incomingGroup.listing;
    incomingGroup.conversations.forEach((conversation) => {
      const existingIndex = group.conversations.findIndex((entry) => entry.conversationId === conversation.conversationId);

      if (existingIndex >= 0) {
        group.conversations[existingIndex] = conversation;
      } else {
        group.conversations.push(conversation);
      }
    });

    group.conversations = group.conversations.sort((left, right) => (right.lastMessageAt || "").localeCompare(left.lastMessageAt || ""));
    groupMap.set(incomingGroup.listing.id, group);
  });

  return Array.from(groupMap.values()).sort((left, right) => {
    const leftTime = getChatGroupLastMessageAt(left) || "";
    const rightTime = getChatGroupLastMessageAt(right) || "";
    return rightTime.localeCompare(leftTime);
  });
}

function getComingSoonLeadName(lead: AdminComingSoonListItem) {
  return [lead.first_name, lead.last_name].filter(Boolean).join(" ").trim() || "Lead";
}

function formatLeadOptionalValue(value: string | null | undefined) {
  return value?.trim() || "Not provided";
}

function escapeCsvCell(value: string | number | null | undefined) {
  const text = value === null || value === undefined ? "" : String(value);
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function buildCsvContent(rows: Array<Array<string | number | null | undefined>>) {
  return rows.map((row) => row.map(escapeCsvCell).join(",")).join("\r\n");
}

function downloadCsv(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function getChatGroupLastMessageAt(chatGroup: AdminChatGroup) {
  return chatGroup.conversations.reduce<string | null>((latestValue, conversation) => {
    if (!latestValue || conversation.lastMessageAt > latestValue) {
      return conversation.lastMessageAt;
    }

    return latestValue;
  }, null);
}

function AdminGlyph({
  name,
  className,
}: {
  name: "brokers" | "listings" | "chats" | "leads" | "activity" | "shield" | "queue" | "spark" | "arrow";
  className?: string;
}) {
  const classes = cn("h-5 w-5", className);

  switch (name) {
    case "brokers":
      return (
        <svg viewBox="0 0 24 24" fill="none" className={classes} aria-hidden="true">
          <circle cx="9" cy="9" r="3.25" stroke="currentColor" strokeWidth="1.8" />
          <circle cx="17" cy="10" r="2.5" stroke="currentColor" strokeWidth="1.8" />
          <path d="M4.5 18a4.5 4.5 0 0 1 9 0M14 18a3.5 3.5 0 0 1 6 0" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      );
    case "listings":
      return (
        <svg viewBox="0 0 24 24" fill="none" className={classes} aria-hidden="true">
          <rect x="4.5" y="5" width="11" height="14" rx="2.6" stroke="currentColor" strokeWidth="1.8" />
          <path d="M8 9h4M8 13h4M18 9v8M14 13h8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      );
    case "chats":
      return (
        <svg viewBox="0 0 24 24" fill="none" className={classes} aria-hidden="true">
          <path
            d="M7 18.5a6.5 6.5 0 1 1 5.5-10h4a4 4 0 0 1 0 8H13l-4.5 2Z"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );
    case "leads":
      return (
        <svg viewBox="0 0 24 24" fill="none" className={classes} aria-hidden="true">
          <circle cx="8.2" cy="7.8" r="2.8" stroke="currentColor" strokeWidth="1.8" />
          <path d="M4 17.4a4.2 4.2 0 0 1 8.4 0M15 7h5M15 12h5M15 17h3.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      );
    case "activity":
      return (
        <svg viewBox="0 0 24 24" fill="none" className={classes} aria-hidden="true">
          <path d="M4 12h3l2.2-4 3.6 8 2.4-5H20" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case "shield":
      return (
        <svg viewBox="0 0 24 24" fill="none" className={classes} aria-hidden="true">
          <path
            d="M12 3.5 18.5 6v5.4c0 4-2.4 7.6-6.5 9.1-4.1-1.5-6.5-5.1-6.5-9.1V6L12 3.5Z"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinejoin="round"
          />
          <path d="M9.75 11.75 11.3 13.3l3.3-3.6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case "queue":
      return (
        <svg viewBox="0 0 24 24" fill="none" className={classes} aria-hidden="true">
          <path
            d="M8 4h8v3a4 4 0 0 1-8 0V4ZM9 19h6M12 15v4M6 6H4a2 2 0 0 0 2 2M18 6h2a2 2 0 0 1-2 2"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );
    case "spark":
      return (
        <svg viewBox="0 0 24 24" fill="none" className={classes} aria-hidden="true">
          <path d="M13 3 6 14h5l-1 7 8-12h-5l0-6Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
        </svg>
      );
    case "arrow":
      return (
        <svg viewBox="0 0 24 24" fill="none" className={classes} aria-hidden="true">
          <path d="m9 6 6 6-6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    default:
      return null;
  }
}

function AdminMetricCard({
  icon,
  title,
  value,
  helper,
  accent,
  onClick,
}: {
  icon: "brokers" | "listings" | "chats" | "spark";
  title: string;
  value: number;
  helper: string;
  accent: string;
  onClick?: () => void;
}) {
  const cardClassName = cn(
    "relative isolate min-w-0 overflow-hidden rounded-[12px] border border-[rgba(255,255,255,0.16)] bg-[#22170f] p-3 text-left text-white shadow-[0_20px_34px_rgba(18,12,8,0.22)] sm:rounded-[16px] sm:p-4 xl:rounded-[20px] xl:p-5",
    onClick && "hover:shadow-[0_24px_40px_rgba(18,12,8,0.28)]"
  );

  const content = (
    <>
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: "url('/assets/kpi_cards.png')",
          backgroundPosition: "center",
          backgroundSize: "cover",
          backgroundRepeat: "no-repeat",
        }}
      />
      <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(20,14,10,0.48)_0%,rgba(20,14,10,0.24)_38%,rgba(20,14,10,0.4)_100%)]" />
      <div className="relative flex h-full min-w-0 flex-col justify-between">
        <div className="flex min-w-0 items-center gap-2 text-[#e4b052] sm:gap-2.5">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] border border-[rgba(228,176,82,0.26)] bg-[rgba(29,20,12,0.34)] sm:h-9 sm:w-9 sm:rounded-[12px]">
            <AdminGlyph name={icon} className="h-5 w-5 sm:h-[26px] sm:w-[26px]" />
          </span>
          <p className="min-w-0 line-clamp-2 whitespace-normal break-words text-sm font-semibold leading-tight tracking-[-0.02em] text-white sm:text-[16px] xl:block xl:truncate xl:whitespace-nowrap xl:text-[17px] xl:leading-normal">{title}</p>
        </div>

        <div className="mt-4 flex min-w-0 flex-col gap-2 sm:flex-row sm:items-end sm:gap-3">
          <p className="break-words text-[30px] font-semibold leading-none tracking-[-0.06em] sm:text-[42px] xl:text-[48px]">{value}</p>
          <div className="min-w-0 pb-0.5">
            <p className="break-words text-xs leading-5 text-[#e1e4ec] sm:text-[14px] xl:text-[15px]">{helper}</p>
            <p className="mt-1 break-words text-xs font-medium text-[#9fd0ab] xl:text-[13px]">{accent}</p>
          </div>
        </div>
      </div>
    </>
  );

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={cardClassName}>
        {content}
      </button>
    );
  }

  return <div className={cardClassName}>{content}</div>;
}

function AdminTabButton({
  active,
  icon,
  label,
  count,
  onClick,
}: {
  active: boolean;
  icon: "brokers" | "listings" | "chats" | "leads" | "activity" | "spark";
  label: string;
  count: number;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex min-h-[40px] max-w-full shrink-0 items-center gap-2 rounded-[8px] border px-3 py-2 text-sm font-medium transition sm:min-h-[42px] sm:px-4 md:max-xl:px-4 md:max-xl:text-sm xl:min-h-[44px] xl:px-5 xl:text-[15px]",
        active
          ? "border-[#253149] bg-[linear-gradient(180deg,#334364_0%,#253149_100%)] text-white shadow-[0_10px_22px_rgba(33,44,69,0.25)]"
          : "border-[#d7dce9] bg-[linear-gradient(180deg,#f7f8fc_0%,#eceff7_100%)] text-[#24314c] shadow-[0_6px_16px_rgba(28,35,61,0.08)] hover:border-[#cfd6e7]"
      )}
    >
      <span className={cn("flex h-6 w-6 items-center justify-center", active ? "text-[#f2d284]" : "text-[#5f6982]")}>
        <AdminGlyph name={icon} className="h-4 w-4" />
      </span>
      <span className="min-w-0 truncate">{label}</span>
      <span
        className={cn(
          "inline-flex min-w-[1.75rem] items-center justify-center rounded-full px-2 py-0.5 text-[12px] font-semibold",
          active ? "bg-[rgba(255,255,255,0.16)] text-white" : "bg-white text-[#5b657c]"
        )}
      >
        {count}
      </span>
    </button>
  );
}

function AdminSkeleton() {
  const adminSkeletonBlockClass = "bg-[#e2e8f0]";

  return (
    <AppShell hidePageHeader mainClassName="!max-w-none !px-0 !pt-0">
      <div className="min-h-screen bg-[#f3f4f6]">
        <section className="relative overflow-hidden border-b border-[#d7dde6] bg-[#eceff3]">
          <div className="mx-auto max-w-[1540px] px-4 py-8 sm:px-6 md:px-8 md:py-10 lg:px-10">
            <SkeletonBlock className={cn("h-6 w-32 rounded-xl", adminSkeletonBlockClass)} />
            <SkeletonBlock className={cn("mt-5 h-12 w-[18rem] rounded-xl", adminSkeletonBlockClass)} />
            <SkeletonBlock className={cn("mt-4 h-4 w-full max-w-[38rem] rounded-xl", adminSkeletonBlockClass)} />
            <SkeletonBlock className={cn("mt-2 h-4 w-full max-w-[30rem] rounded-xl", adminSkeletonBlockClass)} />
            <SkeletonBlock className={cn("mt-8 h-16 w-full max-w-[38rem] rounded-[12px]", adminSkeletonBlockClass)} />
          </div>
        </section>

        <div className="mx-auto max-w-[1540px] px-4 pb-16 pt-6 sm:px-6 md:px-8 lg:px-10">
          <div className="grid gap-4 xl:grid-cols-[minmax(0,2.48fr)_minmax(300px,0.88fr)] xl:items-stretch">
            <div className="rounded-[28px] border border-[#e1e5eb] bg-[#f8fafc] p-5 shadow-[0_20px_48px_rgba(42,48,78,0.06)] md:p-6 xl:h-[31.5rem]">
              <SkeletonBlock className={cn("h-8 w-48 rounded-xl", adminSkeletonBlockClass)} />
              <div className="mt-4 grid h-[calc(100%-3rem)] auto-rows-fr gap-3 sm:grid-cols-2">
                {Array.from({ length: 6 }).map((_, index) => (
                  <SkeletonBlock key={index} className={cn("h-full min-h-[8rem] w-full rounded-[18px]", adminSkeletonBlockClass)} />
                ))}
              </div>
            </div>

            <div className="h-full rounded-[28px] border border-[#e1e5eb] bg-[#f8fafc] p-5 shadow-[0_20px_48px_rgba(42,48,78,0.06)] md:p-6 xl:h-[31.5rem]">
              <SkeletonBlock className={cn("h-7 w-40 rounded-xl", adminSkeletonBlockClass)} />
              <SkeletonBlock className={cn("mt-4 h-20 w-full rounded-[18px]", adminSkeletonBlockClass)} />
              <SkeletonBlock className={cn("mt-3 h-20 w-full rounded-[18px]", adminSkeletonBlockClass)} />
              <SkeletonBlock className={cn("mt-3 h-20 w-full rounded-[18px]", adminSkeletonBlockClass)} />
              <SkeletonBlock className={cn("mt-3 h-20 w-full rounded-[18px]", adminSkeletonBlockClass)} />
            </div>
          </div>

          <div className="mt-6 rounded-[24px] border border-[#e1e5eb] bg-[#f8fafc] p-4 shadow-[0_20px_48px_rgba(42,48,78,0.06)]">
            <div className="flex flex-wrap gap-3">
              {Array.from({ length: 4 }).map((_, index) => (
                <SkeletonBlock key={index} className={cn("h-12 w-32 rounded-full", adminSkeletonBlockClass)} />
              ))}
            </div>
          </div>

          <div className="mt-6 rounded-[28px] border border-[#e1e5eb] bg-[#f8fafc] p-6 shadow-[0_24px_54px_rgba(42,48,78,0.06)]">
            <SkeletonBlock className={cn("h-6 w-44 rounded-xl", adminSkeletonBlockClass)} />
            <SkeletonBlock className={cn("mt-4 h-4 w-full max-w-[28rem] rounded-xl", adminSkeletonBlockClass)} />
            <div className="mt-6 flex flex-wrap gap-3">
              {Array.from({ length: 5 }).map((_, index) => (
                <SkeletonBlock key={index} className={cn("h-11 w-28 rounded-full", adminSkeletonBlockClass)} />
              ))}
            </div>
            <div className="mt-6 space-y-3">
              {Array.from({ length: 4 }).map((_, index) => (
                <SkeletonBlock key={index} className={cn("h-24 w-full rounded-[20px]", adminSkeletonBlockClass)} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

function AdminTableSkeletonRows({
  columns,
  desktopLayoutClassName,
  rows = ADMIN_TAB_PAGE_SIZE,
}: {
  columns: number;
  desktopLayoutClassName: string;
  rows?: number;
}) {
  return (
    <div className={ADMIN_TABLE_ROW_GROUP_CLASS} aria-hidden="true">
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className={ADMIN_TABLE_ROW_CLASS}>
          <div className={cn("grid gap-2 sm:gap-3 xl:items-center", desktopLayoutClassName)}>
            {Array.from({ length: columns }).map((__, columnIndex) => (
              <div key={columnIndex} className={cn("min-w-0", columnIndex > 0 && "hidden xl:block")}>
                <SkeletonBlock className="h-4 w-3/4 rounded-xl bg-[#e2e8f0]" />
                <SkeletonBlock className="mt-2 h-3 w-1/2 rounded-xl bg-[#e2e8f0]" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function AdminActivitySkeletonCards({ rows = ACTIVITY_PAGE_SIZE }: { rows?: number }) {
  return (
    <div className="space-y-4" aria-hidden="true">
      {Array.from({ length: rows }).map((_, index) => (
        <div
          key={index}
          className="rounded-[12px] border border-[#e5e9f2] bg-[linear-gradient(180deg,#ffffff_0%,#f8faff_100%)] px-3 py-3 shadow-[0_10px_22px_rgba(34,40,66,0.05)] sm:px-4 sm:py-4 xl:px-5 xl:py-5"
        >
          <div className="grid items-start gap-2 sm:gap-3 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,1.1fr)_minmax(0,0.92fr)_auto] xl:items-center xl:gap-4">
            <div className="min-w-0">
              <SkeletonBlock className="h-5 w-1/2 rounded-xl bg-[#e2e8f0]" />
              <SkeletonBlock className="mt-3 h-4 w-full rounded-xl bg-[#e2e8f0]" />
              <SkeletonBlock className="mt-2 h-4 w-4/5 rounded-xl bg-[#e2e8f0]" />
            </div>
            <div className="hidden min-w-0 xl:block">
              <SkeletonBlock className="h-3 w-16 rounded-xl bg-[#e2e8f0]" />
              <SkeletonBlock className="mt-3 h-4 w-4/5 rounded-xl bg-[#e2e8f0]" />
              <SkeletonBlock className="mt-2 h-4 w-3/5 rounded-xl bg-[#e2e8f0]" />
            </div>
            <div className="hidden min-w-0 xl:block">
              <SkeletonBlock className="h-3 w-16 rounded-xl bg-[#e2e8f0]" />
              <SkeletonBlock className="mt-3 h-4 w-3/4 rounded-xl bg-[#e2e8f0]" />
              <SkeletonBlock className="mt-2 h-4 w-1/2 rounded-xl bg-[#e2e8f0]" />
            </div>
            <div className="hidden xl:flex xl:justify-end">
              <SkeletonBlock className="h-10 w-28 rounded-full bg-[#e2e8f0]" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function AdminPageContent() {
  const pathname = usePathname();
  const router = useRouter();
  const { enqueueSnackbar } = useSnackbar();
  const { user, loading } = useAuth();
  const resolvedPathname = pathname || "/admin";
  const activeTab = getAdminTabFromPathname(resolvedPathname);
  const [selectedChatListingId, setSelectedChatListingId] = useState<string | null>(null);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [adminChatGroups, setAdminChatGroups] = useState<AdminChatGroup[]>([]);
  const [adminChatNextCursor, setAdminChatNextCursor] = useState<AdminChatConversationCursor | null>(null);
  const [adminChatHasMore, setAdminChatHasMore] = useState(false);
  const [adminChatLoading, setAdminChatLoading] = useState(false);
  const [adminChatTotalConversations, setAdminChatTotalConversations] = useState(0);
  const [brokerFilter, setBrokerFilter] = useState<BrokerFilterId>("all");
  const [brokerSearchQuery, setBrokerSearchQuery] = useState("");
  const [brokerDateFilter, setBrokerDateFilter] = useState<AdminDashboardDateFilterValue>(() => createAdminDashboardDateFilterValue());
  const [brokersPage, setBrokersPage] = useState(1);
  const [brokersPageSize, setBrokersPageSize] = useState<number>(ADMIN_TAB_PAGE_SIZE);
  const [listingFilter, setListingFilter] = useState<ListingFilterId>("all");
  const [listingSearchQuery, setListingSearchQuery] = useState("");
  const [listingDateFilter, setListingDateFilter] = useState<AdminDashboardDateFilterValue>(() => createAdminDashboardDateFilterValue());
  const [listingsPage, setListingsPage] = useState(1);
  const [listingsPageSize, setListingsPageSize] = useState<number>(ADMIN_TAB_PAGE_SIZE);
  const [chatDateFilter, setChatDateFilter] = useState<AdminDashboardDateFilterValue>(() => createAdminDashboardDateFilterValue());
  const [requirementsDateFilter, setRequirementsDateFilter] = useState<AdminDashboardDateFilterValue>(() => createAdminDashboardDateFilterValue());
  const [requirementsFilter, setRequirementsFilter] = useState<RequirementFilterId>("all");
  const [requirementsSearchQuery, setRequirementsSearchQuery] = useState("");
  const [requirementsPage, setRequirementsPage] = useState(1);
  const [requirementsPageSize, setRequirementsPageSize] = useState<number>(ADMIN_TAB_PAGE_SIZE);
  const [enquiriesDateFilter, setEnquiriesDateFilter] = useState<AdminDashboardDateFilterValue>(() => createAdminDashboardDateFilterValue());
  const [enquiriesFilter, setEnquiriesFilter] = useState<EnquiryFilterId>("all");
  const [enquiriesSearchQuery, setEnquiriesSearchQuery] = useState("");
  const [enquiriesPage, setEnquiriesPage] = useState(1);
  const [enquiriesPageSize, setEnquiriesPageSize] = useState<number>(ADMIN_TAB_PAGE_SIZE);
  const [leadsSearchQuery, setLeadsSearchQuery] = useState("");
  const [leadsDateFilter, setLeadsDateFilter] = useState<AdminDashboardDateFilterValue>(() => createAdminDashboardDateFilterValue());
  const [leadsPage, setLeadsPage] = useState(1);
  const [leadsPageSize, setLeadsPageSize] = useState<number>(ADMIN_TAB_PAGE_SIZE);
  const [activityFilter, setActivityFilter] = useState<ActivityFilterId>("all");
  const [activitySearchQuery, setActivitySearchQuery] = useState("");
  const [activityDateFilter, setActivityDateFilter] = useState<AdminDashboardDateFilterValue>(() => createAdminDashboardDateFilterValue());
  const [activityPage, setActivityPage] = useState(1);
  const [activityPageSize, setActivityPageSize] = useState(ACTIVITY_PAGE_SIZE);
  const [activityResponse, setActivityResponse] = useState<AdminActivityResponse | null>(null);
  const [activityResponseKey, setActivityResponseKey] = useState<string | null>(null);
  const [activityLoading, setActivityLoading] = useState(false);
  const [maintenanceLoading, setMaintenanceLoading] = useState(false);
  const [comingSoonLoading, setComingSoonLoading] = useState(false);
  const latestActivityRequestIdRef = useRef(0);
  const latestAdminChatRequestIdRef = useRef(0);
  const adminChatNextCursorRef = useRef<AdminChatConversationCursor | null>(null);
  const adminChatHasMoreRef = useRef(false);
  const adminChatLoadingRef = useRef(false);
  const adminChatLoadedRequestPathRef = useRef<string | null>(null);
  const debouncedBrokerSearchQuery = useDebouncedValue(brokerSearchQuery, 250);
  const debouncedListingSearchQuery = useDebouncedValue(listingSearchQuery, 250);
  const debouncedLeadsSearchQuery = useDebouncedValue(leadsSearchQuery, 250);
  const debouncedActivitySearchQuery = useDebouncedValue(activitySearchQuery, 300);
  const normalizedBrokerSearchQuery = normalizeSearchQuery(debouncedBrokerSearchQuery);
  const normalizedListingSearchQuery = normalizeSearchQuery(debouncedListingSearchQuery);
  const normalizedLeadsSearchQuery = normalizeSearchQuery(debouncedLeadsSearchQuery);
  const normalizedActivitySearchQuery = normalizeSearchQuery(debouncedActivitySearchQuery);
  const canViewAdmin = !!user && isAdmin(user);
  const sessionUserId = user?.uid ?? null;
  const previousSessionUserIdRef = useRef<string | null>(sessionUserId);
  const {
    data: overview,
    loading: overviewLoading,
    refresh: refreshOverview,
    setData: setOverview,
  } = useSessionQuery<AdminOverview>(getApiCacheKey("/api/admin/overview"), () => apiFetch<AdminOverview>("/api/admin/overview"), {
    enabled: !loading && canViewAdmin,
    ttlMs: 45_000,
    onError: (error) => enqueueSnackbar(error instanceof Error ? error.message : "Failed to load admin overview.", { variant: "error" }),
  });
  const {
    data: maintenanceMode,
    loading: maintenanceStateLoading,
    setData: setMaintenanceMode,
  } = useSessionQuery<MaintenanceModeState>(
    getApiCacheKey("/api/admin/maintenance-mode"),
    () => apiFetch<MaintenanceModeState>("/api/admin/maintenance-mode"),
    {
      enabled: !loading && canViewAdmin,
      ttlMs: 45_000,
      onError: (error) => enqueueSnackbar(error instanceof Error ? error.message : "Failed to load maintenance mode.", { variant: "error" }),
    }
  );
  const {
    data: comingSoonMode,
    loading: comingSoonStateLoading,
    setData: setComingSoonMode,
  } = useSessionQuery<ComingSoonModeState>(
    getApiCacheKey("/api/admin/coming-soon-mode"),
    () => apiFetch<ComingSoonModeState>("/api/admin/coming-soon-mode"),
    {
      enabled: !loading && canViewAdmin,
      ttlMs: 45_000,
      onError: (error) => enqueueSnackbar(error instanceof Error ? error.message : "Failed to load coming soon mode.", { variant: "error" }),
    }
  );
  const brokerDateBounds = useMemo(() => getAdminDashboardDateFilterBounds(brokerDateFilter), [brokerDateFilter]);
  const listingDateBounds = useMemo(() => getAdminDashboardDateFilterBounds(listingDateFilter), [listingDateFilter]);
  const requirementsDateBounds = useMemo(() => getAdminDashboardDateFilterBounds(requirementsDateFilter), [requirementsDateFilter]);
  const enquiriesDateBounds = useMemo(() => getAdminDashboardDateFilterBounds(enquiriesDateFilter), [enquiriesDateFilter]);
  const leadsDateBounds = useMemo(() => getAdminDashboardDateFilterBounds(leadsDateFilter), [leadsDateFilter]);
  const brokerRequestPath = useMemo(
    () =>
      buildAdminListRequestPath({
        endpoint: "/api/admin/brokers",
        page: brokersPage,
        pageSize: brokersPageSize,
        status: brokerFilter,
        search: normalizedBrokerSearchQuery,
        startDate: brokerDateBounds.startDate,
        endDate: brokerDateBounds.endDate,
      }),
    [brokerDateBounds.endDate, brokerDateBounds.startDate, brokerFilter, brokersPage, brokersPageSize, normalizedBrokerSearchQuery]
  );
  const listingRequestPath = useMemo(
    () =>
      buildAdminListRequestPath({
        endpoint: "/api/admin/listings",
        page: listingsPage,
        pageSize: listingsPageSize,
        status: listingFilter,
        search: normalizedListingSearchQuery,
        startDate: listingDateBounds.startDate,
        endDate: listingDateBounds.endDate,
      }),
    [listingDateBounds.endDate, listingDateBounds.startDate, listingFilter, listingsPage, listingsPageSize, normalizedListingSearchQuery]
  );
  const requirementsRequestPath = useMemo(
    () =>
      buildAdminListRequestPath({
        endpoint: "/api/admin/requirements",
        page: requirementsPage,
        pageSize: requirementsPageSize,
        status: requirementsFilter,
        search: requirementsSearchQuery,
        startDate: requirementsDateBounds.startDate,
        endDate: requirementsDateBounds.endDate,
      }),
    [
      requirementsDateBounds.endDate,
      requirementsDateBounds.startDate,
      requirementsFilter,
      requirementsPage,
      requirementsPageSize,
      requirementsSearchQuery,
    ]
  );
  const enquiriesRequestPath = useMemo(
    () =>
      buildAdminListRequestPath({
        endpoint: "/api/admin/enquiries",
        page: enquiriesPage,
        pageSize: enquiriesPageSize,
        status: enquiriesFilter,
        search: enquiriesSearchQuery,
        startDate: enquiriesDateBounds.startDate,
        endDate: enquiriesDateBounds.endDate,
      }),
    [enquiriesDateBounds.endDate, enquiriesDateBounds.startDate, enquiriesFilter, enquiriesPage, enquiriesPageSize, enquiriesSearchQuery]
  );
  const leadsRequestPath = useMemo(
    () =>
      buildAdminListRequestPath({
        endpoint: "/api/admin/coming-soon",
        page: leadsPage,
        pageSize: leadsPageSize,
        search: normalizedLeadsSearchQuery,
        startDate: leadsDateBounds.startDate,
        endDate: leadsDateBounds.endDate,
      }),
    [leadsDateBounds.endDate, leadsDateBounds.startDate, leadsPage, leadsPageSize, normalizedLeadsSearchQuery]
  );
  const {
    data: brokerResponse,
    loading: brokersLoading,
  } = useSessionQuery<AdminPaginatedResponse<AdminBrokerListItem, AdminBrokerListCounts>>(
    getApiCacheKey(brokerRequestPath),
    () => apiFetch<AdminPaginatedResponse<AdminBrokerListItem, AdminBrokerListCounts>>(brokerRequestPath),
    {
      enabled: !loading && canViewAdmin && activeTab === "brokers",
      keepPreviousData: true,
      ttlMs: 45_000,
      onError: (error) => enqueueSnackbar(error instanceof Error ? error.message : "Failed to load brokers.", { variant: "error" }),
    }
  );
  const {
    data: listingResponse,
    loading: listingsLoading,
  } = useSessionQuery<AdminPaginatedResponse<AdminListingListItem, AdminListingListCounts>>(
    getApiCacheKey(listingRequestPath),
    () => apiFetch<AdminPaginatedResponse<AdminListingListItem, AdminListingListCounts>>(listingRequestPath),
    {
      enabled: !loading && canViewAdmin && activeTab === "listings",
      keepPreviousData: true,
      ttlMs: 45_000,
      onError: (error) => enqueueSnackbar(error instanceof Error ? error.message : "Failed to load listings.", { variant: "error" }),
    }
  );
  const {
    data: requirementsResponse,
    loading: requirementsLoading,
    refresh: refreshRequirementsResponse,
  } = useSessionQuery<AdminPaginatedResponse<AdminRequirementListItem, AdminRequirementListCounts>>(
    getApiCacheKey(requirementsRequestPath),
    () => apiFetch<AdminPaginatedResponse<AdminRequirementListItem, AdminRequirementListCounts>>(requirementsRequestPath),
    {
      enabled: !loading && canViewAdmin && activeTab === "requirements",
      keepPreviousData: true,
      ttlMs: 45_000,
      onError: (error) => enqueueSnackbar(error instanceof Error ? error.message : "Failed to load requirements.", { variant: "error" }),
    }
  );
  const {
    data: enquiriesResponse,
    loading: enquiriesLoading,
  } = useSessionQuery<AdminPaginatedResponse<AdminEnquiryListItem, AdminEnquiryListCounts>>(
    getApiCacheKey(enquiriesRequestPath),
    () => apiFetch<AdminPaginatedResponse<AdminEnquiryListItem, AdminEnquiryListCounts>>(enquiriesRequestPath),
    {
      enabled: !loading && canViewAdmin && activeTab === "enquiries",
      keepPreviousData: true,
      ttlMs: 45_000,
      onError: (error) => enqueueSnackbar(error instanceof Error ? error.message : "Failed to load enquiries.", { variant: "error" }),
    }
  );
  const {
    data: leadsResponse,
    loading: leadsLoading,
  } = useSessionQuery<AdminPaginatedResponse<AdminComingSoonListItem, ComingSoonListCounts>>(
    getApiCacheKey(leadsRequestPath),
    () => apiFetch<AdminPaginatedResponse<AdminComingSoonListItem, ComingSoonListCounts>>(leadsRequestPath),
    {
      enabled: !loading && canViewAdmin && activeTab === "leads",
      keepPreviousData: true,
      ttlMs: 45_000,
      onError: (error) => enqueueSnackbar(error instanceof Error ? error.message : "Failed to load leads.", { variant: "error" }),
    }
  );
  const pageLoading = overviewLoading || maintenanceStateLoading || comingSoonStateLoading;

  const loadOverview = useCallback(async () => {
    const payload = await refreshOverview();
    if (!payload) {
      throw new Error("Failed to load admin overview.");
    }

    return payload;
  }, [refreshOverview]);
  const clearActivityResponse = useCallback(() => {
    latestActivityRequestIdRef.current += 1;
    setActivityResponse(null);
    setActivityResponseKey(null);
    setActivityLoading(false);
  }, []);

  const handleSelectTab = useCallback(
    (tab: AdminTabId) => {
      const nextHref = getAdminTabHref(tab);

      if (nextHref !== resolvedPathname) {
        router.push(nextHref, { scroll: false });
      }
    },
    [resolvedPathname, router]
  );
  const currentAdminReturnHref = getAdminTabHref(activeTab);
  const getListingDetailHref = useCallback(
    (listingId: string) => createAdminListingDetailHref(listingId, currentAdminReturnHref),
    [currentAdminReturnHref]
  );
  const {
    hasMorePriorityQueueItems,
    isLoadingMorePriorityQueueItems,
    loadMorePriorityQueueItems,
    priorityQueueItems,
    priorityQueueLoading,
    priorityQueueTotalCount,
  } = useAdminPriorityNotifications({
    enabled: !loading && canViewAdmin,
    getListingDetailHref,
  });

  useEffect(() => {
    if (previousSessionUserIdRef.current === sessionUserId) {
      return;
    }

    previousSessionUserIdRef.current = sessionUserId;
    latestActivityRequestIdRef.current += 1;
    latestAdminChatRequestIdRef.current += 1;
    setOverview(null);
    setMaintenanceMode(null);
    setComingSoonMode(null);
    setSelectedChatListingId(null);
    setSelectedConversationId(null);
    setAdminChatGroups([]);
    setAdminChatNextCursor(null);
    setAdminChatHasMore(false);
    setAdminChatLoading(false);
    setAdminChatTotalConversations(0);
    adminChatNextCursorRef.current = null;
    adminChatHasMoreRef.current = false;
    adminChatLoadingRef.current = false;
    adminChatLoadedRequestPathRef.current = null;
    setBrokerFilter("all");
    setBrokerSearchQuery("");
    setBrokerDateFilter(createAdminDashboardDateFilterValue());
    setBrokersPage(1);
    setBrokersPageSize(ADMIN_TAB_PAGE_SIZE);
    setListingFilter("all");
    setListingSearchQuery("");
    setListingDateFilter(createAdminDashboardDateFilterValue());
    setListingsPage(1);
    setListingsPageSize(ADMIN_TAB_PAGE_SIZE);
    setChatDateFilter(createAdminDashboardDateFilterValue());
    setRequirementsDateFilter(createAdminDashboardDateFilterValue());
    setRequirementsFilter("all");
    setRequirementsSearchQuery("");
    setRequirementsPage(1);
    setRequirementsPageSize(ADMIN_TAB_PAGE_SIZE);
    setEnquiriesDateFilter(createAdminDashboardDateFilterValue());
    setEnquiriesFilter("all");
    setEnquiriesSearchQuery("");
    setEnquiriesPage(1);
    setEnquiriesPageSize(ADMIN_TAB_PAGE_SIZE);
    setLeadsSearchQuery("");
    setLeadsDateFilter(createAdminDashboardDateFilterValue());
    setLeadsPage(1);
    setLeadsPageSize(ADMIN_TAB_PAGE_SIZE);
    setActivityFilter("all");
    setActivitySearchQuery("");
    setActivityDateFilter(createAdminDashboardDateFilterValue());
    setActivityPage(1);
    setActivityPageSize(ACTIVITY_PAGE_SIZE);
    setActivityResponse(null);
    setActivityResponseKey(null);
    setActivityLoading(false);
    setMaintenanceLoading(false);
    setComingSoonLoading(false);
  }, [sessionUserId, setComingSoonMode, setMaintenanceMode, setOverview]);

  useEffect(() => {
    if (!loading && !canViewAdmin) {
      router.replace(getDefaultRouteForUser(user));
    }
  }, [canViewAdmin, loading, router, user]);

  useEffect(() => {
    setBrokersPage(1);
  }, [brokerDateBounds.endDate, brokerDateBounds.startDate, brokerFilter, normalizedBrokerSearchQuery]);

  useEffect(() => {
    setListingsPage(1);
  }, [listingDateBounds.endDate, listingDateBounds.startDate, listingFilter, normalizedListingSearchQuery]);

  useEffect(() => {
    setRequirementsPage(1);
  }, [requirementsDateBounds.endDate, requirementsDateBounds.startDate]);

  useEffect(() => {
    setEnquiriesPage(1);
  }, [enquiriesDateBounds.endDate, enquiriesDateBounds.startDate]);

  useEffect(() => {
    setLeadsPage(1);
  }, [leadsDateBounds.endDate, leadsDateBounds.startDate, normalizedLeadsSearchQuery]);

  const handleBrokersPageSizeChange = useCallback((nextPageSize: number) => {
    setBrokersPageSize(nextPageSize);
    setBrokersPage(1);
  }, []);
  const handleListingsPageSizeChange = useCallback((nextPageSize: number) => {
    setListingsPageSize(nextPageSize);
    setListingsPage(1);
  }, []);
  const handleRequirementsPageSizeChange = useCallback((nextPageSize: number) => {
    setRequirementsPageSize(nextPageSize);
    setRequirementsPage(1);
  }, []);
  const handleEnquiriesPageSizeChange = useCallback((nextPageSize: number) => {
    setEnquiriesPageSize(nextPageSize);
    setEnquiriesPage(1);
  }, []);
  const handleLeadsPageSizeChange = useCallback((nextPageSize: number) => {
    setLeadsPageSize(nextPageSize);
    setLeadsPage(1);
  }, []);
  const handleRequirementsQueryChange = useCallback((nextQuery: { filter: RequirementFilterId; search: string }) => {
    setRequirementsFilter((currentFilter) => {
      if (currentFilter !== nextQuery.filter) {
        setRequirementsPage(1);
        return nextQuery.filter;
      }

      return currentFilter;
    });
    setRequirementsSearchQuery((currentSearch) => {
      if (currentSearch !== nextQuery.search) {
        setRequirementsPage(1);
        return nextQuery.search;
      }

      return currentSearch;
    });
  }, []);
  const handleEnquiriesQueryChange = useCallback((nextQuery: { filter: EnquiryFilterId; search: string }) => {
    setEnquiriesFilter((currentFilter) => {
      if (currentFilter !== nextQuery.filter) {
        setEnquiriesPage(1);
        return nextQuery.filter;
      }

      return currentFilter;
    });
    setEnquiriesSearchQuery((currentSearch) => {
      if (currentSearch !== nextQuery.search) {
        setEnquiriesPage(1);
        return nextQuery.search;
      }

      return currentSearch;
    });
  }, []);

  const toggleMaintenanceMode = async () => {
    if (!maintenanceMode || maintenanceLoading) {
      return;
    }

    setMaintenanceLoading(true);
    try {
      const payload = await apiFetch<MaintenanceModeState>("/api/admin/maintenance-mode", {
        method: "PUT",
        body: JSON.stringify({
          enabled: !maintenanceMode.enabled,
        }),
      });
      setMaintenanceMode(payload);
      setPublicSiteModeState({
        maintenance: {
          enabled: payload.enabled,
        },
        comingSoon: {
          enabled: !!comingSoonMode?.enabled,
        },
      });
      enqueueSnackbar(`Maintenance mode ${payload.enabled ? "enabled" : "disabled"}.`, { variant: "success" });
    } catch (error) {
      enqueueSnackbar(error instanceof Error ? error.message : "Failed to update maintenance mode.", { variant: "error" });
    } finally {
      setMaintenanceLoading(false);
    }
  };

  const toggleComingSoonMode = async () => {
    if (!comingSoonMode || comingSoonLoading) {
      return;
    }

    setComingSoonLoading(true);
    try {
      const payload = await apiFetch<ComingSoonModeState>("/api/admin/coming-soon-mode", {
        method: "PUT",
        body: JSON.stringify({
          enabled: !comingSoonMode.enabled,
        }),
      });
      setComingSoonMode(payload);
      setPublicSiteModeState({
        maintenance: {
          enabled: !!maintenanceMode?.enabled,
        },
        comingSoon: {
          enabled: payload.enabled,
        },
      });
      enqueueSnackbar(`Coming soon mode ${payload.enabled ? "enabled" : "disabled"}.`, { variant: "success" });
    } catch (error) {
      enqueueSnackbar(error instanceof Error ? error.message : "Failed to update coming soon mode.", { variant: "error" });
    } finally {
      setComingSoonLoading(false);
    }
  };

  const brokerCounts = brokerResponse?.counts || {
    all: 0,
    approved: 0,
    pending: 0,
    rejected: 0,
    deactivated: 0,
  };
  const brokerUsers = brokerResponse?.items || [];
  const visibleBrokerUsers = brokerUsers;
  const paginatedBrokerUsers = brokerUsers;
  const brokerPageSizeOptions = PAGE_SIZE_OPTIONS;
  const brokersPagination = useMemo(
    () =>
      buildPaginationMeta({
        page: brokerResponse?.page ?? brokersPage,
        pageSize: brokerResponse?.pageSize ?? brokersPageSize,
        totalCount: brokerResponse?.total ?? 0,
      }),
    [brokerResponse?.page, brokerResponse?.pageSize, brokerResponse?.total, brokersPage, brokersPageSize]
  );
  const brokerFilters = useMemo(
    () => [
      { id: "all" as const, label: "All", count: brokerCounts.all },
      { id: "approved" as const, label: "Approved", count: brokerCounts.approved },
      { id: "pending" as const, label: "Pending", count: brokerCounts.pending },
      { id: "rejected" as const, label: "Rejected", count: brokerCounts.rejected },
      { id: "deactivated" as const, label: "Deactivated", count: brokerCounts.deactivated },
    ],
    [brokerCounts.all, brokerCounts.approved, brokerCounts.deactivated, brokerCounts.pending, brokerCounts.rejected]
  );

  const listingCounts = listingResponse?.counts || {
    all: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
    inactive: 0,
    deleted: 0,
  };
  const visibleListings = listingResponse?.items || [];
  const paginatedListings = visibleListings;
  const listingPageSizeOptions = PAGE_SIZE_OPTIONS;
  const listingsPagination = useMemo(
    () =>
      buildPaginationMeta({
        page: listingResponse?.page ?? listingsPage,
        pageSize: listingResponse?.pageSize ?? listingsPageSize,
        totalCount: listingResponse?.total ?? 0,
      }),
    [listingResponse?.page, listingResponse?.pageSize, listingResponse?.total, listingsPage, listingsPageSize]
  );
  const listingFilters = useMemo(
    () => [
      { id: "all" as const, label: "All", count: listingCounts.all },
      { id: "pending" as const, label: "Pending", count: listingCounts.pending },
      { id: "approved" as const, label: "Approved", count: listingCounts.approved },
      { id: "rejected" as const, label: "Rejected", count: listingCounts.rejected },
      { id: "inactive" as const, label: "Inactive", count: listingCounts.inactive },
      { id: "deleted" as const, label: "Deleted", count: listingCounts.deleted },
    ],
    [listingCounts.all, listingCounts.approved, listingCounts.deleted, listingCounts.inactive, listingCounts.pending, listingCounts.rejected]
  );

  const pendingBrokerUsersThisWeek = overview?.metrics.pendingBrokerUsersThisWeek || 0;
  const approvedBrokerUsersThisWeek = overview?.metrics.approvedBrokerUsersThisWeek || 0;
  const pendingListingsThisWeek = overview?.metrics.pendingListingsThisWeek || 0;
  const approvedListingsThisWeek = overview?.metrics.approvedListingsThisWeek || 0;
  const activeRequirementsThisWeek = overview?.metrics.activeRequirementsThisWeek || 0;

  const requirementsItems = requirementsResponse?.items || [];
  const requirementsPagination = useMemo(
    () =>
      buildPaginationMeta({
        page: requirementsResponse?.page ?? requirementsPage,
        pageSize: requirementsResponse?.pageSize ?? requirementsPageSize,
        totalCount: requirementsResponse?.total ?? 0,
      }),
    [requirementsPage, requirementsPageSize, requirementsResponse?.page, requirementsResponse?.pageSize, requirementsResponse?.total]
  );
  const requirementsCounts = requirementsResponse?.counts || {
    all: 0,
    active: 0,
    inactive: 0,
    deleted: 0,
  };
  const enquiriesItems = enquiriesResponse?.items || [];
  const enquiriesPagination = useMemo(
    () =>
      buildPaginationMeta({
        page: enquiriesResponse?.page ?? enquiriesPage,
        pageSize: enquiriesResponse?.pageSize ?? enquiriesPageSize,
        totalCount: enquiriesResponse?.total ?? 0,
      }),
    [enquiriesPage, enquiriesPageSize, enquiriesResponse?.page, enquiriesResponse?.pageSize, enquiriesResponse?.total]
  );
  const enquiriesCounts = enquiriesResponse?.counts || {
    all: 0,
    unreplied: 0,
    replied: 0,
    failed: 0,
  };
  const comingSoonRegistrations = leadsResponse?.items || [];
  const visibleComingSoonRegistrations = comingSoonRegistrations;
  const paginatedComingSoonRegistrations = comingSoonRegistrations;
  const leadsTotalCount = leadsResponse?.total ?? 0;
  const leadsPageSizeOptions = PAGE_SIZE_OPTIONS;
  const leadsPagination = useMemo(
    () =>
      buildPaginationMeta({
        page: leadsResponse?.page ?? leadsPage,
        pageSize: leadsResponse?.pageSize ?? leadsPageSize,
        totalCount: leadsTotalCount,
      }),
    [leadsPage, leadsPageSize, leadsResponse?.page, leadsResponse?.pageSize, leadsTotalCount]
  );

  const chatDateBounds = useMemo(() => getAdminDashboardDateFilterBounds(chatDateFilter), [chatDateFilter]);
  const adminChatBaseRequestPath = useMemo(
    () =>
      buildAdminChatsRequestPath({
        limit: ADMIN_CHAT_PAGE_SIZE,
        cursor: null,
        startDate: chatDateBounds.startDate,
        endDate: chatDateBounds.endDate,
      }),
    [chatDateBounds.endDate, chatDateBounds.startDate]
  );
  const visibleChatGroups = adminChatGroups;

  useEffect(() => {
    adminChatNextCursorRef.current = adminChatNextCursor;
    adminChatHasMoreRef.current = adminChatHasMore;
    adminChatLoadingRef.current = adminChatLoading;
  }, [adminChatHasMore, adminChatLoading, adminChatNextCursor]);

  const loadAdminChats = useCallback(
    async ({ reset = false }: { reset?: boolean } = {}) => {
      if (adminChatLoadingRef.current) {
        return;
      }

      if (!reset && !adminChatHasMoreRef.current) {
        return;
      }

      const requestId = latestAdminChatRequestIdRef.current + 1;
      latestAdminChatRequestIdRef.current = requestId;
      const requestPath = buildAdminChatsRequestPath({
        limit: ADMIN_CHAT_PAGE_SIZE,
        cursor: reset ? null : adminChatNextCursorRef.current,
        startDate: chatDateBounds.startDate,
        endDate: chatDateBounds.endDate,
      });

      adminChatLoadingRef.current = true;
      setAdminChatLoading(true);

      try {
        const payload = await apiFetch<AdminChatPage>(requestPath);
        if (latestAdminChatRequestIdRef.current !== requestId) {
          return;
        }

        setAdminChatGroups((currentGroups) => (reset ? payload.chats : mergeAdminChatGroups(currentGroups, payload.chats)));
        setAdminChatNextCursor(payload.nextCursor);
        setAdminChatHasMore(payload.hasMore);
        setAdminChatTotalConversations(payload.totalConversations);
        adminChatNextCursorRef.current = payload.nextCursor;
        adminChatHasMoreRef.current = payload.hasMore;
        if (reset) {
          adminChatLoadedRequestPathRef.current = requestPath;
        }
      } catch (error) {
        if (latestAdminChatRequestIdRef.current === requestId) {
          enqueueSnackbar(error instanceof Error ? error.message : "Failed to load admin chats.", { variant: "error" });
        }
      } finally {
        if (latestAdminChatRequestIdRef.current === requestId) {
          adminChatLoadingRef.current = false;
          setAdminChatLoading(false);
        }
      }
    },
    [chatDateBounds.endDate, chatDateBounds.startDate, enqueueSnackbar]
  );
  const handleLoadMoreAdminChats = useCallback(() => {
    void loadAdminChats();
  }, [loadAdminChats]);

  useEffect(() => {
    if (loading || !canViewAdmin || activeTab !== "chats") {
      return;
    }

    if (adminChatLoadedRequestPathRef.current === adminChatBaseRequestPath) {
      return;
    }

    latestAdminChatRequestIdRef.current += 1;
    setSelectedChatListingId(null);
    setSelectedConversationId(null);
    setAdminChatGroups([]);
    setAdminChatNextCursor(null);
    setAdminChatHasMore(false);
    setAdminChatTotalConversations(0);
    adminChatNextCursorRef.current = null;
    adminChatHasMoreRef.current = false;
    adminChatLoadingRef.current = false;
    setAdminChatLoading(false);

    void loadAdminChats({ reset: true });
  }, [activeTab, adminChatBaseRequestPath, canViewAdmin, loadAdminChats, loading]);

  const userMap = useMemo(() => new Map<string, AdminActivityUserSummary>(), []);
  const listingMap = useMemo(() => new Map<string, AdminActivityListingSummary>(), []);
  const requirementMap = useMemo(() => new Map<string, AdminActivityRequirementSummary>(), []);
  const areaMap = useMemo(() => new Map((overview?.areas || []).map((area) => [area.id, area])), [overview?.areas]);
  const activityDateBounds = useMemo(() => getAdminDashboardDateFilterBounds(activityDateFilter), [activityDateFilter]);
  const activityRequestPath = useMemo(
    () =>
      buildActivityRequestPath({
        page: activityPage,
        pageSize: activityPageSize,
        category: activityFilter,
        startDate: activityDateBounds.startDate,
        endDate: activityDateBounds.endDate,
        search: normalizedActivitySearchQuery,
      }),
    [activityDateBounds.endDate, activityDateBounds.startDate, activityFilter, activityPage, activityPageSize, normalizedActivitySearchQuery]
  );
  const activityHasFreshResponse = activityResponseKey === activityRequestPath;
  const effectiveActivityResponse = activityHasFreshResponse ? activityResponse : null;
  const effectiveActivityCategoryCounts = effectiveActivityResponse?.categoryCounts || EMPTY_ACTIVITY_CATEGORY_COUNTS;
  const effectiveActivityFilteredCount = effectiveActivityResponse?.filteredCount ?? 0;
  const activityBodyLoading = activeTab === "activity" && activityLoading && !activityHasFreshResponse;

  useEffect(() => {
    if (loading || !canViewAdmin || activeTab !== "activity") {
      return;
    }

    if (activityResponseKey === activityRequestPath && activityResponse) {
      setActivityLoading(false);
      return;
    }

    const requestId = latestActivityRequestIdRef.current + 1;
    latestActivityRequestIdRef.current = requestId;
    const controller = new AbortController();

    setActivityLoading(true);

    void apiFetch<AdminActivityResponse>(activityRequestPath, { signal: controller.signal })
      .then((response) => {
        if (latestActivityRequestIdRef.current !== requestId || controller.signal.aborted) {
          return;
        }

        setActivityResponse(response);
        setActivityResponseKey(activityRequestPath);
      })
      .catch((error) => {
        if (latestActivityRequestIdRef.current !== requestId || controller.signal.aborted) {
          return;
        }

        if (error instanceof Error && error.name === "AbortError") {
          return;
        }

        enqueueSnackbar(error instanceof Error ? error.message : "Failed to load activity logs.", { variant: "error" });
      })
      .finally(() => {
        if (latestActivityRequestIdRef.current === requestId && !controller.signal.aborted) {
          setActivityLoading(false);
        }
      });

    return () => {
      controller.abort();
    };
  }, [activityRequestPath, activityResponse, activityResponseKey, activeTab, canViewAdmin, enqueueSnackbar, loading]);

  const resolvedActivity = useMemo(() => {
    const sourceLogs = effectiveActivityResponse?.activity ?? [];
    return sourceLogs.map((log) =>
      resolveAdminActivityLog(log, {
        areaMap,
        getListingDetailHref,
        listingMap,
        requirementMap,
        userMap,
      })
    );
  }, [areaMap, effectiveActivityResponse?.activity, getListingDetailHref, listingMap, requirementMap, userMap]);

  const activityFilters = useMemo(
    () => [
      { id: "all" as const, label: "All", count: effectiveActivityCategoryCounts.all },
      { id: "listings" as const, label: "Listings", count: effectiveActivityCategoryCounts.listings },
      { id: "brokers" as const, label: "Brokers", count: effectiveActivityCategoryCounts.brokers },
      { id: "credits" as const, label: "Credits", count: effectiveActivityCategoryCounts.credits },
      { id: "requirements" as const, label: "Requirements", count: effectiveActivityCategoryCounts.requirements },
      { id: "system" as const, label: "System", count: effectiveActivityCategoryCounts.system },
    ],
    [effectiveActivityCategoryCounts]
  );

  const adminTabs = useMemo(
    () => [
      { id: "brokers" as const, label: "Brokers", count: overview?.tabCounts.brokers || 0, icon: "brokers" as const },
      { id: "listings" as const, label: "Listings", count: overview?.tabCounts.listings || 0, icon: "listings" as const },
      { id: "chats" as const, label: "Chats", count: adminChatTotalConversations || overview?.tabCounts.chats || 0, icon: "chats" as const },
      { id: "requirements" as const, label: "Requirements", count: overview?.tabCounts.requirements || 0, icon: "spark" as const },
      { id: "enquiries" as const, label: "Enquiries", count: overview?.tabCounts.enquiries || 0, icon: "leads" as const },
      { id: "leads" as const, label: "Leads", count: overview?.tabCounts.leads || 0, icon: "leads" as const },
      {
        id: "activity" as const,
        label: "Activity",
        count: overview?.tabCounts.activity ?? 0,
        icon: "activity" as const,
      },
    ],
    [
      adminChatTotalConversations,
      overview?.tabCounts.activity,
      overview?.tabCounts.brokers,
      overview?.tabCounts.chats,
      overview?.tabCounts.enquiries,
      overview?.tabCounts.leads,
      overview?.tabCounts.listings,
      overview?.tabCounts.requirements,
    ]
  );

  useEffect(() => {
    if (!visibleChatGroups.length) {
      setSelectedChatListingId(null);
      setSelectedConversationId(null);
      return;
    }

    const nextListing = visibleChatGroups.find((chat) => chat.listing.id === selectedChatListingId) || visibleChatGroups[0];
    if (nextListing.listing.id !== selectedChatListingId) {
      setSelectedChatListingId(nextListing.listing.id);
    }

    const nextConversation =
      nextListing.conversations.find((conversation) => conversation.conversationId === selectedConversationId) ||
      nextListing.conversations[0] ||
      null;

    if ((nextConversation?.conversationId || null) !== selectedConversationId) {
      setSelectedConversationId(nextConversation?.conversationId || null);
    }
  }, [selectedChatListingId, selectedConversationId, visibleChatGroups]);

  useEffect(() => {
    if (!adminTabs.some((tab) => tab.id === activeTab)) {
      handleSelectTab("brokers");
    }
  }, [activeTab, adminTabs, handleSelectTab]);
  const handleSelectActivityFilter = useCallback(
    (nextFilter: ActivityFilterId) => {
      if (nextFilter === activityFilter) {
        return;
      }

      setActivityResponseKey(null);
      setActivityLoading(true);
      setActivityFilter(nextFilter);
      setActivityPage(1);
    },
    [activityFilter]
  );
  const handleSelectActivityDateFilter = useCallback((nextFilter: AdminDashboardDateFilterValue) => {
    setActivityResponseKey(null);
    setActivityLoading(true);
    setActivityDateFilter(nextFilter);
    setActivityPage(1);
  }, []);
  const handleActivityPageChange = useCallback((nextPage: number) => {
    setActivityResponseKey(null);
    setActivityLoading(true);
    setActivityPage(nextPage);
  }, []);
  const handleActivityPageSizeChange = useCallback((nextPageSize: number) => {
    setActivityResponseKey(null);
    setActivityLoading(true);
    setActivityPageSize(nextPageSize);
    setActivityPage(1);
  }, []);
  const handleExportLeadsCsv = useCallback(async () => {
    const exportPageSize = 100;
    const exportedLeads: AdminComingSoonListItem[] = [];

    try {
      let exportPage = 1;
      let totalPages = 1;

      do {
        const requestPath = buildAdminListRequestPath({
          endpoint: "/api/admin/coming-soon",
          page: exportPage,
          pageSize: exportPageSize,
          search: normalizedLeadsSearchQuery,
          startDate: leadsDateBounds.startDate,
          endDate: leadsDateBounds.endDate,
        });
        const payload = await apiFetch<AdminPaginatedResponse<AdminComingSoonListItem, ComingSoonListCounts>>(requestPath);
        exportedLeads.push(...(payload.items || []));
        totalPages = payload.totalPages;
        exportPage += 1;
      } while (exportPage <= totalPages);
    } catch (error) {
      enqueueSnackbar(error instanceof Error ? error.message : "Failed to export leads.", { variant: "error" });
      return;
    }

    const rows = [
      [
        "Registration ID",
        "First Name",
        "Last Name",
        "Full Name",
        "Email",
        "WhatsApp Number",
        "Instagram Handle",
        "Company / Agency",
        "Role",
        "Role ID",
        "Submitted At",
      ],
      ...exportedLeads.map((lead) => [
        lead.id,
        lead.first_name,
        lead.last_name,
        getComingSoonLeadName(lead),
        lead.email,
        lead.whatsapp_number,
        lead.instagram_handle || "",
        lead.company_agency_name,
        lead.role_name,
        lead.role_id,
        new Date(lead.created_at).toLocaleString(),
      ]),
    ];
    const dateStamp = new Date().toISOString().slice(0, 10);

    downloadCsv(`coming-soon-leads-${dateStamp}.csv`, buildCsvContent(rows));
    enqueueSnackbar(
      `Exported ${exportedLeads.length} lead${exportedLeads.length === 1 ? "" : "s"}.`,
      { variant: "success" }
    );
  }, [enqueueSnackbar, leadsDateBounds.endDate, leadsDateBounds.startDate, normalizedLeadsSearchQuery]);

  const activityPagination = useMemo(
    () =>
      buildPaginationMeta({
        page: activityPage,
        pageSize: activityPageSize,
        totalCount: effectiveActivityFilteredCount,
      }),
    [activityPage, activityPageSize, effectiveActivityFilteredCount]
  );

  if (loading || !user) {
    return <LoadingScreen label="Loading admin controls..." />;
  }

  if (pageLoading && (!overview || !maintenanceMode || !comingSoonMode)) {
    return <AdminSkeleton />;
  }

  if (!overview || !maintenanceMode || !comingSoonMode) {
    return <AdminSkeleton />;
  }

  return (
    <AppShell hidePageHeader mainClassName="!max-w-none !px-0 !pt-0">
      <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(255,216,145,0.18),transparent_20%),linear-gradient(180deg,#f6f4fa_0%,#f1f2fa_42%,#edf0f8_100%)]">
       <section
  className="relative overflow-hidden border-b border-[#dcdfeb]"
  style={{
    backgroundImage: "url('/assets/broker_dashboard.jpg')",
    backgroundPosition: "center",
    backgroundSize: "cover",
  }}
>
  <div className="mx-auto max-w-[1540px] px-4 pt-6 sm:px-6 md:px-6 md:pt-9 xl:px-10">
    <div className="flex flex-col gap-6">

      {/* Top Row */}
      <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-start">

        {/* Left Content (TEXT SAME, ONLY SCALED LIKE BROKER) */}
        <div className="max-w-[520px] rounded-[10px]">

          <h1 className="text-[20px] font-semibold tracking-[-0.04em] text-[#1b2440] md:text-[34px] lg:text-[36px] xl:text-[40px]">
            Admin Dashboard
          </h1>

          <p className="mt-3 max-w-[560px] text-[17px] font-normal leading-[1.35] text-[#2b3148] lg:text-[18px]">
            Manage broker approvals, listings, and chats from one streamlined dashboard.
          </p>
        </div>

        {/* Right Cards (independent mode switches) */}
        <div className="flex w-full flex-row gap-2 sm:w-auto sm:gap-3 md:max-lg:w-full lg:self-start">
          <button
            type="button"
            onClick={toggleComingSoonMode}
            disabled={comingSoonLoading}
            className="min-w-0 flex-1 rounded-[8px] border border-[rgba(67,76,107,0.18)] bg-[linear-gradient(180deg,rgba(24,39,72,0.88)_0%,rgba(12,29,63,0.9)_100%)] px-2 py-2 text-left text-white shadow-[0_14px_30px_rgba(34,40,66,0.2)] backdrop-blur-md transition hover:brightness-105 disabled:cursor-wait disabled:opacity-80 sm:flex-none sm:px-4 sm:py-3"
          >
            <div className="flex items-center gap-2 sm:gap-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[rgba(247,198,92,0.16)] text-[#f0c165] sm:h-8 sm:w-8">
                <AdminGlyph name="spark" className="h-4 w-4 sm:h-[17px] sm:w-[17px]" />
              </span>

              <div className="min-w-0">
                <p className="truncate text-[9px] font-semibold uppercase tracking-[0.12em] text-[#c6cede] sm:text-[11px] sm:tracking-[0.24em]">
                  <span className="sm:hidden">Coming Soon</span>
                  <span className="hidden sm:inline">Coming Soon Mode</span>
                </p>
                <p className="mt-0.5 text-sm font-medium tracking-[-0.02em] sm:text-base xl:text-[18px]">
                  {comingSoonLoading
                    ? "Updating..."
                    : comingSoonMode.enabled
                    ? "Enabled"
                    : "Disabled"}
                </p>
              </div>
            </div>
          </button>

          <button
            type="button"
            onClick={toggleMaintenanceMode}
            disabled={maintenanceLoading}
            className="min-w-0 flex-1 rounded-[8px] border border-[rgba(67,76,107,0.18)] bg-[linear-gradient(180deg,rgba(24,39,72,0.88)_0%,rgba(12,29,63,0.9)_100%)] px-2 py-2 text-left text-white shadow-[0_14px_30px_rgba(34,40,66,0.2)] backdrop-blur-md transition hover:brightness-105 disabled:cursor-wait disabled:opacity-80 sm:flex-none sm:px-4 sm:py-3"
          >
            <div className="flex items-center gap-2 sm:gap-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[rgba(247,198,92,0.16)] text-[#f0c165] sm:h-8 sm:w-8">
                <AdminGlyph name="shield" className="h-4 w-4 sm:h-[17px] sm:w-[17px]" />
              </span>

              <div className="min-w-0">
                <p className="truncate text-[9px] font-semibold uppercase tracking-[0.12em] text-[#c6cede] sm:text-[11px] sm:tracking-[0.24em]">
                  <span className="sm:hidden">Maintenance</span>
                  <span className="hidden sm:inline">Maintenance Mode</span>
                </p>
                <p className="mt-0.5 text-sm font-medium tracking-[-0.02em] sm:text-base xl:text-[18px]">
                  {maintenanceLoading
                    ? "Updating..."
                    : maintenanceMode.enabled
                    ? "Enabled"
                    : "Disabled"}
                </p>
              </div>
            </div>
          </button>
        </div>
      </div>

      {/* Bottom Welcome Bar (UNCHANGED - ALREADY MATCHING) */}
      <div className="mt-1 bg-[linear-gradient(90deg,rgba(40,44,59,0.82)_0%,rgba(40,44,59,0.42)_62%,rgba(40,44,59,0.12)_100%)] px-4 py-3 text-white shadow-[0_16px_26px_rgba(39,42,63,0.16)] sm:px-6 sm:py-4 md:max-w-[620px]">
        <p className="text-[22px] font-medium leading-tight tracking-[-0.03em] sm:text-[24px] lg:text-[26px] xl:text-[28px] xl:leading-none">
          Welcome back,{" "}
          <span className="font-normal text-[#d6dcec]">
            {getFullName(user.firstName, user.lastName) || "Admin"}
          </span>
        </p>
      </div>
    </div>
  </div>
</section>

        <div
          className={cn(
            "mx-auto max-w-[1540px] px-4 pt-4 sm:pb-4 md:px-6 md:pb-10 xl:px-10 xl:pb-16"
          )}
        >
          <section className="grid gap-4 xl:grid-cols-[minmax(0,2.85fr)_minmax(360px,1.08fr)]">
            <div
              className="relative isolate overflow-hidden rounded-[12px] border border-[rgba(255,255,255,0.16)] p-5 text-white shadow-[0_20px_40px_rgba(26,18,10,0.24)] xl:p-6"
              style={{
                backgroundImage: "url('/assets/kpi_cards.png')",
                backgroundPosition: "center",
                backgroundSize: "cover",
              }}
            >
              <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(20,14,10,0.62)_0%,rgba(20,14,10,0.4)_42%,rgba(20,14,10,0.54)_100%)]" />
                <div className="relative">
                  <h2 className="text-[28px] font-semibold tracking-[-0.05em] text-white sm:text-[30px] md:max-xl:text-[26px]">Admin Overview</h2>

                <div className="mt-5 grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-2">
                  <AdminMetricCard
                    icon="brokers"
                    title="Pending Brokers"
                    value={overview.metrics.pendingApplications}
                    helper="Awaiting approval"
                    accent={`+${pendingBrokerUsersThisWeek} This Week`}
                    onClick={() => {
                      handleSelectTab("brokers");
                      setBrokerFilter("pending");
                    }}
                  />
                  <AdminMetricCard
                    icon="brokers"
                    title="Active Brokers"
                    value={overview.metrics.activeBrokers}
                    helper="Verified broker accounts"
                    accent={`+${approvedBrokerUsersThisWeek} This Week`}
                    onClick={() => {
                      handleSelectTab("brokers");
                      setBrokerFilter("approved");
                    }}
                  />
                  <AdminMetricCard
                    icon="listings"
                    title="Pending Listings"
                    value={overview.metrics.pendingListings}
                    helper="Awaiting moderation"
                    accent={`+${pendingListingsThisWeek} This Week`}
                    onClick={() => {
                      handleSelectTab("listings");
                      setListingFilter("pending");
                    }}
                  />
                  <AdminMetricCard
                    icon="listings"
                    title="Active Listings"
                    value={overview.metrics.activeListings}
                    helper="Approved live inventory"
                    accent={`+${approvedListingsThisWeek} This Week`}
                    onClick={() => {
                      handleSelectTab("listings");
                      setListingFilter("approved");
                    }}
                  />
                  <AdminMetricCard
                    icon="chats"
                    title="Monitor Live Chats"
                    value={overview.metrics.totalChats}
                    helper="Open broker conversations"
                    accent={`${adminChatTotalConversations || overview.metrics.totalChats} conversations active`}
                    onClick={() => handleSelectTab("chats")}
                  />

                  <AdminMetricCard
                    icon="spark"
                    title="Requirements"
                    value={overview.metrics.activeRequirements}
                    helper="Active buyer briefs"
                    accent={`+${activeRequirementsThisWeek} This Week`}
                    onClick={() => handleSelectTab("requirements")}
                  />
                </div>
              </div>
            </div>

            <div className="hidden h-full min-h-0 xl:block xl:h-[34rem]">
              <AdminPriorityQueue
                hasMore={hasMorePriorityQueueItems}
                isLoading={priorityQueueLoading}
                isLoadingMore={isLoadingMorePriorityQueueItems}
                items={priorityQueueItems}
                onLoadMore={loadMorePriorityQueueItems}
                totalCount={priorityQueueTotalCount}
              />
            </div>
          </section>

          <section className="mt-6 rounded-[12px] border border-[#e1e6f0] bg-[rgba(255,255,255,0.9)] p-4 shadow-[0_18px_40px_rgba(42,48,78,0.06)] backdrop-blur-lg">
            <div className="-mx-4 overflow-x-auto px-4 pb-1 md:mx-0 md:px-0">
              <div className="flex min-w-max gap-2 sm:gap-2.5 md:min-w-0 md:flex-wrap">
                {adminTabs.map((tab) => (
                  <AdminTabButton
                    key={tab.id}
                    active={activeTab === tab.id}
                    icon={tab.icon}
                    label={tab.label}
                    count={tab.count}
                    onClick={() => handleSelectTab(tab.id)}
                  />
                ))}
              </div>
            </div>
          </section>

          {activeTab === "brokers" ? (
            <div className="mt-6">
              <AdminSectionCard
                kicker="Broker Management"
                title="Brokers Management"
                subtitle="Approve new registrations, review account status, and keep broker access aligned with current platform standards."
                inlineToolbarOnMobile
                toolbar={
                  <AdminDashboardDateFilter
                    value={brokerDateFilter}
                    onSelectFilter={setBrokerDateFilter}
                    ariaLabel="Filter brokers by join date"
                  />
                }
              >
                <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                  <div className="-mx-4 overflow-x-auto px-4 pb-1 sm:-mx-6 sm:px-6 md:mx-0 md:px-0">
                    <div className="flex min-w-max gap-2 md:min-w-0 md:flex-wrap">
                      {brokerFilters.map((filter) => (
                        <AdminSubTabPill
                          key={filter.id}
                          active={brokerFilter === filter.id}
                          label={filter.label}
                          count={filter.count}
                          variant={filter.id}
                          onClick={() => setBrokerFilter(filter.id)}
                        />
                      ))}
                    </div>
                  </div>

                  <SearchField
                    ariaLabel="Search brokers"
                    value={brokerSearchQuery}
                    onChange={setBrokerSearchQuery}
                    placeholder="Search broker, email, agency"
                    className="w-full xl:max-w-[26rem]"
                  />
                </div>

                <div className={cn("mt-6", ADMIN_TABLE_SURFACE_CLASS)}>
                  <div className={cn(ADMIN_TABLE_HEADER_CLASS, "border-[#edf1f6]", BROKERS_TABLE_DESKTOP_LAYOUT)}>
                    {["Broker", "Agency", "Status", "Credits", "Action"].map((label) => (
                      <p
                        key={label}
                        className={cn(ADMIN_TABLE_HEADER_CELL_CLASS, label === "Action" && "text-right xl:justify-self-end")}
                      >
                        {label}
                      </p>
                    ))}
                  </div>

                  {brokersLoading ? (
                    <AdminTableSkeletonRows columns={5} desktopLayoutClassName={BROKERS_TABLE_DESKTOP_LAYOUT} rows={brokersPageSize} />
                  ) : visibleBrokerUsers.length ? (
                    <div className={ADMIN_TABLE_ROW_GROUP_CLASS}>
                      {paginatedBrokerUsers.map((platformUser) => (
                        <div key={platformUser.id} className={cn(ADMIN_TABLE_ROW_CLASS, "relative w-full overflow-hidden xl:overflow-visible")}>
                          <div className={cn("grid grid-cols-1 items-start gap-2 sm:gap-3 xl:items-center", BROKERS_TABLE_DESKTOP_LAYOUT)}>
                            <div className="min-w-0">
                              <p className={cn(ADMIN_TABLE_MOBILE_LABEL_CLASS, "xl:hidden")}>Broker</p>
                              <div className="flex min-w-0 items-center gap-3 xl:gap-4">
                                <BrokerAvatar
                                  src={platformUser.brokerProfile?.profile_photo}
                                  alt={`${getFullName(platformUser.first_name, platformUser.last_name)} profile photo`}
                                  className="h-12 w-12 shrink-0 border border-[#dfe4ee] bg-white xl:h-14 xl:w-14"
                                />
                                <div className="min-w-0 flex-1">
                                  <p className={cn(ADMIN_TABLE_TITLE_CLASS, "line-clamp-1 pr-20 xl:block xl:pr-0")}>
                                    {getFullName(platformUser.first_name, platformUser.last_name)}
                                  </p>
                                  <p className={cn(ADMIN_TABLE_BODY_TEXT_CLASS, "hidden xl:block xl:line-clamp-none")}>
                                    {platformUser.email} | Joined {formatDate(platformUser.created_at)}
                                  </p>
                                </div>
                              </div>
                              <div className="mt-2 grid min-w-0 gap-1 xl:hidden">
                                <p className={cn(ADMIN_TABLE_BODY_TEXT_CLASS, "mt-0 break-all")}>{platformUser.email || "Email unavailable"}</p>
                                <p className={cn(ADMIN_TABLE_META_TEXT_CLASS, "mt-0")}>Joined {formatDate(platformUser.created_at)}</p>
                              </div>
                              <div className="admin-tablet-badge-strip mt-2 flex w-full min-w-0 items-center justify-between gap-2 xl:hidden">
                                <span className="admin-tablet-badge-primary inline-flex min-h-[26px] min-w-0 flex-1 items-center rounded-full border border-[#e2e7f0] bg-[#f8faff] px-2 py-0.5 text-xs font-semibold text-[#4f5c73]">
                                  <span className="min-w-0 truncate">{platformUser.agency?.name || "No agency"}</span>
                                </span>
                                <span className="admin-tablet-badge-group flex shrink-0 items-center gap-2">
                                  <AdminStatusBadge status={platformUser.status} label={formatUserStatus(platformUser.status)} className="admin-tablet-badge min-h-[26px] px-2 py-0.5 text-xs" />
                                  <span className="admin-tablet-badge inline-flex min-h-[26px] shrink-0 items-center whitespace-nowrap rounded-full border border-[#e2e7f0] bg-white px-2 py-0.5 text-xs font-semibold text-[#4f5c73]">
                                    {platformUser.credits?.available_credits || 0}/{platformUser.credits?.total_credits_assigned || 0} credits
                                  </span>
                                </span>
                              </div>
                            </div>

                            <div className="hidden xl:block">
                              <p className={cn(ADMIN_TABLE_MOBILE_LABEL_CLASS, "xl:hidden")}>Agency</p>
                              <p className="mt-0.5 break-words text-[14px] font-semibold text-[#28324a] xl:mt-1 xl:text-[15px]">{platformUser.agency?.name || "No agency"}</p>
                            </div>

                            <div className="hidden xl:block">
                              <p className={cn(ADMIN_TABLE_MOBILE_LABEL_CLASS, "xl:hidden")}>Status</p>
                              <div className="mt-1">
                                <AdminStatusBadge status={platformUser.status} label={formatUserStatus(platformUser.status)} />
                              </div>
                            </div>

                            <div className="hidden xl:block">
                              <p className={cn(ADMIN_TABLE_MOBILE_LABEL_CLASS, "xl:hidden")}>Credits</p>
                              <p className={cn("mt-1", ADMIN_TABLE_VALUE_CLASS)}>
                                {platformUser.credits?.available_credits || 0}/{platformUser.credits?.total_credits_assigned || 0}
                              </p>
                            </div>

                            <div className="absolute right-2 top-2 mb-0 flex h-fit shrink-0 justify-end whitespace-nowrap pb-0 xl:static xl:col-start-auto xl:row-start-auto xl:self-auto xl:justify-end">
                              <button
                                type="button"
                                className={cn(ADMIN_TABLE_ACTION_BUTTON_BASE, ADMIN_TABLE_ACTION_BUTTON_NEUTRAL, "mb-0 shrink-0 whitespace-nowrap")}
                                onClick={() => router.push(`/admin/brokers/${platformUser.id}`)}
                              >
                                Review
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-5">
                      <AdminBlankState
                        title={normalizedBrokerSearchQuery ? "No results found" : "No brokers found"}
                        description={
                          normalizedBrokerSearchQuery
                            ? "No broker accounts match your search with the current status and date filters."
                            : "No broker accounts match the selected status and date filters."
                        }
                      />
                    </div>
                  )}
                </div>

                {visibleBrokerUsers.length ? (
                  <ListPaginationControls
                    pagination={brokersPagination}
                    pageSizeOptions={brokerPageSizeOptions}
                    itemLabel="brokers"
                    onPageChange={setBrokersPage}
                    onPageSizeChange={handleBrokersPageSizeChange}
                  />
                ) : null}
              </AdminSectionCard>
            </div>
          ) : null}

          {activeTab === "listings" ? (
            <div className="mt-6">
              <AdminSectionCard
                kicker="Listing Moderation"
                title="Listings Management"
                subtitle="Review listing submissions, keep live inventory clean, and inspect every broker-owned record without changing current admin workflows."
                inlineToolbarOnMobile
                toolbar={
                  <AdminDashboardDateFilter
                    value={listingDateFilter}
                    onSelectFilter={setListingDateFilter}
                    ariaLabel="Filter listings by created date"
                  />
                }
              >
                <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                  <div className="-mx-4 overflow-x-auto px-4 pb-1 sm:-mx-6 sm:px-6 md:mx-0 md:px-0">
                    <div className="flex min-w-max gap-2 md:min-w-0 md:flex-wrap">
                      {listingFilters.map((filter) => (
                        <AdminSubTabPill
                          key={filter.id}
                          active={listingFilter === filter.id}
                          label={filter.label}
                          count={filter.count}
                          variant={filter.id}
                          onClick={() => setListingFilter(filter.id)}
                        />
                      ))}
                    </div>
                  </div>

                  <SearchField
                    ariaLabel="Search listings"
                    value={listingSearchQuery}
                    onChange={setListingSearchQuery}
                    placeholder="Search title, area, owner, type"
                    className="w-full xl:max-w-[26rem]"
                  />
                </div>

                <div className={cn("mt-6", ADMIN_TABLE_SURFACE_CLASS)}>
                  <div className={cn(ADMIN_TABLE_HEADER_CLASS, "border-b border-[#edf1f6] xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,0.85fr)_minmax(0,0.8fr)_auto] xl:gap-4")}>
                    {["Listing", "Owner", "Status", "Price", "Action"].map((label) => (
                      <p key={label} className={ADMIN_TABLE_HEADER_CELL_CLASS}>
                        {label}
                      </p>
                    ))}
                  </div>

                  {listingsLoading ? (
                    <AdminTableSkeletonRows
                      columns={5}
                      desktopLayoutClassName="xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,0.85fr)_minmax(0,0.8fr)_auto] xl:gap-4"
                      rows={listingsPageSize}
                    />
                  ) : visibleListings.length ? (
                    <div className={ADMIN_TABLE_ROW_GROUP_CLASS}>
                      {paginatedListings.map((listing) => (
                        <div key={listing.id} className={cn(ADMIN_TABLE_ROW_CLASS, "relative w-full overflow-hidden xl:overflow-visible")}>
                          <div className="grid grid-cols-1 items-start gap-2 sm:gap-3 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,0.85fr)_minmax(0,0.8fr)_auto] xl:items-center xl:gap-4">
                            <div className="min-w-0">
                              <div className="min-w-0 pr-20 xl:pr-0">
                                <p className={cn(ADMIN_TABLE_MOBILE_LABEL_CLASS, "xl:hidden")}>Listing</p>
                                <p className={cn(ADMIN_TABLE_TITLE_CLASS, "line-clamp-2 xl:block")}>{listing.title}</p>
                                <p className={cn(ADMIN_TABLE_BODY_TEXT_CLASS, "line-clamp-2 xl:line-clamp-none")}>
                                  {listing.area?.name || "Area pending"} | {formatPropertyType(listing.property_type)}
                                </p>
                                <p className={cn(ADMIN_TABLE_META_TEXT_CLASS, "line-clamp-1 xl:line-clamp-none")}>Added {formatDate(listing.created_at)}</p>
                              </div>
                              <div className="admin-tablet-badge-strip mt-2 flex w-full min-w-0 items-center justify-between gap-2 xl:hidden">
                                <span className="admin-tablet-badge-primary inline-flex min-h-[26px] min-w-0 flex-1 items-center rounded-full border border-[#e2e7f0] bg-[#f8faff] px-2 py-0.5 text-xs font-semibold text-[#4f5c73]">
                                  <span className="min-w-0 truncate">{listing.owner ? getFullName(listing.owner.first_name, listing.owner.last_name) : "Owner"}</span>
                                </span>
                                <span className="admin-tablet-badge-group flex shrink-0 items-center gap-2">
                                  <AdminStatusBadge
                                    status={listing.deleted_at ? "deleted" : listing.status}
                                    label={formatListingDisplayStatus(listing.status, listing.deleted_at)}
                                    className="admin-tablet-badge min-h-[26px] px-2 py-0.5 text-xs"
                                  />
                                  <span className="admin-tablet-badge inline-flex min-h-[26px] shrink-0 items-center whitespace-nowrap rounded-full border border-[#e2e7f0] bg-white px-2 py-0.5 text-xs font-semibold text-[#4f5c73]">
                                    {formatCurrency(listing.price)}
                                  </span>
                                </span>
                              </div>
                            </div>

                            <div className="hidden xl:block">
                              <p className={cn(ADMIN_TABLE_MOBILE_LABEL_CLASS, "xl:hidden")}>Owner</p>
                              <p className="mt-0.5 break-words text-[14px] font-semibold text-[#28324a] xl:mt-1 xl:text-[15px]">
                                {listing.owner ? getFullName(listing.owner.first_name, listing.owner.last_name) : "Owner"}
                              </p>
                            </div>

                            <div className="hidden xl:block">
                              <p className={cn(ADMIN_TABLE_MOBILE_LABEL_CLASS, "xl:hidden")}>Status</p>
                              <div className="mt-1">
                                <AdminStatusBadge
                                  status={listing.deleted_at ? "deleted" : listing.status}
                                  label={formatListingDisplayStatus(listing.status, listing.deleted_at)}
                                />
                              </div>
                            </div>

                            <div className="hidden xl:block">
                              <p className={cn(ADMIN_TABLE_MOBILE_LABEL_CLASS, "xl:hidden")}>Price</p>
                              <p className={cn("mt-1", ADMIN_TABLE_VALUE_CLASS)}>{formatCurrency(listing.price)}</p>
                            </div>

                            <div className="absolute right-2 top-2 mb-0 flex h-fit shrink-0 justify-end whitespace-nowrap pb-0 xl:static xl:col-start-auto xl:row-start-auto xl:self-auto xl:justify-end">
                              <button
                                type="button"
                                className={cn(ADMIN_TABLE_ACTION_BUTTON_BASE, ADMIN_TABLE_ACTION_BUTTON_NEUTRAL, "mb-0 shrink-0 whitespace-nowrap")}
                                onClick={() => router.push(getListingDetailHref(listing.id))}
                              >
                                Review
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-5">
                      <AdminBlankState
                        title={normalizedListingSearchQuery ? "No results found" : "No listings found"}
                        description={
                          normalizedListingSearchQuery
                            ? "No listings match your search with the current status and date filters."
                            : "No listings match the selected status and date filters."
                        }
                      />
                    </div>
                  )}
                </div>

                {visibleListings.length ? (
                  <ListPaginationControls
                    pagination={listingsPagination}
                    pageSizeOptions={listingPageSizeOptions}
                    itemLabel="listings"
                    onPageChange={setListingsPage}
                    onPageSizeChange={handleListingsPageSizeChange}
                  />
                ) : null}
              </AdminSectionCard>
            </div>
          ) : null}

          {activeTab === "chats" ? (
            <div className="mt-4 w-full min-w-0 max-w-full md:mt-6">
              <AdminSectionCard
                kicker="Chat Monitoring"
                title="Live Chat Oversight"
                subtitle="Monitor broker conversations in real time with the same read-only behavior that already exists, now presented in a cleaner premium workspace."
                compactOnMobile
                toolbar={
                  <AdminDashboardDateFilter
                    value={chatDateFilter}
                    onSelectFilter={setChatDateFilter}
                    ariaLabel="Filter chats by last activity date"
                  />
                }
              >
                <AdminChatWorkspace
                  chatGroups={visibleChatGroups}
                  selectedListingId={selectedChatListingId}
                  selectedConversationId={selectedConversationId}
                  hasMoreChatGroups={adminChatHasMore}
                  isLoadingChatGroups={adminChatLoading}
                  stateResetKey={sessionUserId ?? "signed-out"}
                  totalConversationCount={adminChatTotalConversations || overview.metrics.totalChats}
                  onLoadMoreChatGroups={handleLoadMoreAdminChats}
                  onSelectListing={(listingId, conversationId) => {
                    setSelectedChatListingId(listingId);
                    setSelectedConversationId(conversationId);
                  }}
                  onSelectConversation={setSelectedConversationId}
                  getListingDetailHref={getListingDetailHref}
                />
              </AdminSectionCard>
            </div>
          ) : null}

          {activeTab === "requirements" ? (
            <div className="mt-6">
              <AdminSectionCard
                kicker="Requirement Oversight"
                title="Requirements Management"
                subtitle="Review buyer requirements, inspect full brief details, and moderate requirement status from the workspace without changing the existing requirement or match workflows."
                inlineToolbarOnMobile
                toolbar={
                  <AdminDashboardDateFilter
                    value={requirementsDateFilter}
                    onSelectFilter={setRequirementsDateFilter}
                    ariaLabel="Filter requirements by created date"
                  />
                }
              >
                <AdminRequirementsWorkspace
                  requirements={requirementsItems}
                  counts={requirementsCounts}
                  dateFilter={requirementsDateFilter}
                  isLoading={requirementsLoading}
                  listingReturnHref={currentAdminReturnHref}
                  pagination={requirementsPagination}
                  stateResetKey={sessionUserId ?? "signed-out"}
                  onPageChange={setRequirementsPage}
                  onPageSizeChange={handleRequirementsPageSizeChange}
                  onQueryChange={handleRequirementsQueryChange}
                  onRefresh={async () => {
                    clearActivityResponse();
                    await Promise.all([loadOverview(), refreshRequirementsResponse()]);
                  }}
                />
              </AdminSectionCard>
            </div>
          ) : null}

          {activeTab === "enquiries" ? (
            <div className="mt-6">
              <AdminSectionCard
                kicker="Enquiry Oversight"
                title="Enquiries"
                subtitle="Review public enquiry activity, broker ownership, and email reply history across the marketplace."
                inlineToolbarOnMobile
                toolbar={
                  <AdminDashboardDateFilter
                    value={enquiriesDateFilter}
                    onSelectFilter={setEnquiriesDateFilter}
                    ariaLabel="Filter enquiries by created date"
                  />
                }
              >
                <AdminEnquiriesWorkspace
                  enquiries={enquiriesItems}
                  counts={enquiriesCounts}
                  dateFilter={enquiriesDateFilter}
                  getListingDetailHref={getListingDetailHref}
                  isLoading={enquiriesLoading}
                  pagination={enquiriesPagination}
                  stateResetKey={sessionUserId ?? "signed-out"}
                  onPageChange={setEnquiriesPage}
                  onPageSizeChange={handleEnquiriesPageSizeChange}
                  onQueryChange={handleEnquiriesQueryChange}
                />
              </AdminSectionCard>
            </div>
          ) : null}

          {activeTab === "leads" ? (
            <div className="mt-6">
              <AdminSectionCard
                kicker="Lead Capture"
                title="Leads"
                subtitle="Review Coming Soon form submissions with admin search, date filters, pagination, and CSV export."
                toolbar={
                  <AdminDashboardDateFilter
                    value={leadsDateFilter}
                    onSelectFilter={setLeadsDateFilter}
                    ariaLabel="Filter leads by submitted date"
                  />
                }
              >
                <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                  <p className="text-[14px] text-[#657186]">
                    {visibleComingSoonRegistrations.length} visible | {leadsTotalCount} total
                  </p>

                  <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center xl:w-auto">
                    <SearchField
                      ariaLabel="Search leads"
                      value={leadsSearchQuery}
                      onChange={setLeadsSearchQuery}
                      placeholder="Search name, email, phone, company"
                      className="w-full sm:min-w-[22rem] xl:max-w-[26rem]"
                    />
                    <button
                      type="button"
                      className={cn(ADMIN_TABLE_ACTION_BUTTON_BASE, ADMIN_TABLE_ACTION_BUTTON_PRIMARY, "min-h-[44px] px-5")}
                      onClick={() => void handleExportLeadsCsv()}
                    >
                      Export CSV
                    </button>
                  </div>
                </div>

                <div className={cn("mt-6", ADMIN_TABLE_SURFACE_CLASS)}>
                  <div className={cn(ADMIN_TABLE_HEADER_CLASS, "border-b border-[#edf1f6]", LEADS_TABLE_DESKTOP_LAYOUT)}>
                    {["Lead", "Company & Role", "Contact", "Submitted"].map((label) => (
                      <p key={label} className={ADMIN_TABLE_HEADER_CELL_CLASS}>
                        {label}
                      </p>
                    ))}
                  </div>

                  {leadsLoading ? (
                    <AdminTableSkeletonRows columns={4} desktopLayoutClassName={LEADS_TABLE_DESKTOP_LAYOUT} rows={leadsPageSize} />
                  ) : visibleComingSoonRegistrations.length ? (
                    <div className={ADMIN_TABLE_ROW_GROUP_CLASS}>
                      {paginatedComingSoonRegistrations.map((lead) => (
                        <div key={lead.id} className={ADMIN_TABLE_ROW_CLASS}>
                          <div className={cn("grid gap-2 sm:gap-3 xl:items-center", LEADS_TABLE_DESKTOP_LAYOUT)}>
                            <div className="min-w-0">
                              <p className={cn(ADMIN_TABLE_MOBILE_LABEL_CLASS, "xl:hidden")}>Lead</p>
                              <p className={ADMIN_TABLE_TITLE_CLASS}>{getComingSoonLeadName(lead)}</p>
                              <p className={cn(ADMIN_TABLE_BODY_TEXT_CLASS, "break-all")}>{lead.email}</p>
                              <p className={ADMIN_TABLE_META_TEXT_CLASS}>ID {lead.id.slice(0, 8)}</p>
                              <div className="mt-2 grid min-w-0 gap-1.5 xl:hidden">
                                <p className="min-w-0 break-words text-[13px] font-semibold text-[#28324a]">
                                  {lead.company_agency_name} | {lead.role_name}
                                </p>
                                <p className="min-w-0 break-words text-[12px] leading-5 text-[#667086]">
                                  WhatsApp: {lead.whatsapp_number}
                                </p>
                                <p className="min-w-0 break-all text-[12px] leading-5 text-[#667086]">
                                  Instagram: {formatLeadOptionalValue(lead.instagram_handle)}
                                </p>
                                <p className="text-[12px] font-semibold text-[#8a93a6]">Submitted {formatDateTime(lead.created_at)}</p>
                              </div>
                            </div>
                            <div className="hidden min-w-0 xl:block">
                              <p className={cn(ADMIN_TABLE_MOBILE_LABEL_CLASS, "xl:hidden")}>Company & Role</p>
                              <p className="mt-0.5 break-words text-[14px] font-semibold text-[#28324a] xl:mt-1 xl:text-[15px]">{lead.company_agency_name}</p>
                              <p className={ADMIN_TABLE_BODY_TEXT_CLASS}>{lead.role_name}</p>
                            </div>
                            <div className="hidden min-w-0 xl:block">
                              <p className={cn(ADMIN_TABLE_MOBILE_LABEL_CLASS, "xl:hidden")}>Contact</p>
                              <p className="mt-0.5 break-words text-[14px] font-semibold text-[#28324a] xl:mt-1 xl:text-[15px]">{lead.whatsapp_number}</p>
                              <p className={cn(ADMIN_TABLE_BODY_TEXT_CLASS, "break-all")}>Instagram: {formatLeadOptionalValue(lead.instagram_handle)}</p>
                            </div>
                            <div className="hidden min-w-0 xl:block">
                              <p className={cn(ADMIN_TABLE_MOBILE_LABEL_CLASS, "xl:hidden")}>Submitted</p>
                              <p className={ADMIN_TABLE_META_TEXT_CLASS}>{formatDateTime(lead.created_at)}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-5">
                      <AdminBlankState
                        title={normalizedLeadsSearchQuery ? "No results found" : "No leads found"}
                        description={
                          normalizedLeadsSearchQuery
                            ? "No Coming Soon submissions match your search with the current date filter."
                            : "No Coming Soon submissions match the selected date filter."
                        }
                      />
                    </div>
                  )}
                </div>

                {visibleComingSoonRegistrations.length ? (
                  <ListPaginationControls
                    pagination={leadsPagination}
                    pageSizeOptions={leadsPageSizeOptions}
                    itemLabel="leads"
                    onPageChange={setLeadsPage}
                    onPageSizeChange={handleLeadsPageSizeChange}
                  />
                ) : null}
              </AdminSectionCard>
            </div>
          ) : null}

          {activeTab === "activity" ? (
            <div className="mt-6">
              <AdminSectionCard
                kicker="Activity Overview"
                title="Recent Platform Events"
                subtitle="Trace broker actions, listing updates, credit changes, and system events without changing the underlying activity workflow."
                inlineToolbarOnMobile
                toolbar={
                  <AdminDashboardDateFilter
                    value={activityDateFilter}
                    onSelectFilter={handleSelectActivityDateFilter}
                    ariaLabel="Filter activity by date"
                  />
              }
            >
              <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                  <div className="-mx-4 overflow-x-auto px-4 pb-1 sm:-mx-6 sm:px-6 md:mx-0 md:px-0">
                    <div className="flex min-w-max gap-1 md:min-w-0 md:flex-wrap">
                      {activityFilters.map((filter) => (
                        <AdminSubTabPill
                          key={filter.id}
                          active={activityFilter === filter.id}
                          label={filter.label}
                          count={filter.count}
                          variant={filter.id}
                          onClick={() => handleSelectActivityFilter(filter.id)}
                        />
                      ))}
                    </div>
                  </div>

                  <SearchField
                    ariaLabel="Search activity"
                    value={activitySearchQuery}
                    onChange={(value) => {
                      setActivitySearchQuery(value);
                      setActivityPage(1);
                    }}
                    placeholder="Search action, actor, entity, date"
                    className="w-full xl:max-w-[26rem]"
                  />
                </div>

                <div className="mt-6 space-y-4">
                  {activityBodyLoading ? (
                    <AdminActivitySkeletonCards rows={activityPageSize} />
                  ) : resolvedActivity.length ? (
                    <div className="space-y-4">
                      {resolvedActivity.map((log) => (
                        <AdminActivityCard key={log.id} activity={log} onNavigate={(href) => router.push(href)} pinMobileActions />
                      ))}
                    </div>
                  ) : (
                    <AdminBlankState
                      title={normalizedActivitySearchQuery ? "No results found" : "No activity found"}
                      description={
                        normalizedActivitySearchQuery
                          ? "No platform events match your search with the current activity and date filters."
                          : "No platform events match the selected activity and date filters."
                      }
                    />
                  )}
                </div>

                {resolvedActivity.length || (activityBodyLoading && activityResponse) ? (
                  <ListPaginationControls
                    pagination={activityPagination}
                    itemLabel="events"
                    onPageChange={handleActivityPageChange}
                    onPageSizeChange={handleActivityPageSizeChange}
                  />
                ) : null}
              </AdminSectionCard>
            </div>
          ) : null}
        </div>
      </div>
    </AppShell>
  );
}

export default function AdminWorkspace() {
  return (
    <Suspense fallback={<AdminSkeleton />}>
      <AdminPageContent />
    </Suspense>
  );
}
