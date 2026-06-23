import { NextRequest, NextResponse } from "next/server";
import { getServiceSupabase, jsonError, requireApprovedBroker } from "@/lib/deal-server";
import { fetchChatUserSummaries } from "@/lib/platform-server-data";
import { isActiveListingStatus } from "@/lib/deal-utils";
import { triggerNewMessageEmail } from "@/lib/email-notifications";
import type { ChatMessage, ChatUserSummary, Listing } from "@/lib/deal-types";

const DEFAULT_MESSAGE_LIMIT = 20;
const MAX_MESSAGE_LIMIT = 100;

type ConversationRecord = {
  id: string;
  listing_id: string;
  owner_user_id: string;
  broker_user_id: string;
  created_at: string;
  updated_at: string;
  last_message_at: string;
  last_message_sequence?: number | null;
  owner_last_read_at: string | null;
  broker_last_read_at: string | null;
  owner_last_read_sequence?: number | null;
  broker_last_read_sequence?: number | null;
};

type ListingChatContext = {
  listing: Pick<Listing, "id" | "title" | "status" | "is_visible" | "created_by" | "deleted_at">;
  owner: ChatUserSummary | null;
};

type ChatMessageCursor = {
  sequence?: number | null;
  createdAt?: string;
  id: string;
};

type SendListingChatMessageRpcRow = {
  conversation_id: string;
  message_id: string;
  message_created_at: string;
  message_updated_at: string;
  receiver_id: string | null;
  client_message_id: string | null;
  message_sequence: number;
};

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function getBoundedLimit(value: string | null, fallback: number, max: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }

  return Math.min(Math.floor(parsed), max);
}

function parseMessageCursor(value: string | null): ChatMessageCursor | null {
  if (!value) {
    return null;
  }

  try {
    const parsed = JSON.parse(value) as Partial<ChatMessageCursor>;
    if (typeof parsed.id === "string" && parsed.id) {
      if (typeof parsed.sequence === "number" && Number.isFinite(parsed.sequence)) {
        return { sequence: parsed.sequence, createdAt: parsed.createdAt, id: parsed.id };
      }

      if (typeof parsed.createdAt === "string" && parsed.createdAt) {
        return { createdAt: parsed.createdAt, id: parsed.id };
      }
    }
  } catch {
    return null;
  }

  return null;
}

function parseClientMessageId(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();
  return UUID_PATTERN.test(normalized) ? normalized : null;
}

async function markConversationRead(
  supabase: ReturnType<typeof getServiceSupabase>,
  conversation: ConversationRecord,
  userId: string,
  readUntilSequence?: number | null,
) {
  const { error } = await supabase.rpc("mark_chat_conversation_read", {
    p_conversation_id: conversation.id,
    p_reader_id: userId,
    p_read_until_sequence: readUntilSequence ?? null,
    p_read_at: null,
  });

  if (error) {
    throw new Error(error.message || "Failed to update conversation read state.");
  }
}

async function hydrateConversationMessages(
  supabase: ReturnType<typeof getServiceSupabase>,
  conversation: ConversationRecord,
  listing: Pick<Listing, "id">,
  options: { messageLimit?: number; messageCursor?: ChatMessageCursor | null } = {},
) {
  let messageQuery = supabase
    .from("chat_conversation_messages")
    .select("id, conversation_id, sender_id, receiver_id, client_message_id, message_sequence, content, created_at, updated_at")
    .eq("conversation_id", conversation.id)
    .order("message_sequence", { ascending: false })
    .order("created_at", { ascending: false })
    .order("id", { ascending: false });

  if (typeof options.messageCursor?.sequence === "number" && options.messageCursor.id) {
    messageQuery = messageQuery.or(
      `message_sequence.lt.${options.messageCursor.sequence},and(message_sequence.eq.${options.messageCursor.sequence},id.lt.${options.messageCursor.id})`
    );
  } else if (options.messageCursor?.createdAt && options.messageCursor.id) {
    messageQuery = messageQuery.or(
      `created_at.lt.${options.messageCursor.createdAt},and(created_at.eq.${options.messageCursor.createdAt},id.lt.${options.messageCursor.id})`
    );
  }

  const messageLimit =
    typeof options.messageLimit === "number" && Number.isFinite(options.messageLimit) && options.messageLimit > 0
      ? Math.floor(options.messageLimit)
      : null;

  if (messageLimit) {
    messageQuery = messageQuery.limit(messageLimit + 1);
  }

  const { data: messageRows } = await messageQuery;
  const fetchedMessageRows = ((messageRows || []) as Array<Omit<ChatMessage, "listing_id">>);
  const hasMoreMessages = Boolean(messageLimit && fetchedMessageRows.length > messageLimit);
  const pageMessageRows = messageLimit ? fetchedMessageRows.slice(0, messageLimit) : fetchedMessageRows;
  const sortedMessageRows = [...pageMessageRows].reverse();
  const oldestMessage = sortedMessageRows[0] || null;

  const senderIds = Array.from(new Set(sortedMessageRows.map((message) => message.sender_id)));
  const senders = await fetchChatUserSummaries(supabase, senderIds);
  const senderMap = new Map(senders.map((sender) => [sender.id, sender]));

  return {
    messages: sortedMessageRows.map((message) => ({
      ...message,
      listing_id: listing.id,
      sender: senderMap.get(message.sender_id) || null,
    })),
    hasMoreMessages,
    messagesNextCursor:
      hasMoreMessages && oldestMessage
        ? {
            sequence: oldestMessage.message_sequence ?? null,
            createdAt: oldestMessage.created_at,
            id: oldestMessage.id,
          }
        : null,
  };
}

