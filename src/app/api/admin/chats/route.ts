import { NextRequest, NextResponse } from "next/server";
import { getServiceSupabase, requireAdmin, withNoStore } from "@/lib/deal-server";
import { hydrateMessages } from "@/lib/platform-server-data";
import type {
  Area,
  AdminChatConversationCursor,
  AdminChatPage,
  BrokerProfile,
  ChatMessage,
  Listing,
  ListingImage,
  PlatformUser,
} from "@/lib/deal-types";

const DEFAULT_CHAT_LIMIT = 20;
const MAX_CHAT_LIMIT = 40;
const CHAT_MESSAGE_SELECT =
  "id, conversation_id, sender_id, receiver_id, client_message_id, message_sequence, content, created_at, updated_at";
const ADMIN_CHAT_LISTING_SELECT = "id, title, status, price, is_visible, deleted_at, area_id";
const ADMIN_CHAT_LISTING_IMAGE_SELECT = "id, listing_id, file_name, storage_path, public_url, sort_order, is_cover, created_at";

type ConversationRow = {
  id: string;
  listing_id: string;
  owner_user_id: string;
  broker_user_id: string;
  created_at: string;
  updated_at: string;
  last_message_at: string;
  last_message_id?: string | null;
  last_sender_id?: string | null;
  last_message_sequence?: number | null;
  owner_last_read_at: string | null;
  broker_last_read_at: string | null;
  owner_last_read_sequence?: number | null;
  broker_last_read_sequence?: number | null;
};

type AdminChatParticipant = Pick<PlatformUser, "id" | "first_name" | "last_name" | "email" | "role"> & {
  profile_photo?: string | null;
};

type AdminConversationMessageStats = {
  messageCount: number;
  ownerUnreadCount: number;
  brokerUnreadCount: number;
};

type AdminChatListingRow = Pick<Listing, "id" | "title" | "status" | "price" | "is_visible" | "deleted_at" | "area_id">;

type MessageCountFilterQuery = {
  gt(column: string, value: string | number): MessageCountFilterQuery;
  or(filter: string): MessageCountFilterQuery;
};

function getBoundedLimit(value: string | null, fallback: number, max: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }

  return Math.min(Math.floor(parsed), max);
}

function parseConversationCursor(value: string | null): AdminChatConversationCursor | null {
  if (!value) {
    return null;
  }

  try {
    const parsed = JSON.parse(value) as Partial<AdminChatConversationCursor>;
    if (typeof parsed.lastMessageAt === "string" && parsed.lastMessageAt && typeof parsed.id === "string" && parsed.id) {
      return {
        lastMessageAt: parsed.lastMessageAt,
        id: parsed.id,
      };
    }
  } catch {
    return null;
  }

  return null;
}

