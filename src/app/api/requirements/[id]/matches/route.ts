import { NextRequest, NextResponse } from "next/server";
import { logActivity } from "@/lib/activity-log";
import {
  getRequestUserWithBrokerProfileId,
  getServiceSupabase,
  jsonError,
  REQUIREMENT_MATCH_SELECT,
  REQUIREMENT_SELECT,
  withNoStore,
} from "@/lib/deal-server";
import { isActiveBrokerStatus } from "@/lib/deal-utils";
import { triggerRequirementMatchFoundForSubmittedMatch } from "@/lib/email-notifications";
import { runEmailWorkflowInBackground } from "@/lib/email-service";
import { isListingMatchingRequirement } from "@/lib/requirement-matching";
import { hydrateRequirementMatches } from "@/lib/requirements-server";
import type { Listing, Requirement, RequirementMatch } from "@/lib/deal-types";

const MATCH_SUBMISSION_LISTING_SELECT =
  "id, title, area_id, price, bedrooms, status, deleted_at, created_by, area:areas(id, name, city, slug)";

type SendListingChatMessageRpcRow = {
  conversation_id: string;
  message_id: string;
  message_created_at: string;
  message_updated_at: string;
  receiver_id?: string | null;
  client_message_id?: string | null;
  message_sequence?: number | null;
};

async function resolveRequirementOwnerUserId(
  supabase: ReturnType<typeof getServiceSupabase>,
  requirement: Requirement
) {
  if (requirement.posted_by) {
    return requirement.posted_by;
  }

  const { data: brokerProfile, error } = await supabase
    .from("broker_profiles")
    .select("user_id")
    .eq("id", requirement.broker_id)
    .maybeSingle();

  if (error) {
    throw new Error(error.message || "Failed to resolve requirement owner.");
  }

  return brokerProfile?.user_id || null;
}

