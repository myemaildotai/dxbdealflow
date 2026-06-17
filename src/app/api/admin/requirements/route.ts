import { NextRequest, NextResponse } from "next/server";
import { getServiceSupabase, jsonError, requireAdmin, withNoStore } from "@/lib/deal-server";
import {
  getAdminPaginationParams,
  getOptionalDateParam,
  getPaginationResponseMeta,
  getSafeIlikePattern,
  getSearchParam,
  toInFilterValue,
  uniqueDefinedIds,
} from "@/lib/admin-api-utils";
import type {
  AdminPaginatedResponse,
  AdminRequirementListCounts,
  AdminRequirementListItem,
  BrokerProfile,
  PlatformUser,
  Requirement,
} from "@/lib/deal-types";
import { getRequirementStatus } from "@/lib/requirements";

type RequirementFilterId = "all" | "active" | "inactive" | "deleted";

const ADMIN_REQUIREMENT_SELECT =
  "id, broker_id, posted_by, title, description, property_type, deal_type, bedrooms, budget_min, budget_max, area, area_id, urgency, timeline, is_active, deactivated_by, deleted_at, created_at, updated_at";

function getRequirementFilter(value: string | null): RequirementFilterId {
  return value === "active" || value === "inactive" || value === "deleted" ? value : "all";
}

type RequirementStatusFilterQuery = {
  eq(column: string, value: string | boolean): RequirementStatusFilterQuery;
  is(column: string, value: null): RequirementStatusFilterQuery;
  not(column: string, operator: string, value: string | null): RequirementStatusFilterQuery;
};

function applyRequirementStatusFilter<T>(query: T, filter: RequirementFilterId): T {
  const filterableQuery = query as unknown as RequirementStatusFilterQuery;

  if (filter === "deleted") {
    return filterableQuery.not("deleted_at", "is", null) as unknown as T;
  }

  let nextQuery = filterableQuery.is("deleted_at", null);

  if (filter === "active") {
    nextQuery = nextQuery.eq("is_active", true);
  } else if (filter === "inactive") {
    nextQuery = nextQuery.eq("is_active", false);
  }

  return nextQuery as unknown as T;
}

async function resolveRequirementSearchContext(
  supabase: ReturnType<typeof getServiceSupabase>,
  pattern: string | null
) {
  if (!pattern) {
    return {
      brokerProfileIds: [] as string[],
      ownerUserIds: [] as string[],
    };
  }

  const { data: ownerRows } = await supabase
    .from("users")
    .select("id")
    .or(`first_name.ilike.${pattern},last_name.ilike.${pattern},email.ilike.${pattern}`);
  const ownerUserIds = uniqueDefinedIds(((ownerRows as Array<Pick<PlatformUser, "id">> | null) || []).map((owner) => owner.id));
  const { data: brokerProfiles } = ownerUserIds.length
    ? await supabase.from("broker_profiles").select("id").in("user_id", ownerUserIds)
    : { data: [] as Array<Pick<BrokerProfile, "id">> };

  return {
    ownerUserIds,
    brokerProfileIds: uniqueDefinedIds(((brokerProfiles as Array<Pick<BrokerProfile, "id">> | null) || []).map((profile) => profile.id)),
  };
}

function buildRequirementSearchOrFilter(
  pattern: string | null,
  {
    brokerProfileIds,
    ownerUserIds,
  }: {
    brokerProfileIds: string[];
    ownerUserIds: string[];
  }
) {
  if (!pattern) {
    return null;
  }

  const clauses = [
    `title.ilike.${pattern}`,
    `description.ilike.${pattern}`,
    `area.ilike.${pattern}`,
    `property_type.ilike.${pattern}`,
    `deal_type.ilike.${pattern}`,
    `bedrooms.ilike.${pattern}`,
    `urgency.ilike.${pattern}`,
    `timeline.ilike.${pattern}`,
  ];

  if (ownerUserIds.length) {
    clauses.push(`posted_by.in.(${toInFilterValue(ownerUserIds)})`);
  }

  if (brokerProfileIds.length) {
    clauses.push(`broker_id.in.(${toInFilterValue(brokerProfileIds)})`);
  }

  return clauses.join(",");
}

async function fetchRequirementCount(
  supabase: ReturnType<typeof getServiceSupabase>,
  {
    endDate,
    filter,
    searchOrFilter,
    startDate,
  }: {
    endDate: string | null;
    filter: RequirementFilterId;
    searchOrFilter: string | null;
    startDate: string | null;
  }
) {
  let query = supabase.from("requirements").select("id", { count: "exact", head: true });
  query = applyRequirementStatusFilter(query, filter);

  if (startDate) {
    query = query.gte("created_at", startDate);
  }

  if (endDate) {
    query = query.lte("created_at", endDate);
  }

  if (searchOrFilter) {
    query = query.or(searchOrFilter);
  }

  const { count, error } = await query;
  if (error) {
    throw new Error(error.message || "Failed to count requirements.");
  }

  return count || 0;
}

