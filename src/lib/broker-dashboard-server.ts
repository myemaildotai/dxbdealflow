import type { SupabaseClient } from "@supabase/supabase-js";
import { AREA_SELECT, LEAD_SELECT, LISTING_SELECT } from "@/lib/deal-server";
import type { BrokerNotificationsPayload } from "@/lib/broker-notifications";
import type {
  BrokerChatNavigationSummary,
  BrokerDashboardData,
  Lead,
  Listing,
  PlatformUser,
  Requirement,
} from "@/lib/deal-types";
import { isActiveListingStatus } from "@/lib/deal-utils";
import {
  fetchAreas,
  fetchBrokerChatConversationCounts,
  fetchBrokerChatNavigationSummaries,
  fetchBrokerChatSummariesPage,
  fetchUserBundle,
  hydrateBrokerEnquiries,
  hydrateListings,
} from "@/lib/platform-server-data";
import {
  fetchMyRequirements,
  fetchRequirementNotificationsForBroker,
} from "@/lib/requirements-server";
import { getNotificationsPage } from "@/lib/notifications-server";

type DashboardBundle = Awaited<ReturnType<typeof fetchUserBundle>>;
type CountResult = {
  count: number | null;
  error?: { message?: string | null } | null;
};
type BrokerDashboardMetricsRpcRow = {
  total_listings: number | null;
  active_listings: number | null;
  pending_listings: number | null;
  public_enquiries: number | null;
  active_chats: number | null;
  total_requirements: number | null;
  active_requirements: number | null;
  incoming_requirement_matches: number | null;
  unread_requirement_notifications: number | null;
  listings_this_week: number | null;
  pending_listings_this_week: number | null;
  attention_listings: number | null;
  new_enquiries: number | null;
  enquiries_this_week: number | null;
  chats_this_week: number | null;
  requirements_this_week: number | null;
  closed_requirements: number | null;
  inactive_requirements: number | null;
  contacted_requirement_matches: number | null;
  listings_with_chats: number | null;
};
export type BrokerDashboardSectionPayload = Partial<
  Pick<
    BrokerDashboardData,
    "listings" | "enquiries" | "chats" | "requirements" | "incomingRequirementMatches" | "requirementNotifications" | "areas"
  >
>;
export type BrokerDashboardRequirementsSectionPayload = {
  requirements: Requirement[];
  chats: BrokerChatNavigationSummary[];
};

const WEEK_IN_MS = 7 * 24 * 60 * 60 * 1000;
const OVERVIEW_RECENT_LIMIT = 3;
const NOTIFICATION_CHAT_LIMIT = 50;
const NOTIFICATION_RECENT_HISTORY_LIMIT = 50;
const ATTENTION_LISTING_STATUSES = ["rejected", "inactive", "expired"];
const EMPTY_CHAT_COUNTS = {
  totalRecentConversations: 0,
  totalUnreadConversations: 0,
  totalAllConversations: 0,
};
const DASHBOARD_LISTING_HYDRATION_OPTIONS = {
  includeAgencies: false,
  includeAreas: false,
  includeCommissionTerms: false,
  includeImages: false,
  includeOwnerActiveCount: false,
  includeOwners: false,
} as const;
const DASHBOARD_LISTING_SELECT = `${LISTING_SELECT}, area:areas(${AREA_SELECT})`;
const BROKER_ENQUIRY_SELECT =
  `${LEAD_SELECT}, listing:listings(id, title, price, property_type, status, deleted_at)`;
const NOTIFICATION_LISTING_SELECT =
  "id, title, property_type, price, status, updated_at, deleted_at, approved_at, approval_notification_read_at";
const NOTIFICATION_ENQUIRY_SELECT =
  "id, listing_id, message, contact_name, contact_email, preferred_channel, is_read, read_at, created_at, listing:listings(id, title, price, property_type, status, deleted_at)";

export type BrokerNotificationTimings = Map<string, number>;

function getWeekStartIso() {
  return new Date(Date.now() - WEEK_IN_MS).toISOString();
}

function readMetricValue(value: number | null | undefined) {
  return Number(value || 0);
}