function parseIsoDateParam(value: string | null) {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function uniqueIds(ids: Array<string | null | undefined>) {
  return Array.from(new Set(ids.filter(Boolean))) as string[];
}

function getConversationCursor(conversation: ConversationRow): AdminChatConversationCursor {
  return {
    lastMessageAt: conversation.last_message_at || conversation.updated_at || conversation.created_at,
    id: conversation.id,
  };
}

function createServerTiming() {
  const entries: string[] = [];

  return {
    async measure<T>(name: string, operation: () => Promise<T>) {
      const startedAt = Date.now();
      try {
        return await operation();
      } finally {
        entries.push(`${name};dur=${Math.max(Date.now() - startedAt, 0)}`);
      }
    },
    responseInit() {
      const init = withNoStore();
      const headers = new Headers(init.headers);
      if (entries.length) {
        headers.set("Server-Timing", entries.join(", "));
      }

      return {
        ...init,
        headers,
      };
    },
  };
}

async function fetchAdminChatParticipants(
  supabase: ReturnType<typeof getServiceSupabase>,
  userIds: string[]
) {
  const uniqueUserIds = uniqueIds(userIds);
  if (!uniqueUserIds.length) {
    return new Map<string, AdminChatParticipant>();
  }

  const [usersResult, brokerProfilesResult] = await Promise.all([
    supabase.from("users").select("id, first_name, last_name, email, role").in("id", uniqueUserIds),
    supabase.from("broker_profiles").select("user_id, profile_photo").in("user_id", uniqueUserIds),
  ]);

  const profilePhotoByUserId = new Map(
    (((brokerProfilesResult.data as Array<Pick<BrokerProfile, "user_id" | "profile_photo">> | null) || [])).map((profile) => [
      profile.user_id,
      profile.profile_photo || null,
    ])
  );

  return new Map(
    (((usersResult.data as Array<Pick<PlatformUser, "id" | "first_name" | "last_name" | "email" | "role">> | null) || [])).map((user) => [
      user.id,
      {
        ...user,
        profile_photo: profilePhotoByUserId.get(user.id) || null,
      },
    ])
  );
}

function applyUnreadCountFilter<T extends MessageCountFilterQuery>(
  query: T,
  readSequence?: number | null,
  readAt?: string | null
) {
  if (typeof readSequence === "number" && Number.isFinite(readSequence)) {
    if (readAt) {
      return query.or(`message_sequence.gt.${readSequence},and(message_sequence.is.null,created_at.gt.${readAt})`) as T;
    }

    return query.or(`message_sequence.gt.${readSequence},message_sequence.is.null`) as T;
  }

  if (readAt) {
    return query.gt("created_at", readAt) as T;
  }

  return query;
}

async function countConversationMessages(
  supabase: ReturnType<typeof getServiceSupabase>,
  conversation: ConversationRow
) {
  let ownerUnreadQuery = supabase
    .from("chat_conversation_messages")
    .select("id", { count: "exact", head: true })
    .eq("conversation_id", conversation.id)
    .eq("receiver_id", conversation.owner_user_id);
  ownerUnreadQuery = applyUnreadCountFilter(ownerUnreadQuery, conversation.owner_last_read_sequence, conversation.owner_last_read_at);

  let brokerUnreadQuery = supabase
    .from("chat_conversation_messages")
    .select("id", { count: "exact", head: true })
    .eq("conversation_id", conversation.id)
    .eq("receiver_id", conversation.broker_user_id);
  brokerUnreadQuery = applyUnreadCountFilter(brokerUnreadQuery, conversation.broker_last_read_sequence, conversation.broker_last_read_at);

  const [messageCountResult, ownerUnreadResult, brokerUnreadResult] = await Promise.all([
    supabase.from("chat_conversation_messages").select("id", { count: "exact", head: true }).eq("conversation_id", conversation.id),
    ownerUnreadQuery,
    brokerUnreadQuery,
  ]);

  const error = messageCountResult.error || ownerUnreadResult.error || brokerUnreadResult.error;
  if (error) {
    throw new Error(error.message || "Failed to count chat messages.");
  }

  return {
    conversationId: conversation.id,
    stats: {
      messageCount: messageCountResult.count || 0,
      ownerUnreadCount: ownerUnreadResult.count || 0,
      brokerUnreadCount: brokerUnreadResult.count || 0,
    } satisfies AdminConversationMessageStats,
  };
}

async function fetchConversationMessageStats(
  supabase: ReturnType<typeof getServiceSupabase>,
  conversations: ConversationRow[]
) {
  const conversationIds = uniqueIds(conversations.map((conversation) => conversation.id));
  if (!conversationIds.length) {
    return new Map<string, AdminConversationMessageStats>();
  }

  const statsByConversationId = new Map(
    conversations.map((conversation) => [
      conversation.id,
      {
        messageCount: 0,
        ownerUnreadCount: 0,
        brokerUnreadCount: 0,
      },
    ])
  );

  const results = await Promise.all(conversations.map((conversation) => countConversationMessages(supabase, conversation)));
  results.forEach(({ conversationId, stats }) => {
    statsByConversationId.set(conversationId, stats);
  });

  return statsByConversationId;
}

async function fetchListingPreviewImages(supabase: ReturnType<typeof getServiceSupabase>, listingIds: string[]) {
  if (!listingIds.length) {
    return new Map<string, ListingImage>();
  }

  const results = await Promise.all(
    listingIds.map(async (listingId) => {
      const { data, error } = await supabase
        .from("listing_images")
        .select(ADMIN_CHAT_LISTING_IMAGE_SELECT)
        .eq("listing_id", listingId)
        .order("is_cover", { ascending: false })
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true })
        .limit(1);

      if (error) {
        throw new Error(error.message || "Failed to load chat listing image.");
      }

      return [listingId, ((data as ListingImage[] | null) || [])[0] || null] as const;
    })
  );

  return new Map(results.flatMap(([listingId, image]) => (image ? [[listingId, image] as const] : [])));
}

