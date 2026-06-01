import type { SupabaseClient } from "@supabase/supabase-js";
import {
  AGENCY_SELECT,
  AREA_SELECT,
  BROKER_PROFILE_SELECT,
  CHAT_MESSAGE_SELECT,
  CREDIT_SELECT,
  LEAD_SELECT,
  LISTING_SELECT,
  LISTING_IMAGE_SELECT,
  REQUIREMENT_MATCH_SELECT,
  REQUIREMENT_SELECT,
  USER_SELECT,
} from "@/lib/deal-server";
import { isActiveListingStatus } from "@/lib/deal-utils";
import { getRequirementStatus } from "@/lib/requirements";
import { buildSearchText, normalizeSearchQuery } from "@/lib/search";
import type {
  AdminActivityResponse,
  ActivityLog,
  Agency,
  AdminEnquiry,
  Area,
  BrokerProfile,
  BrokerEnquiry,
  ChatConversationSummary,
  ChatMessage,
  ChatUserSummary,
  CommissionTerms,
  CreditSummary,
  EnquiryReply,
  Lead,
  Listing,
  ListingImage,
  PlatformUser,
  Requirement,
  RequirementMatch,
} from "@/lib/deal-types";

type ActivityCategory = "all" | "listings" | "brokers" | "credits" | "requirements" | "system";

type FetchActivityLogOptions = {
  page?: number;
  pageSize?: number;
  category?: ActivityCategory;
  startDate?: string | null;
  endDate?: string | null;
  searchQuery?: string | null;
  includeCounts?: boolean;
};

type ActivityDateFilterQuery = {
  gte(column: string, value: string): ActivityDateFilterQuery;
  lte(column: string, value: string): ActivityDateFilterQuery;
};

type ActivityCategoryFilterQuery = ActivityDateFilterQuery & {
  eq(column: string, value: string): ActivityCategoryFilterQuery;
  is(column: string, value: null): ActivityCategoryFilterQuery;
  or(filters: string): ActivityCategoryFilterQuery;
};

type ActivityLogRow = {
  id: string;
  action: string;
  target_table: string | null;
  target_id: string | null;
  created_at: string;
  metadata: Record<string, unknown> | null;
  actor_user_id: string | null;
};

type ActivityLogHydrationRow = ActivityLogRow | (ActivityLog & { actor_user_id?: string | null });

type ActivityLogListQuery = ActivityCategoryFilterQuery & {
  range(from: number, to: number): Promise<{ data: ActivityLogRow[] | null; count: number | null }>;
};

function excludeChatActivity<T extends ActivityCategoryFilterQuery>(query: T) {
  return query.or("target_table.is.null,target_table.not.in.(chat_conversations,chat_conversation_messages,chat_messages)") as T;
}

function applyActivityDateFilters<T extends ActivityDateFilterQuery>(
  query: T,
  startDate?: string | null,
  endDate?: string | null
) {
  let nextQuery = query;

  if (startDate) {
    nextQuery = nextQuery.gte("created_at", startDate) as T;
  }

  if (endDate) {
    nextQuery = nextQuery.lte("created_at", endDate) as T;
  }

  return nextQuery;
}

function applyActivityCategoryFilter<T extends ActivityCategoryFilterQuery>(query: T, category?: ActivityCategory) {
  switch (category) {
    case "listings":
      return query.eq("target_table", "listings") as T;
    case "brokers":
      return query.or("target_table.in.(users,broker_profiles)") as T;
    case "credits":
      return query.eq("target_table", "broker_credits") as T;
    case "requirements":
      return query.or("target_table.in.(requirements,requirement_matches)") as T;
    case "system":
      return query.or("target_table.is.null,target_table.in.(leads,settings)") as T;
    default:
      return excludeChatActivity(query);
  }
}

export async function fetchAreas(supabase: SupabaseClient): Promise<Area[]> {
  const { data } = await supabase.from("areas").select(AREA_SELECT).order("name", { ascending: true });
  return (data as Area[]) || [];
}

