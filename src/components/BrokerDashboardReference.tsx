"use client";

import Link from "next/link";
import { ReactNode, useMemo, useState } from "react";
import { BrokerAvatar } from "@/components/BrokerAvatar";
import { BrokerPriorityQueue } from "@/components/BrokerPriorityQueue";
import { type BrokerNotificationFeedItem } from "@/lib/broker-notifications";
import type { BrokerOverviewModel } from "@/lib/broker-dashboard";
import type { BrokerDashboardData, ChatConversationSummary, Listing } from "@/lib/deal-types";
import { cn, formatCurrency, formatDate, formatListingStatus, formatPropertyType, getFullName } from "@/lib/deal-utils";
import { getRequirementStatus } from "@/lib/requirements";

type DashboardSectionId = "overview" | "listings" | "enquiries" | "chats" | "requirements" | "profile";

type BrokerDashboardReferenceProps = {
  dashboard: BrokerDashboardData;
  overview: BrokerOverviewModel;
  activeSection: DashboardSectionId;
  notificationHasMore: boolean;
  notificationIsLoadingMore: boolean;
  notificationTotalCount: number;
  priorityNotifications: BrokerNotificationFeedItem[];
  onLoadMoreNotifications: () => Promise<void> | void;
  onSelectSection: (section: DashboardSectionId) => void;
  onPrefetchSection?: (section: DashboardSectionId) => void;
  onMarkNotificationRead: (notification: BrokerNotificationFeedItem) => Promise<void>;
  onOpenNotificationPrimaryAction: (notification: BrokerNotificationFeedItem) => Promise<void>;
  children?: ReactNode;
};

type ActivityViewId = "listings" | "enquiries" | "chats";

type MetricCardConfig = {
  icon: string;
  title: string;
  value: number;
  helper: string;
  accent: string;
  href?: string;
};

const DAY_IN_MS = 24 * 60 * 60 * 1000;

const getInboxHref = (group?: ChatConversationSummary | null) =>
  group?.conversations[0] ? `/dashboard/chats/${group.conversations[0].conversationId}` : null;

const getBrokerListingHref = (listingId: string) => `/dashboard/listings/${listingId}`;
const getDashboardTabHref = (section: DashboardSectionId) => (section === "overview" ? "/dashboard" : `/dashboard/${section}`);
const getDashboardSectionHref = (
  section: Exclude<DashboardSectionId, "overview" | "profile">,
  params?: Record<string, string>
) => {
  const pathname = `/dashboard/${section}`;
  const searchParams = new URLSearchParams();

  Object.entries(params || {}).forEach(([key, value]) => {
    searchParams.set(key, value);
  });

  const query = searchParams.toString();
  return query ? `${pathname}?${query}` : pathname;
};

const isWithinDays = (value?: string | null, days = 7) => {
  if (!value) return false;
  return Date.now() - new Date(value).getTime() <= days * DAY_IN_MS;
};

function formatRelativeTime(value?: string | null) {
  if (!value) return "Just now";

  const timestamp = new Date(value).getTime();
  const diff = Date.now() - timestamp;
  const minutes = Math.max(1, Math.round(diff / (60 * 1000)));
  const hours = Math.round(diff / (60 * 60 * 1000));
  const days = Math.round(diff / DAY_IN_MS);

  if (minutes < 60) return `${minutes} min ago`;
  if (hours < 24) return `${hours} hr ago`;
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;

  return formatDate(value);
}

function ratioPercent(part: number, total: number) {
  if (!total) return 0;
  return Math.round((part / total) * 100);
}

