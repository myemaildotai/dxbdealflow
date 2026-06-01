import { NextRequest, NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getServiceSupabase, LEAD_SELECT, LISTING_SELECT, REQUIREMENT_SELECT, jsonError, requireAdmin } from "@/lib/deal-server";
import { fetchUserBundle, hydrateActivityLogs, hydrateAdminEnquiries, hydrateListings } from "@/lib/platform-server-data";
import { enrichRequirementsWithSubmissionMeta } from "@/lib/requirements-server";
import type { ActivityLog, AdminBrokerDetail, Area, Lead, Listing, Requirement } from "@/lib/deal-types";

const BROKER_ACTIVITY_SELECT = "id, action, target_table, target_id, created_at, metadata, actor_user_id";
const BROKER_ACTIVITY_LIMIT = 100;
const ACTIVITY_TARGET_ID_CHUNK_SIZE = 40;

type BrokerActivityRow = ActivityLog & { actor_user_id?: string | null };

function uniqueIds(ids: Array<string | null | undefined>) {
  return Array.from(new Set(ids.filter(Boolean))) as string[];
}

function chunkIds(ids: string[]) {
  const chunks: string[][] = [];
  for (let index = 0; index < ids.length; index += ACTIVITY_TARGET_ID_CHUNK_SIZE) {
    chunks.push(ids.slice(index, index + ACTIVITY_TARGET_ID_CHUNK_SIZE));
  }

  return chunks;
}

function mergeBrokerActivityRows(rowGroups: BrokerActivityRow[][]) {
  const activityMap = new Map<string, BrokerActivityRow>();

  rowGroups.flat().forEach((row) => {
    activityMap.set(row.id, row);
  });

  return Array.from(activityMap.values())
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .slice(0, BROKER_ACTIVITY_LIMIT);
}

async function fetchBrokerActivityRowsByTargetIds(supabase: SupabaseClient, targetTable: string, targetIds: string[]) {
  const ids = uniqueIds(targetIds);
  if (!ids.length) {
    return [];
  }

  const results = await Promise.all(
    chunkIds(ids).map((targetIdChunk) =>
      supabase
        .from("activity_log")
        .select(BROKER_ACTIVITY_SELECT)
        .eq("target_table", targetTable)
        .in("target_id", targetIdChunk)
        .order("created_at", { ascending: false })
        .limit(BROKER_ACTIVITY_LIMIT)
    )
  );

  return results.flatMap((result) => (result.data || []) as BrokerActivityRow[]);
}

export async function GET(request: NextRequest, { params }: { params: { userId: string } }) {
  const auth = await requireAdmin(request);
  if ("error" in auth) return auth.error;

  const userId = params.userId;
  if (!userId) {
    return jsonError("Broker id is required.", 400);
  }

  try {
    const supabase = getServiceSupabase();
    const bundle = await fetchUserBundle(supabase, userId);

    if (!bundle.user || bundle.user.role !== "broker") {
      return jsonError("Broker not found.", 404);
    }

    const coveredAreaIds = bundle.brokerProfile?.covered_area_ids?.filter(Boolean) || [];

    const brokerProfileId = bundle.brokerProfile?.id || null;

    const [coveredAreasResult, listingsResult, requirementsResult, enquiriesResult] = await Promise.all([
      coveredAreaIds.length
        ? supabase.from("areas").select("id, name, city, slug").in("id", coveredAreaIds)
        : Promise.resolve({ data: [] as Area[] }),
      supabase.from("listings").select(LISTING_SELECT).eq("created_by", userId).order("created_at", { ascending: false }),
      brokerProfileId
        ? supabase
            .from("requirements")
            .select(REQUIREMENT_SELECT)
            .or(`broker_id.eq.${brokerProfileId},posted_by.eq.${userId}`)
            .order("created_at", { ascending: false })
        : supabase.from("requirements").select(REQUIREMENT_SELECT).eq("posted_by", userId).order("created_at", { ascending: false }),
      supabase.from("leads").select(LEAD_SELECT).eq("to_user_id", userId).order("created_at", { ascending: false }),
    ]);

    const listings = await hydrateListings(supabase, (listingsResult.data as Listing[]) || []);
    const requirements = await enrichRequirementsWithSubmissionMeta(supabase, (requirementsResult.data as Requirement[]) || []);
    const enquiries = await hydrateAdminEnquiries(supabase, (enquiriesResult.data as Lead[]) || []);
    const listingIds = uniqueIds(listings.map((listing) => listing.id));
    const requirementIds = uniqueIds(requirements.map((requirement) => requirement.id));
    const leadIds = uniqueIds(enquiries.map((enquiry) => enquiry.id));
    const [incomingRequirementMatchesResult, submittedRequirementMatchesResult] = await Promise.all([
      requirementIds.length
        ? supabase.from("requirement_matches").select("id").in("requirement_id", requirementIds)
        : Promise.resolve({ data: [] as Array<{ id: string }> }),
      brokerProfileId
        ? supabase.from("requirement_matches").select("id").eq("sender_broker_id", brokerProfileId)
        : Promise.resolve({ data: [] as Array<{ id: string }> }),
    ]);
    const requirementMatchIds = uniqueIds([
      ...(((incomingRequirementMatchesResult.data as Array<{ id: string }> | null) || []).map((match) => match.id)),
      ...(((submittedRequirementMatchesResult.data as Array<{ id: string }> | null) || []).map((match) => match.id)),
    ]);
    const [
      actorActivityResult,
      userActivityRows,
      creditActivityRows,
      profileActivityRows,
      listingActivityRows,
      requirementActivityRows,
      requirementMatchActivityRows,
      leadActivityRows,
    ] = await Promise.all([
      supabase
        .from("activity_log")
        .select(BROKER_ACTIVITY_SELECT)
        .eq("actor_user_id", userId)
        .order("created_at", { ascending: false })
        .limit(BROKER_ACTIVITY_LIMIT),
      fetchBrokerActivityRowsByTargetIds(supabase, "users", [userId]),
      fetchBrokerActivityRowsByTargetIds(supabase, "broker_credits", [userId]),
      fetchBrokerActivityRowsByTargetIds(supabase, "broker_profiles", brokerProfileId ? [brokerProfileId] : []),
      fetchBrokerActivityRowsByTargetIds(supabase, "listings", listingIds),
      fetchBrokerActivityRowsByTargetIds(supabase, "requirements", requirementIds),
      fetchBrokerActivityRowsByTargetIds(supabase, "requirement_matches", requirementMatchIds),
      fetchBrokerActivityRowsByTargetIds(supabase, "leads", leadIds),
    ]);

    const activityRows = mergeBrokerActivityRows([
      ((actorActivityResult.data as BrokerActivityRow[] | null) || []),
      userActivityRows,
      creditActivityRows,
      profileActivityRows,
      listingActivityRows,
      requirementActivityRows,
      requirementMatchActivityRows,
      leadActivityRows,
    ]);
    const activity = await hydrateActivityLogs(supabase, activityRows);

    const payload: AdminBrokerDetail = {
      broker: {
        ...bundle.user,
        brokerProfile: bundle.brokerProfile,
        agency: bundle.agency,
        credits: bundle.credits,
        coveredAreas: (coveredAreasResult.data as Area[] | null) || [],
        listings,
        requirements,
        enquiries,
        activity,
      },
    };

    return NextResponse.json(payload);
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Failed to load broker detail.", 500);
  }
}