export async function fetchUserBundle(supabase: SupabaseClient, userId: string) {
  const { data: user } = await supabase.from("users").select(USER_SELECT).eq("id", userId).maybeSingle();
  if (!user) {
    return { user: null, brokerProfile: null, agency: null, credits: null };
  }

  const [brokerProfileResult, agencyResult, creditResult, emailVerificationResult] = await Promise.all([
    supabase.from("broker_profiles").select(BROKER_PROFILE_SELECT).eq("user_id", userId).maybeSingle(),
    user.agency_id
      ? supabase.from("agencies").select(AGENCY_SELECT).eq("id", user.agency_id).maybeSingle()
      : Promise.resolve({ data: null }),
    supabase.from("broker_credits").select(CREDIT_SELECT).eq("user_id", userId).maybeSingle(),
    user.role === "broker"
      ? supabase.from("broker_email_verifications").select("email, verified_at").eq("user_id", userId).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  return {
    user: {
      ...(user as PlatformUser),
      email_verified_at:
        user.role === "broker" && emailVerificationResult.data?.email?.toLowerCase() === user.email?.toLowerCase()
          ? emailVerificationResult.data?.verified_at || null
          : null,
    },
    brokerProfile: (brokerProfileResult.data as BrokerProfile | null) || null,
    agency: (agencyResult.data as Agency | null) || null,
    credits: (creditResult.data as CreditSummary | null) || null,
  };
}

export async function fetchChatUserSummaries(supabase: SupabaseClient, userIds: string[]): Promise<ChatUserSummary[]> {
  const uniqueUserIds = Array.from(new Set(userIds.filter(Boolean)));
  if (!uniqueUserIds.length) {
    return [];
  }

  const [usersResult, brokerProfilesResult] = await Promise.all([
    supabase.from("users").select("id, first_name, last_name, email").in("id", uniqueUserIds),
    supabase.from("broker_profiles").select("user_id, profile_photo").in("user_id", uniqueUserIds),
  ]);

  const profilePhotoByUserId = new Map(
    (((brokerProfilesResult.data as Array<Pick<BrokerProfile, "user_id" | "profile_photo">>) || [])).map((profile) => [
      profile.user_id,
      profile.profile_photo || null,
    ])
  );

  return ((((usersResult.data as Array<Pick<PlatformUser, "id" | "first_name" | "last_name" | "email">>) || [])).map((user) => ({
    ...user,
    profile_photo: profilePhotoByUserId.get(user.id) || null,
  })) as ChatUserSummary[]);
}

type HydrateListingsOptions = {
  includeAgencies?: boolean;
  includeCommissionTerms?: boolean;
  includeImages?: boolean;
  includeOwnerActiveCount?: boolean;
  includeOwners?: boolean;
};

export async function hydrateListings(
  supabase: SupabaseClient,
  listings: Listing[],
  {
    includeAgencies = true,
    includeCommissionTerms = true,
    includeImages = true,
    includeOwnerActiveCount = true,
    includeOwners = true,
  }: HydrateListingsOptions = {}
): Promise<Listing[]> {
  if (!listings.length) return [];

  const areaIds = Array.from(new Set(listings.map((listing) => listing.area_id).filter(Boolean))) as string[];
  const ownerIds = Array.from(new Set(listings.map((listing) => listing.created_by).filter(Boolean)));
  const agencyIds = Array.from(new Set(listings.map((listing) => listing.agency_id).filter(Boolean))) as string[];
  const listingIds = listings.map((listing) => listing.id);

  const [areasResult, ownersResult, agenciesResult, termsResult, imagesResult, activeListingsResult] = await Promise.all([
    areaIds.length
      ? supabase.from("areas").select(AREA_SELECT).in("id", areaIds)
      : Promise.resolve({ data: [] as Area[] }),
    includeOwners && ownerIds.length
      ? supabase.from("users").select(USER_SELECT).in("id", ownerIds)
      : Promise.resolve({ data: [] as PlatformUser[] }),
    includeAgencies && agencyIds.length
      ? supabase.from("agencies").select(AGENCY_SELECT).in("id", agencyIds)
      : Promise.resolve({ data: [] as Agency[] }),
    includeCommissionTerms && listingIds.length
      ? supabase.from("commission_terms").select("listing_id, co_broke_percent, payment_terms, notes").in("listing_id", listingIds)
      : Promise.resolve({ data: [] as CommissionTerms[] }),
    includeImages && listingIds.length
      ? supabase
          .from("listing_images")
          .select(LISTING_IMAGE_SELECT)
          .in("listing_id", listingIds)
          .order("sort_order", { ascending: true })
      : Promise.resolve({ data: [] as ListingImage[] }),
    includeOwnerActiveCount && ownerIds.length
      ? supabase
          .from("listings")
          .select("id, created_by, status")
          .in("created_by", ownerIds)
          .is("deleted_at", null)
      : Promise.resolve({ data: [] as Array<Pick<Listing, "id" | "created_by" | "status">> }),
  ]);

  const areaMap = new Map((areasResult.data || []).map((area) => [area.id, area as Area]));
  const ownerMap = new Map((ownersResult.data || []).map((owner) => [owner.id, owner as PlatformUser]));
  const agencyMap = new Map((agenciesResult.data || []).map((agency) => [agency.id, agency as Agency]));
  const termsMap = new Map((termsResult.data || []).map((term) => [term.listing_id, term as CommissionTerms]));
  const imageMap = new Map<string, ListingImage[]>();
  const ownerActiveCount = new Map<string, number>();

  (imagesResult.data || []).forEach((image) => {
    imageMap.set(image.listing_id, [...(imageMap.get(image.listing_id) || []), image as ListingImage]);
  });

  (activeListingsResult.data || []).forEach((row) => {
    if (isActiveListingStatus(row.status)) {
      ownerActiveCount.set(row.created_by, (ownerActiveCount.get(row.created_by) || 0) + 1);
    }
  });

  return listings.map((listing) => ({
    ...listing,
    area: listing.area_id ? areaMap.get(listing.area_id) || null : null,
    owner: ownerMap.get(listing.created_by) || null,
    agency: listing.agency_id ? agencyMap.get(listing.agency_id) || null : null,
    commission_terms: termsMap.get(listing.id) || null,
    listing_images: imageMap.get(listing.id) || [],
    owner_active_listings_count: ownerActiveCount.get(listing.created_by) || 0,
  }));
}

export async function hydrateMessages(supabase: SupabaseClient, messages: ChatMessage[]): Promise<ChatMessage[]> {
  if (!messages.length) return [];

  const senderIds = Array.from(new Set(messages.map((message) => message.sender_id)));
  const senders = await fetchChatUserSummaries(supabase, senderIds);
  const senderMap = new Map(senders.map((sender) => [sender.id, sender]));
  return messages.map((message) => ({
    ...message,
    sender: senderMap.get(message.sender_id) || null,
  }));
}

type BrokerConversationRow = {
  id: string;
  listing_id: string;
  owner_user_id: string;
  broker_user_id: string;
  created_at: string;
  updated_at: string;
  last_message_at: string | null;
  last_message_id?: string | null;
  last_sender_id?: string | null;
  last_message_sequence?: number | null;
  owner_last_read_at: string | null;
  broker_last_read_at: string | null;
  owner_last_read_sequence?: number | null;
  broker_last_read_sequence?: number | null;
};

type FetchBrokerChatSummariesOptions = {
  includeMessages?: boolean;
  includeRequirementContext?: boolean;
  filter?: BrokerChatConversationFilter;
  limit?: number;
  cursor?: BrokerChatConversationCursor | null;
  messageLimit?: number;
};

export type BrokerChatConversationFilter = "recent" | "unread" | "all";

export type BrokerChatConversationCursor = {
  lastSequence: number;
  id: string;
};

export type BrokerChatConversationCounts = {
  totalRecentConversations: number;
  totalUnreadConversations: number;
  totalAllConversations: number;
};

export type BrokerChatSummariesPage = {
  groups: ChatConversationSummary[];
  hasMore: boolean;
  nextCursor: BrokerChatConversationCursor | null;
  totalRecentConversations: number;
  totalUnreadConversations: number;
  totalAllConversations: number;
};

type RequirementMatchThreadContext = {
  requirement: Requirement | null;
  requirementMatch: RequirementMatch | null;
};

type BrokerChatConversationCountsRpcRow = {
  total_recent_conversations: number | null;
  total_unread_conversations: number | null;
  total_all_conversations: number | null;
};

type BrokerChatConversationPageRow = BrokerConversationRow & {
  participant_user_id: string;
  viewer_last_read_at: string | null;
  viewer_last_read_sequence: number | null;
  unread_count: number | null;
  message_count: number | null;
  messages: Array<Omit<ChatMessage, "listing_id">> | string | null;
};

function getBrokerConversationProfileKey(listingId: string, senderBrokerProfileId: string | null | undefined, receiverBrokerProfileId: string | null | undefined) {
  return `${listingId}:${senderBrokerProfileId || ""}:${receiverBrokerProfileId || ""}`;
}

async function fetchBrokerProfileIdsByUserId(supabase: SupabaseClient, userIds: string[]) {
  const uniqueUserIds = uniqueActivityIds(userIds);
  if (!uniqueUserIds.length) {
    return new Map<string, string>();
  }

  const { data: brokerProfiles } = await supabase
    .from("broker_profiles")
    .select("id, user_id")
    .in("user_id", uniqueUserIds);

  return new Map(
    (((brokerProfiles as Array<Pick<BrokerProfile, "id" | "user_id">> | null) || [])
      .filter((profile): profile is Pick<BrokerProfile, "id" | "user_id"> & { id: string } => !!profile.id)
      .map((profile) => [profile.user_id, profile.id]))
  );
}

async function fetchRequirementMatchThreadContexts(
  supabase: SupabaseClient,
  conversations: BrokerConversationRow[],
  brokerProfileIdByUserId: Map<string, string>
) {
  const listingIds = uniqueActivityIds(conversations.map((conversation) => conversation.listing_id));
  const senderBrokerProfileIds = uniqueActivityIds(
    conversations.map((conversation) => brokerProfileIdByUserId.get(conversation.owner_user_id))
  );

  if (!listingIds.length || !senderBrokerProfileIds.length) {
    return new Map<string, RequirementMatchThreadContext>();
  }

  const { data: matchRows } = await supabase
    .from("requirement_matches")
    .select(REQUIREMENT_MATCH_SELECT)
    .in("listing_id", listingIds)
    .in("sender_broker_id", senderBrokerProfileIds)
    .order("created_at", { ascending: false });

  const candidateMatches = ((matchRows as RequirementMatch[] | null) || []).filter((match) => !!match.receiver_broker_id);
  if (!candidateMatches.length) {
    return new Map<string, RequirementMatchThreadContext>();
  }

  const requirementIds = uniqueActivityIds(candidateMatches.map((match) => match.requirement_id));
  const requirements = await hydrateActivityRequirements(supabase, requirementIds);
  const requirementMap = new Map(requirements.map((requirement) => [requirement.id, requirement]));
  const hydratedMatches = await hydrateActivityRequirementMatches(supabase, candidateMatches, requirementMap);
  const matchContextByProfileKey = new Map<string, RequirementMatchThreadContext>();

  hydratedMatches.forEach((match) => {
    if (!match.listing_id || !match.receiver_broker_id) {
      return;
    }

    const key = getBrokerConversationProfileKey(match.listing_id, match.sender_broker_id, match.receiver_broker_id);
    if (matchContextByProfileKey.has(key)) {
      return;
    }

    matchContextByProfileKey.set(key, {
      requirement: requirementMap.get(match.requirement_id) || null,
      requirementMatch: match,
    });
  });

  const contextByConversationId = new Map<string, RequirementMatchThreadContext>();

  conversations.forEach((conversation) => {
    const senderBrokerProfileId = brokerProfileIdByUserId.get(conversation.owner_user_id);
    const receiverBrokerProfileId = brokerProfileIdByUserId.get(conversation.broker_user_id);
    const key = getBrokerConversationProfileKey(conversation.listing_id, senderBrokerProfileId, receiverBrokerProfileId);
    const context = matchContextByProfileKey.get(key);

    if (context) {
      contextByConversationId.set(conversation.id, context);
    }
  });

  return contextByConversationId;
}

export async function fetchBrokerChatSummaries(
  supabase: SupabaseClient,
  userId: string,
  options: FetchBrokerChatSummariesOptions = {}
): Promise<ChatConversationSummary[]> {
  const page = await fetchBrokerChatSummariesPage(supabase, userId, options);
  return page.groups;
}

async function fetchBrokerChatConversationCounts(
  supabase: SupabaseClient,
  userId: string
): Promise<BrokerChatConversationCounts> {
  const { data, error } = await supabase.rpc("get_broker_chat_conversation_counts", {
    p_user_id: userId,
  });

  if (error) {
    throw new Error(error.message || "Failed to fetch conversation counts.");
  }

  const [row] = (data || []) as BrokerChatConversationCountsRpcRow[];

  return {
    totalRecentConversations: row?.total_recent_conversations || 0,
    totalUnreadConversations: row?.total_unread_conversations || 0,
    totalAllConversations: row?.total_all_conversations || 0,
  };
}

function normalizeBrokerChatConversationFilter(value: BrokerChatConversationFilter | null | undefined): BrokerChatConversationFilter {
  return value === "unread" || value === "all" ? value : "recent";
}

function parseBrokerChatSummaryMessages(value: BrokerChatConversationPageRow["messages"]) {
  if (Array.isArray(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim()) {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? (parsed as Array<Omit<ChatMessage, "listing_id">>) : [];
    } catch {
      return [];
    }
  }

  return [];
}

export async function fetchBrokerChatSummariesPage(
  supabase: SupabaseClient,
  userId: string,
  options: FetchBrokerChatSummariesOptions = {}
): Promise<BrokerChatSummariesPage> {
  const requestedLimit =
    typeof options.limit === "number" && Number.isFinite(options.limit) && options.limit > 0
      ? Math.floor(options.limit)
      : null;
  const fetchLimit = requestedLimit ? requestedLimit + 1 : 51;
  const summaryMessageLimit =
    options.includeMessages && options.messageLimit && options.messageLimit > 0 ? Math.floor(options.messageLimit) : options.includeMessages ? 20 : 1;
  const filter = normalizeBrokerChatConversationFilter(options.filter);

  const [conversationResult, conversationCounts] = await Promise.all([
    supabase.rpc("get_broker_chat_conversation_page", {
      p_user_id: userId,
      p_filter: filter,
      p_limit: fetchLimit,
      p_cursor_last_message_sequence: options.cursor?.lastSequence ?? null,
      p_cursor_id: options.cursor?.id ?? null,
      p_message_limit: summaryMessageLimit,
    }),
    fetchBrokerChatConversationCounts(supabase, userId),
  ]);
  const { data: conversationRows, error } = conversationResult;

  if (error) {
    throw new Error(error.message || "Failed to fetch conversations.");
  }

  const fetchedConversations = (conversationRows as BrokerChatConversationPageRow[] | null) || [];
  const hasMore = Boolean(requestedLimit && fetchedConversations.length > requestedLimit);
  const conversations = requestedLimit ? fetchedConversations.slice(0, requestedLimit) : fetchedConversations;
  if (!conversations.length) {
    return { groups: [], hasMore: false, nextCursor: null, ...conversationCounts };
  }

  const listingIds = Array.from(new Set(conversations.map((conversation) => conversation.listing_id)));
  const conversationUserIds = uniqueActivityIds(
    conversations.flatMap((conversation) => [conversation.owner_user_id, conversation.broker_user_id])
  );
  const participantIds = Array.from(
    new Set(
      conversations.map((conversation) => conversation.participant_user_id || (conversation.owner_user_id === userId ? conversation.broker_user_id : conversation.owner_user_id))
    )
  );
  const conversationMap = new Map(conversations.map((conversation) => [conversation.id, conversation]));

  const [listingRows, participants, brokerProfileIdByUserId] = await Promise.all([
    supabase
      .from("listings")
      .select(
        "id, title, property_type, deal_type, bedrooms, size_sqft, area_id, developer, price, payment_plan, handover_date, yield_percent, property_video_url, notes, description, status, is_visible, created_at, updated_at, deleted_at, created_by, agency_id, renewal_due_at, approved_at, credits_used"
      )
      .in("id", listingIds),
    fetchChatUserSummaries(supabase, participantIds),
    fetchBrokerProfileIdsByUserId(supabase, conversationUserIds),
  ]);

  const listings = await hydrateListings(supabase, (listingRows.data as Listing[]) || []);
  const listingMap = new Map(listings.map((listing) => [listing.id, listing]));
  const participantMap = new Map(participants.map((user) => [user.id, user]));
  const requirementContextByConversationId = options.includeRequirementContext
    ? await fetchRequirementMatchThreadContexts(supabase, conversations, brokerProfileIdByUserId)
    : new Map<string, RequirementMatchThreadContext>();
  const messages = await hydrateMessages(
    supabase,
    conversations.flatMap((conversation) =>
      parseBrokerChatSummaryMessages(conversation.messages).map((message) => ({
        ...message,
        listing_id: conversationMap.get(message.conversation_id || "")?.listing_id || "",
      }))
    ) as ChatMessage[]
  );

  const messagesByConversation = new Map<string, ChatMessage[]>();
  messages.forEach((message) => {
    const key = message.conversation_id || "";
    messagesByConversation.set(key, [...(messagesByConversation.get(key) || []), message]);
  });

  const grouped = new Map<string, ChatConversationSummary>();

  conversations.forEach((conversation) => {
    const listing = listingMap.get(conversation.listing_id) || null;
    if (!listing && !options.includeRequirementContext) return;

    const participantId = conversation.owner_user_id === userId ? conversation.broker_user_id : conversation.owner_user_id;
    const threadMessages = messagesByConversation.get(conversation.id) || [];
    const sortedThreadMessages = [...threadMessages].sort(
      (left, right) =>
        (left.message_sequence ?? 0) - (right.message_sequence ?? 0) ||
        left.created_at.localeCompare(right.created_at) ||
        left.id.localeCompare(right.id)
    );
    const visibleThreadMessages =
      options.messageLimit && options.messageLimit > 0
        ? sortedThreadMessages.slice(-Math.floor(options.messageLimit))
        : sortedThreadMessages;
    const lastMessage = sortedThreadMessages[sortedThreadMessages.length - 1] || null;
    const lastActivityAt = lastMessage?.created_at || conversation.last_message_at || conversation.updated_at || conversation.created_at;
    const viewerLastReadAt = conversation.viewer_last_read_at;
    const viewerLastReadSequence = conversation.viewer_last_read_sequence;
    const unreadCount = conversation.unread_count || 0;
    const hasUnread = unreadCount > 0;
    const requirementContext = requirementContextByConversationId.get(conversation.id) || null;

    const summary = grouped.get(conversation.listing_id) || {
      listing: {
        id: listing?.id || conversation.listing_id,
        title: listing?.title || "Unavailable listing",
        property_type: listing?.property_type,
        deal_type: listing?.deal_type,
        bedrooms: listing?.bedrooms,
        size_sqft: listing?.size_sqft,
        area_id: listing?.area_id,
        developer: listing?.developer,
        price: listing?.price,
        status: listing?.status || "inactive",
        is_visible: listing?.is_visible || false,
        deleted_at: listing?.deleted_at || null,
        created_at: listing?.created_at,
        updated_at: listing?.updated_at,
        created_by: listing?.created_by,
        isOwner: conversation.owner_user_id === userId,
        area: listing?.area ? { name: listing.area.name, city: listing.area.city } : null,
        listing_images: listing?.listing_images || [],
        owner: listing?.owner || null,
      },
      conversations: [],
    };

    const threadSummary = {
      conversationId: conversation.id,
      participant: participantMap.get(conversation.participant_user_id || participantId) || null,
      lastMessage,
      lastActivityAt,
      hasUnread,
      unreadCount,
      lastReadAt: viewerLastReadAt,
      lastReadSequence: viewerLastReadSequence,
      lastMessageSequence: conversation.last_message_sequence ?? lastMessage?.message_sequence ?? null,
      messageCount: Math.max(conversation.message_count || 0, sortedThreadMessages.length),
      contextType: requirementContext ? ("requirement_match" as const) : ("listing" as const),
      requirement: requirementContext?.requirement || null,
      requirementMatch: requirementContext?.requirementMatch || null,
      ...(options.includeMessages ? { messages: visibleThreadMessages } : {}),
    };

    summary.conversations.push(threadSummary);

    grouped.set(conversation.listing_id, summary);
  });

  const groups = Array.from(grouped.values())
    .map((group) => ({
      ...group,
      conversations: [...group.conversations].sort((a, b) => {
        const aTime = a.lastActivityAt || "";
        const bTime = b.lastActivityAt || "";
        return bTime.localeCompare(aTime);
      }),
    }))
    .sort((a, b) => {
      const aTime = a.conversations[0]?.lastActivityAt || "";
      const bTime = b.conversations[0]?.lastActivityAt || "";
      return bTime.localeCompare(aTime);
    });

  const lastConversation = conversations[conversations.length - 1] || null;
  const nextCursor =
    hasMore && lastConversation
      ? {
          lastSequence: lastConversation.last_message_sequence || 0,
          id: lastConversation.id,
        }
      : null;

  return { groups, hasMore, nextCursor, ...conversationCounts };
}

export async function fetchBrokerChatConversationSummaryPage(
  supabase: SupabaseClient,
  userId: string,
  conversationId: string,
  options: Pick<FetchBrokerChatSummariesOptions, "includeMessages" | "includeRequirementContext" | "messageLimit"> = {}
): Promise<BrokerChatSummariesPage> {
  const summaryMessageLimit =
    options.includeMessages && options.messageLimit && options.messageLimit > 0
      ? Math.floor(options.messageLimit)
      : options.includeMessages
        ? 20
        : 1;

  const [conversationResult, conversationCounts] = await Promise.all([
    supabase
      .from("chat_conversations")
      .select(
        "id, listing_id, owner_user_id, broker_user_id, created_at, updated_at, last_message_at, last_message_id, last_sender_id, last_message_sequence, owner_last_read_at, broker_last_read_at, owner_last_read_sequence, broker_last_read_sequence"
      )
      .eq("id", conversationId)
      .or(`owner_user_id.eq.${userId},broker_user_id.eq.${userId}`)
      .maybeSingle(),
    fetchBrokerChatConversationCounts(supabase, userId),
  ]);

  if (conversationResult.error) {
    throw new Error(conversationResult.error.message || "Failed to fetch conversation.");
  }

  const conversation = (conversationResult.data as BrokerConversationRow | null) || null;
  if (!conversation) {
    return { groups: [], hasMore: false, nextCursor: null, ...conversationCounts };
  }

  const participantId = conversation.owner_user_id === userId ? conversation.broker_user_id : conversation.owner_user_id;
  const viewerLastReadAt = conversation.owner_user_id === userId ? conversation.owner_last_read_at : conversation.broker_last_read_at;
  const viewerLastReadSequence =
    conversation.owner_user_id === userId ? conversation.owner_last_read_sequence ?? null : conversation.broker_last_read_sequence ?? null;

  const [listingRows, participants, brokerProfileIdByUserId, messageRows, messageCountResult, unreadCountResult] = await Promise.all([
    supabase
      .from("listings")
      .select(
        "id, title, property_type, deal_type, bedrooms, size_sqft, area_id, developer, price, payment_plan, handover_date, yield_percent, property_video_url, notes, description, status, is_visible, created_at, updated_at, deleted_at, created_by, agency_id, renewal_due_at, approved_at, credits_used"
      )
      .eq("id", conversation.listing_id),
    fetchChatUserSummaries(supabase, [participantId]),
    fetchBrokerProfileIdsByUserId(supabase, [conversation.owner_user_id, conversation.broker_user_id]),
    supabase
      .from("chat_conversation_messages")
      .select("id, conversation_id, sender_id, receiver_id, client_message_id, message_sequence, content, created_at, updated_at")
      .eq("conversation_id", conversation.id)
      .order("message_sequence", { ascending: false })
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .limit(Math.max(1, Math.min(summaryMessageLimit, 100))),
    supabase
      .from("chat_conversation_messages")
      .select("id", { count: "exact", head: true })
      .eq("conversation_id", conversation.id),
    supabase
      .from("chat_conversation_messages")
      .select("id", { count: "exact", head: true })
      .eq("conversation_id", conversation.id)
      .eq("receiver_id", userId)
      .gt("message_sequence", viewerLastReadSequence ?? 0),
  ]);

  const [listing] = await hydrateListings(supabase, (listingRows.data as Listing[]) || [], {
    includeAgencies: false,
    includeCommissionTerms: false,
    includeImages: true,
    includeOwnerActiveCount: false,
    includeOwners: true,
  });
  const sortedThreadMessages = [...((messageRows.data as Array<Omit<ChatMessage, "listing_id">> | null) || [])]
    .reverse()
    .map((message) => ({
      ...message,
      listing_id: conversation.listing_id,
    })) as ChatMessage[];
  const hydratedMessages = await hydrateMessages(supabase, sortedThreadMessages);
  const lastMessage = hydratedMessages[hydratedMessages.length - 1] || null;
  const lastActivityAt = lastMessage?.created_at || conversation.last_message_at || conversation.updated_at || conversation.created_at;
  const messageCount = Math.max(messageCountResult.count || 0, hydratedMessages.length);
  const unreadCount = unreadCountResult.count || 0;
  const requirementContextByConversationId = options.includeRequirementContext
    ? await fetchRequirementMatchThreadContexts(supabase, [conversation], brokerProfileIdByUserId)
    : new Map<string, RequirementMatchThreadContext>();
  const requirementContext = requirementContextByConversationId.get(conversation.id) || null;

  const groups: ChatConversationSummary[] = [
    {
      listing: {
        id: listing?.id || conversation.listing_id,
        title: listing?.title || "Unavailable listing",
        property_type: listing?.property_type,
        deal_type: listing?.deal_type,
        bedrooms: listing?.bedrooms,
        size_sqft: listing?.size_sqft,
        area_id: listing?.area_id,
        developer: listing?.developer,
        price: listing?.price,
        status: listing?.status || "inactive",
        is_visible: listing?.is_visible || false,
        deleted_at: listing?.deleted_at || null,
        created_at: listing?.created_at,
        updated_at: listing?.updated_at,
        created_by: listing?.created_by,
        isOwner: conversation.owner_user_id === userId,
        area: listing?.area ? { name: listing.area.name, city: listing.area.city } : null,
        listing_images: listing?.listing_images || [],
        owner: listing?.owner || null,
      },
      conversations: [
        {
          conversationId: conversation.id,
          participant: participants[0] || null,
          lastMessage,
          lastActivityAt,
          hasUnread: unreadCount > 0,
          unreadCount,
          lastReadAt: viewerLastReadAt,
          lastReadSequence: viewerLastReadSequence,
          lastMessageSequence: conversation.last_message_sequence ?? lastMessage?.message_sequence ?? null,
          messageCount,
          contextType: requirementContext ? "requirement_match" : "listing",
          requirement: requirementContext?.requirement || null,
          requirementMatch: requirementContext?.requirementMatch || null,
          ...(options.includeMessages ? { messages: hydratedMessages } : {}),
        },
      ],
    },
  ];

  return { groups, hasMore: false, nextCursor: null, ...conversationCounts };
}

export async function fetchListingMessages(supabase: SupabaseClient, listingId: string) {
  const { data } = await supabase
    .from("chat_messages")
    .select(CHAT_MESSAGE_SELECT)
    .eq("listing_id", listingId)
    .order("created_at", { ascending: true });

  return hydrateMessages(supabase, (data as ChatMessage[]) || []);
}

export async function hydrateEnquiries(supabase: SupabaseClient, enquiries: Lead[]): Promise<Lead[]> {
  if (!enquiries.length) return [];

  const listingIds = Array.from(new Set(enquiries.map((enquiry) => enquiry.listing_id).filter(Boolean))) as string[];
  const { data: listings } = listingIds.length
    ? await supabase.from("listings").select("id, title, price, property_type, status, deleted_at").in("id", listingIds)
    : { data: [] as Array<Pick<Listing, "id" | "title" | "price" | "property_type" | "status" | "deleted_at">> };

  const listingMap = new Map((listings || []).map((listing) => [listing.id, listing]));
  return enquiries.map((enquiry) => ({
    ...enquiry,
    listing: enquiry.listing_id ? listingMap.get(enquiry.listing_id) || null : null,
  }));
}

function getReplyActivityDate(reply: Pick<EnquiryReply, "sent_at" | "created_at">) {
  return reply.sent_at || reply.created_at;
}

export async function hydrateBrokerEnquiries(
  supabase: SupabaseClient,
  enquiries: Lead[],
  brokerId: string
): Promise<BrokerEnquiry[]> {
  if (!enquiries.length) return [];

  const hydratedEnquiries = await hydrateEnquiries(supabase, enquiries);
  const enquiryIds = hydratedEnquiries.map((enquiry) => enquiry.id);
  const { data: replies } = enquiryIds.length
    ? await supabase
        .from("enquiry_replies")
        .select("id, enquiry_id, listing_id, broker_id, enquirer_email, subject, message, sent_at, status, failure_reason, created_at")
        .in("enquiry_id", enquiryIds)
        .eq("broker_id", brokerId)
        .order("created_at", { ascending: false })
    : { data: [] as EnquiryReply[] };
  const repliesByEnquiryId = new Map<string, EnquiryReply[]>();

  ((replies as EnquiryReply[] | null) || []).forEach((reply) => {
    repliesByEnquiryId.set(reply.enquiry_id, [...(repliesByEnquiryId.get(reply.enquiry_id) || []), reply]);
  });

  return hydratedEnquiries.map((enquiry) => {
    const enquiryReplies = repliesByEnquiryId.get(enquiry.id) || [];
    const latestReply = enquiryReplies.reduce<EnquiryReply | null>((latest, reply) => {
      if (!latest) return reply;

      return getReplyActivityDate(reply).localeCompare(getReplyActivityDate(latest)) > 0 ? reply : latest;
    }, null);

    return {
      ...enquiry,
      replies: enquiryReplies,
      reply_count: enquiryReplies.length,
      latest_reply_at: latestReply ? getReplyActivityDate(latestReply) : null,
      latest_reply_status: latestReply?.status || null,
    };
  });
}

export async function hydrateAdminEnquiries(supabase: SupabaseClient, enquiries: Lead[]): Promise<AdminEnquiry[]> {
  if (!enquiries.length) return [];

  const hydratedEnquiries = await hydrateEnquiries(supabase, enquiries);
  const enquiryIds = hydratedEnquiries.map((enquiry) => enquiry.id);
  const brokerIds = uniqueActivityIds(hydratedEnquiries.map((enquiry) => enquiry.to_user_id));

  const [brokersResult, repliesResult] = await Promise.all([
    brokerIds.length
      ? supabase.from("users").select("id, first_name, last_name, email").in("id", brokerIds)
      : Promise.resolve({ data: [] as Array<Pick<PlatformUser, "id" | "first_name" | "last_name" | "email">> }),
    enquiryIds.length
      ? supabase
          .from("enquiry_replies")
          .select("id, enquiry_id, listing_id, broker_id, enquirer_email, subject, message, sent_at, status, failure_reason, created_at")
          .in("enquiry_id", enquiryIds)
          .order("created_at", { ascending: true })
      : Promise.resolve({ data: [] as EnquiryReply[] }),
  ]);

  const replyRows = (repliesResult.data as EnquiryReply[] | null) || [];
  const replyBrokerIds = uniqueActivityIds(replyRows.map((reply) => reply.broker_id));
  const { data: replyBrokers } = replyBrokerIds.length
    ? await supabase.from("users").select("id, first_name, last_name, email").in("id", replyBrokerIds)
    : { data: [] as Array<Pick<PlatformUser, "id" | "first_name" | "last_name" | "email">> };
  const brokerMap = new Map(
    (((brokersResult.data as Array<Pick<PlatformUser, "id" | "first_name" | "last_name" | "email">> | null) || []).map((broker) => [
      broker.id,
      broker,
    ]))
  );
  const replyBrokerMap = new Map(
    (((replyBrokers as Array<Pick<PlatformUser, "id" | "first_name" | "last_name" | "email">> | null) || []).map((broker) => [
      broker.id,
      broker,
    ]))
  );
  const repliesByEnquiryId = new Map<string, EnquiryReply[]>();

  replyRows.forEach((reply) => {
    const hydratedReply = {
      ...reply,
      broker: replyBrokerMap.get(reply.broker_id) || brokerMap.get(reply.broker_id) || null,
    };

    repliesByEnquiryId.set(reply.enquiry_id, [...(repliesByEnquiryId.get(reply.enquiry_id) || []), hydratedReply]);
  });

  return hydratedEnquiries.map((enquiry) => {
    const replies = repliesByEnquiryId.get(enquiry.id) || [];
    const latestReply = replies.reduce<EnquiryReply | null>((latest, reply) => {
      if (!latest) return reply;

      return getReplyActivityDate(reply).localeCompare(getReplyActivityDate(latest)) > 0 ? reply : latest;
    }, null);

    return {
      ...enquiry,
      broker: brokerMap.get(enquiry.to_user_id) || null,
      replies,
      reply_count: replies.length,
      latest_reply_at: latestReply ? getReplyActivityDate(latestReply) : null,
      latest_reply_status: latestReply?.status || null,
    };
  });
}

export function groupMessagesByListing(listings: Listing[], messages: ChatMessage[]) {
  const listingMap = new Map(listings.map((listing) => [listing.id, listing]));
  const grouped = new Map<string, ChatMessage[]>();

  messages.forEach((message) => {
    grouped.set(message.listing_id, [...(grouped.get(message.listing_id) || []), message]);
  });

  return Array.from(grouped.entries()).map(([listingId, listingMessages]) => ({
    listing: listingMap.get(listingId),
    messages: listingMessages,
  }));
}

function uniqueActivityIds(ids: Array<string | null | undefined>) {
  return Array.from(new Set(ids.filter(Boolean))) as string[];
}

function getActivityLogMetadataString(metadata: Record<string, unknown> | null | undefined, ...keys: string[]) {
  if (!metadata) {
    return null;
  }

  for (const key of keys) {
    const value = metadata[key];
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return null;
}

async function hydrateActivityRequirements(supabase: SupabaseClient, requirementIds: string[]) {
  const uniqueRequirementIds = uniqueActivityIds(requirementIds);
  if (!uniqueRequirementIds.length) {
    return [] as Requirement[];
  }

  const { data: requirementRows } = await supabase
    .from("requirements")
    .select(REQUIREMENT_SELECT)
    .in("id", uniqueRequirementIds);
  const requirements = (requirementRows as Requirement[] | null) || [];
  if (!requirements.length) {
    return [] as Requirement[];
  }

  const brokerProfileIds = uniqueActivityIds(requirements.map((requirement) => requirement.broker_id));
  const { data: brokerProfiles } = brokerProfileIds.length
    ? await supabase.from("broker_profiles").select("id, user_id").in("id", brokerProfileIds)
    : { data: [] as Array<Pick<BrokerProfile, "id" | "user_id">> };
  const brokerProfileOwnerMap = new Map(
    (((brokerProfiles as Array<Pick<BrokerProfile, "id" | "user_id">> | null) || [])
      .filter((profile) => profile.id)
      .map((profile) => [profile.id as string, profile.user_id]))
  );
  const ownerIds = uniqueActivityIds(
    requirements.map((requirement) => requirement.posted_by || brokerProfileOwnerMap.get(requirement.broker_id))
  );
  const { data: ownerRows } = ownerIds.length
    ? await supabase.from("users").select("id, first_name, last_name, email").in("id", ownerIds)
    : { data: [] as Array<Pick<PlatformUser, "id" | "first_name" | "last_name" | "email">> };
  const ownerMap = new Map(
    (((ownerRows as Array<Pick<PlatformUser, "id" | "first_name" | "last_name" | "email">> | null) || []).map((owner) => [
      owner.id,
      owner,
    ]))
  );

  return requirements.map((requirement) => {
    const ownerUserId = requirement.posted_by || brokerProfileOwnerMap.get(requirement.broker_id) || null;

    return {
      ...requirement,
      owner: ownerUserId ? ownerMap.get(ownerUserId) || null : null,
      status: getRequirementStatus(requirement),
    };
  });
}

async function hydrateActivityRequirementMatches(
  supabase: SupabaseClient,
  matches: RequirementMatch[],
  requirementMap: Map<string, Requirement>
) {
  if (!matches.length) {
    return [] as RequirementMatch[];
  }

  const senderBrokerIds = uniqueActivityIds(matches.map((match) => match.sender_broker_id));
  const listingIds = uniqueActivityIds(matches.map((match) => match.listing_id));
  const [brokerProfilesResult, listingRowsResult] = await Promise.all([
    senderBrokerIds.length
      ? supabase.from("broker_profiles").select("id, user_id").in("id", senderBrokerIds)
      : Promise.resolve({ data: [] as Array<Pick<BrokerProfile, "id" | "user_id">> }),
    listingIds.length
      ? supabase
          .from("listings")
          .select("id, title, property_type, price, status, bedrooms, area_id, is_visible, deleted_at")
          .in("id", listingIds)
      : Promise.resolve({
          data: [] as Array<
            Pick<Listing, "id" | "title" | "property_type" | "price" | "status" | "bedrooms" | "area_id" | "is_visible" | "deleted_at">
          >,
        }),
  ]);

  const senderProfiles = ((brokerProfilesResult.data as Array<Pick<BrokerProfile, "id" | "user_id">> | null) || []).filter(
    (profile): profile is Pick<BrokerProfile, "id" | "user_id"> & { id: string } => !!profile.id
  );
  const senderUserIds = uniqueActivityIds(senderProfiles.map((profile) => profile.user_id));
  const { data: senderUsers } = senderUserIds.length
    ? await supabase.from("users").select("id, first_name, last_name, email").in("id", senderUserIds)
    : { data: [] as Array<Pick<PlatformUser, "id" | "first_name" | "last_name" | "email">> };
  const senderProfileMap = new Map(senderProfiles.map((profile) => [profile.id, profile.user_id]));
  const senderUserMap = new Map(
    (((senderUsers as Array<Pick<PlatformUser, "id" | "first_name" | "last_name" | "email">> | null) || []).map((user) => [
      user.id,
      user,
    ]))
  );
  const listingRows =
    ((listingRowsResult.data as Array<
      Pick<Listing, "id" | "title" | "property_type" | "price" | "status" | "bedrooms" | "area_id" | "is_visible" | "deleted_at">
    > | null) || []);
  const areaIds = uniqueActivityIds(listingRows.map((listing) => listing.area_id));
  const { data: areaRows } = areaIds.length
    ? await supabase.from("areas").select("id, name, city").in("id", areaIds)
    : { data: [] as Array<Pick<Area, "id" | "name" | "city">> };
  const areaMap = new Map(((areaRows as Array<Pick<Area, "id" | "name" | "city">> | null) || []).map((area) => [area.id, area]));
  const listingMap = new Map(
    listingRows.map((listing) => [
      listing.id,
      {
        id: listing.id,
        title: listing.title,
        property_type: listing.property_type,
        price: listing.price,
        status: listing.status,
        bedrooms: listing.bedrooms,
        area: listing.area_id ? areaMap.get(listing.area_id) || null : null,
        is_visible: listing.is_visible,
        deleted_at: listing.deleted_at || null,
      },
    ])
  );

  return matches.map((match) => {
    const listing = match.listing_id ? listingMap.get(match.listing_id) || null : null;

    return {
      ...match,
      status: match.status || "new",
      listing: listing
        ? {
            id: listing.id,
            title: listing.title,
            property_type: listing.property_type,
            price: listing.price,
            status: listing.status,
            bedrooms: listing.bedrooms,
            area: listing.area,
            is_visible: listing.is_visible,
            deleted_at: listing.deleted_at || null,
          }
        : null,
      sender: senderUserMap.get(senderProfileMap.get(match.sender_broker_id) || "") || null,
      requirement: requirementMap.get(match.requirement_id) || null,
    };
  });
}

export async function hydrateActivityLogs(
  supabase: SupabaseClient,
  logs: ActivityLogHydrationRow[]
): Promise<ActivityLog[]> {
  const resolvedLogs = logs || [];
  const actorIds = uniqueActivityIds(resolvedLogs.map((log) => log.actor_user_id));
  const leadIds = uniqueActivityIds(
    resolvedLogs
      .filter((log) => log.target_table === "leads" && log.target_id)
      .map((log) => log.target_id)
  );
  const requirementMatchIds = uniqueActivityIds(
    resolvedLogs
      .filter((log) => log.target_table === "requirement_matches" && log.target_id)
      .map((log) => log.target_id)
  );

  const { data: actors } = actorIds.length
    ? await supabase.from("users").select("id, email, first_name, last_name, role").in("id", actorIds)
    : { data: [] as Array<Pick<PlatformUser, "id" | "email" | "first_name" | "last_name" | "role">> };

  const { data: leadRows } = leadIds.length
    ? await supabase
        .from("leads")
        .select(LEAD_SELECT)
        .in("id", leadIds)
    : { data: [] as Lead[] };

  const { data: requirementMatchRows } = requirementMatchIds.length
    ? await supabase
        .from("requirement_matches")
        .select(REQUIREMENT_MATCH_SELECT)
        .in("id", requirementMatchIds)
    : { data: [] as RequirementMatch[] };

  const requirementMatches = (requirementMatchRows as RequirementMatch[] | null) || [];
  const requirementIds = uniqueActivityIds([
    ...resolvedLogs
      .filter((log) => log.target_table === "requirements" && log.target_id)
      .map((log) => log.target_id),
    ...resolvedLogs.map((log) => getActivityLogMetadataString(log.metadata, "requirementId", "requirement_id")),
    ...((leadRows as Lead[] | null) || []).map((lead) => lead.requirement_id),
    ...requirementMatches.map((match) => match.requirement_id),
  ]);
  const hydratedLeads = await hydrateEnquiries(supabase, (leadRows as Lead[] | null) || []);
  const hydratedRequirements = await hydrateActivityRequirements(supabase, requirementIds);
  const requirementMap = new Map(hydratedRequirements.map((requirement) => [requirement.id, requirement]));
  const hydratedRequirementMatches = await hydrateActivityRequirementMatches(supabase, requirementMatches, requirementMap);

  const actorMap = new Map((actors || []).map((actor) => [actor.id, actor]));
  const leadMap = new Map(hydratedLeads.map((lead) => [lead.id, lead]));
  const requirementMatchMap = new Map(hydratedRequirementMatches.map((match) => [match.id, match]));

  return resolvedLogs.map((log) => {
    const requirementMatch = log.target_table === "requirement_matches" && log.target_id ? requirementMatchMap.get(log.target_id) || null : null;
    const requirementId =
      log.target_table === "requirements" && log.target_id
        ? log.target_id
        : requirementMatch?.requirement_id || getActivityLogMetadataString(log.metadata, "requirementId", "requirement_id");

    return {
      ...(log as ActivityLog),
      actor: log.actor_user_id ? actorMap.get(log.actor_user_id) || null : null,
      lead: log.target_table === "leads" && log.target_id ? leadMap.get(log.target_id) || null : null,
      requirement: requirementId ? requirementMap.get(requirementId) || null : null,
      requirementMatch,
    };
  });
}

function collectActivityMetadataSearchValues(values: string[], value: unknown): void {
  if (value === null || value === undefined) {
    return;
  }

  if (Array.isArray(value)) {
    value.forEach((entry) => collectActivityMetadataSearchValues(values, entry));
    return;
  }

  if (typeof value === "object") {
    Object.entries(value as Record<string, unknown>).forEach(([key, entryValue]) => {
      values.push(key);
      collectActivityMetadataSearchValues(values, entryValue);
    });
    return;
  }

  values.push(String(value));
}

function getActivityMetadataSearchText(metadata: Record<string, unknown> | null | undefined) {
  const values: string[] = [];
  collectActivityMetadataSearchValues(values, metadata);
  return buildSearchText(values);
}

async function hydrateActivitySearchListingMap(supabase: SupabaseClient, logs: ActivityLog[]) {
  const listingIds = uniqueActivityIds([
    ...logs.filter((log) => log.target_table === "listings" && log.target_id).map((log) => log.target_id),
    ...logs.map((log) => log.lead?.listing_id),
    ...logs.map((log) => log.requirementMatch?.listing_id),
    ...logs.map((log) => getActivityLogMetadataString(log.metadata, "listingId", "listing_id")),
  ]);

  if (!listingIds.length) {
    return new Map<string, Listing>();
  }

  const { data: listingRows } = await supabase.from("listings").select(LISTING_SELECT).in("id", listingIds);
  const listings = await hydrateListings(supabase, (listingRows as Listing[] | null) || []);

  return new Map(listings.map((listing) => [listing.id, listing]));
}

function getActivityLogSearchText(log: ActivityLog, listingMap: Map<string, Listing>) {
  const listingId =
    (log.target_table === "listings" ? log.target_id : null) ||
    log.lead?.listing_id ||
    log.requirementMatch?.listing_id ||
    getActivityLogMetadataString(log.metadata, "listingId", "listing_id");
  const listing = listingId ? listingMap.get(listingId) || null : null;
  const requirement = log.requirement || log.requirementMatch?.requirement || null;

  return buildSearchText([
    log.action,
    log.target_table,
    log.target_id,
    log.created_at,
    log.actor?.first_name,
    log.actor?.last_name,
    log.actor?.email,
    log.actor?.role,
    listing?.title,
    listing?.developer,
    listing?.area?.name,
    listing?.area?.city,
    listing?.property_type,
    listing?.status,
    listing?.price,
    log.lead?.contact_name,
    log.lead?.contact_email,
    log.lead?.contact_phone,
    log.lead?.message,
    log.lead?.preferred_channel,
    log.lead?.listing?.title,
    log.lead?.listing?.property_type,
    log.lead?.listing?.status,
    log.lead?.listing?.price,
    requirement?.title,
    requirement?.description,
    requirement?.area,
    requirement?.property_type,
    requirement?.budget_min,
    requirement?.budget_max,
    requirement?.bedrooms,
    log.requirementMatch?.message,
    log.requirementMatch?.status,
    log.requirementMatch?.listing?.title,
    log.requirementMatch?.listing?.property_type,
    log.requirementMatch?.listing?.status,
    log.requirementMatch?.listing?.price,
    log.requirementMatch?.sender?.first_name,
    log.requirementMatch?.sender?.last_name,
    log.requirementMatch?.sender?.email,
    getActivityMetadataSearchText(log.metadata),
  ]);
}

function getActivityLogCategoryCountKey(log: Pick<ActivityLog, "target_table">): Exclude<ActivityCategory, "all"> | null {
  if (log.target_table === "listings") return "listings";
  if (log.target_table === "users" || log.target_table === "broker_profiles") return "brokers";
  if (log.target_table === "broker_credits") return "credits";
  if (log.target_table === "requirements" || log.target_table === "requirement_matches") return "requirements";
  if (log.target_table === null || log.target_table === "leads" || log.target_table === "settings") return "system";
  return null;
}

function getActivityLogCategoryCounts(logs: ActivityLog[]): AdminActivityResponse["categoryCounts"] {
  const counts: AdminActivityResponse["categoryCounts"] = {
    all: logs.length,
    listings: 0,
    brokers: 0,
    credits: 0,
    requirements: 0,
    system: 0,
  };

  logs.forEach((log) => {
    const category = getActivityLogCategoryCountKey(log);
    if (category) {
      counts[category] += 1;
    }
  });

  return counts;
}

export async function fetchActivityLog(
  supabase: SupabaseClient,
  options: FetchActivityLogOptions = {}
): Promise<AdminActivityResponse> {
  const page = Math.max(1, Number(options.page || 1));
  const pageSize = Math.max(1, Math.min(100, Number(options.pageSize || 10)));
  const rangeFrom = (page - 1) * pageSize;
  const rangeTo = rangeFrom + pageSize - 1;
  const includeCounts = options.includeCounts !== false;
  const normalizedSearchQuery = normalizeSearchQuery(options.searchQuery);

  const buildActivityListQuery = (category?: ActivityCategory) =>
    applyActivityCategoryFilter(
      applyActivityDateFilters(
        excludeChatActivity(
          supabase
            .from("activity_log")
            .select("id, action, target_table, target_id, created_at, metadata, actor_user_id")
            .order("created_at", { ascending: false }) as unknown as ActivityLogListQuery
        ),
        options.startDate,
        options.endDate
      ) as ActivityLogListQuery,
      category
    );

  const logsQuery = buildActivityListQuery(options.category);
  const emptyCategoryCounts: AdminActivityResponse["categoryCounts"] = {
    all: 0,
    listings: 0,
    brokers: 0,
    credits: 0,
    requirements: 0,
    system: 0,
  };

  const buildCountQuery = (category: ActivityCategory) =>
    applyActivityCategoryFilter(
      applyActivityDateFilters(
        excludeChatActivity(supabase.from("activity_log").select("id", { count: "exact", head: true }) as unknown as ActivityCategoryFilterQuery),
        options.startDate,
        options.endDate
      ),
      category
    ) as unknown as Promise<{ count: number | null }>;

  const shouldResolveBaseCounts = includeCounts || !!normalizedSearchQuery;
  let categoryCounts = emptyCategoryCounts;

  if (shouldResolveBaseCounts) {
    const [allCount, listingsCount, brokersCount, creditsCount, requirementsCount, systemCount] = await Promise.all([
      buildCountQuery("all"),
      buildCountQuery("listings"),
      buildCountQuery("brokers"),
      buildCountQuery("credits"),
      buildCountQuery("requirements"),
      buildCountQuery("system"),
    ]);

    categoryCounts = {
      all: allCount.count || 0,
      listings: listingsCount.count || 0,
      brokers: brokersCount.count || 0,
      credits: creditsCount.count || 0,
      requirements: requirementsCount.count || 0,
      system: systemCount.count || 0,
    };
  }

  if (normalizedSearchQuery) {
    if (!categoryCounts.all) {
      return {
        activity: [],
        totalCount: categoryCounts.all,
        filteredCount: 0,
        page,
        pageSize,
        totalPages: 1,
        countsIncluded: includeCounts,
        categoryCounts: includeCounts ? categoryCounts : emptyCategoryCounts,
      };
    }

    const { data: logs } = await buildActivityListQuery("all").range(0, Math.max(categoryCounts.all - 1, 0));
    const hydratedLogs = await hydrateActivityLogs(supabase, logs || []);
    const listingMap = await hydrateActivitySearchListingMap(supabase, hydratedLogs);
    const matchedLogs = hydratedLogs.filter((log) => getActivityLogSearchText(log, listingMap).includes(normalizedSearchQuery));
    const searchCategoryCounts = getActivityLogCategoryCounts(matchedLogs);
    const categoryMatchedLogs =
      options.category && options.category !== "all"
        ? matchedLogs.filter((log) => getActivityLogCategoryCountKey(log) === options.category)
        : matchedLogs;
    const activity = categoryMatchedLogs.slice(rangeFrom, rangeTo + 1);

    return {
      activity,
      totalCount: categoryCounts.all,
      filteredCount: categoryMatchedLogs.length,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(categoryMatchedLogs.length / pageSize)),
      countsIncluded: includeCounts,
      categoryCounts: includeCounts ? searchCategoryCounts : emptyCategoryCounts,
    };
  }

  const { data: logs } = await logsQuery.range(rangeFrom, rangeTo);
  const resolvedLogs = logs || [];
  const activity = await hydrateActivityLogs(supabase, resolvedLogs);

  if (!includeCounts) {
    return {
      activity,
      totalCount: 0,
      filteredCount: 0,
      page,
      pageSize,
      totalPages: 1,
      countsIncluded: false,
      categoryCounts: emptyCategoryCounts,
    };
  }

  const filteredCount =
    options.category && options.category !== "all" ? categoryCounts[options.category] : categoryCounts.all;

  return {
    activity,
    totalCount: categoryCounts.all,
    filteredCount,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(filteredCount / pageSize)),
    countsIncluded: true,
    categoryCounts,
  };
}