function mergeNotificationRows<T extends { id: string }>(
  recentRows: T[],
  unreadRows: T[],
  getTimestamp: (row: T) => string | null | undefined
) {
  const rowsById = new Map<string, T>();

  [...unreadRows, ...recentRows].forEach((row) => {
    rowsById.set(row.id, row);
  });

  return Array.from(rowsById.values()).sort((left, right) =>
    (getTimestamp(right) || "").localeCompare(getTimestamp(left) || "")
  );
}

async function measureBrokerNotificationOperation<T>(
  timings: BrokerNotificationTimings,
  name: string,
  operation: () => PromiseLike<T>
) {
  const startedAt = performance.now();

  try {
    return await operation();
  } finally {
    timings.set(name, performance.now() - startedAt);
  }
}

async function readCount(query: PromiseLike<CountResult>) {
  const result = await query;
  if (result.error) {
    throw new Error(result.error.message || "Failed to load dashboard count.");
  }

  return result.count || 0;
}

async function fetchBrokerDashboardMetricsRpc(
  supabase: SupabaseClient,
  userId: string,
  brokerProfileId: string | null
): Promise<BrokerDashboardData["metrics"] | null> {
  const { data, error } = await supabase.rpc("get_broker_dashboard_metrics", {
    p_user_id: userId,
    p_broker_profile_id: brokerProfileId,
  });

  if (error) {
    return null;
  }

  const [row] = (data || []) as BrokerDashboardMetricsRpcRow[];
  if (!row) {
    return null;
  }

  return {
    totalListings: readMetricValue(row.total_listings),
    activeListings: readMetricValue(row.active_listings),
    pendingListings: readMetricValue(row.pending_listings),
    publicEnquiries: readMetricValue(row.public_enquiries),
    activeChats: readMetricValue(row.active_chats),
    totalRequirements: readMetricValue(row.total_requirements),
    activeRequirements: readMetricValue(row.active_requirements),
    incomingRequirementMatches: readMetricValue(row.incoming_requirement_matches),
    unreadRequirementNotifications: readMetricValue(row.unread_requirement_notifications),
    listingsThisWeek: readMetricValue(row.listings_this_week),
    pendingListingsThisWeek: readMetricValue(row.pending_listings_this_week),
    attentionListings: readMetricValue(row.attention_listings),
    newEnquiries: readMetricValue(row.new_enquiries),
    enquiriesThisWeek: readMetricValue(row.enquiries_this_week),
    chatsThisWeek: readMetricValue(row.chats_this_week),
    requirementsThisWeek: readMetricValue(row.requirements_this_week),
    closedRequirements: readMetricValue(row.closed_requirements),
    inactiveRequirements: readMetricValue(row.inactive_requirements),
    contactedRequirementMatches: readMetricValue(row.contacted_requirement_matches),
    listingsWithChats: readMetricValue(row.listings_with_chats),
  };
}

