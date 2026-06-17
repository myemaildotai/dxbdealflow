import { NextRequest, NextResponse } from "next/server";
import { getServiceSupabase, jsonError, requireApprovedBroker } from "@/lib/deal-server";
import { fetchChatUserSummaries, hydrateMessages } from "@/lib/platform-server-data";
import { isActiveListingStatus } from "@/lib/deal-utils";
import { triggerNewMessageEmail } from "@/lib/email-notifications";
import type { ChatMessage, Listing } from "@/lib/deal-types";

const DEFAULT_MESSAGE_LIMIT = 20;
const MAX_MESSAGE_LIMIT = 100;

type ConversationRow = {
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

type ChatMessageCursor = {
  sequence?: number | null;
  createdAt?: string;
  id: string;
};

type SendConversationMessageRpcRow = {
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

function parsePositiveInteger(value: string | null) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? Math.floor(parsed) : null;
}

async function getConversationRow(
  supabase: ReturnType<typeof getServiceSupabase>,
  conversationId: string,
) {
  const { data: conversation } = await supabase
    .from("chat_conversations")
    .select("id, listing_id, owner_user_id, broker_user_id, created_at, updated_at, last_message_at, last_message_sequence, owner_last_read_at, broker_last_read_at, owner_last_read_sequence, broker_last_read_sequence")
    .eq("id", conversationId)
    .maybeSingle();

  return (conversation as ConversationRow | null) || null;
}

async function markConversationRead(
  supabase: ReturnType<typeof getServiceSupabase>,
  conversation: ConversationRow,
  userId: string,
  readUntilSequence?: number | null,
  readAt?: string | null,
) {
  const { error } = await supabase.rpc("mark_chat_conversation_read", {
    p_conversation_id: conversation.id,
    p_reader_id: userId,
    p_read_until_sequence: readUntilSequence ?? null,
    p_read_at: readAt ?? null,
  });

  if (error) {
    throw new Error(error.message || "Failed to update conversation read state.");
  }
}

async function getConversationBundle(
  supabase: ReturnType<typeof getServiceSupabase>,
  conversationId: string,
  userId: string,
  options: { messageLimit?: number; messageCursor?: ChatMessageCursor | null; sinceSequence?: number | null } = {},
) {
  const row = await getConversationRow(supabase, conversationId);
  if (!row) {
    return { error: jsonError("Conversation not found.", 404) } as const;
  }

  if (row.owner_user_id !== userId && row.broker_user_id !== userId) {
    return { error: jsonError("You cannot access this conversation.", 403) } as const;
  }

  const participantId = row.owner_user_id === userId ? row.broker_user_id : row.owner_user_id;
  const isSinceSequenceQuery = typeof options.sinceSequence === "number" && Number.isFinite(options.sinceSequence);
  let messageQuery = supabase
    .from("chat_conversation_messages")
    .select("id, conversation_id, sender_id, receiver_id, client_message_id, message_sequence, content, created_at, updated_at")
    .eq("conversation_id", conversationId);

  if (isSinceSequenceQuery) {
    messageQuery = messageQuery
      .gt("message_sequence", options.sinceSequence as number)
      .order("message_sequence", { ascending: true })
      .order("created_at", { ascending: true })
      .order("id", { ascending: true });
  } else {
    messageQuery = messageQuery
      .order("message_sequence", { ascending: false })
      .order("created_at", { ascending: false })
      .order("id", { ascending: false });
  }

  if (!isSinceSequenceQuery && typeof options.messageCursor?.sequence === "number" && options.messageCursor.id) {
    messageQuery = messageQuery.or(
      `message_sequence.lt.${options.messageCursor.sequence},and(message_sequence.eq.${options.messageCursor.sequence},id.lt.${options.messageCursor.id})`
    );
  } else if (!isSinceSequenceQuery && options.messageCursor?.createdAt && options.messageCursor.id) {
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

  const [listingRows, messageRows, participants] = await Promise.all([
    supabase
      .from("listings")
      .select("id, title, status, is_visible, deleted_at")
      .eq("id", row.listing_id),
    messageQuery,
    fetchChatUserSummaries(supabase, [participantId]),
  ]);

  const [listing] = (listingRows.data as Pick<Listing, "id" | "title" | "status" | "is_visible" | "deleted_at">[] | null) || [];
  const fetchedMessageRows = (messageRows.data as Array<Omit<ChatMessage, "listing_id">> | null) || [];
  const hasMoreMessages = Boolean(messageLimit && fetchedMessageRows.length > messageLimit);
  const pageMessageRows = messageLimit ? fetchedMessageRows.slice(0, messageLimit) : fetchedMessageRows;
  const sortedMessageRows = isSinceSequenceQuery ? pageMessageRows : [...pageMessageRows].reverse();
  const oldestMessage = sortedMessageRows[0] || null;

  const messages = await hydrateMessages(
    supabase,
    sortedMessageRows.map((message) => ({
      ...message,
      listing_id: row.listing_id,
    }))
  );

  return {
    conversation: row,
    listing,
    participant: participants[0] || null,
    messages,
    hasMoreMessages,
    messagesNextCursor:
      !isSinceSequenceQuery && hasMoreMessages && oldestMessage
        ? {
            sequence: oldestMessage.message_sequence ?? null,
            createdAt: oldestMessage.created_at,
            id: oldestMessage.id,
          }
        : null,
  } as const;
}

async function getConversationPostingContext(
  supabase: ReturnType<typeof getServiceSupabase>,
  conversationId: string,
  userId: string,
) {
  const row = await getConversationRow(supabase, conversationId);
  if (!row) {
    return { error: jsonError("Conversation not found.", 404) } as const;
  }

  if (row.owner_user_id !== userId && row.broker_user_id !== userId) {
    return { error: jsonError("You cannot access this conversation.", 403) } as const;
  }

  const { data: listing } = await supabase
    .from("listings")
    .select("id, status, is_visible, deleted_at")
    .eq("id", row.listing_id)
    .maybeSingle();

  return {
    conversation: row,
    listing: (listing as Pick<Listing, "id" | "status" | "is_visible" | "deleted_at"> | null) || null,
  } as const;
}

export async function GET(request: NextRequest, { params }: { params: { conversationId: string } }) {
  const auth = await requireApprovedBroker(request);
  if ("error" in auth) return auth.error;

  const supabase = getServiceSupabase();
  const searchParams = request.nextUrl.searchParams;
  const messageCursor = parseMessageCursor(searchParams.get("cursor"));
  const messageLimit = getBoundedLimit(searchParams.get("limit"), DEFAULT_MESSAGE_LIMIT, MAX_MESSAGE_LIMIT);
  const sinceSequence = parsePositiveInteger(searchParams.get("sinceSequence"));
  const bundle = await getConversationBundle(supabase, params.conversationId, auth.user.id, {
    messageCursor,
    messageLimit: sinceSequence !== null ? MAX_MESSAGE_LIMIT : messageLimit,
    sinceSequence,
  });
  if ("error" in bundle) return bundle.error;

  if (sinceSequence !== null) {
    return NextResponse.json({
      conversationId: bundle.conversation.id,
      listing: {
        id: bundle.listing?.id || bundle.conversation.listing_id,
        title: bundle.listing?.title || "Unavailable listing",
        status: bundle.listing?.status || "inactive",
        is_visible: bundle.listing?.is_visible || false,
        canPost: !!bundle.listing && !bundle.listing.deleted_at && bundle.listing.is_visible && isActiveListingStatus(bundle.listing.status),
        isOwner: bundle.conversation.owner_user_id === auth.user.id,
        isActive: !!bundle.listing && isActiveListingStatus(bundle.listing.status),
        isAvailable: !!bundle.listing && !bundle.listing.deleted_at,
      },
      participant: bundle.participant,
      messages: bundle.messages,
      messagesHasMore: false,
      messagesNextCursor: null,
    });
  }

  if (!messageCursor) {
    await markConversationRead(
      supabase,
      bundle.conversation,
      auth.user.id,
      bundle.messages[bundle.messages.length - 1]?.message_sequence ?? bundle.conversation.last_message_sequence ?? null
    );
  }

  const isAvailable = !!bundle.listing && !bundle.listing.deleted_at;
  const canPost = isAvailable && bundle.listing.is_visible && isActiveListingStatus(bundle.listing.status);

  return NextResponse.json({
    conversationId: bundle.conversation.id,
    listing: {
      id: bundle.listing?.id || bundle.conversation.listing_id,
      title: bundle.listing?.title || "Unavailable listing",
      status: bundle.listing?.status || "inactive",
      is_visible: bundle.listing?.is_visible || false,
      canPost,
      isOwner: bundle.conversation.owner_user_id === auth.user.id,
      isActive: !!bundle.listing && isActiveListingStatus(bundle.listing.status),
      isAvailable,
    },
    participant: bundle.participant,
    messages: bundle.messages,
    messagesHasMore: bundle.hasMoreMessages,
    messagesNextCursor: bundle.messagesNextCursor,
  });
}

export async function POST(request: NextRequest, { params }: { params: { conversationId: string } }) {
  const auth = await requireApprovedBroker(request);
  if ("error" in auth) return auth.error;

  const body = await request.json();
  const content = String(body.content || "").trim();
  const clientMessageId = parseClientMessageId(body.clientMessageId || body.client_message_id);

  if (!content) {
    return jsonError("Message content is required.", 400);
  }

  const supabase = getServiceSupabase();
  const context = await getConversationPostingContext(supabase, params.conversationId, auth.user.id);
  if ("error" in context) return context.error;
  if (!context.listing || context.listing.deleted_at || !context.listing.is_visible || !isActiveListingStatus(context.listing.status)) {
    return jsonError("This listing is no longer active. Messaging is disabled.", 403);
  }

  const { data, error } = await supabase.rpc("send_chat_conversation_message", {
    p_conversation_id: params.conversationId,
    p_sender_id: auth.user.id,
    p_content: content,
    p_client_message_id: clientMessageId,
  });
  const [sentMessage] = (data || []) as SendConversationMessageRpcRow[];

  if (error || !sentMessage) {
    return jsonError(error?.message || "Failed to send message.", 500);
  }

  const receiverId = context.conversation.owner_user_id === auth.user.id ? context.conversation.broker_user_id : context.conversation.owner_user_id;

  // Email trigger: notify only the receiving broker, with conversation-level throttling.
  await triggerNewMessageEmail({
    conversationId: sentMessage.conversation_id,
    messageId: sentMessage.message_id,
    senderId: auth.user.id,
    receiverId: sentMessage.receiver_id || receiverId,
    listingId: context.conversation.listing_id,
  });

  return NextResponse.json({
    success: true,
    messageId: sentMessage.message_id,
    createdAt: sentMessage.message_created_at,
    updatedAt: sentMessage.message_updated_at,
    message: {
      id: sentMessage.message_id,
      conversation_id: sentMessage.conversation_id,
      sender_id: auth.user.id,
      receiver_id: sentMessage.receiver_id || receiverId,
      client_message_id: sentMessage.client_message_id,
      message_sequence: sentMessage.message_sequence,
      content,
      created_at: sentMessage.message_created_at,
      updated_at: sentMessage.message_updated_at,
      body: content,
    },
  });
}

export async function PATCH(request: NextRequest, { params }: { params: { conversationId: string } }) {
  const auth = await requireApprovedBroker(request);
  if ("error" in auth) return auth.error;

  const body = await request.json().catch(() => ({}));
  if (body.action !== "mark_read") {
    return jsonError("Unsupported chat action.", 400);
  }

  const supabase = getServiceSupabase();
  const conversation = await getConversationRow(supabase, params.conversationId);

  if (!conversation) {
    return jsonError("Conversation not found.", 404);
  }

  if (conversation.owner_user_id !== auth.user.id && conversation.broker_user_id !== auth.user.id) {
    return jsonError("You cannot access this conversation.", 403);
  }

  await markConversationRead(
    supabase,
    conversation,
    auth.user.id,
    typeof body.readUntilSequence === "number" && Number.isFinite(body.readUntilSequence) ? Math.floor(body.readUntilSequence) : null,
    typeof body.readAt === "string" && body.readAt.trim() ? body.readAt.trim() : null
  );

  return NextResponse.json({ success: true });
}
