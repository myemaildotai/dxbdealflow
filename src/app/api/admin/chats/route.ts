import { NextRequest, NextResponse } from "next/server";
import { getServiceSupabase, LISTING_SELECT, requireAdmin, withNoStore } from "@/lib/deal-server";
import { hydrateListings, hydrateMessages } from "@/lib/platform-server-data";
import type {
  AdminChatConversationCursor,
  AdminChatPage,
  BrokerProfile,
  ChatMessage,
  Listing,
  PlatformUser,
} from "@/lib/deal-types";

const DEFAULT_CHAT_LIMIT = 20;
const MAX_CHAT_LIMIT = 40;
const CHAT_MESSAGE_SELECT =
  "id, conversation_id, sender_id, receiver_id, client_message_id, message_sequence, content, created_at, updated_at";

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

type AdminConversationMessageStatRow = {
  conversation_id: string;
  receiver_id: string | null;
  message_sequence: number | null;
  created_at: string;
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

function isMessageUnreadForReader(
  message: Pick<AdminConversationMessageStatRow, "created_at" | "message_sequence">,
  readSequence?: number | null,
  readAt?: string | null
) {
  if (typeof readSequence === "number" && Number.isFinite(readSequence) && typeof message.message_sequence === "number") {
    return message.message_sequence > readSequence;
  }

  if (readAt) {
    return message.created_at > readAt;
  }

  return true;
}

function getConversationCursor(conversation: ConversationRow): AdminChatConversationCursor {
  return {
    lastMessageAt: conversation.last_message_at || conversation.updated_at || conversation.created_at,
    id: conversation.id,
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

async function fetchConversationMessageStats(
  supabase: ReturnType<typeof getServiceSupabase>,
  conversations: ConversationRow[]
) {
  const conversationIds = uniqueIds(conversations.map((conversation) => conversation.id));
  if (!conversationIds.length) {
    return new Map<string, AdminConversationMessageStats>();
  }

  const conversationById = new Map(conversations.map((conversation) => [conversation.id, conversation]));
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

  const { data, error } = await supabase
    .from("chat_conversation_messages")
    .select("conversation_id, receiver_id, message_sequence, created_at")
    .in("conversation_id", conversationIds);

  if (error) {
    throw new Error(error.message || "Failed to count chat messages.");
  }

  ((data as AdminConversationMessageStatRow[] | null) || []).forEach((message) => {
    const conversation = conversationById.get(message.conversation_id);
    const stats = statsByConversationId.get(message.conversation_id);
    if (!conversation || !stats) {
      return;
    }

    stats.messageCount += 1;

    if (message.receiver_id === conversation.owner_user_id) {
      if (isMessageUnreadForReader(message, conversation.owner_last_read_sequence, conversation.owner_last_read_at)) {
        stats.ownerUnreadCount += 1;
      }
    }

    if (message.receiver_id === conversation.broker_user_id) {
      if (isMessageUnreadForReader(message, conversation.broker_last_read_sequence, conversation.broker_last_read_at)) {
        stats.brokerUnreadCount += 1;
      }
    }
  });

  return statsByConversationId;
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
  const auth = await requireAdmin(request);
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

  const [countResult, conversationsResult] = await Promise.all([countQuery, pageQuery]);
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
  const participants = await fetchAdminChatParticipants(
    supabase,
    rawPageConversations.flatMap((conversation) => [conversation.owner_user_id, conversation.broker_user_id])
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
      withNoStore()
    );
    return response;
  }

  const listingIds = uniqueIds(conversations.map((conversation) => conversation.listing_id));
  const conversationByLastMessageId = new Map(
    conversations.flatMap((conversation) => (conversation.last_message_id ? [[conversation.last_message_id, conversation] as const] : []))
  );
  const lastMessageIds = Array.from(conversationByLastMessageId.keys());

  const [listingRowsResult, lastMessageRowsResult, messageStatsByConversationId] = await Promise.all([
    supabase.from("listings").select(LISTING_SELECT).in("id", listingIds),
    lastMessageIds.length
      ? supabase.from("chat_conversation_messages").select(CHAT_MESSAGE_SELECT).in("id", lastMessageIds)
      : Promise.resolve({ data: [] as Array<Omit<ChatMessage, "listing_id">> }),
    fetchConversationMessageStats(supabase, conversations),
  ]);

  const listings = await hydrateListings(supabase, (listingRowsResult.data as Listing[] | null) || [], {
    includeAgencies: false,
    includeCommissionTerms: false,
    includeOwnerActiveCount: false,
    includeOwners: false,
  });
  const listingMap = new Map(listings.map((listing) => [listing.id, listing]));
  const hydratedLastMessages = await hydrateMessages(
    supabase,
    ((lastMessageRowsResult.data as Array<Omit<ChatMessage, "listing_id">> | null) || []).flatMap((message) => {
      const conversation = conversationByLastMessageId.get(message.id);
      return conversation ? [{ ...message, listing_id: conversation.listing_id }] : [];
    })
  );
  const lastMessageByConversationId = new Map(hydratedLastMessages.map((message) => [message.conversation_id || "", message]));

  const grouped = new Map<string, AdminChatPage["chats"][number]>();

  conversations.forEach((conversation) => {
    const listing = listingMap.get(conversation.listing_id);
    if (!listing) {
      return;
    }

    const group = grouped.get(conversation.listing_id) || {
      listing: {
        id: listing.id,
        title: listing.title,
        status: listing.status,
        price: listing.price,
        is_visible: listing.is_visible,
        deleted_at: listing.deleted_at || null,
        area: listing.area ? { name: listing.area.name, city: listing.area.city } : null,
        listing_images: listing.listing_images || [],
      },
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
    withNoStore()
  );
  return response;
}