function Glyph({ name, className }: { name: string; className?: string }) {
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
    case "enquiries":
      return (
        <svg viewBox="0 0 24 24" fill="none" className={classes} aria-hidden="true">
          <rect x="4" y="6" width="16" height="12" rx="2.5" stroke="currentColor" strokeWidth="1.8" />
          <path d="m6 9 5.1 3.8a1.5 1.5 0 0 0 1.8 0L18 9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
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
    case "requirements":
      return (
        <svg viewBox="0 0 24 24" fill="none" className={classes} aria-hidden="true">
          <path d="M8.5 11a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5ZM15.5 11a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z" stroke="currentColor" strokeWidth="1.8" />
          <path d="M4.5 18a4 4 0 0 1 8 0M11.5 18a4 4 0 0 1 8 0" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      );
    case "profile":
      return (
        <svg viewBox="0 0 24 24" fill="none" className={classes} aria-hidden="true">
          <circle cx="12" cy="8" r="3.5" stroke="currentColor" strokeWidth="1.8" />
          <path d="M5.5 19a6.5 6.5 0 0 1 13 0" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      );
    case "pin":
      return (
        <svg viewBox="0 0 24 24" fill="none" className={classes} aria-hidden="true">
          <path
            d="M12 21s5-5.4 5-9.4A5 5 0 0 0 7 11.6C7 15.6 12 21 12 21Z"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinejoin="round"
          />
          <circle cx="12" cy="11" r="1.8" fill="currentColor" />
        </svg>
      );
    case "phone":
      return (
        <svg viewBox="0 0 24 24" fill="none" className={classes} aria-hidden="true">
          <path
            d="M8.2 5h2.6l1 4-1.8 1.7a13.5 13.5 0 0 0 3.3 3.3l1.7-1.8 4 1v2.6a1.8 1.8 0 0 1-1.9 1.8A14.9 14.9 0 0 1 6.4 6.9 1.8 1.8 0 0 1 8.2 5Z"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );
    case "trend":
      return (
        <svg viewBox="0 0 24 24" fill="none" className={classes} aria-hidden="true">
          <path d="m4 16 5-5 4 3 7-7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M16 7h4v4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
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
    case "plus":
      return (
        <svg viewBox="0 0 24 24" fill="none" className={classes} aria-hidden="true">
          <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      );
    case "arrow":
      return (
        <svg viewBox="0 0 24 24" fill="none" className={classes} aria-hidden="true">
          <path d="m9 6 6 6-6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case "dot":
      return (
        <svg viewBox="0 0 24 24" fill="none" className={classes} aria-hidden="true">
          <circle cx="12" cy="12" r="3.3" fill="currentColor" />
        </svg>
      );
    default:
      return null;
  }
}

function DashboardTabButton({
  active,
  href,
  icon,
  label,
  onIntent,
}: {
  active: boolean;
  href: string;
  icon: string;
  label: string;
  onIntent?: () => void;
}) {
  const handleIntent = () => {
    onIntent?.();
  };

  return (
    <Link
      href={href}
      prefetch
      aria-current={active ? "page" : undefined}
      onFocus={handleIntent}
      onMouseEnter={handleIntent}
      onTouchStart={handleIntent}
      className={cn(
        "inline-flex min-h-[40px] shrink-0 items-center gap-2 rounded-[8px] border px-3 py-2 text-sm font-medium transition sm:min-h-[44px] sm:px-4 md:max-xl:px-4 md:max-xl:text-sm xl:px-5 xl:text-[15px]",
        active
          ? "border-[#253149] bg-[linear-gradient(180deg,#334364_0%,#253149_100%)] text-white shadow-[0_10px_22px_rgba(33,44,69,0.25)]"
          : "border-[#d7dce9] bg-[linear-gradient(180deg,#f7f8fc_0%,#eceff7_100%)] text-[#24314c] shadow-[0_6px_16px_rgba(28,35,61,0.08)] hover:border-[#cfd6e7]"
      )}
    >
      <span className={cn("flex h-4 w-4 items-center justify-center", active ? "text-[#f2d284]" : "text-[#5f6982]")}>
        <Glyph name={icon} />
      </span>
      <span className="min-w-0 truncate">{label}</span>

    </Link>
  );
}

function MetricCard({
  icon,
  title,
  value,
  helper,
  accent,
  href,
}: {
  icon: string;
  title: string;
  value: number;
  helper: string;
  accent: string;
  href?: string;
}) {
  const cardClassName = cn(
    "relative isolate min-w-0 overflow-hidden rounded-[10px] border border-[rgba(255,255,255,0.16)] bg-[#22170f] px-3 py-4 text-white shadow-[0_18px_34px_rgba(26,18,10,0.24)] sm:px-4 sm:py-5 xl:px-6 xl:py-8",

  );

  const content = (
    <>
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            "url('/assets/kpi_cards.png')",
          backgroundPosition: "center",
          backgroundSize: "cover",
          backgroundRepeat: "no-repeat",
        }}
      />
      <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(20,14,10,0.38)_0%,rgba(20,14,10,0.18)_40%,rgba(20,14,10,0.34)_100%)]" />
      <div className="relative">
        <div className="flex min-w-0 items-center gap-2 text-[#e1ad4f] sm:gap-3">
          <Glyph name={icon} className="h-6 w-6 shrink-0 sm:h-7 sm:w-7 xl:h-[36px] xl:w-[36px]" />
          <p className="min-w-0 line-clamp-2 whitespace-normal break-words text-sm font-semibold leading-tight tracking-[-0.02em] text-white sm:text-base xl:block xl:truncate xl:whitespace-nowrap xl:px-3 xl:text-[23px] xl:leading-normal">{title}</p>
        </div>
        <div className="mt-4 flex min-w-0 flex-col gap-2 sm:flex-row sm:items-end sm:gap-4 xl:mt-5 xl:gap-6">
          <p className="min-w-0 break-words text-[34px] font-semibold leading-none tracking-[-0.05em] sm:text-[42px] xl:text-[66px]">{value}</p>
          <div className="min-w-0 pb-[3px]">
            <p className="break-words text-xs leading-[1.25] text-white sm:text-sm xl:text-[18px] xl:leading-[1.2]">{helper}</p>
            <p className="mt-1 break-words text-xs leading-[1.25] text-[#98d0a9] sm:text-sm xl:mt-2 xl:text-[16px] xl:leading-[1.2]">{accent}</p>
          </div>
        </div>
      </div>
    </>
  );

  if (href) {
    return (
      <Link href={href} className={cardClassName} aria-label={`Open ${title}`}>
        {content}
      </Link>
    );
  }

  return <div className={cardClassName}>{content}</div>;
}