async function hydrateAdminChatListings(
  supabase: ReturnType<typeof getServiceSupabase>,
  listings: AdminChatListingRow[]
) {
  if (!listings.length) {
    return new Map<string, AdminChatPage["chats"][number]["listing"]>();
  }

  const areaIds = uniqueIds(listings.map((listing) => listing.area_id));
  const [areasResult, imageMap] = await Promise.all([
    areaIds.length ? supabase.from("areas").select("id, name, city").in("id", areaIds) : Promise.resolve({ data: [] as Array<Pick<Area, "id" | "name" | "city">> }),
    fetchListingPreviewImages(supabase, listings.map((listing) => listing.id)),
  ]);
  const areaMap = new Map(
    (((areasResult.data as Array<Pick<Area, "id" | "name" | "city">> | null) || []).map((area) => [area.id, area]))
  );

  return new Map(
    listings.map((listing) => {
      const image = imageMap.get(listing.id);

      return [
        listing.id,
        {
          id: listing.id,
          title: listing.title,
          status: listing.status,
          price: listing.price,
          is_visible: listing.is_visible,
          deleted_at: listing.deleted_at || null,
          area: listing.area_id ? areaMap.get(listing.area_id) || null : null,
          listing_images: image ? [image] : [],
        },
      ];
    })
  );
}

function toChatParticipant(participant: AdminChatParticipant | null | undefined) {
  if (!participant) {
    return null;
  }

  return {
    id: participant.id,
    first_name: participant.first_name,
    last_name: participant.last_name,
    email: participant.email,
    profile_photo: participant.profile_photo || null,
  };
}

