import type { Area, BrokerDashboardData, ChatConversationSummary, Lead, Listing } from "@/lib/deal-types";
import { getFullName } from "@/lib/deal-utils";

export type BrokerOverviewSection = "listings" | "enquiries" | "chats" | "requirements" | "profile";

export interface BrokerOverviewAction {
  id: string;
  title: string;
  description: string;
  badge?: string;
  href?: string;
  section?: BrokerOverviewSection;
  tone: "primary" | "secondary";
  disabled?: boolean;
}

export interface BrokerOverviewModel {
  brokerName: string;
  status: string | null;
  email: string | null;
  phone: string | null;
  agencyName: string | null;
  speciality: string | null;
  experienceYears: number | null;
  whatsappNumber: string | null;
  reraBrn: string | null;
  approvedAt: string | null;
  profileCompleteness: number;
  coveredAreas: Area[];
  coveragePreview: Area[];
  extraCoverageCount: number;
  credits: {
    available: number;
    used: number;
    assigned: number;
    usagePercent: number;
  };
  activity: {
    openChats: number;
    totalMessages: number;
    listingsWithChats: number;
    pendingListings: number;
    attentionListings: number;
    newEnquiries: number;
    latestListingUpdatedAt: string | null;
    latestEnquiryAt: string | null;
    latestChatAt: string | null;
  };
  actions: BrokerOverviewAction[];
  recent: {
    listings: Listing[];
    enquiries: Lead[];
    chats: ChatConversationSummary[];
  };
}

const PROFILE_COMPLETENESS_FIELDS = 8;
const COVERAGE_PREVIEW_LIMIT = 4;
const RECENT_ITEMS_LIMIT = 3;
const ATTENTION_STATUSES = new Set(["rejected", "inactive", "expired"]);

const getInboxHref = (group?: ChatConversationSummary | null) =>
  group?.conversations[0] ? `/dashboard/chats/${group.conversations[0].conversationId}` : null;

