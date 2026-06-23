import { NextRequest, NextResponse } from "next/server";
import {
  AGENCY_SELECT,
  CREDIT_SELECT,
  getServiceSupabase,
  jsonError,
  requireAdmin,
  withNoStore,
} from "@/lib/deal-server";
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
  AdminBrokerListCounts,
  AdminBrokerListItem,
  AdminPaginatedResponse,
  Agency,
  BrokerProfile,
  CreditSummary,
  PlatformUser,
} from "@/lib/deal-types";

type BrokerFilterId = "all" | "approved" | "pending" | "rejected" | "deactivated";
type BrokerRowMode = BrokerFilterId | "notPending";

const BROKER_USER_SELECT = "id, email, first_name, last_name, phone, role, status, agency_id, created_at, updated_at";
const BROKER_PROFILE_LIST_SELECT = "user_id, profile_photo, rera_brn, approved_at, created_at, updated_at";

function getBrokerFilter(value: string | null): BrokerFilterId {
  return value === "approved" || value === "pending" || value === "rejected" || value === "deactivated" ? value : "all";
}

async function resolveBrokerSearchContext(
  supabase: ReturnType<typeof getServiceSupabase>,
  pattern: string | null
) {
  if (!pattern) {
    return {
      agencyIds: [] as string[],
      brokerUserIds: [] as string[],
    };
  }

  const [agenciesResult, brokerProfilesResult] = await Promise.all([
    supabase.from("agencies").select("id").or(`name.ilike.${pattern},rera_brn.ilike.${pattern}`),
    supabase.from("broker_profiles").select("user_id").ilike("rera_brn", pattern),
  ]);

  return {
    agencyIds: uniqueDefinedIds(((agenciesResult.data as Array<Pick<Agency, "id">> | null) || []).map((agency) => agency.id)),
    brokerUserIds: uniqueDefinedIds(
      ((brokerProfilesResult.data as Array<Pick<BrokerProfile, "user_id">> | null) || []).map((profile) => profile.user_id)
    ),
  };
}

function buildSearchOrFilter(
  pattern: string | null,
  {
    agencyIds,
    brokerUserIds,
  }: {
    agencyIds: string[];
    brokerUserIds: string[];
  }
) {
  if (!pattern) {
    return null;
  }

  const clauses = [
    `first_name.ilike.${pattern}`,
    `last_name.ilike.${pattern}`,
    `email.ilike.${pattern}`,
    `phone.ilike.${pattern}`,
  ];

  if (agencyIds.length) {
    clauses.push(`agency_id.in.(${toInFilterValue(agencyIds)})`);
  }

  if (brokerUserIds.length) {
    clauses.push(`id.in.(${toInFilterValue(brokerUserIds)})`);
  }

  return clauses.join(",");
}

async function fetchBrokerCount(
  supabase: ReturnType<typeof getServiceSupabase>,
  {
    endDate,
    filter,
    searchOrFilter,
    startDate,
  }: {
    endDate: string | null;
    filter: BrokerRowMode;
    searchOrFilter: string | null;
    startDate: string | null;
  }
) {
  let query = supabase.from("users").select("id", { count: "exact", head: true }).eq("role", "broker");
  if (filter === "approved") {
    query = query.in("status", ["active", "approved"]);
  } else if (filter === "deactivated") {
    query = query.in("status", ["suspended", "deactivated"]);
  } else if (filter === "pending" || filter === "rejected") {
    query = query.eq("status", filter);
  } else if (filter === "notPending") {
    query = query.neq("status", "pending");
  }

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
    throw new Error(error.message || "Failed to count brokers.");
  }

  return count || 0;
}

async function fetchBrokerRows(
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
    filter: BrokerRowMode;
    rangeFrom: number;
    rangeTo: number;
    searchOrFilter: string | null;
    startDate: string | null;
  }
) {
  let query = supabase.from("users").select(BROKER_USER_SELECT).eq("role", "broker");
  if (filter === "approved") {
    query = query.in("status", ["active", "approved"]);
  } else if (filter === "deactivated") {
    query = query.in("status", ["suspended", "deactivated"]);
  } else if (filter === "pending" || filter === "rejected") {
    query = query.eq("status", filter);
  } else if (filter === "notPending") {
    query = query.neq("status", "pending");
  }

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
    throw new Error(error.message || "Failed to load brokers.");
  }

  return (data as PlatformUser[] | null) || [];
}

