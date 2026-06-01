"use client";

import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, usePathname, useRouter, useSearchParams } from "next/navigation";
import { useSnackbar } from "notistack";
import {
  AdminDashboardDateFilter,
  createAdminDashboardDateFilterValue,
  matchesAdminDashboardDateRange,
  type AdminDashboardDateFilterValue,
} from "@/app/admin/_components/AdminDashboardDateFilter";
import { AdminActivityCard, resolveAdminActivityLog } from "@/app/admin/_components/AdminActivityFeed";
import { AdminBrokerSocialLinks } from "@/app/admin/_components/AdminBrokerSocialLinks";
import { AdminEnquiriesWorkspace } from "@/app/admin/_components/AdminEnquiriesWorkspace";
import {
  ADMIN_TABLE_ACTION_BUTTON_BASE,
  ADMIN_TABLE_ACTION_BUTTON_NEUTRAL,
  ADMIN_TABLE_BODY_TEXT_CLASS,
  ADMIN_TABLE_HEADER_CELL_CLASS,
  ADMIN_TABLE_HEADER_CLASS,
  ADMIN_TABLE_META_TEXT_CLASS,
  ADMIN_TABLE_MOBILE_LABEL_CLASS,
  ADMIN_TABLE_ROW_CLASS,
  ADMIN_TABLE_ROW_GROUP_CLASS,
  ADMIN_TABLE_SURFACE_CLASS,
  ADMIN_TABLE_TITLE_CLASS,
  AdminBlankState,
  AdminSectionCard,
  AdminStatusBadge,
  AdminSubTabPill,
} from "@/app/admin/_components/AdminPanelUi";
import { AdminRequirementsWorkspace } from "@/app/admin/_components/AdminRequirementsWorkspace";
import { AppShell } from "@/components/AppShell";
import { BackButton } from "@/components/BackButton";
import { BrokerAvatar } from "@/components/BrokerAvatar";
import { EmptyState } from "@/components/EmptyState";
import { ListPaginationControls } from "@/components/ListPaginationControls";
import { LoadingScreen } from "@/components/LoadingScreen";
import { SearchField } from "@/components/SearchField";
import { useAuth } from "@/auth/useAuth";
import { useClientPagination } from "@/hooks/useClientPagination";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { createAdminListingDetailHref } from "@/lib/admin-navigation";
import { apiFetch } from "@/lib/deal-api";
import { invalidateAdminOverviewCaches } from "@/lib/client-cache";
import type { AdminBrokerDetail } from "@/lib/deal-types";
import {
  cn,
  formatCurrency,
  formatDate,
  formatDateTime,
  formatListingDisplayStatus,
  formatPropertyType,
  formatUserStatus,
  getFullName,
  isActiveBrokerStatus,
  isActiveListingStatus,
} from "@/lib/deal-utils";
import { getDefaultRouteForUser, isAdmin } from "@/lib/route-access";
import { buildSearchText, normalizeSearchQuery } from "@/lib/search";

type AdminBrokerTabId = "overview" | "listings" | "requirements" | "enquiries" | "activity";
type ListingFilterId = "all" | "pending" | "approved" | "rejected" | "inactive" | "deleted";
type ActivityFilterId = "all" | "listings" | "brokers" | "credits" | "requirements" | "system";
type HeroMetaIconName = "agency" | "rera" | "joined" | "phone" | "application";

const ADMIN_BROKER_TAB_IDS: AdminBrokerTabId[] = ["overview", "listings", "requirements", "enquiries", "activity"];

function isAdminBrokerTabId(value: string | null): value is AdminBrokerTabId {
  return value !== null && ADMIN_BROKER_TAB_IDS.includes(value as AdminBrokerTabId);
}

function getAdminBrokerTabFromSearchParam(value: string | null): AdminBrokerTabId {
  return isAdminBrokerTabId(value) ? value : "overview";
}

function getAdminBrokerTabHref(pathname: string, searchParams: URLSearchParams, tab: AdminBrokerTabId) {
  const nextParams = new URLSearchParams(searchParams.toString());

  if (tab === "overview") {
    nextParams.delete("tab");
  } else {
    nextParams.set("tab", tab);
  }

  const query = nextParams.toString();
  return query ? `${pathname}?${query}` : pathname;
}

function OverviewIconFrame({ icon, className }: { icon: string; className?: string }) {
  return (
    <span
      className={cn(
        "flex h-11 w-11 shrink-0 items-center justify-center rounded-[16px] border border-brand-line/70 bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] text-brand-navy shadow-[0_10px_22px_rgba(15,42,95,0.06)]",
        className
      )}
      aria-hidden="true"
    >
      <AdminIcon name={icon} className="h-5 w-5" />
    </span>
  );
}

function OverviewDetailTile({
  label,
  value,
  icon,
  className,
  valueClassName,
}: {
  label: string;
  value: ReactNode;
  icon: string;
  className?: string;
  valueClassName?: string;
}) {
  return (
    <div
      className={cn(
        "group flex min-w-0 items-start gap-3 rounded-[12px] border border-brand-line/70 bg-white/90 px-4 py-5 shadow-[0_12px_26px_rgba(15,42,95,0.045)]",
        className
      )}
    >
      <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-[12px] border border-brand-line/60 bg-brand-panel-soft text-brand-blue transition duration-200 group-hover:border-brand-blue/20 group-hover:bg-white">
        <AdminIcon name={icon} className="h-[24px] w-[24px]" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-brand-slate">{label}</p>
        <div className={cn("mt-1.5 min-w-0 break-words text-[15px] font-semibold leading-6 text-brand-ink", valueClassName)}>{value}</div>
      </div>
    </div>
  );
}

function HeroMetaItem({
  label,
  value,
  icon,
  align = "left",
}: {
  label: string;
  value: ReactNode;
  icon?: HeroMetaIconName;
  align?: "left" | "right";
}) {
  return (
    <div
      className={cn(
        "flex min-w-0 items-start gap-3 rounded-[16px] border border-white/70 bg-white/[0.82] px-5 py-6 shadow-[0_14px_32px_rgba(15,42,95,0.08)] backdrop-blur",
        align === "right" ? "text-right" : "text-left"
      )}
    >
      {icon ? <HeroMetaIcon name={icon} /> : null}
      <div className="min-w-0 flex-1">
        <p className="micro-copy text-[14px]">{label}</p>
        <div className="mt-2 min-w-0 break-words text-base font-semibold leading-6 text-brand-ink line-clamp-2 xl:truncate xl:text-lg">
          {value}
        </div>
      </div>
    </div>
  );
}