async function fetchBrokerDashboardMetricsFallback(
  supabase: SupabaseClient,
  userId: string,
  brokerProfileId: string | null
): Promise<BrokerDashboardData["metrics"]> {
  const weekStartIso = getWeekStartIso();
  const weekStartMs = new Date(weekStartIso).getTime();

  const chatCountsPromise = fetchBrokerChatConversationCounts(supabase, userId);

  const listingsPromise = supabase
    .from("listings")
    .select("status, deleted_at, updated_at")
    .eq("created_by", userId);

  const leadsPromise = supabase
    .from("leads")
    .select("lead_status, created_at")
    .eq("to_user_id", userId);

  const chatConversationsPromise = readCount(
    supabase
      .from("chat_conversations")
      .select("id", { count: "exact", head: true })
      .or(`owner_user_id.eq.${userId},broker_user_id.eq.${userId}`)
      .gte("last_message_at", weekStartIso)
  );

  const requirementsPromise = brokerProfileId
    ? supabase
        .from("requirements")
        .select("is_active, deleted_at, created_at")
        .eq("broker_id", brokerProfileId)
    : Promise.resolve({ data: null, error: null });

  const notificationsPromise = readCount(
    supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("recipient_user_id", userId)
      .eq("recipient_role", "broker")
      .eq("type", "requirement_match_found")
      .eq("status", "active")
      .eq("is_read", false)
  );

  const matchesPromise = brokerProfileId
    ? supabase
        .from("requirement_matches")
        .select("status, requirements!inner(id)")
        .eq("requirements.broker_id", brokerProfileId)
    : Promise.resolve({ data: null, error: null });

  const [
    listingsRes,
    leadsRes,
    chatsThisWeek,
    requirementsRes,
    unreadRequirementNotifications,
    chatCounts,
    matchesRes,
  ] = await Promise.all([
    listingsPromise,
    leadsPromise,
    chatConversationsPromise,
    requirementsPromise,
    notificationsPromise,
    chatCountsPromise,
    matchesPromise,
  ]);

  if (listingsRes.error) {
    throw new Error(listingsRes.error.message || "Failed to load listings metrics.");
  }
  if (leadsRes.error) {
    throw new Error(leadsRes.error.message || "Failed to load leads metrics.");
  }
  if (requirementsRes.error) {
    throw new Error(requirementsRes.error.message || "Failed to load requirements metrics.");
  }
  if (matchesRes.error) {
    throw new Error(matchesRes.error.message || "Failed to load requirement matches metrics.");
  }

  const listingsData = listingsRes.data || [];
  const leadsData = leadsRes.data || [];
  const requirementsData = requirementsRes.data || [];
  const matchesData = matchesRes.data || [];

  let totalListings = 0;
  let activeListings = 0;
  let pendingListings = 0;
  let attentionListings = 0;
  let listingsThisWeek = 0;
  let pendingListingsThisWeek = 0;

  for (const listing of listingsData) {
    if (listing.deleted_at !== null) continue;
    totalListings++;

    const status = listing.status;
    if (status === "active" || status === "approved") {
      activeListings++;
    }
    if (status === "pending") {
      pendingListings++;
    }
    if (ATTENTION_LISTING_STATUSES.includes(status || "")) {
      attentionListings++;
    }

    const updatedAtMs = listing.updated_at ? new Date(listing.updated_at).getTime() : 0;
    if (updatedAtMs >= weekStartMs) {
      listingsThisWeek++;
      if (status === "pending") {
        pendingListingsThisWeek++;
      }
    }
  }

  let publicEnquiries = 0;
  let newEnquiries = 0;
  let enquiriesThisWeek = 0;

  for (const lead of leadsData) {
    publicEnquiries++;
    if (lead.lead_status === "new") {
      newEnquiries++;
    }
    const createdAtMs = lead.created_at ? new Date(lead.created_at).getTime() : 0;
    if (createdAtMs >= weekStartMs) {
      enquiriesThisWeek++;
    }
  }

  let totalRequirements = 0;
  let activeRequirements = 0;
  let requirementsThisWeek = 0;
  let closedRequirements = 0;
  let inactiveRequirements = 0;

  for (const req of requirementsData) {
    totalRequirements++;
    if (req.is_active === true) {
      activeRequirements++;
    }
    const createdAtMs = req.created_at ? new Date(req.created_at).getTime() : 0;
    if (createdAtMs >= weekStartMs) {
      requirementsThisWeek++;
    }
    if (req.deleted_at !== null) {
      closedRequirements++;
    }
    if (req.is_active === false && req.deleted_at === null) {
      inactiveRequirements++;
    }
  }

  let incomingRequirementMatches = 0;
  let contactedRequirementMatches = 0;

  for (const match of matchesData) {
    incomingRequirementMatches++;
    if (match.status === "contacted") {
      contactedRequirementMatches++;
    }
  }

  return {
    totalListings,
    activeListings,
    pendingListings,
    publicEnquiries,
    activeChats: chatCounts.totalRecentConversations,
    totalRequirements,
    activeRequirements,
    incomingRequirementMatches,
    unreadRequirementNotifications,
    listingsThisWeek,
    pendingListingsThisWeek,
    attentionListings,
    newEnquiries,
    enquiriesThisWeek,
    chatsThisWeek,
    requirementsThisWeek,
    closedRequirements,
    inactiveRequirements,
    contactedRequirementMatches,
    listingsWithChats: chatCounts.totalRecentConversations,
  };
}

