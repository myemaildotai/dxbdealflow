"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/deal-utils";

type AdminSubTabPillProps = {
  active: boolean;
  label: string;
  count?: number;
  variant: string;
  onClick: () => void;
};

type AdminStatusTone = "active" | "pending" | "rejected" | "inactive";
type AdminSubTabTone =
  | "all"
  | "active"
  | "pending"
  | "rejected"
  | "deleted"
  | "inactive"
  | "listings"
  | "brokers"
  | "credits"
  | "requirements"
  | "system"
  | "replied"
  | "unreplied";

export const ADMIN_TABLE_SURFACE_CLASS = "table-surface rounded-[12px] border-[#ebeef5] shadow-[0_22px_48px_rgba(28,40,68,0.08)]";
export const ADMIN_TABLE_ROW_GROUP_CLASS = "divide-y-2 divide-[#edf1f6]";
export const ADMIN_TABLE_HEADER_CLASS = "hidden xl:grid xl:items-center xl:bg-[#fbfcff] xl:px-8 xl:py-5";
export const ADMIN_TABLE_HEADER_CELL_CLASS = "text-[12px] font-semibold uppercase tracking-[0.24em] text-[#7d879c]";
export const ADMIN_TABLE_ROW_CLASS = "bg-white px-3 py-3 transition hover:bg-[#fcfdff] sm:px-4 sm:py-3 xl:px-8 xl:py-6";
export const ADMIN_TABLE_ROW_ALERT_CLASS = "bg-[#fffdfc] hover:bg-[#fffaf8]";
export const ADMIN_TABLE_MOBILE_LABEL_CLASS = "text-[11px] font-semibold uppercase tracking-[0.18em] text-[#8c95a9] xl:text-[12px] xl:tracking-[0.2em]";
export const ADMIN_TABLE_TITLE_CLASS = "min-w-0 break-words text-base font-semibold tracking-[-0.02em] text-[#1f2940] sm:text-[17px] xl:truncate xl:text-[19px]";
export const ADMIN_TABLE_BODY_TEXT_CLASS = "mt-0.5 min-w-0 break-words text-[13px] leading-5 text-[#5c6780] xl:mt-1 xl:text-[14px]";
export const ADMIN_TABLE_META_TEXT_CLASS = "mt-0.5 min-w-0 break-words text-[12px] leading-5 text-[#8a93a6] xl:mt-1 xl:text-[13px]";
export const ADMIN_TABLE_VALUE_CLASS = "text-[18px] font-semibold tracking-[-0.03em] text-[#1f2940] xl:text-[21px]";
export const ADMIN_TABLE_ACTION_BUTTON_BASE =
  "inline-flex min-h-[38px] max-w-full items-center justify-center rounded-full border px-3 py-1.5 text-center text-sm font-semibold tracking-[-0.01em] shadow-[0_8px_18px_rgba(50,62,92,0.08)] transition sm:px-4 sm:py-2 md:text-[14px] lg:whitespace-nowrap xl:min-h-[40px] xl:px-5 xl:py-3";
export const ADMIN_TABLE_ACTION_BUTTON_NEUTRAL =
  "border-[#d9dfeb] bg-[linear-gradient(180deg,#ffffff_0%,#f5f7fb_100%)] text-[#32415f] hover:border-[#cdd6e5] hover:bg-[#fbfcff]";
export const ADMIN_TABLE_ACTION_BUTTON_PRIMARY =
  "border-[#d7deec] bg-[linear-gradient(180deg,#f8faff_0%,#eef2fa_100%)] text-[#334669] hover:border-[#c7d2e6] hover:bg-[#f9fbff]";
export const ADMIN_TABLE_ICON_BUTTON =
  "inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#e2e7f0] bg-white text-[#56637c] shadow-[0_8px_16px_rgba(31,47,82,0.06)] transition hover:border-[#d2d9e7] hover:bg-[#fbfcff] xl:h-[44px] xl:w-[44px]";

