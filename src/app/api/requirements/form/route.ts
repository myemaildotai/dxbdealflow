import { NextRequest, NextResponse } from "next/server";
import {
  getRequestSupabase,
  getRequestUser,
  jsonError,
  REQUIREMENT_SELECT,
  withNoStore,
} from "@/lib/deal-server";
import { isActiveBrokerStatus } from "@/lib/deal-utils";
import {
  fetchBrokerProfileByUserId,
  fetchRequirementFilterAreas,
} from "@/lib/requirements-server";
import type { Requirement } from "@/lib/deal-types";

export async function GET(request: NextRequest) {
  const viewer = await getRequestUser(request);
  if (!viewer || viewer.role !== "broker" || !isActiveBrokerStatus(viewer.status)) {
    return jsonError("Active broker access required.", 403);
  }

  const supabase = getRequestSupabase(request);
  const brokerProfile = await fetchBrokerProfileByUserId(supabase, viewer.id);
  if (!brokerProfile?.id) {
    return jsonError("Broker profile not found.", 404);
  }

  const editId = request.nextUrl.searchParams.get("id")?.trim() || "";
  const [areas, requirementResult] = await Promise.all([
    fetchRequirementFilterAreas(supabase),
    editId
      ? supabase
          .from("requirements")
          .select(REQUIREMENT_SELECT)
          .eq("id", editId)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
  ]);

  if (requirementResult.error) {
    return jsonError(requirementResult.error.message || "Failed to load requirement.", 400);
  }

  const requirement = (requirementResult.data as Requirement | null) || null;

  if (editId && !requirement) {
    return jsonError("Requirement not found.", 404);
  }

  if (requirement && requirement.broker_id !== brokerProfile.id) {
    return jsonError("You can only edit your own requirement.", 403);
  }

  return NextResponse.json(
    {
      areas,
      brokerProfileId: brokerProfile.id,
      brokerStatus: viewer.status,
      requirement,
    },
    withNoStore()
  );
}