function PreviewPanel({
  title,
  actionLabel,
  onAction,
  children,
}: {
  title: string;
  actionLabel?: string;
  onAction?: () => void;
  children: ReactNode;
}) {
  return (
    <section className="rounded-[12px] border border-[#e1e5ef] bg-white px-3 py-4 shadow-[0_18px_42px_rgba(42,48,78,0.08)] sm:px-5 sm:py-5 md:px-6">
      <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h3 className="text-xl font-medium tracking-[-0.03em] text-[#1f2940] sm:text-[24px]">{title}</h3>
        {actionLabel && onAction ? (
          <button
            type="button"
            onClick={onAction}
            className="inline-flex min-h-[38px] items-center gap-2 rounded-full border border-[#d8dde9] bg-white px-3 text-sm font-semibold text-[#24314c] shadow-[0_8px_16px_rgba(35,41,70,0.08)] transition hover:border-[#c7cfdf] sm:min-h-[42px] sm:px-4 sm:text-[15px]"
          >
            <span>{actionLabel}</span>
            <span className="text-[#d39a35]">
              <Glyph name="arrow" />
            </span>
          </button>
        ) : null}
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

export function BrokerDashboardReference({
  dashboard,
  overview,
  activeSection,
  notificationHasMore,
  notificationIsLoadingMore,
  notificationTotalCount,
  priorityNotifications,
  onLoadMoreNotifications,
  onSelectSection,
  onPrefetchSection,
  onMarkNotificationRead,
  onOpenNotificationPrimaryAction,
  children,
}: BrokerDashboardReferenceProps) {
  const [activityView, setActivityView] = useState<ActivityViewId>("listings");

  const brokerName = overview.brokerName || "Broker";
  const primaryPhone = overview.phone || overview.whatsappNumber || "Phone not added";
  const featuredArea =
    overview.coveragePreview[0] ||
    dashboard.listings.find((listing) => listing.area)?.area ||
    dashboard.areas[0] ||
    null;

  const listingsThisWeek = useMemo(
    () => dashboard.metrics.listingsThisWeek ?? dashboard.listings.filter((listing) => isWithinDays(listing.updated_at)).length,
    [dashboard.listings, dashboard.metrics.listingsThisWeek]
  );
  const pendingThisWeek = useMemo(
    () =>
      dashboard.metrics.pendingListingsThisWeek ??
      dashboard.listings.filter((listing) => listing.status === "pending" && isWithinDays(listing.updated_at)).length,
    [dashboard.listings, dashboard.metrics.pendingListingsThisWeek]
  );
  const enquiriesThisWeek = useMemo(
    () => dashboard.metrics.enquiriesThisWeek ?? dashboard.enquiries.filter((lead) => isWithinDays(lead.created_at)).length,
    [dashboard.enquiries, dashboard.metrics.enquiriesThisWeek]
  );
  const newEnquiries = useMemo(
    () => dashboard.metrics.newEnquiries ?? (dashboard.enquiries.filter((lead) => lead.lead_status === "new").length || dashboard.metrics.publicEnquiries),
    [dashboard.enquiries, dashboard.metrics.newEnquiries, dashboard.metrics.publicEnquiries]
  );
  const matchAlerts = dashboard.metrics.unreadRequirementNotifications || 0;
  const availableMatches = dashboard.metrics.incomingRequirementMatches ?? dashboard.incomingRequirementMatches.length;
  const requirementMetrics = useMemo(() => {
    let active = 0;
    let closed = 0;
    let inactive = 0;
    let newThisWeek = 0;
    const contactedMatches = dashboard.incomingRequirementMatches.filter((match) => match.status === "contacted").length;

    dashboard.requirements.forEach((requirement) => {
      const status = requirement.status || getRequirementStatus(requirement);

      if (status === "active") active += 1;
      if (status === "closed") closed += 1;
      if (status === "inactive") inactive += 1;
      if (isWithinDays(requirement.created_at)) newThisWeek += 1;
    });

    return {
      total: dashboard.metrics.totalRequirements || dashboard.requirements.length,
      active: dashboard.metrics.activeRequirements ?? active,
      closed: dashboard.metrics.closedRequirements ?? closed,
      inactive: dashboard.metrics.inactiveRequirements ?? inactive,
      newThisWeek: dashboard.metrics.requirementsThisWeek ?? newThisWeek,
      incomingMatches: dashboard.metrics.incomingRequirementMatches ?? dashboard.incomingRequirementMatches.length,
      contactedMatches: dashboard.metrics.contactedRequirementMatches ?? contactedMatches,
    };
  }, [
    dashboard.incomingRequirementMatches,
    dashboard.metrics.activeRequirements,
    dashboard.metrics.closedRequirements,
    dashboard.metrics.contactedRequirementMatches,
    dashboard.metrics.inactiveRequirements,
    dashboard.metrics.incomingRequirementMatches,
    dashboard.metrics.requirementsThisWeek,
    dashboard.metrics.totalRequirements,
    dashboard.requirements,
  ]);
  const chatsThisWeek = useMemo(
    () =>
      dashboard.metrics.chatsThisWeek ??
      dashboard.chats.filter((group) =>
        group.conversations.some((conversation) => isWithinDays(conversation.lastMessage?.created_at))
      ).length,
    [dashboard.chats, dashboard.metrics.chatsThisWeek]
  );

  const topTabs = [
    { id: "overview" as const, label: "Overview", icon: "overview" },
    { id: "listings" as const, label: `Listings (${dashboard.metrics.totalListings ?? dashboard.listings.length})`, icon: "listings" },
    { id: "enquiries" as const, label: `Enquiries (${dashboard.metrics.publicEnquiries ?? dashboard.enquiries.length})`, icon: "enquiries" },
    { id: "chats" as const, label: `Chats (${dashboard.metrics.activeChats ?? dashboard.chats.length})`, icon: "chats" },
    { id: "requirements" as const, label: `Requirements (${dashboard.metrics.totalRequirements || dashboard.requirements.length})`, icon: "requirements" },
    { id: "profile" as const, label: "Profile", icon: "profile" },
  ];

  const defaultKpis: MetricCardConfig[] = [
    {
      icon: "listings",
      title: "My Listings",
      value: dashboard.metrics.totalListings,
      helper: "Total Listings",
      accent: `+${listingsThisWeek} This Week`,
      href: getDashboardSectionHref("listings"),
    },
    {
      icon: "overview",
      title: "Pending Review",
      value: dashboard.metrics.pendingListings,
      helper: "Awaiting Approval",
      accent: `+${pendingThisWeek} Pending New`,
      href: getDashboardSectionHref("listings", { listingStatus: "pending" }),
    },
    {
      icon: "enquiries",
      title: "Enquiries",
      value: newEnquiries,
      helper: "New Enquiries",
      accent: `+${enquiriesThisWeek} This Week`,
      href: getDashboardSectionHref("enquiries"),
    },
    {
      icon: "requirements",
      title: "Incoming Matches",
      value: matchAlerts,
      helper: "Unread Alerts",
      accent: `+${availableMatches} Available`,
      href: getDashboardSectionHref("requirements"),
    },
  ];
  const requirementKpis: MetricCardConfig[] = [
    {
      icon: "requirements",
      title: "Total Requirements",
      value: requirementMetrics.total,
      helper: "Buyer Briefs",
      accent: `+${requirementMetrics.newThisWeek} This Week`,
    },
    {
      icon: "spark",
      title: "Active Requirements",
      value: requirementMetrics.active,
      helper: "Live On Board",
      accent: `${ratioPercent(requirementMetrics.active, Math.max(requirementMetrics.total, 1))}% of Total`,
    },
    {
      icon: "trophy",
      title: "Closed / Fulfilled",
      value: requirementMetrics.closed,
      helper: "Completed Briefs",
      accent: `${requirementMetrics.inactive} Inactive`,
    },
    {
      icon: "enquiries",
      title: "Incoming Matches",
      value: requirementMetrics.incomingMatches,
      helper: "Broker Submissions",
      accent: `+${requirementMetrics.contactedMatches} Contacted`,
    },
  ];
  const isRequirementsTab = activeSection === "requirements";
  const pageTitle = isRequirementsTab ? "Buyer Requirements Board" : "Broker Dashboard";
  const pageDescription = isRequirementsTab
    ? "Capture live buyer demand in Dubai, match clients to new listings, and turn requirements into closed deals."
    : "Manage listings, enquiries, credits and monitor broker activity from one convenient workspace.";
  const kpis = isRequirementsTab ? requirementKpis : defaultKpis;

  const activityDatasets = useMemo(
    () => ({
      listings: {
        percentage: ratioPercent(listingsThisWeek, Math.max(dashboard.metrics.totalListings, 1)),
        barValues: [14, 18, 24, 88, 52, 62, 72],
        lineValues: [28, 10, 33, 44, 58, 15, 41],
        lineBackgroundValues: [20, 26, 32, 10, 44, 50, 56],
      },
      enquiries: {
        percentage: ratioPercent(enquiriesThisWeek, Math.max(dashboard.metrics.publicEnquiries, 1)),
        barValues: [15, 19, 25, 90, 54, 64, 74],
        lineValues: [30, 38, 35, 46, 60, 50, 42],
        lineBackgroundValues: [22, 28, 34, 40, 46, 52, 58],
      },
      chats: {
        percentage: ratioPercent(chatsThisWeek, Math.max(overview.activity.openChats, 1)),
        barValues: [13, 17, 23, 86, 50, 10, 70],
        lineValues: [26, 34, 31, 42, 56, 47, 39],
        lineBackgroundValues: [18, 24, 30, 10, 42, 48, 54],
      },
    }),
    [chatsThisWeek, dashboard.metrics.publicEnquiries, dashboard.metrics.totalListings, enquiriesThisWeek, listingsThisWeek, overview.activity.openChats]
  );

  const activeActivityDataset = activityDatasets[activityView];

  const activityLineCoordinates = useMemo(() => {
    const chartWidth = 196;
    const chartHeight = 82;
    const horizontalInset = 8;
    const step = (chartWidth - horizontalInset * 2) / Math.max(activeActivityDataset.lineValues.length - 1, 1);

    return activeActivityDataset.lineValues.map((height, index) => ({
      x: Number((horizontalInset + step * index).toFixed(2)),
      y: Number((chartHeight - height).toFixed(2)),
    }));
  }, [activeActivityDataset.lineValues]);

  const activityLinePoints = useMemo(
    () => activityLineCoordinates.map((point) => `${point.x},${point.y}`).join(" "),
    [activityLineCoordinates]
  );

  const pipelineDelta = Math.max(1, Math.round((dashboard.metrics.activeListings / Math.max(dashboard.metrics.totalListings, 1)) * 5));
  const recentListings = overview.recent.listings.slice(0, 3);
  const featuredEnquiry = overview.recent.enquiries[0] || null;
  const featuredChat = overview.recent.chats[0] || null;
  const featuredChatThread = featuredChat?.conversations[0] || null;
  const featuredChatHref = getInboxHref(featuredChat);
  const complianceEntries = [
    {
      id: "agency",
      title: overview.agencyName || "Agency account",
      lineOne: `RERA ${overview.reraBrn || "Pending"}`,
      lineTwo: overview.approvedAt ? `Approved ${formatDate(overview.approvedAt)}` : "Approval date pending",
    },
    {
      id: "broker",
      title: brokerName,
      lineOne: overview.speciality || "Speciality not added",
      lineTwo: overview.experienceYears ? `${overview.experienceYears} years experience` : "Experience not added",
    },
  ];

  const pipelineCards = [
    {
      icon: "chats",
      title: "Open Chat Threads",
      value: overview.activity.openChats,
      accent: `[+${chatsThisWeek}] This Week`,
    },
    {
      icon: "listings",
      title: "Listings with Conversations",
      value: overview.activity.listingsWithChats,
      accent: "Active Listings",
    },
    {
      icon: "overview",
      title: "Pending Moderation",
      value: dashboard.metrics.pendingListings,
      accent: `+${Math.max(dashboard.metrics.pendingListings, 1)} Available`,
    },
    {
      icon: "enquiries",
      title: "New Enquiries",
      value: newEnquiries,
      accent: "New Enquiries",
    },
  ];

  const showKpiSection = activeSection !== "profile";

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(255,216,145,0.18),transparent_20%),linear-gradient(180deg,#f6f4fa_0%,#f1f2fa_42%,#edf0f8_100%)]">
      <section
        className="relative overflow-hidden border-b border-[#dcdfeb]"
        style={{
          backgroundImage:
            "url('/assets/broker_dashboard.jpg')",
          backgroundPosition: "center",
          backgroundSize: "cover",
        }}
      >
        <div className="mx-auto max-w-[1540px] px-4 pt-6 sm:px-6 md:px-6 md:pt-9 xl:px-10">
          <div className="flex flex-col gap-6">
            <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-start">
              <div className="max-w-[520px] rounded-[10px]">
                <h1 className="text-[24px] font-semibold tracking-[-0.04em] text-[#1b2440] md:text-[34px] lg:text-[36px] xl:text-[40px]">{pageTitle}</h1>
                <p className="mt-3 max-w-[560px] text-[17px] font-normal leading-[1.35] text-[#2b3148] lg:text-[18px]">
                  {pageDescription}
                </p>
              </div>

              <div className="max-w-full self-start rounded-[8px] border border-[rgba(67,76,107,0.18)] bg-[linear-gradient(180deg,rgba(70,79,112,0.85)_0%,rgba(56,63,92,0.88)_100%)] px-3 py-2.5 text-white shadow-[0_14px_30px_rgba(34,40,66,0.2)] backdrop-blur-md sm:px-4 sm:py-3">
                <div className="flex min-w-0 items-center gap-2 sm:gap-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[rgba(247,198,92,0.16)] text-[#f0c165]">
                    <Glyph name="phone" className="h-[17px] w-[17px]" />
                  </span>
              <span className="min-w-0 break-all text-sm font-medium tracking-[-0.02em] sm:text-base xl:text-[18px]">{primaryPhone}</span>
                </div>
              </div>
            </div>

            <div className="mt-1 bg-[linear-gradient(90deg,rgba(40,44,59,0.82)_0%,rgba(40,44,59,0.42)_62%,rgba(40,44,59,0.12)_100%)] px-4 py-3 text-white shadow-[0_16px_26px_rgba(39,42,63,0.16)] sm:px-6 sm:py-4 md:max-w-[620px]">
              <p className="text-[18px] font-medium leading-tight tracking-[-0.03em] sm:text-[22px] lg:text-[26px] xl:text-[28px] xl:leading-none">
                Welcome back, <span className="break-words font-normal text-[#d6dcec]">{brokerName}</span>
              </p>
            </div>
          </div>
        </div>
      </section>

      <div className="border-b border-[#e4e7f0] bg-[rgba(255,255,255,0.92)] shadow-[0_8px_24px_rgba(43,49,80,0.04)] backdrop-blur-lg">
        <div className="mx-auto flex max-w-[1540px] flex-col gap-4 px-4 py-4 sm:px-6 md:px-6 xl:flex-row xl:items-center xl:justify-between xl:px-10">
          <div className="-mx-4 overflow-x-auto px-4 pb-1 sm:-mx-6 sm:px-6 md:mx-0 md:px-0">
            <div className="flex min-w-max gap-2.5 md:min-w-0 md:flex-wrap">
              {topTabs.map((tab) => (
                <DashboardTabButton
                  key={tab.id}
                  active={activeSection === tab.id}
                  href={getDashboardTabHref(tab.id)}
                  icon={tab.icon}
                  label={tab.label}
                  onIntent={() => onPrefetchSection?.(tab.id)}
                />
              ))}
            </div>
          </div>

          {activeSection === "listings" ? (
            <Link
              href="/post-listing"
              className="inline-flex min-h-[40px] items-center justify-center gap-2 rounded-[4px] border border-[#e0c79a] bg-white px-3 py-2 text-sm font-medium text-[#cb8b27] shadow-[0_10px_24px_rgba(211,154,53,0.12)] transition hover:border-[#d7b980] sm:min-h-[42px] sm:px-4 md:self-start md:px-5 md:py-3 md:text-base xl:min-h-[46px] xl:text-[18px]"
            >
              <Glyph name="plus" className="h-[18px] w-[18px]" />
              <span>Add Listing</span>
            </Link>
          ) : null}

          {activeSection === "requirements" ? (
            <Link
              href="/post-requirement"
              className="inline-flex min-h-[40px] items-center justify-center gap-2 rounded-[4px] border border-[#e0c79a] bg-white px-3 py-2 text-sm font-medium text-[#cb8b27] shadow-[0_10px_24px_rgba(211,154,53,0.12)] transition hover:border-[#d7b980] sm:min-h-[42px] sm:px-4 md:self-start md:px-5 md:py-3 md:text-base xl:min-h-[46px] xl:text-[18px]"
            >
              <Glyph name="plus" className="h-[18px] w-[18px]" />
              <span>Add Requirement</span>
            </Link>
          ) : null}
        </div>
      </div>

      <div className="mx-auto max-w-[1540px] px-4 pb-8 pt-6 sm:px-6 sm:pb-10 md:px-6 md:pb-12 md:pt-7 xl:px-10 xl:pb-16">
        {showKpiSection ? (
          <section className="rounded-[12px] border border-[#e5e8f1] bg-[linear-gradient(180deg,rgba(255,255,255,0.95)_0%,rgba(250,250,253,0.96)_100%)] px-5 py-5 shadow-[0_20px_48px_rgba(43,49,80,0.08)] md:px-5 xl:px-6">
            <h2 className="text-[26px] font-semibold tracking-[-0.03em] text-[#1e2941] md:max-xl:text-[24px]">{pageTitle}</h2>
            <div className="mt-5 grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-2 lg:grid-cols-4">
              {kpis.map((card) => (
                <MetricCard key={card.title} {...card} />
              ))}
            </div>
          </section>
        ) : null}



        {activeSection === "overview" ? (
          <div className="mt-5 space-y-6">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-[1.04fr_1.04fr_0.98fr]">
              <section className="rounded-[12px] border border-[#e1e5ef] bg-white px-5 py-5 shadow-[0_18px_42px_rgba(42,48,78,0.08)] md:px-6">
                <h3 className="text-[24px] font-medium tracking-[-0.03em] text-[#1f2940]">Account Overview</h3>

                <div className="mt-4 flex items-start gap-4 rounded-[8px] bg-[linear-gradient(180deg,#fbfbfe_0%,#f5f7fc_100%)] px-3 py-3">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[linear-gradient(180deg,#f0be53_0%,#d7952b_100%)] text-white shadow-[0_8px_18px_rgba(212,153,47,0.24)]">
                    <Glyph name="pin" className="h-[20px] w-[20px]" />
                  </div>
                  <div>
                    <p className="text-[17px] font-semibold tracking-[-0.02em] text-[#212b45]">
                      {featuredArea ? `${featuredArea.name}, ${featuredArea.city}` : "Dubai, UAE"}
                    </p>
                    <p className="mt-1 text-[15px] text-[#71798f]">Active Listings</p>
                  </div>
                </div>

                <div className="mt-5 border-t border-[#e7e9f1] pt-5">
                  <p className="text-[14px] font-semibold uppercase tracking-[0.22em] text-[#5f6982]">RERA Compliance</p>
                  <div className="mt-4 space-y-4">
                    {complianceEntries.map((entry) => (
                      <div key={entry.id} className="flex gap-3">
                        <span className="mt-[10px] h-[6px] w-[6px] shrink-0 rounded-full bg-[#2b3650]" />
                        <div>
                          <p className="text-[17px] font-semibold tracking-[-0.02em] text-[#1f2940]">{entry.title}</p>
                          <p className="mt-1 text-[15px] leading-[1.35] text-[#5f6982]">{entry.lineOne}</p>
                          <p className="mt-1 text-[15px] leading-[1.35] text-[#7d8698]">{entry.lineTwo}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-5 flex items-end justify-between gap-4 border-t border-[#e7e9f1] pt-5">
                  <div>
                    <p className="text-[18px] font-semibold tracking-[-0.02em] text-[#202a42]">Credits</p>
                    <p className="mt-1 text-[15px] text-[#4a5265]">
                      <span className="mr-2 text-[40px] font-semibold leading-none tracking-[-0.04em] text-[#1b2540]">
                        {overview.credits.available}
                      </span>
                      {overview.credits.used} Used out of {overview.credits.assigned} Assigned.
                     
                    </p>
                  </div>
                  {/* <button
                    type="button"
                    className="inline-flex min-h-[46px] items-center justify-center rounded-[12px] border border-[#d0a34c] bg-[linear-gradient(180deg,#dbab4c_0%,#bb7f1b_100%)] px-4 text-sm font-semibold text-white shadow-[0_14px_22px_rgba(194,132,32,0.26)] sm:min-h-[48px] sm:px-5 sm:text-[18px]"
                  >
                    Add Credits
                  </button> */}
                </div>
              </section>

              <section className="rounded-[12px] border border-[#e1e5ef] bg-white px-5 py-5 shadow-[0_18px_42px_rgba(42,48,78,0.08)] md:px-6">
                <div className="flex items-start justify-between gap-3 sm:gap-4">
                  <h3 className="text-xl font-medium tracking-[-0.03em] text-[#1f2940] sm:text-[24px]">Recent Activity</h3>
                  <div className="flex items-center gap-2 text-[#d2a44d]">
                    <Glyph name="spark" />
                    <Glyph name="chats" />
                  </div>
                </div>

                <div className="mt-4 flex w-full max-w-full overflow-hidden rounded-full border border-[#d7dce8] bg-[linear-gradient(180deg,#f7f8fc_0%,#edf0f7_100%)] sm:inline-flex sm:w-auto">
                  {(["listings", "enquiries", "chats"] as ActivityViewId[]).map((item, index) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => setActivityView(item)}
                      className={cn(
                        "min-w-0 flex-1 px-3 py-2 text-sm font-medium capitalize transition sm:flex-none sm:px-5 sm:text-[16px]",

                        // 🔹 shape control
                        index === 0 && "rounded-l-full",
                        index === 2 && "rounded-r-full",

                        // 🔹 vertical divider (light line)
                        index !== 0 && "border-l border-[#d7dce8]",

                        // 🔹 active state
                        activityView === item
                          ? "bg-[#4b556d] text-white shadow-[0_10px_18px_rgba(51,61,86,0.18)]"
                          : "text-[#4f5971] bg-transparent"
                      )}
                    >
                      {item}
                    </button>
                  ))}
                </div>

                <div className="mt-5 flex flex-col gap-4 sm:mt-6 sm:flex-row sm:items-end sm:justify-between sm:gap-6">
                  <div className="min-w-0">
                    <p className="text-[34px] font-medium leading-none tracking-[-0.06em] text-[#2f886c] sm:text-[48px] xl:text-[58px]">
                      +{activeActivityDataset.percentage}%
                    </p>
                    <p className="mt-1 text-sm text-[#364056] sm:text-[17px]">
                      Activity This Week
                    </p>
                  </div>

                <div className="w-full sm:w-[60%]">
                  <div className="relative">
                    <div className="absolute inset-x-0 bottom-0 h-px bg-[#e3e7ed]" />
                    <div className="relative flex h-[110px] w-full items-end justify-between">
                      {activeActivityDataset.barValues.map((height, index) => (
                        <div
                          key={`bar-${index}`}
                          className={cn(
                            "w-[22px] rounded-t-[2px]",
                            index < 3 ? "bg-[#DADDE2]" : index === 3 ? "bg-[#2F3E5C]" : "bg-[#5FA777]"
                          )}
                          style={{ height: `${height}px` }}
                        />
                      ))}
                     </div>
                    </div>
                  </div>
                </div>

                <div className="mt-[18px] w-full">
                  <div className="relative h-[90px] w-full">
                    <div className="absolute inset-0 flex items-end justify-between">
                      {activeActivityDataset.lineBackgroundValues.map((height, index) => (
                        <div
                          key={`line-background-${index}`}
                          className="w-[7px] rounded-t-[2px] bg-[#E5E7EB] opacity-25"
                          style={{ height: `${height}px` }}
                        />
                      ))}
                    </div>

                    <svg
                      width="100%"
                      height="100%"
                      viewBox="0 0 196 82"
                      preserveAspectRatio="none"
                      className="absolute inset-0 h-full w-full"
                      fill="none"
                      aria-hidden="true"
                    >
                      <polyline
                        points={activityLinePoints}
                        fill="none"
                        stroke="#D29B2C"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      {activityLineCoordinates.map((point, index) => (
                        <circle key={`line-point-${index}`} cx={point.x} cy={point.y} r="2.5" fill="#ffffff" stroke="#D29B2C" strokeWidth="2" />
                      ))}
                    </svg>
                  </div>

                  <div className="mt-[6px] grid w-full grid-cols-7 text-center text-[10px] font-medium uppercase tracking-[0.08em] text-[#7b8296]">
                    {["10 M", "5", "4Q", "16", "8", "9", "11 K"].map((label) => (
                      <span key={label}>{label}</span>
                    ))}
                  </div>
                </div>

                <div className="mt-4 rounded-[8px] border border-[#e7eaf2] bg-[linear-gradient(180deg,#fcfcfe_0%,#f7f8fc_100%)] px-4 py-4">
                  <div className="flex items-center gap-2 text-[#2f3e5f]">
                    <Glyph name="dot" className="h-[12px] w-[12px] text-[#3c4770]" />
                    <p className="min-w-0 break-words text-base font-medium tracking-[-0.02em] sm:text-[18px]">
                      {featuredArea ? `${featuredArea.name} - ${featuredArea.city}` : "Broker Workspace"}
                    </p>
                  </div>
                  <p className="mt-2 text-[15px] text-[#535d74]">
                    {overview.credits.used} used out of {overview.credits.assigned} assigned
                  </p>
                </div>
              </section>

              <div className="hidden min-w-0 xl:col-span-1 xl:block">
                <BrokerPriorityQueue
                  hasMore={notificationHasMore}
                  isLoadingMore={notificationIsLoadingMore}
                  notifications={priorityNotifications}
                  onLoadMore={onLoadMoreNotifications}
                  onMarkAsRead={onMarkNotificationRead}
                  onOpenPrimaryAction={onOpenNotificationPrimaryAction}
                  totalCount={notificationTotalCount}
                />
              </div>
            </div>

            <section className="rounded-[12px] border border-[#e1e5ef] bg-white px-5 py-5 shadow-[0_18px_42px_rgba(42,48,78,0.08)] md:px-6">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <h3 className="text-[24px] font-medium tracking-[-0.03em] text-[#1f2940]">Pipeline Health</h3>
                  <span className="text-[#3e9b7c]">
                    <Glyph name="trend" className="h-[40px] w-[30px]" />
                  </span>
                </div>
                <p className="text-[30px] font-semibold tracking-[-0.04em] text-[#cf912e]">+{pipelineDelta}%</p>
              </div>

              <div className="mt-4 overflow-hidden rounded-[12px] border border-[rgba(255,255,255,0.16)] shadow-[0_18px_34px_rgba(26,18,10,0.24)]">
                <div className="grid grid-cols-2 xl:grid-cols-4">
                  {pipelineCards.map((card, index) => (
                    <div key={card.title} className="relative isolate min-w-0 overflow-hidden bg-[#22170f] px-3 py-4 text-white sm:px-4 sm:py-5 xl:px-7 xl:py-6">
                      {index > 0 ? (
                        <span
                          aria-hidden="true"
                          className="pointer-events-none absolute left-0 top-1/2 hidden h-[58%] w-px -translate-y-1/2 bg-[linear-gradient(180deg,rgba(226,231,239,0)_0%,rgba(226,231,239,0.08)_18%,rgba(226,231,239,0.16)_50%,rgba(226,231,239,0.08)_82%,rgba(226,231,239,0)_100%)] xl:block"
                        />
                      ) : null}
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
                      <div className="relative flex min-w-0 items-start gap-2 sm:gap-3">
                        <span className="mt-1 shrink-0 text-[#e1ad4f]">
                          <Glyph name={card.icon} className="h-5 w-5 sm:h-6 sm:w-6 xl:h-[30px] xl:w-[30px]" />
                        </span>
                        <div className="min-w-0">
                          <p className="max-w-[170px] break-words text-sm font-medium leading-[1.25] tracking-[-0.02em] text-white sm:text-base xl:text-[22px] xl:leading-[1.35]">{card.title}</p>
                          <div className="mt-3 flex min-w-0 flex-col gap-1 sm:flex-row sm:items-end sm:gap-3 xl:mt-4 xl:gap-5">
                            <span className="break-words text-[30px] font-semibold leading-none tracking-[-0.06em] sm:text-[38px] xl:text-[52px]">{card.value}</span>
                            <span className="break-words text-xs font-medium text-[#98d0a9] sm:pb-[5px] sm:text-sm xl:text-[15px]">{card.accent}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-5 grid gap-4 xl:grid-cols-[1.05fr_1fr]">
                <PreviewPanel title="Recent Listings" actionLabel="View All" onAction={() => onSelectSection("listings")}>
                  <div className="space-y-3">
                    {recentListings.length ? (
                      recentListings.map((listing: Listing) => (
                        <div
                          key={listing.id}
                          className="min-w-0 border-b border-[#e4e8f0] px-0 pb-3 last:border-b-0 last:pb-0 xl:rounded-[12px] xl:border xl:border-[#dfe4ee] xl:bg-[linear-gradient(180deg,#fdfdff_0%,#f7f8fc_100%)] xl:px-4 xl:py-4 xl:shadow-[0_8px_18px_rgba(34,40,66,0.04)] xl:last:border-b xl:last:pb-4"
                        >
                          <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                            <div className="min-w-0 flex-1">
                              <Link href={getBrokerListingHref(listing.id)} className="line-clamp-2 break-words text-base font-semibold tracking-[-0.02em] text-[#202a42] sm:block sm:truncate sm:text-[18px]">
                                {listing.title}
                              </Link>
                              <p className="mt-2 break-words text-sm text-[#4e566c] sm:text-[16px]">
                                {listing.area?.name || "Area pending"} | {formatListingStatus(listing.status)}
                              </p>
                              <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-[#566078] sm:text-[15px]">
                                <span>Updated {formatRelativeTime(listing.updated_at)}</span>
                                <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[#d4a24a] text-white">
                                  <span className="block h-[5px] w-[5px] rounded-full bg-current" />
                                </span>
                              </div>
                            </div>
                            <div className="flex shrink-0 flex-wrap items-center gap-2 sm:block sm:text-right">
                              <span className="inline-flex rounded-[8px] bg-[#eef0f6] px-3 py-1 text-[12px] font-semibold uppercase tracking-[0.08em] text-[#37435f]">
                                {formatListingStatus(listing.status)}
                              </span>
                              <p className="text-sm text-[#616a80] sm:mt-3 sm:text-[16px]">{formatRelativeTime(listing.updated_at)}</p>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="rounded-[18px] border border-[#dfe4ee] bg-[linear-gradient(180deg,#fdfdff_0%,#f7f8fc_100%)] px-4 py-6 text-[15px] text-[#5b6478]">
                        Recent listing activity will appear here once inventory is added.
                      </div>
                    )}
                  </div>
                </PreviewPanel>

                <div className="space-y-4 xl:space-y-0">
                  <PreviewPanel title="Recent Enquiries" actionLabel="View All" onAction={() => onSelectSection("enquiries")}>
                    {featuredEnquiry ? (
                      <div className="min-w-0 xl:rounded-[12px] xl:border xl:border-[#dfe4ee] xl:bg-[linear-gradient(180deg,#fdfdff_0%,#f7f8fc_100%)] xl:px-4 xl:py-4 xl:shadow-[0_8px_18px_rgba(34,40,66,0.04)]">
                        <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                          <div className="min-w-0 flex-1">
                            <p className="line-clamp-2 break-words text-base font-semibold tracking-[-0.02em] text-[#202a42] sm:truncate sm:text-[18px]">{featuredEnquiry.contact_name}</p>
                            <p className="mt-2 break-words text-sm font-medium text-[#27314a] sm:text-[16px]">
                              {featuredEnquiry.listing?.title || "Enquiring: Public Lead"}
                              {featuredEnquiry.lead_status === "new" ? (
                                <span className="ml-2 inline-flex rounded-full bg-[#f6ead7] px-2 py-[2px] text-[12px] font-semibold uppercase tracking-[0.08em] text-[#b77d1a]">
                                  New
                                </span>
                              ) : null}
                            </p>
                            <div className="mt-3 flex flex-wrap gap-2">
                              <span className="rounded-full bg-[#eef0f6] px-3 py-1 text-[15px] text-[#46516b]">
                                {featuredEnquiry.listing?.property_type
                                  ? `${formatPropertyType(featuredEnquiry.listing.property_type)}`
                                  : "Public lead"}
                              </span>
                              {featuredEnquiry.listing?.price ? (
                                <span className="rounded-full bg-[#f4ead8] px-3 py-1 text-[15px] text-[#8a611d]">{formatCurrency(featuredEnquiry.listing.price)}</span>
                              ) : null}
                            </div>
                            <p className="mt-3 text-sm text-[#586176] sm:text-[15px]">Updated {formatRelativeTime(featuredEnquiry.created_at)}</p>
                          </div>
                          <p className="shrink-0 text-sm text-[#71798f] sm:text-right sm:text-[16px]">{formatRelativeTime(featuredEnquiry.created_at)}</p>
                        </div>
                      </div>
                    ) : (
                      <div className="rounded-[12px] border border-[#dfe4ee] bg-[linear-gradient(180deg,#fdfdff_0%,#f7f8fc_100%)] px-4 py-6 text-[15px] text-[#5b6478]">
                        Public enquiries will show here as soon as they arrive.
                      </div>
                    )}
                  </PreviewPanel>

                  <PreviewPanel title="Recent Chats" actionLabel="View All" onAction={() => onSelectSection("chats")}>
                    {featuredChat && featuredChatThread ? (
                      <div className="min-w-0 xl:rounded-[12px] xl:border xl:border-[#dfe4ee] xl:bg-[linear-gradient(180deg,#fdfdff_0%,#f7f8fc_100%)] xl:px-4 xl:py-4 xl:shadow-[0_8px_18px_rgba(34,40,66,0.04)]">
                        <div className="flex min-w-0 items-start gap-3 sm:gap-4">
                          <BrokerAvatar
                            alt={`${featuredChatThread.participant ? getFullName(featuredChatThread.participant.first_name, featuredChatThread.participant.last_name) : "Broker"} avatar`}
                            className="h-10 w-10 shrink-0 border border-[#dfe4ee] bg-white sm:h-12 sm:w-12"
                          />
                          <div className="min-w-0 flex-1">
                            {featuredChatHref ? (
                              <Link href={featuredChatHref} className="line-clamp-2 break-words text-base font-semibold tracking-[-0.02em] text-[#202a42] sm:block sm:truncate sm:text-[18px]">
                                {featuredChatThread.participant
                                  ? getFullName(featuredChatThread.participant.first_name, featuredChatThread.participant.last_name)
                                  : "Broker"}
                              </Link>
                            ) : (
                              <p className="line-clamp-2 break-words text-base font-semibold tracking-[-0.02em] text-[#202a42] sm:truncate sm:text-[18px]">
                                {featuredChatThread.participant
                                  ? getFullName(featuredChatThread.participant.first_name, featuredChatThread.participant.last_name)
                                  : "Broker"}
                              </p>
                            )}
                            <p className="mt-2 line-clamp-2 break-words text-sm text-[#4e566c] sm:text-[16px]">{featuredChatThread.lastMessage?.content || "No messages yet."}</p>
                            <p className="mt-2 break-words text-sm text-[#596277] sm:text-[15px]">
                              {featuredChat.listing.title} at {featuredChatThread.lastMessage?.created_at ? formatRelativeTime(featuredChatThread.lastMessage.created_at) : "Just now"}
                            </p>
                          </div>
                          <p className="hidden shrink-0 text-right text-[16px] text-[#71798f] sm:block">
                            {featuredChatThread.lastMessage?.created_at ? formatRelativeTime(featuredChatThread.lastMessage.created_at) : "Now"}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="rounded-[12px] border border-[#dfe4ee] bg-[linear-gradient(180deg,#fdfdff_0%,#f7f8fc_100%)] px-4 py-6 text-[15px] text-[#5b6478]">
                        Chat previews will appear once brokers start messaging on listings.
                      </div>
                    )}
                  </PreviewPanel>
                </div>
              </div>
            </section>
          </div>
        ) : (
          <div className="mt-6">{children}</div>
        )}
      </div>
    </div>
  );
}