export async function GET(request: NextRequest) {
  const timing = createServerTiming();
  const auth = await timing.measure("admin_auth", () => requireAdmin(request));
  if ("error" in auth) return auth.error;

  const supabase = getServiceSupabase();
  const searchParams = request.nextUrl.searchParams;
  const limit = getBoundedLimit(searchParams.get("limit"), DEFAULT_CHAT_LIMIT, MAX_CHAT_LIMIT);
  const cursor = parseConversationCursor(searchParams.get("cursor"));
  const startDate = parseIsoDateParam(searchParams.get("startDate"));
  const endDate = parseIsoDateParam(searchParams.get("endDate"));

  let countQuery = supabase.from("chat_conversations").select("id", { count: "exact", head: true });
  let pageQuery = supabase
    .from("chat_conversations")
    .select(
      "id, listing_id, owner_user_id, broker_user_id, created_at, updated_at, last_message_at, last_message_id, last_sender_id, last_message_sequence, owner_last_read_at, broker_last_read_at, owner_last_read_sequence, broker_last_read_sequence"
    );

  if (startDate) {
    countQuery = countQuery.gte("last_message_at", startDate);
    pageQuery = pageQuery.gte("last_message_at", startDate);
  }

  if (endDate) {
    countQuery = countQuery.lte("last_message_at", endDate);
    pageQuery = pageQuery.lte("last_message_at", endDate);
  }

  if (cursor) {
    pageQuery = pageQuery.or(`last_message_at.lt.${cursor.lastMessageAt},and(last_message_at.eq.${cursor.lastMessageAt},id.lt.${cursor.id})`);
  }

  pageQuery = pageQuery.order("last_message_at", { ascending: false }).order("id", { ascending: false }).limit(limit + 1);

  const [countResult, conversationsResult] = await timing.measure("chat_page", () => Promise.all([countQuery, pageQuery]));
  if (countResult.error) {
    throw new Error(countResult.error.message || "Failed to count admin chats.");
  }
  if (conversationsResult.error) {
    throw new Error(conversationsResult.error.message || "Failed to fetch admin chats.");
  }

  const fetchedConversations = (conversationsResult.data as ConversationRow[] | null) || [];
  const hasMore = fetchedConversations.length > limit;
  const rawPageConversations = fetchedConversations.slice(0, limit);
  const nextCursor = hasMore && rawPageConversations.length ? getConversationCursor(rawPageConversations[rawPageConversations.length - 1]) : null;
  const participants = await timing.measure("chat_participants", () =>
    fetchAdminChatParticipants(
      supabase,
      rawPageConversations.flatMap((conversation) => [conversation.owner_user_id, conversation.broker_user_id])
    )
  );
  const seenConversationKeys = new Set<string>();
  const conversations = rawPageConversations.filter((conversation) => {
    const owner = participants.get(conversation.owner_user_id);
    const broker = participants.get(conversation.broker_user_id);
    const conversationKey = `${conversation.listing_id}:${conversation.owner_user_id}:${conversation.broker_user_id}`;

    if (!owner || !broker || owner.role !== "broker" || broker.role !== "broker" || conversation.owner_user_id === conversation.broker_user_id) {
      return false;
    }

    if (seenConversationKeys.has(conversationKey)) {
      return false;
    }

    seenConversationKeys.add(conversationKey);
    return true;
  });

  if (!conversations.length) {
    const response = NextResponse.json(
      {
        chats: [],
        hasMore,
        nextCursor,
        totalConversations: countResult.count || 0,
      } satisfies AdminChatPage,
      timing.responseInit()
    );
    return response;
  }

  const listingIds = uniqueIds(conversations.map((conversation) => conversation.listing_id));
  const conversationByLastMessageId = new Map(
    conversations.flatMap((conversation) => (conversation.last_message_id ? [[conversation.last_message_id, conversation] as const] : []))
  );
  const lastMessageIds = Array.from(conversationByLastMessageId.keys());

  const [listingRowsResult, lastMessageRowsResult, messageStatsByConversationId] = await timing.measure("chat_related", () => Promise.all([
    supabase.from("listings").select(ADMIN_CHAT_LISTING_SELECT).in("id", listingIds),
    lastMessageIds.length
      ? supabase.from("chat_conversation_messages").select(CHAT_MESSAGE_SELECT).in("id", lastMessageIds)
      : Promise.resolve({ data: [] as Array<Omit<ChatMessage, "listing_id">> }),
    fetchConversationMessageStats(supabase, conversations),
  ]));

  if (listingRowsResult.error) {
    throw new Error(listingRowsResult.error.message || "Failed to load chat listings.");
  }

  const [listingMap, hydratedLastMessages] = await timing.measure("chat_hydrate", () =>
    Promise.all([
      hydrateAdminChatListings(supabase, (listingRowsResult.data as AdminChatListingRow[] | null) || []),
      hydrateMessages(
        supabase,
        ((lastMessageRowsResult.data as Array<Omit<ChatMessage, "listing_id">> | null) || []).flatMap((message) => {
          const conversation = conversationByLastMessageId.get(message.id);
          return conversation ? [{ ...message, listing_id: conversation.listing_id }] : [];
        })
      ),
    ])
  );
  const lastMessageByConversationId = new Map(hydratedLastMessages.map((message) => [message.conversation_id || "", message]));

  const grouped = new Map<string, AdminChatPage["chats"][number]>();

  conversations.forEach((conversation) => {
    const listing = listingMap.get(conversation.listing_id);
    if (!listing) {
      return;
    }

    const group = grouped.get(conversation.listing_id) || {
      listing,
      conversations: [],
    };
    const messageStats = messageStatsByConversationId.get(conversation.id) || {
      messageCount: 0,
      ownerUnreadCount: 0,
      brokerUnreadCount: 0,
    };
    const lastMessage = lastMessageByConversationId.get(conversation.id) || null;
    const lastMessageAt = lastMessage?.created_at || conversation.last_message_at || conversation.updated_at || conversation.created_at;

    group.conversations.push({
      conversationId: conversation.id,
      owner: toChatParticipant(participants.get(conversation.owner_user_id)),
      broker: toChatParticipant(participants.get(conversation.broker_user_id)),
      lastMessageAt,
      lastMessage,
      messageCount: messageStats.messageCount,
      unreadCount: messageStats.ownerUnreadCount + messageStats.brokerUnreadCount,
      ownerUnreadCount: messageStats.ownerUnreadCount,
      brokerUnreadCount: messageStats.brokerUnreadCount,
      messages: [],
    });

    grouped.set(conversation.listing_id, group);
  });

  const chats = Array.from(grouped.values())
    .map((group) => ({
      ...group,
      conversations: group.conversations.sort((left, right) => right.lastMessageAt.localeCompare(left.lastMessageAt)),
    }))
    .sort((left, right) => {
      const leftTime = left.conversations[0]?.lastMessageAt || "";
      const rightTime = right.conversations[0]?.lastMessageAt || "";
      return rightTime.localeCompare(leftTime);
    });

  const response = NextResponse.json(
    {
      chats,
      hasMore,
      nextCursor,
      totalConversations: countResult.count || 0,
    } satisfies AdminChatPage,
    timing.responseInit()
  );
  return response;
}