export async function fetchBrokerDashboardMetrics(
  supabase: SupabaseClient,
  userId: string,
  brokerProfileId: string | null
): Promise<BrokerDashboardData["metrics"]> {
  return fetchBrokerDashboardMetricsRpc(supabase, userId, brokerProfileId).then(
    (rpcMetrics) => rpcMetrics || fetchBrokerDashboardMetricsFallback(supabase, userId, brokerProfileId)
  );
}

function createDashboardPayload(
  bundle: DashboardBundle,
  metrics: BrokerDashboardData["metrics"],
  payload: BrokerDashboardSectionPayload = {}
): BrokerDashboardData {
  const listings = addBrokerListingActions(payload.listings || []);

  return {
    metrics,
    profile: bundle.user,
    brokerProfile: bundle.brokerProfile,
    agency: bundle.agency,
    credits: bundle.credits,
    listings,
    enquiries: payload.enquiries || [],
    chats: payload.chats || [],
    requirements: payload.requirements || [],
    incomingRequirementMatches: payload.incomingRequirementMatches || [],
    requirementNotifications: payload.requirementNotifications || [],
    areas: payload.areas || [],
  };
}

function addBrokerListingActions(listings: Listing[]) {
  return listings.map((listing) => ({
    ...listing,
    can_edit: true,
    can_chat: isActiveListingStatus(listing.status),
  }));
}

async function fetchDashboardBase(
  supabase: SupabaseClient,
  userId: string,
  knownUser?: PlatformUser | null,
  knownBrokerProfileId?: string | null
) {
  const bundlePromise = fetchUserBundle(supabase, userId, knownUser);
  const metricsPromise =
    knownBrokerProfileId !== undefined
      ? fetchBrokerDashboardMetrics(supabase, userId, knownBrokerProfileId)
      : bundlePromise.then((bundle) => fetchBrokerDashboardMetrics(supabase, userId, bundle.brokerProfile?.id ?? null));
  const [bundle, metrics] = await Promise.all([bundlePromise, metricsPromise]);

  return { bundle, metrics };
}

export async function fetchBrokerDashboardShell(
  supabase: SupabaseClient,
  userId: string,
  knownUser?: PlatformUser | null,
  knownBrokerProfileId?: string | null
) {
  const [{ bundle, metrics }, areas] = await Promise.all([
    fetchDashboardBase(supabase, userId, knownUser, knownBrokerProfileId),
    fetchAreas(supabase),
  ]);

  return createDashboardPayload(bundle, metrics, { areas });
}

async function fetchBrokerListings(supabase: SupabaseClient, userId: string, limit?: number) {
  let query = supabase
    .from("listings")
    .select(DASHBOARD_LISTING_SELECT)
    .eq("created_by", userId)
    .is("deleted_at", null)
    .order("updated_at", { ascending: false, nullsFirst: false });

  if (limit) {
    query = query.limit(limit);
  }

  const { data, error } = await query;
  if (error) {
    throw new Error(error.message || "Failed to load listings.");
  }

  return hydrateListings(supabase, (data as unknown as Listing[]) || [], DASHBOARD_LISTING_HYDRATION_OPTIONS);
}

async function fetchNotificationListings(supabase: SupabaseClient, userId: string) {
  const createQuery = () =>
    supabase
      .from("listings")
      .select(NOTIFICATION_LISTING_SELECT)
      .eq("created_by", userId)
      .is("deleted_at", null)
      .not("approved_at", "is", null)
      .order("approved_at", { ascending: false, nullsFirst: false });
  const [recentResult, unreadResult] = await Promise.all([
    createQuery().limit(NOTIFICATION_RECENT_HISTORY_LIMIT),
    createQuery().is("approval_notification_read_at", null),
  ]);

  if (recentResult.error || unreadResult.error) {
    throw new Error(recentResult.error?.message || unreadResult.error?.message || "Failed to load listing notifications.");
  }

  return mergeNotificationRows(
    (recentResult.data || []) as unknown as Listing[],
    (unreadResult.data || []) as unknown as Listing[],
    (listing) => listing.approved_at
  );
}