async function fetchRequirementRows(
  supabase: ReturnType<typeof getServiceSupabase>,
  {
    endDate,
    filter,
    rangeFrom,
    rangeTo,
    searchOrFilter,
    startDate,
  }: {
    endDate: string | null;
    filter: RequirementFilterId;
    rangeFrom: number;
    rangeTo: number;
    searchOrFilter: string | null;
    startDate: string | null;
  }
) {
  let query = supabase.from("requirements").select(ADMIN_REQUIREMENT_SELECT);
  query = applyRequirementStatusFilter(query, filter);

  if (startDate) {
    query = query.gte("created_at", startDate);
  }

  if (endDate) {
    query = query.lte("created_at", endDate);
  }

  if (searchOrFilter) {
    query = query.or(searchOrFilter);
  }

  const { data, error } = await query.order("created_at", { ascending: false }).range(rangeFrom, rangeTo);
  if (error) {
    throw new Error(error.message || "Failed to load requirements.");
  }

  return (data as Requirement[] | null) || [];
}

async function hydrateRequirementRows(
  supabase: ReturnType<typeof getServiceSupabase>,
  requirements: Requirement[]
) {
  if (!requirements.length) {
    return [] as AdminRequirementListItem[];
  }

  const requirementIds = requirements.map((requirement) => requirement.id);
  const brokerProfileIds = uniqueDefinedIds(requirements.map((requirement) => requirement.broker_id));
  const [brokerProfilesResult, matchRowsResult] = await Promise.all([
    brokerProfileIds.length
      ? supabase.from("broker_profiles").select("id, user_id").in("id", brokerProfileIds)
      : Promise.resolve({ data: [] as Array<Pick<BrokerProfile, "id" | "user_id">> }),
    supabase
      .from("requirement_matches")
      .select("requirement_id, created_at")
      .in("requirement_id", requirementIds)
      .order("created_at", { ascending: false }),
  ]);
  const brokerProfileOwnerMap = new Map(
    (((brokerProfilesResult.data as Array<Pick<BrokerProfile, "id" | "user_id">> | null) || [])
      .filter((profile): profile is Pick<BrokerProfile, "id" | "user_id"> & { id: string } => !!profile.id)
      .map((profile) => [profile.id, profile.user_id]))
  );
  const ownerIds = uniqueDefinedIds(
    requirements.map((requirement) => requirement.posted_by || brokerProfileOwnerMap.get(requirement.broker_id))
  );
  const { data: ownerRows } = ownerIds.length
    ? await supabase.from("users").select("id, first_name, last_name, email").in("id", ownerIds)
    : { data: [] as Array<Pick<PlatformUser, "id" | "first_name" | "last_name" | "email">> };
  const ownerMap = new Map(
    (((ownerRows as Array<Pick<PlatformUser, "id" | "first_name" | "last_name" | "email">> | null) || []).map((owner) => [
      owner.id,
      owner,
    ]))
  );
  const submissionMeta = new Map<string, { count: number; latest: string | null }>();

  (((matchRowsResult.data as Array<{ requirement_id: string; created_at: string }> | null) || [])).forEach((row) => {
    const current = submissionMeta.get(row.requirement_id);
    if (!current) {
      submissionMeta.set(row.requirement_id, {
        count: 1,
        latest: row.created_at,
      });
      return;
    }

    submissionMeta.set(row.requirement_id, {
      count: current.count + 1,
      latest: current.latest || row.created_at,
    });
  });

  return requirements.map((requirement) => {
    const ownerUserId = requirement.posted_by || brokerProfileOwnerMap.get(requirement.broker_id) || null;
    const submission = submissionMeta.get(requirement.id);

    return {
      ...requirement,
      owner: ownerUserId ? ownerMap.get(ownerUserId) || null : null,
      status: getRequirementStatus(requirement),
      submitted_match_count: submission?.count || 0,
      latest_submission_at: submission?.latest || null,
    };
  });
}

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if ("error" in auth) return auth.error;

  try {
    const supabase = getServiceSupabase();
    const { page, pageSize, rangeFrom, rangeTo } = getAdminPaginationParams(request);
    const filter = getRequirementFilter(request.nextUrl.searchParams.get("status"));
    const pattern = getSafeIlikePattern(getSearchParam(request, "search"));
    const startDate = getOptionalDateParam(request, "startDate");
    const endDate = getOptionalDateParam(request, "endDate");
    const searchContext = await resolveRequirementSearchContext(supabase, pattern);
    const searchOrFilter = buildRequirementSearchOrFilter(pattern, searchContext);

    const [counts, requirementRows] = await Promise.all([
      Promise.all([
        fetchRequirementCount(supabase, { endDate, filter: "all", searchOrFilter, startDate }),
        fetchRequirementCount(supabase, { endDate, filter: "active", searchOrFilter, startDate }),
        fetchRequirementCount(supabase, { endDate, filter: "inactive", searchOrFilter, startDate }),
        fetchRequirementCount(supabase, { endDate, filter: "deleted", searchOrFilter, startDate }),
      ]),
      fetchRequirementRows(supabase, {
        endDate,
        filter,
        rangeFrom,
        rangeTo,
        searchOrFilter,
        startDate,
      }),
    ]);
    const items = await hydrateRequirementRows(supabase, requirementRows);
    const [all, active, inactive, deleted] = counts;
    const total = filter === "active" ? active : filter === "inactive" ? inactive : filter === "deleted" ? deleted : all;
    const payload: AdminPaginatedResponse<AdminRequirementListItem, AdminRequirementListCounts> = {
      items,
      ...getPaginationResponseMeta(total, page, pageSize),
      counts: {
        all,
        active,
        inactive,
        deleted,
      },
    };

    return NextResponse.json(payload, withNoStore());
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Failed to load requirements.", 500);
  }
}