export function buildBrokerOverview(dashboard: BrokerDashboardData): BrokerOverviewModel {
  const listings = dashboard.listings || [];
  const enquiries = dashboard.enquiries || [];
  const chats = dashboard.chats || [];
  const coveredAreaIds = dashboard.brokerProfile?.covered_area_ids || [];
  const coveredAreaIdSet = new Set(coveredAreaIds);
  const coveredAreas = (dashboard.areas || []).filter((area) => coveredAreaIdSet.has(area.id));
  const chatListingIdSet = new Set(chats.map((group) => group.listing.id));
  const totalMessages = chats.reduce(
    (groupTotal, group) => groupTotal + group.conversations.reduce((conversationTotal, conversation) => conversationTotal + conversation.messageCount, 0),
    0
  );
  const pendingListings = dashboard.metrics.pendingListings ?? listings.filter((listing) => listing.status === "pending").length;
  const attentionListings = dashboard.metrics.attentionListings ?? listings.filter((listing) => ATTENTION_STATUSES.has(listing.status)).length;
  const newEnquiries = dashboard.metrics.newEnquiries ?? enquiries.filter((enquiry) => enquiry.lead_status === "new").length;
  const listingsWithChats = dashboard.metrics.listingsWithChats ?? listings.filter((listing) => chatListingIdSet.has(listing.id)).length;
  const assignedCredits = dashboard.credits?.total_credits_assigned || 0;
  const usedCredits = dashboard.credits?.used_credits || 0;
  const availableCredits = dashboard.credits?.available_credits || 0;
  const usagePercent = assignedCredits > 0 ? Math.min(100, Math.round((usedCredits / assignedCredits) * 100)) : 0;
  const profileCompletenessChecks = [
    !!dashboard.profile?.phone,
    !!dashboard.agency?.name,
    !!dashboard.brokerProfile?.speciality,
    dashboard.brokerProfile?.experience_years !== null && dashboard.brokerProfile?.experience_years !== undefined,
    !!dashboard.brokerProfile?.whatsapp_number,
    coveredAreas.length > 0,
    !!dashboard.brokerProfile?.bio,
    !!(dashboard.brokerProfile?.rera_brn || dashboard.agency?.rera_brn),
  ];
  const profileCompleteness = Math.round(
    (profileCompletenessChecks.filter(Boolean).length / PROFILE_COMPLETENESS_FIELDS) * 100
  );
  const latestChatHref = getInboxHref(chats[0]);
  const fallbackActions: BrokerOverviewAction[] = [
    {
      id: "browse-listings",
      title: "Browse live inventory",
      description: "Compare active stock across the marketplace and monitor pricing.",
      href: "/listings",
      tone: "secondary",
    },
  ];
  const actions = [
    {
      id: "create-listing",
      title: "Create listing",
      description:
        availableCredits > 0
          ? `${availableCredits} credits are ready for new inventory.`
          : "No credits are available right now. Request an allocation before posting.",
      badge: availableCredits > 0 ? `${availableCredits} credits` : "Credits needed",
      href: availableCredits > 0 ? "/post-listing" : undefined,
      tone: "primary" as const,
      disabled: availableCredits <= 0,
    },
    profileCompleteness < 100
      ? {
          id: "complete-profile",
          title: "Complete broker profile",
          description: "Fill in the missing broker details so your account data stays usable across the workspace.",
          badge: `${profileCompleteness}% complete`,
          section: "profile" as const,
          tone: "secondary" as const,
        }
      : null,
    pendingListings > 0 || attentionListings > 0
      ? {
          id: "review-listings",
          title: "Review listing pipeline",
          description:
            attentionListings > 0
              ? "Some listings need broker follow-up because they are inactive, rejected, or expired."
              : "Track listings waiting on moderation and recent updates.",
          badge: attentionListings > 0 ? `${attentionListings} follow-up` : `${pendingListings} pending`,
          section: "listings" as const,
          tone: "secondary" as const,
        }
      : null,
    enquiries.length > 0
      ? {
          id: "review-enquiries",
          title: "Review enquiries",
          description: "Check public leads routed from your listings and keep response times tight.",
          badge: `${newEnquiries} new`,
          section: "enquiries" as const,
          tone: "secondary" as const,
        }
      : null,
    (dashboard.metrics.incomingRequirementMatches || 0) > 0 || (dashboard.metrics.unreadRequirementNotifications || 0) > 0
      ? {
          id: "review-requirements",
          title: "Review requirements and incoming matches",
          description: "Manage your own briefs and the real broker-submitted matches that arrive against them.",
          badge:
            (dashboard.metrics.unreadRequirementNotifications || 0) > 0
              ? `${dashboard.metrics.unreadRequirementNotifications} alerts`
              : `${dashboard.metrics.incomingRequirementMatches || 0} incoming`,
          section: "requirements" as const,
          tone: "secondary" as const,
        }
      : null,
    latestChatHref
      ? {
          id: "open-inbox",
          title: "Open latest inbox",
          description: "Continue the most recent listing conversation without leaving the dashboard.",
          badge: `${chats.length} threads`,
          href: latestChatHref,
          tone: "secondary" as const,
        }
      : null,
  ].filter(Boolean) as BrokerOverviewAction[];

  return {
    brokerName: getFullName(dashboard.profile?.first_name, dashboard.profile?.last_name),
    status: dashboard.profile?.status || dashboard.brokerProfile?.application_status || null,
    email: dashboard.profile?.email || null,
    phone: dashboard.profile?.phone || null,
    agencyName: dashboard.agency?.name || null,
    speciality: dashboard.brokerProfile?.speciality || null,
    experienceYears: dashboard.brokerProfile?.experience_years || null,
    whatsappNumber: dashboard.brokerProfile?.whatsapp_number || null,
    reraBrn: dashboard.brokerProfile?.rera_brn || dashboard.agency?.rera_brn || null,
    approvedAt: dashboard.brokerProfile?.approved_at || null,
    profileCompleteness,
    coveredAreas,
    coveragePreview: coveredAreas.slice(0, COVERAGE_PREVIEW_LIMIT),
    extraCoverageCount: Math.max(coveredAreas.length - COVERAGE_PREVIEW_LIMIT, 0),
    credits: {
      available: availableCredits,
      used: usedCredits,
      assigned: assignedCredits,
      usagePercent,
    },
    activity: {
      openChats: dashboard.metrics.activeChats ?? chats.length,
      totalMessages,
      listingsWithChats,
      pendingListings,
      attentionListings,
      newEnquiries,
      latestListingUpdatedAt: listings[0]?.updated_at || null,
      latestEnquiryAt: enquiries[0]?.created_at || null,
      latestChatAt: chats[0]?.conversations[0]?.lastMessage?.created_at || null,
    },
    actions: actions.length ? actions : fallbackActions,
    recent: {
      listings: listings.slice(0, RECENT_ITEMS_LIMIT),
      enquiries: enquiries.slice(0, RECENT_ITEMS_LIMIT),
      chats: chats.slice(0, RECENT_ITEMS_LIMIT),
    },
  };
}