export function AdminBlankState({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-[24px] border border-[#e5e9f2] bg-[linear-gradient(180deg,#fcfcff_0%,#f7f9fd_100%)] px-5 py-10 text-center shadow-[0_10px_22px_rgba(34,40,66,0.04)]">
      <p className="text-[20px] font-semibold tracking-[-0.03em] text-[#1f2940]">{title}</p>
      <p className="mx-auto mt-2 max-w-[34rem] text-[15px] leading-7 text-[#657186]">{description}</p>
    </div>
  );
}

export function AdminSectionCard({
  kicker,
  title,
  subtitle,
  toolbar,
  children,
  compactOnMobile = false,
  inlineToolbarOnMobile = false,
}: {
  kicker: string;
  title: string;
  subtitle: string;
  toolbar?: ReactNode;
  children: ReactNode;
  compactOnMobile?: boolean;
  inlineToolbarOnMobile?: boolean;
}) {
  return (
    <section
      className={cn(
        "rounded-[12px] border border-[#e1e6f0] bg-[linear-gradient(180deg,rgba(255,255,255,0.97)_0%,rgba(249,251,255,0.97)_100%)] shadow-[0_24px_54px_rgba(42,48,78,0.08)]",
        compactOnMobile ? "p-2 sm:p-3 md:p-4" : "p-3 sm:p-4"
      )}
    >
      <div
        className={cn(
          inlineToolbarOnMobile
            ? "flex flex-wrap items-start justify-between gap-2 sm:gap-3 xl:gap-4"
            : "flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between xl:gap-4"
        )}
      >
        <div className={cn("min-w-0", inlineToolbarOnMobile && "basis-0 flex-1")}>
          <p className="text-[12px] font-semibold uppercase tracking-[0.24em] text-[#8d95a8]">{kicker}</p>
          <h2
            className={cn(
              "mt-2 text-xl font-semibold tracking-[-0.05em] text-[#1f2940] sm:text-2xl md:text-3xl lg:text-[34px] xl:mt-3",
              inlineToolbarOnMobile && "line-clamp-2 lg:line-clamp-none"
            )}
          >
            {title}
          </h2>
          <p
            className={cn(
              "mt-2 max-w-[48rem] text-sm leading-7 text-[#657086] sm:text-[15px]",
              inlineToolbarOnMobile && "line-clamp-2 lg:line-clamp-none"
            )}
          >
            {subtitle}
          </p>
        </div>
        {toolbar ? (
          <div
            className={cn(
              inlineToolbarOnMobile
                ? "flex basis-full w-full shrink-0 justify-start sm:basis-auto sm:w-[14rem] sm:justify-end lg:w-auto"
                : "flex w-full justify-start lg:w-auto lg:justify-end"
            )}
          >
            {toolbar}
          </div>
        ) : null}
      </div>
      <div className={compactOnMobile ? "mt-3 sm:mt-4 xl:mt-6" : "mt-4 xl:mt-6"}>{children}</div>
    </section>
  );
}

const ADMIN_SUB_TAB_STYLES: Record<
  AdminSubTabTone,
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
  deleted: {
    activePill: "border-[#a65d7d] bg-[linear-gradient(180deg,#b97091_0%,#a65d7d_100%)] text-white shadow-[0_14px_28px_rgba(166,93,125,0.24)]",
    inactivePill: "border-[#ead8e1] bg-[linear-gradient(180deg,#ffffff_0%,#fff7fa_100%)] text-[#91536f] shadow-[0_10px_22px_rgba(126,74,98,0.08)] hover:border-[#e1c7d4] hover:bg-[#fff8fb]",
    activeIcon: "bg-white/18 text-white",
    inactiveIcon: "bg-[#f8e9ef] text-[#b06987]",
    activeBadge: "bg-white/16 text-white",
    inactiveBadge: "bg-[#f8eaf0] text-[#9f6a82]",
  },
  inactive: {
    activePill: "border-[#95a1b8] bg-[linear-gradient(180deg,#a6afc3_0%,#95a1b8_100%)] text-white shadow-[0_14px_28px_rgba(97,111,138,0.22)]",
    inactivePill: "border-[#e4e8f0] bg-[linear-gradient(180deg,#ffffff_0%,#f7f9fc_100%)] text-[#667389] shadow-[0_10px_22px_rgba(75,89,111,0.08)] hover:border-[#d8deea] hover:bg-[#fafcff]",
    activeIcon: "bg-white/18 text-white",
    inactiveIcon: "bg-[#edf1f6] text-[#8a96ad]",
    activeBadge: "bg-white/16 text-white",
    inactiveBadge: "bg-[#eef2f7] text-[#7a859c]",
  },
  listings: {
    activePill: "border-[#4e7dbc] bg-[linear-gradient(180deg,#6b98d0_0%,#4e7dbc_100%)] text-white shadow-[0_14px_28px_rgba(78,125,188,0.24)]",
    inactivePill: "border-[#dfe7f4] bg-[linear-gradient(180deg,#ffffff_0%,#f4f7fc_100%)] text-[#486181] shadow-[0_10px_22px_rgba(61,84,125,0.08)] hover:border-[#cedaf0] hover:bg-[#f7faff]",
    activeIcon: "bg-white/18 text-white",
    inactiveIcon: "bg-[#edf3fb] text-[#6488b5]",
    activeBadge: "bg-white/16 text-white",
    inactiveBadge: "bg-[#eef3fb] text-[#6980a3]",
  },
  brokers: {
    activePill: "border-[#2f9d6b] bg-[linear-gradient(180deg,#3daa78_0%,#2f9d6b_100%)] text-white shadow-[0_14px_28px_rgba(47,157,107,0.25)]",
    inactivePill: "border-[#d9ecdf] bg-[linear-gradient(180deg,#ffffff_0%,#f4fbf7_100%)] text-[#2b714f] shadow-[0_10px_22px_rgba(51,104,76,0.08)] hover:border-[#c7e3d1] hover:bg-[#f6fdf8]",
    activeIcon: "bg-white/18 text-white",
    inactiveIcon: "bg-[#eaf7ef] text-[#4ca876]",
    activeBadge: "bg-white/16 text-white",
    inactiveBadge: "bg-[#ebf7ef] text-[#4e8b67]",
  },
  credits: {
    activePill: "border-[#e0a53b] bg-[linear-gradient(180deg,#efb64a_0%,#e0a53b_100%)] text-white shadow-[0_14px_28px_rgba(224,165,59,0.26)]",
    inactivePill: "border-[#efdfbf] bg-[linear-gradient(180deg,#ffffff_0%,#fffbf2_100%)] text-[#91651d] shadow-[0_10px_22px_rgba(145,101,29,0.08)] hover:border-[#e7d2a7] hover:bg-[#fff9ec]",
    activeIcon: "bg-white/18 text-white",
    inactiveIcon: "bg-[#fff1d6] text-[#d69425]",
    activeBadge: "bg-white/16 text-white",
    inactiveBadge: "bg-[#fff1d8] text-[#b8842c]",
  },
  requirements: {
    activePill: "border-[#4e7dbc] bg-[linear-gradient(180deg,#6b98d0_0%,#4e7dbc_100%)] text-white shadow-[0_14px_28px_rgba(78,125,188,0.24)]",
    inactivePill: "border-[#dfe7f4] bg-[linear-gradient(180deg,#ffffff_0%,#f4f7fc_100%)] text-[#486181] shadow-[0_10px_22px_rgba(61,84,125,0.08)] hover:border-[#cedaf0] hover:bg-[#f7faff]",
    activeIcon: "bg-white/18 text-white",
    inactiveIcon: "bg-[#edf3fb] text-[#6488b5]",
    activeBadge: "bg-white/16 text-white",
    inactiveBadge: "bg-[#eef3fb] text-[#6980a3]",
  },
  system: {
    activePill: "border-[#95a1b8] bg-[linear-gradient(180deg,#a6afc3_0%,#95a1b8_100%)] text-white shadow-[0_14px_28px_rgba(97,111,138,0.22)]",
    inactivePill: "border-[#e4e8f0] bg-[linear-gradient(180deg,#ffffff_0%,#f7f9fc_100%)] text-[#667389] shadow-[0_10px_22px_rgba(75,89,111,0.08)] hover:border-[#d8deea] hover:bg-[#fafcff]",
    activeIcon: "bg-white/18 text-white",
    inactiveIcon: "bg-[#edf1f6] text-[#8a96ad]",
    activeBadge: "bg-white/16 text-white",
    inactiveBadge: "bg-[#eef2f7] text-[#7a859c]",
  },
  replied: {
    activePill: "border-[#2f9d6b] bg-[linear-gradient(180deg,#3daa78_0%,#2f9d6b_100%)] text-white shadow-[0_14px_28px_rgba(47,157,107,0.25)]",
    inactivePill: "border-[#d9ecdf] bg-[linear-gradient(180deg,#ffffff_0%,#f4fbf7_100%)] text-[#2b714f] shadow-[0_10px_22px_rgba(51,104,76,0.08)] hover:border-[#c7e3d1] hover:bg-[#f6fdf8]",
    activeIcon: "bg-white/18 text-white",
    inactiveIcon: "bg-[#eaf7ef] text-[#4ca876]",
    activeBadge: "bg-white/16 text-white",
    inactiveBadge: "bg-[#ebf7ef] text-[#4e8b67]",
  },
  unreplied: {
    activePill: "border-[#95a1b8] bg-[linear-gradient(180deg,#a6afc3_0%,#95a1b8_100%)] text-white shadow-[0_14px_28px_rgba(97,111,138,0.22)]",
    inactivePill: "border-[#e4e8f0] bg-[linear-gradient(180deg,#ffffff_0%,#f7f9fc_100%)] text-[#667389] shadow-[0_10px_22px_rgba(75,89,111,0.08)] hover:border-[#d8deea] hover:bg-[#fafcff]",
    activeIcon: "bg-white/18 text-white",
    inactiveIcon: "bg-[#edf1f6] text-[#8a96ad]",
    activeBadge: "bg-white/16 text-white",
    inactiveBadge: "bg-[#eef2f7] text-[#7a859c]",
  },
};