async function getListingChatContext(
  supabase: ReturnType<typeof getServiceSupabase>,
  listingId: string,
  brokerUserId: string,
) {
  const { data: listing } = await supabase
    .from("listings")
    .select("id, title, status, is_visible, created_by, deleted_at")
    .eq("id", listingId)
    .maybeSingle();

  if (!listing) {
    return { error: jsonError("Listing not found.", 404) } as const;
  }

  if (listing.created_by === brokerUserId) {
    return { error: jsonError("Use the inbox to open private conversations for your own listing.", 400) } as const;
  }

  if (listing.deleted_at || !listing.is_visible || !isActiveListingStatus(listing.status)) {
    return { error: jsonError("Listing chat is unavailable.", 404) } as const;
  }

  const [owner] = await fetchChatUserSummaries(supabase, [listing.created_by]);

  return {
    context: {
      listing,
      owner: owner || null,
    } satisfies ListingChatContext,
  } as const;
}

async function findConversation(
  supabase: ReturnType<typeof getServiceSupabase>,
  listingId: string,
  brokerUserId: string,
) {
  const { data: conversation, error } = await supabase
    .from("chat_conversations")
    .select("id, listing_id, owner_user_id, broker_user_id, created_at, updated_at, last_message_at, last_message_sequence, owner_last_read_at, broker_last_read_at, owner_last_read_sequence, broker_last_read_sequence")
    .eq("listing_id", listingId)
    .eq("broker_user_id", brokerUserId)
    .maybeSingle();

  if (error) {
    return { error: jsonError(error.message || "Failed to load conversation.", 500) } as const;
  }

  return { conversation: (conversation as ConversationRecord | null) || null } as const;
}

export async function GET(request: NextRequest, { params }: { params: { listingId: string } }) {
  const auth = await requireApprovedBroker(request);
  if ("error" in auth) return auth.error;

  const supabase = getServiceSupabase();
  const contextResult = await getListingChatContext(supabase, params.listingId, auth.user.id);
  if ("error" in contextResult) return contextResult.error;

  const { context } = contextResult;
  const conversationResult = await findConversation(supabase, params.listingId, auth.user.id);
  if ("error" in conversationResult) return conversationResult.error;

  const conversation = conversationResult.conversation;
  const searchParams = request.nextUrl.searchParams;
  const messageCursor = parseMessageCursor(searchParams.get("cursor"));
  const messageLimit = getBoundedLimit(searchParams.get("limit"), DEFAULT_MESSAGE_LIMIT, MAX_MESSAGE_LIMIT);
  const messagePage = conversation
    ? await hydrateConversationMessages(supabase, conversation, context.listing, {
        messageCursor,
        messageLimit,
      })
    : { messages: [], hasMoreMessages: false, messagesNextCursor: null };
  if (conversation) {
    if (!messageCursor) {
      await markConversationRead(
        supabase,
        conversation,
        auth.user.id,
        messagePage.messages[messagePage.messages.length - 1]?.message_sequence ?? conversation.last_message_sequence ?? null
      );
    }
  }

  return NextResponse.json({
    conversationId: conversation?.id || null,
    listing: {
      id: context.listing.id,
      title: context.listing.title,
      status: context.listing.status,
      is_visible: context.listing.is_visible,
      canPost: true,
      isOwner: false,
      isActive: isActiveListingStatus(context.listing.status),
      isAvailable: true,
    },
    participant: context.owner,
    messages: messagePage.messages,
    messagesHasMore: messagePage.hasMoreMessages,
    messagesNextCursor: messagePage.messagesNextCursor,
  });
}

export async function POST(request: NextRequest, { params }: { params: { listingId: string } }) {
  const auth = await requireApprovedBroker(request);
  if ("error" in auth) return auth.error;

  const body = await request.json();
  const content = String(body.content || "").trim();
  const clientMessageId = parseClientMessageId(body.clientMessageId || body.client_message_id);

  if (!content) {
    return jsonError("Message content is required.", 400);
  }

  const supabase = getServiceSupabase();
  const contextResult = await getListingChatContext(supabase, params.listingId, auth.user.id);
  if ("error" in contextResult) return contextResult.error;

  const { context } = contextResult;
  const { data, error } = await supabase.rpc("send_listing_chat_message", {
    p_listing_id: params.listingId,
    p_owner_user_id: context.listing.created_by,
    p_broker_user_id: auth.user.id,
    p_sender_id: auth.user.id,
    p_content: content,
    p_client_message_id: clientMessageId,
  });
  const [sentMessage] = (data || []) as SendListingChatMessageRpcRow[];

  if (error || !sentMessage) {
    return jsonError(error?.message || "Failed to send message.", 500);
  }

  // Email trigger: notify only the receiving broker, with conversation-level throttling.
  await triggerNewMessageEmail({
    conversationId: sentMessage.conversation_id,
    messageId: sentMessage.message_id,
    senderId: auth.user.id,
    receiverId: sentMessage.receiver_id || context.listing.created_by,
    listingId: params.listingId,
    listingTitle: context.listing.title,
  });

  return NextResponse.json({
    success: true,
    conversationId: sentMessage.conversation_id,
    messageId: sentMessage.message_id,
    createdAt: sentMessage.message_created_at,
    updatedAt: sentMessage.message_updated_at,
    message: {
      id: sentMessage.message_id,
      conversation_id: sentMessage.conversation_id,
      sender_id: auth.user.id,
      client_message_id: sentMessage.client_message_id,
      message_sequence: sentMessage.message_sequence,
      content,
      created_at: sentMessage.message_created_at,
      updated_at: sentMessage.message_updated_at,
      receiver_id: sentMessage.receiver_id || context.listing.created_by,
      body: content,
    },
  });
}