async function fetchBrokerEnquiries(supabase: SupabaseClient, userId: string, limit?: number) {
  let query = supabase
    .from("leads")
    .select(BROKER_ENQUIRY_SELECT)
    .eq("to_user_id", userId)
    .order("created_at", { ascending: false });

  if (limit) {
    query = query.limit(limit);
  }

  const { data, error } = await query;
  if (error) {
    throw new Error(error.message || "Failed to load enquiries.");
  }

  return hydrateBrokerEnquiries(supabase, (data as unknown as Lead[]) || [], userId, { listingsHydrated: true });
}

async function fetchNotificationEnquiries(supabase: SupabaseClient, userId: string) {
  const createQuery = () =>
    supabase
      .from("leads")
      .select(NOTIFICATION_ENQUIRY_SELECT)
      .eq("to_user_id", userId)
      .order("created_at", { ascending: false });
  const [recentResult, unreadResult] = await Promise.all([
    createQuery().limit(NOTIFICATION_RECENT_HISTORY_LIMIT),
    createQuery().eq("is_read", false),
  ]);

  if (recentResult.error || unreadResult.error) {
    throw new Error(recentResult.error?.message || unreadResult.error?.message || "Failed to load enquiry notifications.");
  }

  return mergeNotificationRows(
    (recentResult.data || []) as unknown as BrokerDashboardData["enquiries"],
    (unreadResult.data || []) as unknown as BrokerDashboardData["enquiries"],
    (enquiry) => enquiry.created_at
  );
}

export async function fetchBrokerDashboardOverviewSection(supabase: SupabaseClient, userId: string): Promise<BrokerDashboardSectionPayload> {
  const [listings, enquiries, chatGroupsPage] = await Promise.all([
    fetchBrokerListings(supabase, userId, OVERVIEW_RECENT_LIMIT),
    fetchBrokerEnquiries(supabase, userId, OVERVIEW_RECENT_LIMIT),
    fetchBrokerChatSummariesPage(supabase, userId, {
      conversationCounts: EMPTY_CHAT_COUNTS,
      limit: OVERVIEW_RECENT_LIMIT,
    }),
  ]);

  return {
    listings: addBrokerListingActions(listings),
    enquiries,
    chats: chatGroupsPage.groups,
  };
}

export async function fetchBrokerDashboardOverview(supabase: SupabaseClient, userId: string, knownUser?: PlatformUser | null) {
  const [shell, section] = await Promise.all([
    fetchBrokerDashboardShell(supabase, userId, knownUser),
    fetchBrokerDashboardOverviewSection(supabase, userId),
  ]);

  return { ...shell, ...section, areas: shell.areas };
}

export async function fetchBrokerDashboardListingsSection(supabase: SupabaseClient, userId: string): Promise<BrokerDashboardSectionPayload> {
  const listings = await fetchBrokerListings(supabase, userId);

  return { listings: addBrokerListingActions(listings) };
}

export async function fetchBrokerDashboardListings(supabase: SupabaseClient, userId: string, knownUser?: PlatformUser | null) {
  const [shell, section] = await Promise.all([
    fetchBrokerDashboardShell(supabase, userId, knownUser),
    fetchBrokerDashboardListingsSection(supabase, userId),
  ]);

  return { ...shell, ...section, areas: shell.areas };
}

export async function fetchBrokerDashboardEnquiriesSection(supabase: SupabaseClient, userId: string): Promise<BrokerDashboardSectionPayload> {
  const enquiries = await fetchBrokerEnquiries(supabase, userId);

  return { enquiries };
}

export async function fetchBrokerDashboardEnquiries(supabase: SupabaseClient, userId: string, knownUser?: PlatformUser | null) {
  const [shell, section] = await Promise.all([
    fetchBrokerDashboardShell(supabase, userId, knownUser),
    fetchBrokerDashboardEnquiriesSection(supabase, userId),
  ]);

  return { ...shell, ...section, areas: shell.areas };
}