const ADMIN_STATUS_STYLES: Record<
  AdminStatusTone,
  {
    pill: string;
    icon: string;
  }
> = {
  active: {
    pill: "border-[#2f9d6b] bg-[linear-gradient(180deg,#3daa78_0%,#2f9d6b_100%)] text-white shadow-[0_12px_24px_rgba(47,157,107,0.2)]",
    icon: "bg-white/18 text-white",
  },
  pending: {
    pill: "border-[#e3c481] bg-[linear-gradient(180deg,#fff1ca_0%,#f6df9f_100%)] text-[#9b6a10] shadow-[0_12px_24px_rgba(201,156,60,0.16)]",
    icon: "bg-white/75 text-[#d39a2f]",
  },
  rejected: {
    pill: "border-[#e8c1c1] bg-[linear-gradient(180deg,#fff1f1_0%,#f8dddd_100%)] text-[#b54b4b] shadow-[0_12px_24px_rgba(181,75,75,0.14)]",
    icon: "bg-white/75 text-[#c85d5d]",
  },
  inactive: {
    pill: "border-[#d8deea] bg-[linear-gradient(180deg,#f6f8fc_0%,#e8edf5_100%)] text-[#677388] shadow-[0_12px_24px_rgba(100,114,139,0.12)]",
    icon: "bg-white/75 text-[#8b96ab]",
  },
};

