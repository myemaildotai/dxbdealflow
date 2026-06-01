import { NextRequest, NextResponse } from "next/server";
import { logActivity } from "@/lib/activity-log";
import { getRequestUser, getServiceSupabase, jsonError, withNoStore } from "@/lib/deal-server";
import { isActiveBrokerStatus } from "@/lib/deal-utils";
import { fetchBrokerProfileByUserId } from "@/lib/requirements-server";
import type { RequirementMatchStatus } from "@/lib/deal-types";

const ALLOWED_STATUSES = new Set<RequirementMatchStatus>(["new", "read", "contacted", "archived"]);

export async function PATCH(request: NextRequest, { params }: { params: { matchId: string } }) {
  const viewer = await getRequestUser(request);
  if (!viewer || (viewer.role !== "admin" && (viewer.role !== "broker" || !isActiveBrokerStatus(viewer.status)))) {
    return jsonError("Broker or admin access required.", 403);
  }

  const supabase = getServiceSupabase();
  const body = await request.json();
  const nextStatus = String(body.status || "").trim() as RequirementMatchStatus;

  if (!ALLOWED_STATUSES.has(nextStatus)) {
    return jsonError("Unsupported match status.", 400);
  }

  const { data: match, error: loadError } = await supabase
    .from("requirement_matches")
    .select("id, requirement_id, receiver_broker_id, sender_broker_id, status")
    .eq("id", params.matchId)
    .maybeSingle();

  if (loadError) {
    return jsonError(loadError.message || "Failed to load match submission.", 400);
  }

  if (!match) {
    return jsonError("Match submission not found.", 404);
  }

  if (viewer.role === "broker") {
    const brokerProfile = await fetchBrokerProfileByUserId(supabase, viewer.id);
    if (!brokerProfile?.id) {
      return jsonError("Broker profile not found.", 404);
    }

    if (match.receiver_broker_id !== brokerProfile.id) {
      return jsonError("You can only update submissions received on your own requirements.", 403);
    }
  }

  const { error: updateError } = await supabase
    .from("requirement_matches")
    .update({
      status: nextStatus,
    })
    .eq("id", params.matchId);

  if (updateError) {
    return jsonError(updateError.message || "Failed to update submission status.", 400);
  }

  if (match.status !== nextStatus) {
    await logActivity(supabase, viewer.id, "requirement_match_status_updated", "requirement_matches", params.matchId, {
      requirementId: match.requirement_id,
      matchId: params.matchId,
      previousStatus: match.status,
      nextStatus,
    });
  }

  if (nextStatus !== "new") {
    const notificationUpdate = {
      is_read: true,
      read_at: new Date().toISOString(),
    };

    let notificationQuery = supabase.from("broker_notifications").update(notificationUpdate).eq("requirement_match_id", params.matchId);
    if (typeof body.notificationId === "string" && body.notificationId.trim()) {
      notificationQuery = notificationQuery.eq("id", body.notificationId.trim());
    }

    await notificationQuery;
  }

  return NextResponse.json({ success: true }, withNoStore());
}