function HeroMetaIcon({ name }: { name: HeroMetaIconName }) {
  const iconClassName = "h-5 w-5";
  const iconStyles: Record<HeroMetaIconName, string> = {
    agency: "border-[#d8e6ff] bg-[linear-gradient(135deg,#edf5ff_0%,#cde0ff_100%)] text-[#2e6bb8]",
    rera: "border-[#f5dfaa] bg-[linear-gradient(135deg,#fff8df_0%,#f3d278_100%)] text-[#9a6d05]",
    joined: "border-[#cdebd6] bg-[linear-gradient(135deg,#edfff4_0%,#bfe8cd_100%)] text-[#24814d]",
    phone: "border-[#d8ddff] bg-[linear-gradient(135deg,#f1f4ff_0%,#d3d9ff_100%)] text-[#4c5bbb]",
    application: "border-[#ead7ff] bg-[linear-gradient(135deg,#fbf5ff_0%,#dfc3ff_100%)] text-[#7a45b6]",
  };

  return (
    <span
      className={cn(
        "flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] border shadow-[0_10px_22px_rgba(31,43,74,0.1)]",
        iconStyles[name]
      )}
      aria-hidden="true"
    >
      {name === "agency" ? (
        <svg viewBox="0 0 24 24" fill="none" className={iconClassName}>
          <path d="M5.5 19V7.5l6.5-3 6.5 3V19M4 19h16M9 10h.01M12 10h.01M15 10h.01M9 13h.01M12 13h.01M15 13h.01M10 19v-3h4v3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ) : null}
      {name === "rera" ? (
        <svg viewBox="0 0 24 24" fill="none" className={iconClassName}>
          <path d="M12 4.25 18.5 7v4.95c0 3.75-2.65 6.45-6.5 7.2-3.85-.75-6.5-3.45-6.5-7.2V7L12 4.25Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
          <path d="M9.2 12.15 11 13.95l3.9-4.05" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ) : null}
      {name === "joined" ? (
        <svg viewBox="0 0 24 24" fill="none" className={iconClassName}>
          <path d="M7 4.5v2.25M17 4.5v2.25M4.75 9.25h14.5M7.5 12.75h2.25M11 12.75h2.25M14.5 12.75h2.25M7.5 16h2.25M11 16h2.25" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          <rect x="4.75" y="6.25" width="14.5" height="13" rx="2.5" stroke="currentColor" strokeWidth="1.8" />
        </svg>
      ) : null}
      {name === "phone" ? (
        <svg viewBox="0 0 24 24" fill="none" className={iconClassName}>
          <path d="M8.25 5.25h2.55l1 4.05-1.75 1.65a13.2 13.2 0 0 0 3.05 3.05l1.65-1.75 4.05 1v2.55a2 2 0 0 1-2.1 2A14.3 14.3 0 0 1 6.25 7.35a2 2 0 0 1 2-2.1Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ) : null}
      {name === "application" ? (
        <svg viewBox="0 0 24 24" fill="none" className={iconClassName}>
          <path d="M7 4.75h6l4 4V18a1.75 1.75 0 0 1-1.75 1.75h-8.5A1.75 1.75 0 0 1 5 18V6.75A2 2 0 0 1 7 4.75Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
          <path d="M13 5v4h4M8.25 12.5h7M8.25 15.75h5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      ) : null}
    </span>
  );
}

function brokerStatusBadgeClasses(status: string | null | undefined) {
  switch (status) {
    case "active":
    case "approved":
      return "border-[#e9fff1] bg-[#20b762] text-white shadow-[0_12px_28px_rgba(32,183,98,0.36)]";
    case "pending":
      return "border-[#fff6de] bg-[#e2a52f] text-white shadow-[0_12px_28px_rgba(226,165,47,0.34)]";
    case "rejected":
    case "deactivated":
      return "border-[#fff0ef] bg-[#d8584d] text-white shadow-[0_12px_28px_rgba(216,88,77,0.32)]";
    case "suspended":
      return "border-[#f1f4f8] bg-[#778397] text-white shadow-[0_12px_28px_rgba(94,107,128,0.3)]";
    default:
      return "border-[#f1f4f8] bg-[#607089] text-white shadow-[0_12px_28px_rgba(75,88,112,0.28)]";
  }
}

function AdminIcon({ name, className }: { name: string; className?: string }) {
  const classes = cn("h-6 w-6", className);

  switch (name) {
    case "overview":
      return (
        <svg viewBox="0 0 24 24" fill="none" className={classes} aria-hidden="true">
          <rect x="4" y="5" width="16" height="14" rx="2.5" stroke="currentColor" strokeWidth="1.8" />
          <path d="M8 9h8M8 13h8M8 17h5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      );
    case "listings":
      return (
        <svg viewBox="0 0 24 24" fill="none" className={classes} aria-hidden="true">
          <rect x="4" y="5" width="12" height="14" rx="2.5" stroke="currentColor" strokeWidth="1.8" />
          <path d="M8 9h4M8 13h4M19 10v8M15 14h8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      );
    case "requirements":
      return (
        <svg viewBox="0 0 24 24" fill="none" className={classes} aria-hidden="true">
          <path d="M8.5 11a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5ZM15.5 11a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z" stroke="currentColor" strokeWidth="1.8" />
          <path d="M4.5 18a4 4 0 0 1 8 0M11.5 18a4 4 0 0 1 8 0" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      );
    case "activity":
      return (
        <svg viewBox="0 0 24 24" fill="none" className={classes} aria-hidden="true">
          <path d="M5 17.5h14M6.5 7h11M8 12.25h8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          <path d="M5.5 17.5a1.75 1.75 0 1 0 0-3.5 1.75 1.75 0 0 0 0 3.5ZM18.5 8.75a1.75 1.75 0 1 0 0-3.5 1.75 1.75 0 0 0 0 3.5ZM12 14a1.75 1.75 0 1 0 0-3.5 1.75 1.75 0 0 0 0 3.5Z" fill="currentColor" />
        </svg>
      );
    case "status":
      return (
        <svg viewBox="0 0 24 24" fill="none" className={classes} aria-hidden="true">
          <path d="M12 4.75 18.25 7.5v4.75c0 3.75-2.55 6.35-6.25 7-3.7-.65-6.25-3.25-6.25-7V7.5L12 4.75Z" stroke="currentColor" strokeWidth="1.6" />
          <path d="m9.25 12.1 1.8 1.8 3.9-4.05" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case "credits":
      return (
        <svg viewBox="0 0 24 24" fill="none" className={classes} aria-hidden="true">
          <path d="M5.5 8.25h13v9a2 2 0 0 1-2 2h-9a2 2 0 0 1-2-2v-9Z" stroke="currentColor" strokeWidth="1.6" />
          <path d="M8 8.25V6.5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v1.75M9 13h6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      );
    case "spark":
      return (
        <svg viewBox="0 0 24 24" fill="none" className={classes} aria-hidden="true">
          <path d="M13 3 6 14h5l-1 7 8-12h-5l0-6Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
        </svg>
      );
    case "trophy":
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
    case "contact":
      return (
        <svg viewBox="0 0 24 24" fill="none" className={classes} aria-hidden="true">
          <path d="M8.2 5h2.6l1 4-1.8 1.7a13.5 13.5 0 0 0 3.3 3.3l1.7-1.8 4 1v2.6a1.8 1.8 0 0 1-1.9 1.8A14.9 14.9 0 0 1 6.4 6.9 1.8 1.8 0 0 1 8.2 5Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case "agency":
      return (
        <svg viewBox="0 0 24 24" fill="none" className={classes} aria-hidden="true">
          <path d="M5.5 19V7.5l6.5-3 6.5 3V19M4 19h16M9 10h.01M12 10h.01M15 10h.01M9 13h.01M12 13h.01M15 13h.01M10 19v-3h4v3" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case "user":
      return (
        <svg viewBox="0 0 24 24" fill="none" className={classes} aria-hidden="true">
          <circle cx="12" cy="8.5" r="3.25" stroke="currentColor" strokeWidth="1.8" />
          <path d="M5.75 19a6.25 6.25 0 0 1 12.5 0" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      );
    case "id-card":
      return (
        <svg viewBox="0 0 24 24" fill="none" className={classes} aria-hidden="true">
          <rect x="4.5" y="6" width="15" height="12" rx="2.5" stroke="currentColor" strokeWidth="1.8" />
          <circle cx="9" cy="11" r="1.75" stroke="currentColor" strokeWidth="1.6" />
          <path d="M7 15h4M13.5 10h3.25M13.5 13.25h3.25" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
        </svg>
      );
    case "star":
      return (
        <svg viewBox="0 0 24 24" fill="none" className={classes} aria-hidden="true">
          <path d="m12 4.75 2.05 4.15 4.6.67-3.33 3.25.79 4.58L12 15.24 7.89 17.4l.79-4.58-3.33-3.25 4.6-.67L12 4.75Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
        </svg>
      );
    case "briefcase":
      return (
        <svg viewBox="0 0 24 24" fill="none" className={classes} aria-hidden="true">
          <path d="M8.25 8V6.75A2.25 2.25 0 0 1 10.5 4.5h3A2.25 2.25 0 0 1 15.75 6.75V8M5.5 10.5h13M9.5 13h5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          <rect x="4.75" y="8" width="14.5" height="11" rx="2.5" stroke="currentColor" strokeWidth="1.8" />
        </svg>
      );
    case "calendar":
      return (
        <svg viewBox="0 0 24 24" fill="none" className={classes} aria-hidden="true">
          <path d="M7 4.5v2.25M17 4.5v2.25M4.75 9.25h14.5M8 13h2.25M12 13h2.25M8 16h2.25" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          <rect x="4.75" y="6.25" width="14.5" height="13" rx="2.5" stroke="currentColor" strokeWidth="1.8" />
        </svg>
      );
    case "check-circle":
      return (
        <svg viewBox="0 0 24 24" fill="none" className={classes} aria-hidden="true">
          <circle cx="12" cy="12" r="7.25" stroke="currentColor" strokeWidth="1.8" />
          <path d="m8.75 12.15 2.15 2.15 4.55-4.85" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case "clock":
      return (
        <svg viewBox="0 0 24 24" fill="none" className={classes} aria-hidden="true">
          <circle cx="12" cy="12" r="7.25" stroke="currentColor" strokeWidth="1.8" />
          <path d="M12 8.25v4.25l2.75 1.65" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case "mail":
      return (
        <svg viewBox="0 0 24 24" fill="none" className={classes} aria-hidden="true">
          <rect x="4.5" y="6.75" width="15" height="10.5" rx="2.25" stroke="currentColor" strokeWidth="1.8" />
          <path d="m5.5 8.25 6.5 5 6.5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case "phone":
      return (
        <svg viewBox="0 0 24 24" fill="none" className={classes} aria-hidden="true">
          <path d="M8.25 5.25h2.55l1 4.05-1.75 1.65a13.2 13.2 0 0 0 3.05 3.05l1.65-1.75 4.05 1v2.55a2 2 0 0 1-2.1 2A14.3 14.3 0 0 1 6.25 7.35a2 2 0 0 1 2-2.1Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case "whatsapp":
      return (
        <svg viewBox="0 0 24 24" fill="none" className={classes} aria-hidden="true">
          <path d="M5.6 18.4 6.8 15.5a6.85 6.85 0 1 1 2.1 2.05L5.6 18.4Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
          <path d="M9.45 9.25c.2 2.15 1.95 4 4.3 4.55l1.05-1.05" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case "share":
      return (
        <svg viewBox="0 0 24 24" fill="none" className={classes} aria-hidden="true">
          <circle cx="7" cy="12" r="2.25" stroke="currentColor" strokeWidth="1.8" />
          <circle cx="17" cy="7" r="2.25" stroke="currentColor" strokeWidth="1.8" />
          <circle cx="17" cy="17" r="2.25" stroke="currentColor" strokeWidth="1.8" />
          <path d="m9.05 11 5.9-2.95M9.05 13l5.9 2.95" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      );
    default:
      return (
        <svg viewBox="0 0 24 24" fill="none" className={classes} aria-hidden="true">
          <circle cx="12" cy="8" r="3.5" stroke="currentColor" strokeWidth="1.8" />
          <path d="M5.5 19a6.5 6.5 0 0 1 13 0" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      );
  }
}

function DashboardKpiCard({
  icon,
  title,
  value,
  helper,
  accent,
}: {
  icon: string;
  title: string;
  value: ReactNode;
  helper: string;
  accent: string;
}) {
  return (
    <div className="relative isolate min-h-[142px] min-w-0 overflow-hidden rounded-[10px] border border-[rgba(255,255,255,0.16)] bg-[#22170f] px-3 py-4 text-white shadow-[0_18px_34px_rgba(26,18,10,0.24)] transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_24px_44px_rgba(26,18,10,0.28)] sm:min-h-[160px] sm:px-4 sm:py-5 xl:min-h-[184px] xl:px-6 xl:py-7">
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: "url('/assets/kpi_cards.png')",
          backgroundPosition: "center",
          backgroundSize: "cover",
          backgroundRepeat: "no-repeat",
        }}
      />
      <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(20,14,10,0.38)_0%,rgba(20,14,10,0.18)_40%,rgba(20,14,10,0.34)_100%)]" />
      <div className="relative min-w-0">
        <div className="flex min-w-0 items-center gap-2 text-[#e1ad4f] sm:gap-3">
          <AdminIcon name={icon} className="h-6 w-6 shrink-0 sm:h-7 sm:w-7 xl:h-[34px] xl:w-[34px]" />
          <p className="min-w-0 break-words text-sm font-semibold tracking-[-0.02em] text-white line-clamp-2 xl:truncate sm:text-base xl:text-[21px]">
            {title}
          </p>
        </div>
        <div className="mt-4 flex min-w-0 flex-col gap-2 sm:flex-row sm:items-end sm:gap-4 xl:mt-5 xl:gap-5">
          <p className="min-w-0 break-words text-[30px] font-semibold leading-none tracking-[-0.06em] sm:text-[40px] md:text-[46px] xl:text-[58px]">{value}</p>
          <div className="min-w-0 pb-[3px]">
            <p className="break-words text-xs leading-[1.25] text-white sm:text-sm xl:text-[16px] xl:leading-[1.2]">{helper}</p>
            <p className="mt-1 break-words text-xs font-medium leading-[1.25] text-[#98d0a9] sm:text-sm xl:mt-2">{accent}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function getBrokerDetailListingSearchText(listing: AdminBrokerDetail["broker"]["listings"][number]) {
  return buildSearchText([
    listing.title,
    listing.area?.name,
    listing.area?.city,
    listing.developer,
    formatPropertyType(listing.property_type),
    formatListingDisplayStatus(listing.status, listing.deleted_at),
    listing.status,
  ]);
}

function getBrokerDetailActivitySearchText(activity: ReturnType<typeof resolveAdminActivityLog>) {
  return buildSearchText([
    activity.actionLabel,
    activity.summary,
    activity.categoryLabel,
    activity.targetEntityLabel,
    activity.targetTitle,
    activity.targetSubtitle,
    activity.actorName,
    activity.actorSubtitle,
    activity.created_at,
    formatDateTime(activity.created_at),
    activity.metaRows.map((row) => `${row.label} ${row.value}`),
    activity.changes.map((change) => `${change.label} ${change.before || ""} ${change.after || ""}`),
    activity.enquiryDetails?.title,
    activity.enquiryDetails?.message,
    activity.enquiryDetails?.detailRows.map((row) => `${row.label} ${row.value}`),
    activity.requirementDetails?.title,
    activity.requirementDetails?.description,
    activity.requirementDetails?.detailRows.map((row) => `${row.label} ${row.value}`),
    activity.requirementDetails?.matchRows.map((row) => `${row.label} ${row.value}`),
  ]);
}

function OverviewCreditMetric({
  label,
  value,
  icon,
  tone = "navy",
}: {
  label: string;
  value: number;
  icon: string;
  tone?: "navy" | "blue" | "gold" | "success";
}) {
  const toneClasses = {
    navy: "border-brand-navy/10 bg-brand-navy/10 text-brand-navy",
    blue: "border-brand-blue/15 bg-brand-blue/10 text-brand-blue",
    gold: "border-brand-gold/25 bg-brand-gold/15 text-brand-navy",
    success: "border-brand-success/20 bg-brand-success/10 text-brand-success",
  };

  return (
    <div className="relative isolate overflow-hidden rounded-[12px] border border-brand-line/75 bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] p-3 shadow-[0_14px_30px_rgba(15,42,95,0.055)]">
      <div className="absolute inset-x-4 top-0 h-px bg-[linear-gradient(90deg,transparent,rgba(212,175,55,0.55),transparent)]" />
      <div className="relative flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.17em] text-brand-slate">{label}</p>
          <p className="mt-3 text-2xl font-bold leading-none tracking-[-0.05em] text-brand-navy sm:text-3xl lg:text-[34px]">{value}</p>
        </div>
        <span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] border", toneClasses[tone])} aria-hidden="true">
          <AdminIcon name={icon} className="h-5 w-5" />
        </span>
      </div>
    </div>
  );
}

function BrokerDetailTabButton({
  active,
  label,
  icon,
  count,
  onClick,
}: {
  active: boolean;
  label: string;
  icon: string;
  count?: number;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "inline-flex min-h-[40px] min-w-max shrink-0 items-center justify-center gap-2 rounded-[12px] border px-3 py-2 text-sm font-semibold transition duration-200 sm:min-h-[44px] sm:px-4 sm:justify-start md:min-h-[48px] md:text-[15px]",
        active
          ? "border-[#253149] bg-[linear-gradient(180deg,#334364_0%,#253149_100%)] text-white shadow-[0_12px_26px_rgba(33,44,69,0.24)]"
          : "border-[#d7dce9] bg-[linear-gradient(180deg,#f7f8fc_0%,#eceff7_100%)] text-[#24314c] shadow-[0_8px_18px_rgba(28,35,61,0.08)] hover:border-[#cfd6e7] hover:-translate-y-0.5"
      )}
    >
      <span className={cn("flex h-5 w-5 items-center justify-center", active ? "text-[#f2d284]" : "text-[#5f6982]")}>
        <AdminIcon name={icon} className="h-5 w-5" />
      </span>
      <span className="min-w-0 truncate">{label}</span>
      {typeof count === "number" ? (
        <span
          className={cn(
            "inline-flex min-w-7 items-center justify-center rounded-full px-2 py-0.5 text-xs font-bold",
            active ? "bg-white/[0.14] text-white" : "bg-white text-[#5f6982]"
          )}
        >
          {count}
        </span>
      ) : null}
    </button>
  );
}

function OverviewCard({
  title,
  icon,
  children,
  className,
  description,
}: {
  title: string;
  description?: string;
  icon: string;
  children: ReactNode;
  className?: string;
  action?: ReactNode;
}) {
  return (
    <section
      className={cn(
        "min-w-0 rounded-[12px] border border-brand-line/80 bg-[linear-gradient(180deg,#ffffff_0%,#fbfcff_100%)] p-5 shadow-[0_22px_52px_rgba(15,42,95,0.075)] sm:p-6",
        className
      )}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <OverviewIconFrame icon={icon} />
          <div className="min-w-0 pt-1">
            <h3 className="text-[20px] font-semibold tracking-[-0.035em] text-brand-navy">{title}</h3>
            {description ? <p className="mt-1.5 max-w-2xl text-sm leading-6 text-brand-slate">{description}</p> : null}
          </div>
        </div>
      </div>
      <div className="mt-6">{children}</div>
    </section>
  );
}


function OverviewBooleanPill({ value }: { value: boolean | null | undefined }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-3 py-1 text-[12px] font-semibold",
        value === true
          ? "border-brand-success/20 bg-brand-success/10 text-[#1f8a4d]"
          : value === false
            ? "border-brand-line bg-brand-panel-soft text-brand-slate"
            : "border-brand-line bg-white text-brand-slate"
      )}
    >
      {booleanValue(value)}
    </span>
  );
}

function textValue(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === "") {
    return "Not provided";
  }

  return String(value);
}

function dateValue(value: string | null | undefined) {
  return value ? formatDateTime(value) : "Not provided";
}

function booleanValue(value: boolean | null | undefined) {
  if (value === null || value === undefined) {
    return "Not provided";
  }

  return value ? "Yes" : "No";
}

export default function AdminBrokerDetailPage() {
  const params = useParams<{ userId: string }>();
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { enqueueSnackbar } = useSnackbar();
  const { user, loading } = useAuth();
  const resolvedPathname = pathname || "/admin";
  const resolvedSearchParams = useMemo(() => searchParams ?? new URLSearchParams(), [searchParams]);
  const requestedTab = getAdminBrokerTabFromSearchParam(resolvedSearchParams.get("tab"));
  const [detail, setDetail] = useState<AdminBrokerDetail | null>(null);
  const [pageLoading, setPageLoading] = useState(true);
  const [creditInput, setCreditInput] = useState("");
  const [pendingAction, setPendingAction] = useState<{ action: string; label: string; prompt: string } | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<AdminBrokerTabId>(requestedTab);
  const [listingFilter, setListingFilter] = useState<ListingFilterId>("all");
  const [listingSearchQuery, setListingSearchQuery] = useState("");
  const [listingDateFilter, setListingDateFilter] = useState<AdminDashboardDateFilterValue>(() => createAdminDashboardDateFilterValue());
  const [requirementsDateFilter, setRequirementsDateFilter] = useState<AdminDashboardDateFilterValue>(() => createAdminDashboardDateFilterValue());
  const [enquiriesDateFilter, setEnquiriesDateFilter] = useState<AdminDashboardDateFilterValue>(() => createAdminDashboardDateFilterValue());
  const [activityFilter, setActivityFilter] = useState<ActivityFilterId>("all");
  const [activitySearchQuery, setActivitySearchQuery] = useState("");
  const [activityDateFilter, setActivityDateFilter] = useState<AdminDashboardDateFilterValue>(() => createAdminDashboardDateFilterValue());
  const [statusTooltipPosition, setStatusTooltipPosition] = useState<{ x: number; y: number } | null>(null);
  const detailRequestIdRef = useRef(0);
  const debouncedListingSearchQuery = useDebouncedValue(listingSearchQuery, 250);
  const debouncedActivitySearchQuery = useDebouncedValue(activitySearchQuery, 250);
  const normalizedListingSearchQuery = normalizeSearchQuery(debouncedListingSearchQuery);
  const normalizedActivitySearchQuery = normalizeSearchQuery(debouncedActivitySearchQuery);
  const normalizedListingCountSearchQuery = normalizeSearchQuery(listingSearchQuery);
  const normalizedActivityCountSearchQuery = normalizeSearchQuery(activitySearchQuery);
  const brokerId = params?.userId;
  const handleSelectTab = useCallback(
    (tab: AdminBrokerTabId) => {
      setActiveTab(tab);

      const currentQuery = resolvedSearchParams.toString();
      const currentHref = currentQuery ? `${resolvedPathname}?${currentQuery}` : resolvedPathname;
      const nextHref = getAdminBrokerTabHref(resolvedPathname, resolvedSearchParams, tab);

      if (nextHref !== currentHref) {
        router.replace(nextHref, { scroll: false });
      }
    },
    [resolvedPathname, resolvedSearchParams, router]
  );
  const currentBrokerReturnHref = useMemo(
    () => getAdminBrokerTabHref(resolvedPathname, resolvedSearchParams, activeTab),
    [activeTab, resolvedPathname, resolvedSearchParams]
  );
  const getListingDetailHref = useCallback(
    (listingId: string) => createAdminListingDetailHref(listingId, currentBrokerReturnHref),
    [currentBrokerReturnHref]
  );

  const loadDetail = useCallback(async () => {
    if (!brokerId) return null;
    const requestId = detailRequestIdRef.current + 1;
    detailRequestIdRef.current = requestId;
    const payload = await apiFetch<AdminBrokerDetail>(`/api/admin/brokers/${brokerId}`);
    if (detailRequestIdRef.current === requestId) {
      setDetail(payload);
    }
    return payload;
  }, [brokerId]);

  useEffect(() => {
    let isActive = true;

    if (!loading && (!user || !isAdmin(user))) {
      detailRequestIdRef.current += 1;
      setDetail(null);
      setCreditInput("");
      setPendingAction(null);
      setActionLoading(false);
      setListingFilter("all");
      setListingSearchQuery("");
      setListingDateFilter(createAdminDashboardDateFilterValue());
      setRequirementsDateFilter(createAdminDashboardDateFilterValue());
      setEnquiriesDateFilter(createAdminDashboardDateFilterValue());
      setActivityFilter("all");
      setActivitySearchQuery("");
      setActivityDateFilter(createAdminDashboardDateFilterValue());
      setStatusTooltipPosition(null);
      setPageLoading(false);
      router.replace(getDefaultRouteForUser(user));
      return;
    }

    if (!loading && user && brokerId) {
      setPageLoading(true);
      loadDetail()
        .catch((error) => enqueueSnackbar(error instanceof Error ? error.message : "Failed to load broker detail.", { variant: "error" }))
        .finally(() => {
          if (isActive) {
            setPageLoading(false);
          }
        });
    }

    return () => {
      isActive = false;
    };
  }, [brokerId, enqueueSnackbar, loadDetail, loading, router, user]);

  useEffect(() => {
    setActiveTab((current) => (current === requestedTab ? current : requestedTab));
  }, [requestedTab]);

  const runAction = async (action: string) => {
    if (!detail) return;

    setActionLoading(true);
    try {
      await apiFetch("/api/admin/action", {
        method: "POST",
        body: JSON.stringify({ action, targetId: detail.broker.id }),
      });
      invalidateAdminOverviewCaches();
      enqueueSnackbar("Admin action completed.", { variant: "success" });
      setPendingAction(null);
      await loadDetail();
    } catch (error) {
      enqueueSnackbar(error instanceof Error ? error.message : "Admin action failed.", { variant: "error" });
    } finally {
      setActionLoading(false);
    }
  };

  const assignCredits = async () => {
    if (!detail) return;

    const creditsToAdd = Number(creditInput || 0);
    if (!creditsToAdd) {
      enqueueSnackbar("Enter a credit amount.", { variant: "error" });
      return;
    }

    try {
      await apiFetch("/api/admin/credits", {
        method: "POST",
        body: JSON.stringify({ userId: detail.broker.id, creditsToAdd }),
      });
      invalidateAdminOverviewCaches();
      enqueueSnackbar("Credits assigned.", { variant: "success" });
      setCreditInput("");
      await loadDetail();
    } catch (error) {
      enqueueSnackbar(error instanceof Error ? error.message : "Failed to assign credits.", { variant: "error" });
    }
  };

  const broker = brokerId && detail?.broker.id === brokerId ? detail.broker : null;
  const actionButtons = useMemo(() => {
    if (!broker) return [];

    if (broker.status === "pending") {
      return [
        {
          label: "Approve",
          action: "approve_application",
          className: "btn-primary",
          prompt: "Are you sure you want to approve this broker?",
        },
        {
          label: "Reject",
          action: "reject_application",
          className: "btn-secondary",
          prompt: "Are you sure you want to reject this broker?",
        },
      ];
    }

    if (broker.status === "rejected") {
      return [
        {
          label: "Approve",
          action: "approve_application",
          className: "btn-primary",
          prompt: "Are you sure you want to approve this broker?",
        },
      ];
    }

    if (broker.status === "suspended" || broker.status === "deactivated") {
      return [
        {
          label: "Reactivate",
          action: "reactivate_broker",
          className: "btn-secondary",
          prompt: "Are you sure you want to reactivate this broker?",
        },
      ];
    }

    if (isActiveBrokerStatus(broker.status)) {
      return [
        {
          label: "Deactivate",
          action: "suspend_broker",
          className: "btn-secondary",
          prompt: "Are you sure you want to deactivate this broker?",
        },
      ];
    }

    return [];
  }, [broker]);

  const dateScopedListings = useMemo(
    () => (broker?.listings || []).filter((listing) => matchesAdminDashboardDateRange(listing.created_at, listingDateFilter)),
    [broker?.listings, listingDateFilter]
  );
  const listingCountSourceListings = useMemo(
    () =>
      normalizedListingCountSearchQuery
        ? dateScopedListings.filter((listing) => getBrokerDetailListingSearchText(listing).includes(normalizedListingCountSearchQuery))
        : dateScopedListings,
    [dateScopedListings, normalizedListingCountSearchQuery]
  );

  const listingFilters = useMemo(
    () => [
      { id: "all" as const, label: "All", count: listingCountSourceListings.filter((listing) => !listing.deleted_at).length },
      {
        id: "pending" as const,
        label: "Pending",
        count: listingCountSourceListings.filter((listing) => !listing.deleted_at && listing.status === "pending").length,
      },
      {
        id: "approved" as const,
        label: "Approved",
        count: listingCountSourceListings.filter((listing) => !listing.deleted_at && (listing.status === "active" || listing.status === "approved")).length,
      },
      {
        id: "rejected" as const,
        label: "Rejected",
        count: listingCountSourceListings.filter((listing) => !listing.deleted_at && listing.status === "rejected").length,
      },
      {
        id: "inactive" as const,
        label: "Inactive",
        count: listingCountSourceListings.filter((listing) => !listing.deleted_at && listing.status === "inactive").length,
      },
      { id: "deleted" as const, label: "Deleted", count: listingCountSourceListings.filter((listing) => !!listing.deleted_at).length },
    ],
    [listingCountSourceListings]
  );

  const filteredListings = useMemo(() => {
    if (!broker?.listings.length) return [];
    return broker.listings.filter((listing) => {
      const matchesStatus =
        listingFilter === "deleted"
          ? !!listing.deleted_at
          : listing.deleted_at
            ? false
            : listingFilter === "all"
              ? true
              : listingFilter === "approved"
                ? listing.status === "active" || listing.status === "approved"
                : listing.status === listingFilter;

      if (!matchesStatus) {
        return false;
      }

      return normalizedListingSearchQuery ? getBrokerDetailListingSearchText(listing).includes(normalizedListingSearchQuery) : true;
    });
  }, [broker?.listings, listingFilter, normalizedListingSearchQuery]);

  const visibleListings = useMemo(
    () => filteredListings.filter((listing) => matchesAdminDashboardDateRange(listing.created_at, listingDateFilter)),
    [filteredListings, listingDateFilter]
  );
  const {
    paginatedItems: paginatedListings,
    pagination: listingsPagination,
    pageSizeOptions: listingPageSizeOptions,
    setPage: setListingsPage,
    setPageSize: setListingsPageSize,
  } = useClientPagination(visibleListings, {
    resetKey: `${activeTab}|${listingFilter}|${normalizedListingSearchQuery}|${listingDateFilter.id}|${listingDateFilter.range?.startDate || ""}|${listingDateFilter.range?.endDate || ""}|${visibleListings.length}`,
  });

  const resolvedActivity = useMemo(() => {
    if (!broker) return [];

    const listingMap = new Map((broker.listings || []).map((listing) => [listing.id, listing]));
    const requirementMap = new Map((broker.requirements || []).map((requirement) => [requirement.id, requirement]));
    const userMap = new Map([[broker.id, broker]]);
    const areaMap = new Map((broker.coveredAreas || []).map((area) => [area.id, area]));

    return (broker.activity || []).map((log) =>
      resolveAdminActivityLog(log, {
        areaMap,
        getListingDetailHref,
        listingMap,
        requirementMap,
        userMap,
      })
    );
  }, [broker, getListingDetailHref]);

  const dateFilteredActivity = useMemo(
    () => resolvedActivity.filter((log) => matchesAdminDashboardDateRange(log.created_at, activityDateFilter)),
    [activityDateFilter, resolvedActivity]
  );
  const activityCountSourceLogs = useMemo(
    () =>
      normalizedActivityCountSearchQuery
        ? dateFilteredActivity.filter((log) => getBrokerDetailActivitySearchText(log).includes(normalizedActivityCountSearchQuery))
        : dateFilteredActivity,
    [dateFilteredActivity, normalizedActivityCountSearchQuery]
  );

  const activityFilters = useMemo(
    () => [
      { id: "all" as const, label: "All", count: activityCountSourceLogs.length },
      { id: "listings" as const, label: "Listings", count: activityCountSourceLogs.filter((log) => log.category === "listings").length },
      { id: "brokers" as const, label: "Brokers", count: activityCountSourceLogs.filter((log) => log.category === "brokers").length },
      { id: "credits" as const, label: "Credits", count: activityCountSourceLogs.filter((log) => log.category === "credits").length },
      { id: "requirements" as const, label: "Requirements", count: activityCountSourceLogs.filter((log) => log.category === "requirements").length },
      { id: "system" as const, label: "System", count: activityCountSourceLogs.filter((log) => log.category === "system").length },
    ],
    [activityCountSourceLogs]
  );

  const filteredActivity = useMemo(
    () =>
      dateFilteredActivity.filter((log) => {
        if (activityFilter !== "all" && log.category !== activityFilter) {
          return false;
        }

        return normalizedActivitySearchQuery ? getBrokerDetailActivitySearchText(log).includes(normalizedActivitySearchQuery) : true;
      }),
    [activityFilter, dateFilteredActivity, normalizedActivitySearchQuery]
  );
  const {
    paginatedItems: paginatedActivity,
    pagination: activityPagination,
    pageSizeOptions: activityPageSizeOptions,
    setPage: setActivityPage,
    setPageSize: setActivityPageSize,
  } = useClientPagination(filteredActivity, {
    resetKey: `${activeTab}|${activityFilter}|${normalizedActivitySearchQuery}|${activityDateFilter.id}|${activityDateFilter.range?.startDate || ""}|${activityDateFilter.range?.endDate || ""}|${filteredActivity.length}|${brokerId}`,
  });

  if (loading || !user) {
    return <LoadingScreen label="Loading broker detail..." />;
  }

  if (pageLoading && !broker) {
    return <LoadingScreen label="Loading broker detail..." />;
  }

  if (!broker) {
    return (
      <AppShell title="Broker Detail" subtitle="Review broker accounts, credits, and lifecycle actions." hidePageHeader>
        <div className="pt-6">
          <BackButton fallbackHref="/admin" className="btn-secondary hidden sm:inline-flex">
            Back to Admin
          </BackButton>
          <div className="mt-6">
            <EmptyState title="Broker not found" description="The selected broker could not be loaded." />
          </div>
        </div>
      </AppShell>
    );
  }

  const brokerName = getFullName(broker.first_name, broker.last_name);
  const updateStatusTooltipPosition = (x: number, y: number) => {
    setStatusTooltipPosition({ x: x + 14, y: y + 14 });
  };
  const currentListings = broker.listings.filter((listing) => !listing.deleted_at);
  const activeListings = currentListings.filter((listing) => isActiveListingStatus(listing.status)).length;
  const pendingListings = currentListings.filter((listing) => listing.status === "pending").length;
  const deletedListings = broker.listings.length - currentListings.length;
  const requirements = broker.requirements || [];
  const currentRequirements = requirements.filter((requirement) => !requirement.deleted_at);
  const activeRequirements = currentRequirements.filter((requirement) => requirement.is_active).length;
  const inactiveRequirements = currentRequirements.filter((requirement) => !requirement.is_active).length;
  const deletedRequirements = requirements.length - currentRequirements.length;
  const submittedRequirementMatches = currentRequirements.reduce((total, requirement) => total + (requirement.submitted_match_count || 0), 0);
  const requirementsWithSubmittedMatches = currentRequirements.filter((requirement) => (requirement.submitted_match_count || 0) > 0).length;
  const availableCredits = broker.credits?.available_credits || 0;
  const usedCredits = broker.credits?.used_credits || 0;
  const assignedCredits = broker.credits?.total_credits_assigned || 0;
  const brokerReraBrn = broker.brokerProfile?.rera_brn || broker.agency?.rera_brn || null;
  const brokerStatusLabel = formatUserStatus(broker.status);
  const tabItems: Array<{ id: AdminBrokerTabId; label: string; icon: string; count?: number }> = [
    { id: "overview", label: "Overview", icon: "overview" },
    { id: "listings", label: "Listings", icon: "listings", count: broker.listings.length },
    { id: "requirements", label: "Requirements", icon: "requirements", count: requirements.length },
    { id: "enquiries", label: "Enquiries", icon: "mail", count: broker.enquiries.length },
    { id: "activity", label: "Recent Activity", icon: "activity", count: resolvedActivity.length },
  ];
  const kpiCards = [
    {
      icon: "credits",
      title: "Available Credits",
      value: availableCredits,
      helper: "Credits Remaining",
      accent: `${usedCredits} used | ${assignedCredits} assigned`,
    },
    {
      icon: "listings",
      title: "Total Listings",
      value: currentListings.length,
      helper: "Current Listings",
      accent: `${activeListings} active | ${pendingListings} pending${deletedListings ? ` | ${deletedListings} deleted` : ""}`,
    },
    {
      icon: "requirements",
      title: "Total Requirements",
      value: currentRequirements.length,
      helper: "Current Buyer Briefs",
      accent: `${activeRequirements} active | ${inactiveRequirements} inactive${deletedRequirements ? ` | ${deletedRequirements} deleted` : ""}`,
    },
    {
      icon: "trophy",
      title: "Submitted Matches",
      value: submittedRequirementMatches,
      helper: "Across Current Requirements",
      accent: `${requirementsWithSubmittedMatches} requirement${requirementsWithSubmittedMatches === 1 ? "" : "s"} with submissions`,
    },
  ];

  return (
    <AppShell hidePageHeader mainClassName="!max-w-[1540px] xl:!px-10">
      <div className="pb-10">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <BackButton fallbackHref="/admin" className="btn-secondary hidden sm:inline-flex">
            Back to Admin
          </BackButton>
        </div>

        <section className="relative mt-6 overflow-hidden rounded-[24px] border border-[#dfe5ee] bg-[linear-gradient(135deg,#fffaf0_0%,#ffffff_36%,#eef4fb_100%)] shadow-[0_26px_70px_rgba(15,42,95,0.12)] sm:rounded-[32px]">
          <div className="absolute -left-20 top-10 h-56 w-56 rounded-full bg-brand-gold/[0.16] blur-3xl" />
          <div className="absolute -right-24 bottom-0 h-64 w-64 rounded-full bg-brand-blue/10 blur-3xl" />
          <div className="absolute inset-x-10 top-0 h-px bg-[linear-gradient(90deg,transparent,rgba(212,175,55,0.78),transparent)]" />
          <div className="relative px-4 py-5 sm:px-6 sm:py-6 md:px-7 xl:px-10 xl:py-7">
            <div className="shell-boundary grid gap-4 md:gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(36rem,auto)_minmax(0,1fr)] xl:items-center xl:gap-6">
              <div className="order-2 grid gap-3 sm:grid-cols-2 xl:order-1 xl:grid-cols-1 xl:self-center">
                <HeroMetaItem label="Agency" value={broker.agency?.name || "No agency assigned"} icon="agency" />
                <HeroMetaItem label="RERA BRN" value={brokerReraBrn || "Not provided"} icon="rera" />
              </div>

              <div className="order-1 flex min-w-0 flex-col items-center text-center xl:order-2">
                <div className="relative mt-2 flex items-center justify-center sm:mt-4 xl:mt-8">
                  <div className="absolute h-24 w-24 rounded-full border border-white/80 bg-white/[0.45] shadow-[0_18px_50px_rgba(15,42,95,0.08)] sm:h-28 sm:w-28 xl:h-32 xl:w-32" />
                  <div className="absolute h-32 w-32 rounded-full border border-brand-gold/20 sm:h-40 sm:w-40 xl:h-44 xl:w-44" />
                  <div className="group relative">
                    <BrokerAvatar
                      src={broker.brokerProfile?.profile_photo}
                      alt={`${brokerName} profile photo`}
                      className="relative h-24 w-24 shrink-0 border-4 border-white bg-white shadow-[0_26px_58px_rgba(15,42,95,0.18)] sm:h-28 sm:w-28 sm:border-[5px] xl:h-36 xl:w-36 xl:border-[6px]"
                    />
                    <span
                      className={cn(
                        "absolute bottom-1.5 right-1.5 z-10 flex h-7 w-7 items-center justify-center rounded-full border-[3px] transition duration-200 hover:scale-105 focus:outline-none focus:ring-4 focus:ring-white/80 sm:bottom-2 sm:right-2 sm:h-8 sm:w-8 sm:border-[3.5px] xl:bottom-3 xl:right-3 xl:h-10 xl:w-10 xl:border-[4px]",
                        brokerStatusBadgeClasses(broker.status)
                      )}
                      aria-label={`Broker status: ${brokerStatusLabel}`}
                      tabIndex={0}
                      onPointerEnter={(event) => updateStatusTooltipPosition(event.clientX, event.clientY)}
                      onPointerMove={(event) => updateStatusTooltipPosition(event.clientX, event.clientY)}
                      onPointerLeave={() => setStatusTooltipPosition(null)}
                      onFocus={(event) => {
                        const bounds = event.currentTarget.getBoundingClientRect();
                        updateStatusTooltipPosition(bounds.right, bounds.top);
                      }}
                      onBlur={() => setStatusTooltipPosition(null)}
                    >
                      <span className="h-1.5 w-1.5 rounded-full bg-white sm:h-2 sm:w-2 xl:h-2 xl:w-2" aria-hidden="true" />
                    </span>
                  </div>
                </div>
                {statusTooltipPosition ? (
                  <span
                    className="pointer-events-none fixed z-50 whitespace-nowrap rounded-full border border-[#dfe5ee] bg-white px-3 py-1.5 text-xs font-semibold text-[#253149] shadow-[0_12px_28px_rgba(25,36,58,0.16)]"
                    role="tooltip"
                    style={{ left: statusTooltipPosition.x, top: statusTooltipPosition.y }}
                  >
                    {brokerStatusLabel}
                  </span>
                ) : null}
                <h1 className="mt-4 max-w-full break-words text-[1.85rem] font-bold tracking-[-0.055em] text-brand-navy sm:text-3xl md:text-[2.4rem] xl:mt-5 xl:max-w-4xl xl:text-3xl">
                  {brokerName}
                </h1>
                <p className="mt-2 max-w-full break-all text-sm font-medium leading-6 text-brand-slate sm:max-w-2xl sm:text-base sm:leading-7 md:text-lg">
                  {broker.email}
                </p>
                <div className="mt-4 flex w-full max-w-full flex-wrap items-center justify-center gap-2.5 xl:hidden">
                  <span className="badge max-w-full border-[#d9e0ea] bg-white text-brand-navy">{brokerStatusLabel}</span>
                  <span className="badge max-w-full border-[#efdfb4] bg-[#fff8e7] text-[#9a6d05]">
                    {availableCredits} credits available
                  </span>
                </div>
                <div className="mt-4 flex w-full flex-col items-stretch justify-center gap-2 sm:flex-row sm:flex-wrap sm:items-center xl:mt-5 xl:gap-3">
                  {actionButtons.length ? (
                    actionButtons.map((button) => (
                      <button
                        key={button.action}
                        type="button"
                        className={cn(button.className, "w-full max-w-full sm:w-auto")}
                        onClick={() => setPendingAction({ action: button.action, label: button.label, prompt: button.prompt })}
                        disabled={actionLoading}
                      >
                        {button.label}
                      </button>
                    ))
                  ) : (
                    <span className="badge w-full max-w-full border-brand-line bg-white text-brand-slate sm:w-auto">No actions available</span>
                  )}
                </div>
              </div>

              <div className="order-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-1 xl:self-center">
                <HeroMetaItem label="Joined" value={dateValue(broker.created_at)} icon="joined" />
                <HeroMetaItem label="Phone" value={textValue(broker.phone)} icon="phone" />
                
              </div>
            </div>
          </div>
        </section>

        <section className="mt-6 rounded-[12px] border border-[#e5e8f1] bg-[linear-gradient(180deg,rgba(255,255,255,0.95)_0%,rgba(250,250,253,0.96)_100%)] px-5 py-5 shadow-[0_20px_48px_rgba(43,49,80,0.08)] md:px-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="page-kicker text-brand-orange">Broker Snapshot</p>
              <h2 className="mt-2 text-[26px] font-semibold tracking-[-0.03em] text-[#1e2941]">Performance and account</h2>
            </div>
          </div>
          <div className="mt-5 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4">
            {kpiCards.map((card) => (
              <DashboardKpiCard key={card.title} {...card} />
            ))}
          </div>
        </section>

        <section className="mt-6 rounded-[12px] border border-[#e1e6f0] bg-[rgba(255,255,255,0.9)] p-4 shadow-[0_18px_40px_rgba(42,48,78,0.06)] backdrop-blur-lg">
          <div className="-mx-4 overflow-x-auto px-4 pb-1 xl:mx-0 xl:px-0">
            <div className="flex min-w-max gap-2.5 xl:min-w-0 xl:flex-wrap">
              {tabItems.map((tab) => (
                <BrokerDetailTabButton
                  key={tab.id}
                  active={activeTab === tab.id}
                  label={tab.label}
                  icon={tab.icon}
                  count={tab.count}
                  onClick={() => handleSelectTab(tab.id)}
                />
              ))}
            </div>
          </div>
        </section>

        <div className="mt-6">
          {activeTab === "overview" ? (
            <div className="space-y-6">
              <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-[minmax(0,1.1fr)_minmax(400px,0.9fr)]">
                <OverviewCard
                  title="Basic Information"
                  icon="overview"
                  description="Core identity, brokerage, and profile timeline details for this broker account."
                >
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <OverviewDetailTile label="Full Name" value={brokerName} icon="user" />
                    <OverviewDetailTile label="First Name" value={textValue(broker.first_name)} icon="user" />
                    <OverviewDetailTile label="Last Name" value={textValue(broker.last_name)} icon="user" />
                    <OverviewDetailTile label="Agency Name" value={broker.agency?.name || "No agency assigned"} icon="agency" />
                    <OverviewDetailTile label="Broker RERA BRN" value={broker.brokerProfile?.rera_brn || "Not provided"} icon="id-card" />
                    <OverviewDetailTile label="Speciality" value={broker.brokerProfile?.speciality || "Not provided"} icon="star" />
                    <OverviewDetailTile
                      label="Experience"
                      value={broker.brokerProfile?.experience_years ? `${broker.brokerProfile.experience_years} years` : "Not provided"}
                      icon="briefcase"
                    />
                    <OverviewDetailTile label="Joined" value={dateValue(broker.created_at)} icon="calendar" />
                    <OverviewDetailTile label="Approved At" value={dateValue(broker.brokerProfile?.approved_at)} icon="check-circle" />
                    <OverviewDetailTile label="Profile Updated" value={dateValue(broker.brokerProfile?.updated_at)} icon="clock" />
                  </div>
                </OverviewCard>

                <div className="flex min-w-0 flex-col gap-2">
                  <OverviewCard title="Credits Summary" icon="credits">
                    <div className="grid gap-3 sm:grid-cols-3">
                      <OverviewCreditMetric label="Available" value={availableCredits} icon="spark" tone="success" />
                      <OverviewCreditMetric label="Used" value={usedCredits} icon="activity" tone="blue" />
                      <OverviewCreditMetric label="Assigned" value={assignedCredits} icon="credits" tone="gold" />
                    </div>

                    <div className="mt-4 rounded-[22px] border border-brand-line/75 bg-brand-panel-soft/80 p-4 sm:p-5">
                      <div>
                        <p className="text-[12px] font-semibold uppercase tracking-[0.18em] text-brand-navy">Credit Action</p>
                      </div>
                      <div className="mt-2 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
                        <input
                          id="broker-credit-assignment"
                          aria-label="Credits to assign"
                          className="input min-h-[48px] rounded-[12px]"
                          placeholder="Credits"
                          value={creditInput}
                          onChange={(event) => setCreditInput(event.target.value)}
                        />
                        <button type="button" className="btn-primary min-h-[48px] rounded-[12px] px-6" onClick={assignCredits}>
                          Assign Credits
                        </button>
                      </div>
                    </div>
                  </OverviewCard>

                  <OverviewCard title="Contact Information" icon="contact">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <OverviewDetailTile label="Email" value={<span className="break-all">{broker.email}</span>} icon="mail" />
                      <OverviewDetailTile label="Phone" value={textValue(broker.phone)} icon="phone" />
                      <OverviewDetailTile label="WhatsApp" value={broker.brokerProfile?.whatsapp_number || "Not provided"} icon="whatsapp" />
                      <OverviewDetailTile
                        label="Share Latest Deals"
                        value={<OverviewBooleanPill value={broker.brokerProfile?.share_latest_deals} />}
                        icon="share"
                      />
                    </div>

                    <AdminBrokerSocialLinks
                      whatsappNumber={broker.brokerProfile?.whatsapp_number || null}
                      instagramUrl={broker.brokerProfile?.instagram_profile || null}
                      linkedinUrl={broker.brokerProfile?.linkedin_profile || null}
                      className="mt-4"
                    />
                  </OverviewCard>
                </div>

                <OverviewCard
                  title="Bio / Covered Areas"
                  description="Professional profile details and the geographic areas this broker covers."
                  icon="agency"
                  className="lg:col-span-2"
                >
                  <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(280px,0.95fr)]">
                    <div
                      className={cn(
                        "rounded-[12px] border border-brand-line/75 bg-white/90 p-5 shadow-[0_12px_28px_rgba(15,42,95,0.045)]",
                        !broker.brokerProfile?.bio && "border-dashed bg-brand-panel-soft/80"
                      )}
                    >
                      <p className="text-[11px] font-semibold uppercase tracking-[0.17em] text-brand-slate">Bio</p>
                      <p className={cn("mt-3 text-[15px] leading-7", broker.brokerProfile?.bio ? "text-brand-ink" : "font-medium text-brand-slate")}>
                        {broker.brokerProfile?.bio || "Not provided"}
                      </p>
                    </div>

                    <div className="rounded-[12px] border border-brand-line/75 bg-brand-panel-soft/80 p-5 shadow-[0_12px_28px_rgba(15,42,95,0.04)]">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.17em] text-brand-slate">Covered Areas</p>
                      <div className="mt-4 flex flex-wrap gap-2">
                        {broker.coveredAreas.length ? (
                          broker.coveredAreas.map((area) => (
                            <span
                              key={area.id}
                              className="inline-flex min-h-[36px] items-center rounded-full border border-brand-line/80 bg-white px-3.5 py-2 text-sm font-semibold text-brand-navy shadow-[0_8px_18px_rgba(15,42,95,0.045)]"
                            >
                              {area.name}, {area.city}
                            </span>
                          ))
                        ) : (
                          <p className="w-full rounded-[16px] border border-dashed border-brand-line bg-white px-4 py-3 text-sm leading-6 text-brand-slate">
                            No covered areas selected.
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </OverviewCard>
              </div>
            </div>
          ) : null}

          {activeTab === "listings" ? (
            <AdminSectionCard
              kicker="Listing Moderation"
              title="Listings Management"
              subtitle="Review this broker's listing submissions, keep live inventory clean, and inspect every broker-owned record without changing current admin workflows."
              compactOnMobile
              inlineToolbarOnMobile
              toolbar={
                <AdminDashboardDateFilter
                  value={listingDateFilter}
                  onSelectFilter={setListingDateFilter}
                  ariaLabel="Filter broker listings by created date"
                />
              }
            >
              <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                <div className="-mx-4 overflow-x-auto px-4 pb-1 sm:-mx-6 sm:px-6 xl:mx-0 xl:px-0">
                  <div className="flex min-w-max gap-2 xl:min-w-0 xl:flex-wrap">
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
                  ariaLabel="Search broker listings"
                  value={listingSearchQuery}
                  onChange={setListingSearchQuery}
                  placeholder="Search title, area, developer, type"
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

                {visibleListings.length ? (
                  <div className={ADMIN_TABLE_ROW_GROUP_CLASS}>
                    {paginatedListings.map((listing) => (
                      <div key={listing.id} className={ADMIN_TABLE_ROW_CLASS}>
                        <div className="grid gap-3 sm:gap-4 md:grid-cols-[minmax(0,1.45fr)_minmax(0,0.95fr)] md:items-start lg:grid-cols-[minmax(0,1.55fr)_minmax(0,0.95fr)] xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,0.85fr)_minmax(0,0.8fr)_auto] xl:items-center xl:gap-4">
                          <div className="min-w-0">
                            <p className={cn(ADMIN_TABLE_MOBILE_LABEL_CLASS, "xl:hidden")}>Listing</p>
                            <p className={cn(ADMIN_TABLE_TITLE_CLASS, "line-clamp-2 xl:line-clamp-1")}>{listing.title}</p>
                            <p className={cn(ADMIN_TABLE_BODY_TEXT_CLASS, "line-clamp-2 xl:line-clamp-none")}>
                              {listing.area?.name || "Area pending"} | {formatPropertyType(listing.property_type)}
                            </p>
                            <p className={ADMIN_TABLE_META_TEXT_CLASS}>Added {formatDate(listing.created_at)}</p>
                          </div>

                          <div className="min-w-0">
                            <p className={cn(ADMIN_TABLE_MOBILE_LABEL_CLASS, "xl:hidden")}>Owner</p>
                            <p className="mt-0.5 break-words text-[14px] font-semibold text-[#28324a] line-clamp-2 xl:mt-1 xl:text-[15px] xl:line-clamp-none">
                              {brokerName}
                            </p>
                          </div>

                          <div className="grid grid-cols-[minmax(0,1fr)_minmax(6.75rem,auto)] items-center gap-2 rounded-[10px] border border-[#edf1f6] bg-[#fbfcff] px-3 py-2 md:col-span-2 md:grid-cols-[minmax(0,1fr)_minmax(10rem,auto)] md:gap-4 md:rounded-[12px] md:px-4 md:py-3 xl:contents">
                            <div className="min-w-0">
                              <p className={cn(ADMIN_TABLE_MOBILE_LABEL_CLASS, "xl:hidden")}>Status</p>
                              <div className="mt-1 max-w-full">
                                <AdminStatusBadge
                                  status={listing.deleted_at ? "deleted" : listing.status}
                                  label={formatListingDisplayStatus(listing.status, listing.deleted_at)}
                                  className="max-w-full"
                                />
                              </div>
                            </div>

                            <div className="min-w-0 text-right md:text-left">
                              <p className={cn(ADMIN_TABLE_MOBILE_LABEL_CLASS, "text-right md:text-left xl:hidden")}>Price</p>
                              <p className="mt-1 truncate whitespace-nowrap text-right text-[15px] font-semibold leading-6 tracking-[-0.03em] text-[#1f2940] sm:text-[18px] md:text-left xl:overflow-visible xl:text-clip xl:text-[21px] xl:leading-normal xl:whitespace-normal">
                                {formatCurrency(listing.price)}
                              </p>
                            </div>
                          </div>

                          <div className="flex justify-start md:col-span-2 xl:col-span-1 xl:justify-end">
                            <button
                              type="button"
                              className={cn(ADMIN_TABLE_ACTION_BUTTON_BASE, ADMIN_TABLE_ACTION_BUTTON_NEUTRAL, "w-full sm:w-auto")}
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
                          ? "No broker listings match your search with the current status and date filters."
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
                  onPageSizeChange={setListingsPageSize}
                />
              ) : null}
            </AdminSectionCard>
          ) : null}

          {activeTab === "requirements" ? (
            <AdminSectionCard
              kicker="Requirement Oversight"
              title="Requirements Management"
              subtitle="Review this broker's buyer requirements, inspect full brief details, and moderate requirement status from the workspace without changing the existing requirement or match workflows."
              compactOnMobile
              inlineToolbarOnMobile
              toolbar={
                <AdminDashboardDateFilter
                  value={requirementsDateFilter}
                  onSelectFilter={setRequirementsDateFilter}
                  ariaLabel="Filter broker requirements by created date"
                />
              }
            >
              <AdminRequirementsWorkspace
                requirements={requirements}
                dateFilter={requirementsDateFilter}
                listingReturnHref={currentBrokerReturnHref}
                stateResetKey={`${user?.uid ?? "signed-out"}:${brokerId ?? ""}`}
                onRefresh={loadDetail}
              />
            </AdminSectionCard>
          ) : null}

          {activeTab === "enquiries" ? (
            <AdminSectionCard
              kicker="Enquiry Oversight"
              title="Enquiries"
              subtitle="Review this broker's received enquiries and email reply history without changing broker-owned reply permissions."
              compactOnMobile
              inlineToolbarOnMobile
              toolbar={
                <AdminDashboardDateFilter
                  value={enquiriesDateFilter}
                  onSelectFilter={setEnquiriesDateFilter}
                  ariaLabel="Filter broker enquiries by created date"
                />
              }
            >
              <AdminEnquiriesWorkspace
                enquiries={broker.enquiries || []}
                dateFilter={enquiriesDateFilter}
                getListingDetailHref={getListingDetailHref}
                showBrokerAction={false}
                stateResetKey={`${user?.uid ?? "signed-out"}:${brokerId ?? ""}`}
              />
            </AdminSectionCard>
          ) : null}

          {activeTab === "activity" ? (
            <AdminSectionCard
              kicker="Activity Overview"
              title="Recent Broker Events"
              subtitle="Trace broker actions, listing updates, credit changes, and relevant enquiry events for this account."
              compactOnMobile
              inlineToolbarOnMobile
              toolbar={
                <AdminDashboardDateFilter
                  value={activityDateFilter}
                  onSelectFilter={setActivityDateFilter}
                  ariaLabel="Filter broker activity by date"
                />
              }
            >
              <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                <div className="-mx-4 overflow-x-auto px-4 pb-1 sm:-mx-6 sm:px-6 xl:mx-0 xl:px-0">
                  <div className="flex min-w-max gap-2 xl:min-w-0 xl:flex-wrap">
                    {activityFilters.map((filter) => (
                      <AdminSubTabPill
                        key={filter.id}
                        active={activityFilter === filter.id}
                        label={filter.label}
                        count={filter.count}
                        variant={filter.id}
                        onClick={() => setActivityFilter(filter.id)}
                      />
                    ))}
                  </div>
                </div>

                <SearchField
                  ariaLabel="Search broker activity"
                  value={activitySearchQuery}
                  onChange={setActivitySearchQuery}
                  placeholder="Search action, actor, entity, date"
                  className="w-full xl:max-w-[26rem]"
                />
              </div>

              <div className="mt-6 space-y-4">
                {paginatedActivity.length ? (
                  paginatedActivity.map((log) => (
                    <AdminActivityCard
                      key={log.id}
                      activity={log}
                      onNavigate={(href) => router.push(href)}
                      surfaceClassName="rounded-[14px] border border-[#e5e9f2] bg-[linear-gradient(180deg,#ffffff_0%,#f8faff_100%)] px-3 py-3 shadow-[0_10px_22px_rgba(34,40,66,0.05)] sm:px-4 sm:py-4 xl:rounded-[22px] xl:px-5 xl:py-5"
                    />
                  ))
                ) : (
                  <AdminBlankState
                    title={normalizedActivitySearchQuery ? "No results found" : "No activity found"}
                    description={
                      normalizedActivitySearchQuery
                        ? "No broker events match your search with the current activity and date filters."
                        : "No broker events match the selected activity and date filters."
                    }
                  />
                )}
              </div>

              {filteredActivity.length ? (
                <ListPaginationControls
                  pagination={activityPagination}
                  pageSizeOptions={activityPageSizeOptions}
                  itemLabel="events"
                  onPageChange={setActivityPage}
                  onPageSizeChange={setActivityPageSize}
                />
              ) : null}
            </AdminSectionCard>
          ) : null}
        </div>
      </div>

      {pendingAction ? (
        <div className="fixed inset-0 z-[100] flex items-end justify-center overflow-x-hidden bg-slate-950/60 p-2 sm:items-center sm:p-4">
          <div className="panel max-h-[calc(100dvh-1rem)] w-full max-w-lg overflow-x-hidden overflow-y-auto p-3 sm:max-h-[calc(100vh-2rem)] sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.3em] text-brand-orange">Confirm Broker Action</p>
                <h3 className="mt-2 text-2xl font-semibold text-brand-navy">{pendingAction.label} Broker</h3>
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

            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button type="button" className="btn-secondary" onClick={() => setPendingAction(null)} disabled={actionLoading}>
                Cancel
              </button>
              <button type="button" className="btn-primary" onClick={() => runAction(pendingAction.action)} disabled={actionLoading}>
                {actionLoading ? "Confirming..." : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </AppShell>
  );
}
