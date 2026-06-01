import { NextRequest, NextResponse } from "next/server";
import { getServiceSupabase, jsonError, requireApprovedBroker } from "@/lib/deal-server";
import {
  fetchBrokerChatSummariesPage,
  type BrokerChatConversationCursor,
  type BrokerChatConversationFilter,
} from "@/lib/platform-server-data";

const DEFAULT_CONVERSATION_LIMIT = 10;
const MAX_CONVERSATION_LIMIT = 50;
const DEFAULT_SUMMARY_MESSAGE_LIMIT = 20;

function getBoundedLimit(value: string | null, fallback: number, max: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }

  return Math.min(Math.floor(parsed), max);
}

function parseConversationCursor(value: string | null): BrokerChatConversationCursor | null {
  if (!value) {
    return null;
  }

  try {
    const parsed = JSON.parse(value) as Partial<BrokerChatConversationCursor>;
    if (typeof parsed.lastSequence === "number" && Number.isFinite(parsed.lastSequence) && typeof parsed.id === "string" && parsed.id) {
      return { lastSequence: parsed.lastSequence, id: parsed.id };
    }
  } catch {
    return null;
  }

  return null;
}

function parseConversationFilter(value: string | null): BrokerChatConversationFilter {
  return value === "unread" || value === "all" ? value : "recent";
}

export async function GET(request: NextRequest) {
  const auth = await requireApprovedBroker(request);
  if ("error" in auth) return auth.error;

  const supabase = getServiceSupabase();
  const searchParams = request.nextUrl.searchParams;
  const limit = getBoundedLimit(searchParams.get("limit"), DEFAULT_CONVERSATION_LIMIT, MAX_CONVERSATION_LIMIT);
  const cursor = parseConversationCursor(searchParams.get("cursor"));
  const filter = parseConversationFilter(searchParams.get("filter"));

  try {
    const page = await fetchBrokerChatSummariesPage(supabase, auth.user.id, {
      includeMessages: true,
      includeRequirementContext: true,
      filter,
      limit,
      cursor,
      messageLimit: DEFAULT_SUMMARY_MESSAGE_LIMIT,
    });
    return NextResponse.json(page);
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Failed to fetch conversations.", 500);
  }
}
