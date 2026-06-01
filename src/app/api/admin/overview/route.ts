import { NextRequest, NextResponse } from "next/server";
import {
  BROKER_PROFILE_SELECT,
  COMING_SOON_REGISTRATION_SELECT,
  CREDIT_SELECT,
  getServiceSupabase,
  LEAD_SELECT,
  LISTING_SELECT,
  REQUIREMENT_SELECT,
  requireAdmin,
  withNoStore,
} from "@/lib/deal-server";
import {
  fetchActivityLog,
  fetchAreas,
  hydrateAdminEnquiries,
  hydrateListings,
} from "@/lib/platform-server-data";
import {
  ensureAdminPriorityQueueNotificationsFromPendingItems,
  fetchAdminPriorityQueueNotifications,
} from "@/lib/admin-priority-queue-server";
import { isActiveBrokerStatus, isActiveListingStatus } from "@/lib/deal-utils";
import { enrichRequirementsWithSubmissionMeta } from "@/lib/requirements-server";
import type { Agency, ComingSoonRegistration, CreditSummary, Lead, Listing, PlatformUser, Requirement } from "@/lib/deal-types";

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if ("error" in auth) return auth.error;

  const supabase = getServiceSupabase();
  const notificationScope = request.nextUrl.searchParams.get("scope") === "notifications";

  if (notificationScope) {
    const priorityQueue = await fetchAdminPriorityQueueNotifications(supabase, auth.user.id);
    const response = NextResponse.json(
      {
        metrics: {
          pendingApplications: 0,
          activeBrokers: 0,
          totalUsers: 0,
          activeListings: 0,
          pendingListings: 0,
          activeRequirements: 0,
          publicEnquiries: 0,
          totalChats: 0,
        },
        applications: [],
        users: [],
        listings: [],
        priorityQueue,
        requirements: [],
        enquiries: [],
        comingSoonRegistrations: [],
        chats: [],
        activityResponse: {
          activity: [],
          totalCount: 0,
          filteredCount: 0,
          page: 1,
          pageSize: 10,
          totalPages: 1,
          countsIncluded: false,
          categoryCounts: {
            all: 0,
            listings: 0,
            brokers: 0,
            credits: 0,
            requirements: 0,
            system: 0,
          },
        },
        activity: [],
        activityTotal: 0,
        areas: [],
      },
      withNoStore()
    );
    return response;
  }

  const [
    areas,
    activity,
    usersResult,
    brokerProfilesResult,
    creditsResult,
    listingsResult,
    requirementsResult,
    enquiriesResult,
    comingSoonRegistrationsResult,
    conversationsCountResult,
  ] = await Promise.all([
    fetchAreas(supabase),
    fetchActivityLog(supabase, { page: 1, pageSize: 10 }),
    supabase
      .from("users")
      .select("id, email, first_name, last_name, phone, role, status, agency_id, created_at, updated_at")
      .order("created_at", { ascending: false }),
    supabase
      .from("broker_profiles")
      .select(BROKER_PROFILE_SELECT),
    supabase.from("broker_credits").select(CREDIT_SELECT),
    supabase.from("listings").select(LISTING_SELECT).order("created_at", { ascending: false }),
    supabase.from("requirements").select(REQUIREMENT_SELECT).order("created_at", { ascending: false }),
    supabase.from("leads").select(LEAD_SELECT).order("created_at", { ascending: false }),
    supabase.from("coming_soon_registrations").select(COMING_SOON_REGISTRATION_SELECT).order("created_at", { ascending: false }),
    supabase.from("chat_conversations").select("id", { count: "exact", head: true }),
  ]);

  const users = (usersResult.data as PlatformUser[]) || [];
  const listingsPromise = hydrateListings(supabase, (listingsResult.data as Listing[]) || []);
  const requirementsPromise = enrichRequirementsWithSubmissionMeta(supabase, (requirementsResult.data as Requirement[]) || []);
  const enquiriesPromise = hydrateAdminEnquiries(supabase, (enquiriesResult.data as Lead[]) || []);
  const comingSoonRegistrations = (comingSoonRegistrationsResult.data as ComingSoonRegistration[] | null) || [];
  const brokerProfiles = new Map((brokerProfilesResult.data || []).map((profile) => [profile.user_id, profile]));
  const credits = new Map((creditsResult.data as CreditSummary[] | null)?.map((credit) => [credit.user_id, credit]) || []);

  const agencyIds = Array.from(new Set(users.map((user) => user.agency_id).filter(Boolean))) as string[];

  const [listings, requirements, enquiries, { data: agencies }] = await Promise.all([
    listingsPromise,
    requirementsPromise,
    enquiriesPromise,
    agencyIds.length
      ? supabase.from("agencies").select("id, name, rera_brn, status, created_at, updated_at").in("id", agencyIds)
      : Promise.resolve({ data: [] as Agency[] }),
  ]);

  const agencyMap = new Map((agencies || []).map((agency) => [agency.id, agency]));

  const hydratedUsers = users.map((user) => ({
    ...user,
    brokerProfile: brokerProfiles.get(user.id) || null,
    agency: user.agency_id ? agencyMap.get(user.agency_id) || null : null,
    credits: credits.get(user.id) || null,
  }));
  const adminUserIds = hydratedUsers.filter((user) => user.role === "admin").map((user) => user.id);
  const pendingBrokerUsers = hydratedUsers.filter((user) => user.role === "broker" && user.status === "pending");
  const pendingListings = listings.filter((listing) => !listing.deleted_at && listing.status === "pending");

  await ensureAdminPriorityQueueNotificationsFromPendingItems(supabase, adminUserIds, pendingBrokerUsers, pendingListings);
  const priorityQueue = await fetchAdminPriorityQueueNotifications(supabase, auth.user.id);

  const response = NextResponse.json(
    {
      metrics: {
        pendingApplications: hydratedUsers.filter((user) => user.role === "broker" && user.status === "pending").length,
        activeBrokers: hydratedUsers.filter((user) => user.role === "broker" && isActiveBrokerStatus(user.status)).length,
        totalUsers: hydratedUsers.length,
        activeListings: listings.filter((listing) => !listing.deleted_at && isActiveListingStatus(listing.status)).length,
        pendingListings: listings.filter((listing) => !listing.deleted_at && listing.status === "pending").length,
        activeRequirements: requirements.filter((requirement) => requirement.is_active).length,
        publicEnquiries: enquiries.length,
        totalChats: conversationsCountResult.count || 0,
      },
      applications: hydratedUsers.filter((user) => user.role === "broker" && user.status === "pending"),
      users: hydratedUsers,
      listings,
      priorityQueue,
      requirements,
      enquiries,
      comingSoonRegistrations,
      chats: [],
      activityResponse: activity,
      activity: activity.activity,
      activityTotal: activity.totalCount,
      areas,
    },
    withNoStore()
  );
  return response;
}