export async function fetchBrokerDashboardChatsSection(supabase: SupabaseClient, userId: string): Promise<BrokerDashboardSectionPayload> {
  const chatGroupsPage = await fetchBrokerChatSummariesPage(supabase, userId, {
    conversationCounts: EMPTY_CHAT_COUNTS,
  });

  return { chats: chatGroupsPage.groups };
}

export async function fetchBrokerDashboardChats(supabase: SupabaseClient, userId: string, knownUser?: PlatformUser | null) {
  const [shell, section] = await Promise.all([
    fetchBrokerDashboardShell(supabase, userId, knownUser),
    fetchBrokerDashboardChatsSection(supabase, userId),
  ]);

  return { ...shell, ...section, areas: shell.areas };
}

export async function fetchBrokerDashboardRequirementsSection(
  supabase: SupabaseClient,
  userId: string,
  knownBrokerProfileId?: string | null
): Promise<BrokerDashboardRequirementsSectionPayload> {
  let brokerProfileId = knownBrokerProfileId;

  if (brokerProfileId === undefined) {
    const { data: brokerProfile, error } = await supabase.from("broker_profiles").select("id").eq("user_id", userId).maybeSingle();
    if (error) {
      throw new Error(error.message || "Failed to load broker profile.");
    }
    brokerProfileId = (brokerProfile as { id?: string } | null)?.id ?? null;
  }

  const [requirements, chats] = await Promise.all([
    brokerProfileId ? fetchMyRequirements(supabase, brokerProfileId) : Promise.resolve([]),
    fetchBrokerChatNavigationSummaries(supabase, userId),
  ]);

  return {
    requirements,
    chats,
  };
}

export async function fetchBrokerDashboardRequirements(supabase: SupabaseClient, userId: string, knownUser?: PlatformUser | null) {
  const [shell, section] = await Promise.all([
    fetchBrokerDashboardShell(supabase, userId, knownUser),
    fetchBrokerDashboardRequirementsSection(supabase, userId),
  ]);

  return { ...shell, ...section, areas: shell.areas };
}

export async function fetchBrokerDashboardProfile(supabase: SupabaseClient, userId: string, knownUser?: PlatformUser | null) {
  const { bundle, metrics } = await fetchDashboardBase(supabase, userId, knownUser);
  const areas = await fetchAreas(supabase);

  return createDashboardPayload(bundle, metrics, { areas });
}

export async function fetchBrokerNotificationsPayload(
  supabase: SupabaseClient,
  userId: string,
  _brokerProfileId: string | null,
  timings: BrokerNotificationTimings = new Map()
): Promise<BrokerNotificationsPayload> {
  return measureBrokerNotificationOperation(timings, "notifications", () =>
    getNotificationsPage(supabase, {
      recipientRole: "broker",
      recipientUserId: userId,
    })
  );
}

export async function fetchBrokerDashboardNotifications(supabase: SupabaseClient, userId: string, knownUser?: PlatformUser | null) {
  const { bundle, metrics } = await fetchDashboardBase(supabase, userId, knownUser);
  const brokerProfileId = bundle.brokerProfile?.id ?? null;
  const [listings, enquiries, chatGroupsPage, requirementNotifications] = await Promise.all([
    fetchNotificationListings(supabase, userId),
    fetchNotificationEnquiries(supabase, userId),
    fetchBrokerChatSummariesPage(supabase, userId, {
      includeMessages: true,
      filter: "unread",
      limit: NOTIFICATION_CHAT_LIMIT,
      messageLimit: 1,
    }),
    brokerProfileId
      ? fetchRequirementNotificationsForBroker(supabase, brokerProfileId, {
          recentLimit: NOTIFICATION_RECENT_HISTORY_LIMIT,
        })
      : Promise.resolve([]),
  ]);

  return createDashboardPayload(bundle, metrics, {
    listings,
    enquiries,
    chats: chatGroupsPage.groups,
    requirementNotifications,
  });
}

export async function fetchBrokerDashboardLegacy(
  supabase: SupabaseClient,
  userId: string,
  notificationScope: boolean,
  knownUser?: PlatformUser | null
) {
  if (notificationScope) {
    return fetchBrokerDashboardNotifications(supabase, userId, knownUser);
  }

  return fetchBrokerDashboardOverview(supabase, userId, knownUser);
}
