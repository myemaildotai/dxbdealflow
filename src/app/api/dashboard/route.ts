import { NextRequest, NextResponse } from "next/server";
import { getServiceSupabase, LISTING_SELECT, requireApprovedBroker, withNoStore } from "@/lib/deal-server";
import {
  fetchAreas,
  fetchBrokerChatSummariesPage,
  fetchUserBundle,
  hydrateBrokerEnquiries,
  hydrateListings,
} from "@/lib/platform-server-data";
import { isActiveListingStatus } from "@/lib/deal-utils";
import {
  fetchRequirementMatchesForOwner,
  fetchMyRequirements,
  fetchRequirementNotificationsForBroker,
} from "@/lib/requirements-server";
import type { Lead, Listing } from "@/lib/deal-types";

export async function GET(request: NextRequest) {
  const auth = await requireApprovedBroker(request);
  if ("error" in auth) return auth.error;

  const supabase = getServiceSupabase();
  const notificationScope = request.nextUrl.searchParams.get("scope") === "notifications";
  const [bundle, areas, listingsResult, enquiriesResult, chatGroupsPage] = await Promise.all([
    fetchUserBundle(supabase, auth.user.id),
    notificationScope ? Promise.resolve([]) : fetchAreas(supabase),
    supabase
      .from("listings")
      .select(LISTING_SELECT)
      .eq("created_by", auth.user.id)
      .is("deleted_at", null)
      .order(notificationScope ? "approved_at" : "updated_at", { ascending: false, nullsFirst: false }),
    supabase
      .from("leads")
      .select(
        "id, listing_id, requirement_id, from_user_id, to_user_id, lead_type, lead_status, message, contact_name, contact_email, contact_phone, preferred_channel, email_triggered_at, whatsapp_triggered_at, is_read, read_at, created_at"
      )
      .eq("to_user_id", auth.user.id)
      .order("created_at", { ascending: false }),
    notificationScope
      ? fetchBrokerChatSummariesPage(supabase, auth.user.id, {
          includeMessages: true,
          filter: "unread",
          limit: 50,
          messageLimit: 1,
        })
      : fetchBrokerChatSummariesPage(supabase, auth.user.id),
  ]);

  const listings = await hydrateListings(supabase, (listingsResult.data as Listing[]) || [], {
    includeAgencies: !notificationScope,
    includeCommissionTerms: !notificationScope,
    includeImages: true,
    includeOwnerActiveCount: !notificationScope,
    includeOwners: !notificationScope,
  });
  const enquiries = await hydrateBrokerEnquiries(supabase, (enquiriesResult.data as Lead[]) || [], auth.user.id);
  const chatGroups = chatGroupsPage.groups;
  const brokerProfileId = bundle.brokerProfile?.id ?? null;
  const [requirements, incomingRequirementMatches, requirementNotifications] = brokerProfileId
    ? await Promise.all([
        notificationScope ? Promise.resolve([]) : fetchMyRequirements(supabase, brokerProfileId),
        notificationScope ? Promise.resolve([]) : fetchRequirementMatchesForOwner(supabase, brokerProfileId),
        fetchRequirementNotificationsForBroker(supabase, brokerProfileId),
      ])
    : [[], [], []];

  const response = NextResponse.json(
    {
      metrics: {
        totalListings: listings.length,
        activeListings: listings.filter((listing) => isActiveListingStatus(listing.status)).length,
        pendingListings: listings.filter((listing) => listing.status === "pending").length,
        publicEnquiries: enquiries.length,
        activeChats: chatGroupsPage.totalRecentConversations,
        totalRequirements: requirements.length,
        activeRequirements: requirements.filter((requirement) => requirement.is_active).length,
        incomingRequirementMatches: incomingRequirementMatches.length,
        unreadRequirementNotifications: requirementNotifications.filter((notification) => !notification.is_read).length,
      },
      profile: bundle.user,
      brokerProfile: bundle.brokerProfile,
      agency: bundle.agency,
      credits: bundle.credits,
      listings: listings.map((listing) => ({
        ...listing,
        can_edit: true,
        can_chat: isActiveListingStatus(listing.status),
      })),
      enquiries,
      chats: chatGroups,
      requirements,
      incomingRequirementMatches,
      requirementNotifications,
      areas,
    },
    withNoStore()
  );
  return response;
}
