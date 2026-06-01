import { NextRequest, NextResponse } from "next/server";
import { getServiceSupabase, jsonError, requireApprovedBroker } from "@/lib/deal-server";
import { fetchBrokerChatConversationSummaryPage } from "@/lib/platform-server-data";

const DEFAULT_SUMMARY_MESSAGE_LIMIT = 20;

export async function GET(_request: NextRequest, { params }: { params: { conversationId: string } }) {
  const auth = await requireApprovedBroker(_request);
  if ("error" in auth) return auth.error;

  const supabase = getServiceSupabase();

  try {
    const page = await fetchBrokerChatConversationSummaryPage(supabase, auth.user.id, params.conversationId, {
      includeMessages: true,
      includeRequirementContext: true,
      messageLimit: DEFAULT_SUMMARY_MESSAGE_LIMIT,
    });

    if (!page.groups.length) {
      return jsonError("Conversation not found.", 404);
    }

    return NextResponse.json(page);
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Failed to fetch conversation summary.", 500);
  }
}
