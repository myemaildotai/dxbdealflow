import { NextRequest, NextResponse } from "next/server";
import { getServiceSupabase, jsonError, requireAdmin, withNoStore } from "@/lib/deal-server";
import { hydrateMessages } from "@/lib/platform-server-data";
import type { AdminChatMessageCursor, AdminChatMessagesPage, ChatMessage } from "@/lib/deal-types";

const DEFAULT_MESSAGE_LIMIT = 30;
const MAX_MESSAGE_LIMIT = 100;
const CHAT_MESSAGE_SELECT =
  "id, conversation_id, sender_id, receiver_id, client_message_id, message_sequence, content, created_at, updated_at";

type ConversationRow = {
  id: string;
  listing_id: string;
};

function getBoundedLimit(value: string | null, fallback: number, max: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }

  return Math.min(Math.floor(parsed), max);
}

function parseMessageCursor(value: string | null): AdminChatMessageCursor | null {
  if (!value) {
    return null;
  }

  try {
    const parsed = JSON.parse(value) as Partial<AdminChatMessageCursor>;
    if (typeof parsed.id === "string" && parsed.id && typeof parsed.createdAt === "string" && parsed.createdAt) {
      return {
        sequence: typeof parsed.sequence === "number" && Number.isFinite(parsed.sequence) ? parsed.sequence : null,
        createdAt: parsed.createdAt,
        id: parsed.id,
      };
    }
  } catch {
    return null;
  }

  return null;
}

function getMessageCursor(message: Omit<ChatMessage, "listing_id">): AdminChatMessageCursor {
  return {
    sequence: message.message_sequence ?? null,
    createdAt: message.created_at,
    id: message.id,
  };
}

export async function GET(request: NextRequest, { params }: { params: { conversationId: string } }) {
  const auth = await requireAdmin(request);
  if ("error" in auth) return auth.error;

  const supabase = getServiceSupabase();
  const searchParams = request.nextUrl.searchParams;
  const limit = getBoundedLimit(searchParams.get("limit"), DEFAULT_MESSAGE_LIMIT, MAX_MESSAGE_LIMIT);
  const cursor = parseMessageCursor(searchParams.get("cursor"));

  const { data: conversation } = await supabase
    .from("chat_conversations")
    .select("id, listing_id")
    .eq("id", params.conversationId)
    .maybeSingle();

  const conversationRow = (conversation as ConversationRow | null) || null;
  if (!conversationRow) {
    return jsonError("Conversation not found.", 404);
  }

  let messageQuery = supabase
    .from("chat_conversation_messages")
    .select(CHAT_MESSAGE_SELECT)
    .eq("conversation_id", params.conversationId);

  if (cursor && typeof cursor.sequence === "number" && Number.isFinite(cursor.sequence)) {
    messageQuery = messageQuery.or(`message_sequence.gt.${cursor.sequence},and(message_sequence.eq.${cursor.sequence},id.gt.${cursor.id})`);
  } else if (cursor?.createdAt) {
    messageQuery = messageQuery.or(`created_at.gt.${cursor.createdAt},and(created_at.eq.${cursor.createdAt},id.gt.${cursor.id})`);
  }

  messageQuery = messageQuery
    .order("message_sequence", { ascending: true })
    .order("created_at", { ascending: true })
    .order("id", { ascending: true })
    .limit(limit + 1);

  const { data: messageRows, error } = await messageQuery;
  if (error) {
    throw new Error(error.message || "Failed to fetch chat messages.");
  }

  const fetchedMessages = (messageRows as Array<Omit<ChatMessage, "listing_id">> | null) || [];
  const hasMore = fetchedMessages.length > limit;
  const pageMessages = fetchedMessages.slice(0, limit);
  const hydratedMessages = await hydrateMessages(
    supabase,
    pageMessages.map((message) => ({
      ...message,
      listing_id: conversationRow.listing_id,
    }))
  );

  return NextResponse.json(
    {
      conversationId: conversationRow.id,
      messages: hydratedMessages,
      hasMore,
      nextCursor: hasMore && pageMessages.length ? getMessageCursor(pageMessages[pageMessages.length - 1]) : null,
    } satisfies AdminChatMessagesPage,
    withNoStore()
  );
}