async function hydrateBrokerRows(supabase: ReturnType<typeof getServiceSupabase>, users: PlatformUser[]) {
  if (!users.length) {
    return [] as AdminBrokerListItem[];
  }

  const userIds = users.map((user) => user.id);
  const agencyIds = uniqueDefinedIds(users.map((user) => user.agency_id));
  const [brokerProfilesResult, creditsResult, agenciesResult] = await Promise.all([
    supabase.from("broker_profiles").select(BROKER_PROFILE_LIST_SELECT).in("user_id", userIds),
    supabase.from("broker_credits").select(CREDIT_SELECT).in("user_id", userIds),
    agencyIds.length
      ? supabase.from("agencies").select(AGENCY_SELECT).in("id", agencyIds)
      : Promise.resolve({ data: [] as Agency[] }),
  ]);

  const profileMap = new Map(
    (((brokerProfilesResult.data as Array<Pick<BrokerProfile, "user_id" | "profile_photo" | "rera_brn" | "approved_at" | "created_at" | "updated_at">> | null) || [])
      .map((profile) => [profile.user_id, profile]))
  );
  const creditMap = new Map(((creditsResult.data as CreditSummary[] | null) || []).map((credit) => [credit.user_id, credit]));
  const agencyMap = new Map(((agenciesResult.data as Agency[] | null) || []).map((agency) => [agency.id, agency]));

  return users.map((user) => ({
    ...user,
    brokerProfile: profileMap.get(user.id) || null,
    agency: user.agency_id ? agencyMap.get(user.agency_id) || null : null,
    credits: creditMap.get(user.id) || null,
  }));
}

async function fetchBrokerPageRows(
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
    filter: BrokerFilterId;
    rangeFrom: number;
    rangeTo: number;
    searchOrFilter: string | null;
    startDate: string | null;
  }
) {
  if (filter !== "all") {
    return fetchBrokerRows(supabase, {
      endDate,
      filter,
      rangeFrom,
      rangeTo,
      searchOrFilter,
      startDate,
    });
  }

  const pendingCount = await fetchBrokerCount(supabase, {
    endDate,
    filter: "pending",
    searchOrFilter,
    startDate,
  });
  const rows: PlatformUser[] = [];

  if (rangeFrom < pendingCount) {
    rows.push(
      ...(await fetchBrokerRows(supabase, {
        endDate,
        filter: "pending",
        rangeFrom,
        rangeTo: Math.min(rangeTo, pendingCount - 1),
        searchOrFilter,
        startDate,
      }))
    );
  }

  const remaining = rangeTo - rangeFrom + 1 - rows.length;
  if (remaining > 0) {
    const nonPendingFrom = Math.max(0, rangeFrom - pendingCount);
    rows.push(
      ...(await fetchBrokerRows(supabase, {
        endDate,
        filter: "notPending",
        rangeFrom: nonPendingFrom,
        rangeTo: nonPendingFrom + remaining - 1,
        searchOrFilter,
        startDate,
      }))
    );
  }

  return rows;
}

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if ("error" in auth) return auth.error;

  try {
    const supabase = getServiceSupabase();
    const { page, pageSize, rangeFrom, rangeTo } = getAdminPaginationParams(request);
    const filter = getBrokerFilter(request.nextUrl.searchParams.get("status"));
    const pattern = getSafeIlikePattern(getSearchParam(request, "search"));
    const startDate = getOptionalDateParam(request, "startDate");
    const endDate = getOptionalDateParam(request, "endDate");
    const searchContext = await resolveBrokerSearchContext(supabase, pattern);
    const searchOrFilter = buildSearchOrFilter(pattern, searchContext);

    const [counts, users] = await Promise.all([
      Promise.all([
        fetchBrokerCount(supabase, { endDate, filter: "all", searchOrFilter, startDate }),
        fetchBrokerCount(supabase, { endDate, filter: "approved", searchOrFilter, startDate }),
        fetchBrokerCount(supabase, { endDate, filter: "pending", searchOrFilter, startDate }),
        fetchBrokerCount(supabase, { endDate, filter: "rejected", searchOrFilter, startDate }),
        fetchBrokerCount(supabase, { endDate, filter: "deactivated", searchOrFilter, startDate }),
      ]),
      fetchBrokerPageRows(supabase, {
        endDate,
        filter,
        rangeFrom,
        rangeTo,
        searchOrFilter,
        startDate,
      }),
    ]);

    const [all, approved, pending, rejected, deactivated] = counts;
    const total =
      filter === "approved"
        ? approved
        : filter === "pending"
        ? pending
        : filter === "rejected"
        ? rejected
        : filter === "deactivated"
        ? deactivated
        : all;
    const items = await hydrateBrokerRows(supabase, users);
    const payload: AdminPaginatedResponse<AdminBrokerListItem, AdminBrokerListCounts> = {
      items,
      ...getPaginationResponseMeta(total, page, pageSize),
      counts: {
        all,
        approved,
        pending,
        rejected,
        deactivated,
      },
    };

    return NextResponse.json(payload, withNoStore());
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Failed to load brokers.", 500);
  }
}