function buildSubmissionChatMessage(requirement: Requirement, listing: Listing, customMessage: string) {
  if (customMessage) {
    return customMessage;
  }

  const requirementLabel = requirement.title || (requirement.area ? `your requirement in ${requirement.area}` : "your requirement");
  return `Shared "${listing.title}" for ${requirementLabel}.`;
}

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const { user: viewer, brokerProfileId } = await getRequestUserWithBrokerProfileId(request);
  if (!viewer || (viewer.role !== "admin" && (viewer.role !== "broker" || !isActiveBrokerStatus(viewer.status)))) {
    return jsonError("Broker or admin access required.", 403);
  }

  const supabase = getServiceSupabase();
  const { data: requirement, error: requirementError } = await supabase
    .from("requirements")
    .select(REQUIREMENT_SELECT)
    .eq("id", params.id)
    .maybeSingle();

  if (requirementError) {
    return jsonError(requirementError.message || "Failed to load requirement.", 400);
  }

  if (!requirement) {
    return jsonError("Requirement not found.", 404);
  }

  if (viewer.role === "broker") {
    if (!brokerProfileId) {
      return jsonError("Broker profile not found.", 404);
    }

    if (requirement.broker_id !== brokerProfileId) {
      return jsonError("You can only view matches for your own requirement.", 403);
    }
  }

  const submittedMatchesResult = await supabase
    .from("requirement_matches")
    .select(REQUIREMENT_MATCH_SELECT)
    .eq("requirement_id", params.id)
    .order("created_at", { ascending: false });

  if (submittedMatchesResult.error) {
    return jsonError(submittedMatchesResult.error.message || "Failed to load requirement matches.", 400);
  }

  const matches = await hydrateRequirementMatches(supabase, (submittedMatchesResult.data as RequirementMatch[]) || [], {
    includeListingDetails: false,
    includeRequirement: false,
  });

  return NextResponse.json(
    {
      submittedMatches: matches,
      matches,
    },
    withNoStore()
  );
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const { user: viewer, brokerProfileId } = await getRequestUserWithBrokerProfileId(request);
  if (!viewer || viewer.role !== "broker" || !isActiveBrokerStatus(viewer.status)) {
    return jsonError("Active broker access required.", 403);
  }

  const supabase = getServiceSupabase();
  if (!brokerProfileId) {
    return jsonError("Broker profile not found.", 404);
  }

  const body = await request.json();
  const message = String(body.message || "").trim();
  const listingId = String(body.listingId || "").trim() || null;

  if (!listingId) {
    return jsonError("Please select a listing.", 400);
  }

  const { data: requirement, error: requirementError } = await supabase
    .from("requirements")
    .select(REQUIREMENT_SELECT)
    .eq("id", params.id)
    .maybeSingle();

  if (requirementError) {
    return jsonError(requirementError.message || "Failed to load requirement.", 400);
  }

  if (!requirement || !requirement.is_active || requirement.deleted_at) {
    return jsonError("Requirement not found.", 404);
  }

  if (requirement.broker_id === brokerProfileId) {
    return jsonError("You cannot match your own requirement.", 400);
  }

  const { data: listingRows, error: listingError } = await supabase
    .from("listings")
    .select(MATCH_SUBMISSION_LISTING_SELECT)
    .eq("id", listingId)
    .eq("created_by", viewer.id)
    .is("deleted_at", null)
    .in("status", ["active", "approved"]);

  if (listingError) {
    return jsonError(listingError.message || "Failed to load selected listing.", 400);
  }

  const [listing] = (listingRows as unknown as Listing[]) || [];

  if (!listing) {
    return jsonError("Selected listing was not found in your inventory.", 404);
  }

  if (!isListingMatchingRequirement(requirement as Requirement, listing)) {
    return jsonError("Selected listing no longer matches this requirement.", 400);
  }

  let createdMatchId: string | null = null;

  try {
    const requirementOwnerUserId = await resolveRequirementOwnerUserId(supabase, requirement as Requirement);

    if (!requirementOwnerUserId) {
      return jsonError("Requirement owner is unavailable for chat.", 400);
    }

    const { data: matchSubmission, error: matchError } = await supabase
      .from("requirement_matches")
      .insert({
        requirement_id: params.id,
        sender_broker_id: brokerProfileId,
        receiver_broker_id: requirement.broker_id,
        message,
        listing_id: listingId,
        status: "new",
      })
      .select("id")
      .single();

    if (matchError || !matchSubmission) {
      return jsonError(matchError?.message || "Failed to submit match.", 400);
    }

    createdMatchId = matchSubmission.id;

    const chatContent = buildSubmissionChatMessage(requirement as Requirement, listing, message);
    const { data: sentRows, error: conversationMessageError } = await supabase.rpc("send_listing_chat_message", {
      p_listing_id: listingId,
      p_owner_user_id: listing.created_by,
      p_broker_user_id: requirementOwnerUserId,
      p_sender_id: viewer.id,
      p_content: chatContent,
      p_client_message_id: null,
    });
    const [sentMessage] = (sentRows || []) as SendListingChatMessageRpcRow[];

    if (conversationMessageError || !sentMessage) {
      throw new Error(conversationMessageError?.message || "Failed to create the conversation message.");
    }

    await logActivity(supabase, viewer.id, "requirement_match_submitted", "requirement_matches", createdMatchId, {
      requirementId: params.id,
      requirementTitle: requirement.title || null,
      listingId,
      listingTitle: listing.title,
      matchId: createdMatchId,
      message: message || null,
      status: "new",
    });

    // Email trigger: requirement owner receives the matched listing summary.
    const emailWorkflow = triggerRequirementMatchFoundForSubmittedMatch({
      requirementId: params.id,
      listingId,
      requirementMatchId: createdMatchId,
    });
    runEmailWorkflowInBackground(emailWorkflow, "requirement-match-submitted-email");

    return NextResponse.json(
      {
        success: true,
        matchId: createdMatchId,
        conversationId: sentMessage.conversation_id,
        message: "Match submitted.",
      },
      withNoStore()
    );
  } catch (error) {
    if (createdMatchId) {
      await supabase.from("requirement_matches").delete().eq("id", createdMatchId);
    }

    return jsonError(error instanceof Error ? error.message : "Failed to submit match.", 500);
  }
}