function resolveAdminStatusTone(status: string): AdminStatusTone {
  switch (status) {
    case "approved":
    case "active":
    case "contacted":
    case "sent":
    case "won":
      return "active";
    case "pending":
    case "medium":
    case "new":
      return "pending";
    case "rejected":
    case "deleted":
    case "closed":
    case "deactivated":
    case "high":
    case "failed":
      return "rejected";
    case "inactive":
    case "expired":
    case "suspended":
    case "archived":
    case "read":
    case "low":
    default:
      return "inactive";
  }
}

function AdminStatusIcon({ tone }: { tone: AdminStatusTone }) {
  switch (tone) {
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

function resolveAdminSubTabTone(variant: string): AdminSubTabTone {
  switch (variant) {
    case "approved":
    case "active":
    case "won":
      return "active";
    case "pending":
      return "pending";
    case "rejected":
      return "rejected";
    case "deleted":
      return "deleted";
    case "inactive":
    case "deactivated":
      return "inactive";
    case "listings":
      return "listings";
    case "brokers":
      return "brokers";
    case "credits":
      return "credits";
    case "requirements":
      return "requirements";
    case "replied":
      return "replied";
    case "unreplied":
      return "unreplied";
    case "failed":
      return "rejected";
    case "system":
      return "system";
    case "all":
    default:
      return "all";
  }
}

function AdminSubTabIcon({ tone }: { tone: AdminSubTabTone }) {
  switch (tone) {
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
    case "deleted":
      return (
        <svg viewBox="0 0 20 20" fill="none" className="h-[15px] w-[15px]" aria-hidden="true">
          <path d="M6.2 6.5h7.6M8 6.5V5.2c0-.6.5-1.1 1.1-1.1h1.8c.6 0 1.1.5 1.1 1.1v1.3M7.2 8.2v5.4M10 8.2v5.4M12.8 8.2v5.4M7 15.4h6c.7 0 1.2-.5 1.3-1.2l.6-7.7H5.1l.6 7.7c.1.7.6 1.2 1.3 1.2Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case "inactive":
      return (
        <svg viewBox="0 0 20 20" fill="none" className="h-[15px] w-[15px]" aria-hidden="true">
          <path d="M7.2 5.8v8.4M12.8 5.8v8.4" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
        </svg>
      );
    case "listings":
      return (
        <svg viewBox="0 0 20 20" fill="none" className="h-[15px] w-[15px]" aria-hidden="true">
          <rect x="4" y="3.5" width="9" height="11.5" rx="2" stroke="currentColor" strokeWidth="1.8" />
          <path d="M7 7.2h3M7 10.2h3M14.8 6.5v7M11.8 10h6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      );
    case "brokers":
      return (
        <svg viewBox="0 0 20 20" fill="none" className="h-[15px] w-[15px]" aria-hidden="true">
          <circle cx="7.6" cy="7.2" r="2.3" stroke="currentColor" strokeWidth="1.8" />
          <circle cx="13.8" cy="7.9" r="1.8" stroke="currentColor" strokeWidth="1.8" />
          <path d="M4.3 14.8a3.3 3.3 0 0 1 6.6 0M11.7 14.8a2.6 2.6 0 0 1 4.4 0" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      );
    case "credits":
      return (
        <svg viewBox="0 0 20 20" fill="none" className="h-[15px] w-[15px]" aria-hidden="true">
          <ellipse cx="10" cy="5.1" rx="4.4" ry="1.9" stroke="currentColor" strokeWidth="1.8" />
          <path d="M5.6 5.1v5.8c0 1 2 1.9 4.4 1.9s4.4-.9 4.4-1.9V5.1" stroke="currentColor" strokeWidth="1.8" />
          <path d="M5.6 8.1c0 1 2 1.9 4.4 1.9s4.4-.9 4.4-1.9" stroke="currentColor" strokeWidth="1.8" />
        </svg>
      );
    case "requirements":
      return (
        <svg viewBox="0 0 20 20" fill="none" className="h-[15px] w-[15px]" aria-hidden="true">
          <path d="M5 3.8h6.1L15 7.7v8.5H5V3.8Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
          <path d="M10.8 3.8v4.1H15M7.8 11h4.4M7.8 13.8h3.1" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case "system":
      return (
        <svg viewBox="0 0 20 20" fill="none" className="h-[15px] w-[15px]" aria-hidden="true">
          <path d="M10 2.9 15 4.8v4.1c0 3.1-1.9 5.8-5 6.9-3.1-1.1-5-3.8-5-6.9V4.8L10 2.9Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
          <path d="m8.3 9.4 1.2 1.2 2.3-2.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case "replied":
      return (
        <svg viewBox="0 0 20 20" fill="none" className="h-[15px] w-[15px]" aria-hidden="true">
          <path d="M4.3 10.4a5.7 5.7 0 1 1 2.5 4.7l-2.7.8.9-2.5a5.6 5.6 0 0 1-.7-3Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
          <path d="m7.8 10.2 1.5 1.5 3.1-3.3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case "unreplied":
      return (
        <svg viewBox="0 0 20 20" fill="none" className="h-[15px] w-[15px]" aria-hidden="true">
          <path d="M4.3 10.4a5.7 5.7 0 1 1 2.5 4.7l-2.7.8.9-2.5a5.6 5.6 0 0 1-.7-3Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
          <path d="M7.6 10h4.8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      );
    default:
      return null;
  }
}

export function AdminSubTabPill({ active, label, count, variant, onClick }: AdminSubTabPillProps) {
  const tone = resolveAdminSubTabTone(variant);
  const styles = ADMIN_SUB_TAB_STYLES[tone];

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
        <AdminSubTabIcon tone={tone} />
      </span>
      <span className="min-w-0 truncate">{label}</span>
      {typeof count === "number" ? (
        <span
          className={cn(
            "inline-flex h-6 min-w-6 items-center justify-center rounded-full px-2 text-[12px] font-semibold leading-none",
            active ? styles.activeBadge : styles.inactiveBadge
          )}
        >
          {count}
        </span>
      ) : null}
    </button>
  );
}

export function AdminStatusBadge({
  status,
  label,
  className,
}: {
  status: string;
  label: string;
  className?: string;
}) {
  const tone = resolveAdminStatusTone(status);
  const styles = ADMIN_STATUS_STYLES[tone];

  return (
    <span
      className={cn(
        "inline-flex max-w-full items-center gap-1.5 rounded-full border font-semibold tracking-[-0.01em]",
        
        // Mobile (default)
        "min-h-[26px] px-2 py-0.5 text-[11px]",
        
        // Tablet & up
        "sm:min-h-[30px] sm:px-2.5 sm:py-1 sm:text-[13px]",
        
        // Desktop
        "md:min-h-[28px] md:px-3 md:py-1 md:text-[14px]",
        
        styles.pill,
        className
      )}
    >
      <span className={cn("inline-flex h-4 w-4 items-center justify-center rounded-full", styles.icon)}>
        <AdminStatusIcon tone={tone} />
      </span>
      <span className="min-w-0 truncate">{label}</span>
    </span>
  );
}
