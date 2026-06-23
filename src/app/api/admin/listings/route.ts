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
  AdminListingListCounts,
  AdminListingListItem,
  AdminPaginatedResponse,
  Area,
  Listing,
  PlatformUser,
} from "@/lib/deal-types";

type ListingFilterId = "all" | "pending" | "approved" | "rejected" | "inactive" | "deleted";

const ADMIN_LISTING_SELECT =
  "id, title, property_type, deal_type, bedrooms, area_id, developer, price, status, is_visible, created_at, updated_at, deleted_at, created_by, approved_at";

function getListingFilter(value: string | null): ListingFilterId {
  return value === "pending" || value === "approved" || value === "rejected" || value === "inactive" || value === "deleted"
    ? value
    : "all";
}

type ListingStatusFilterQuery = {
  eq(column: string, value: string): ListingStatusFilterQuery;
  in(column: string, values: string[]): ListingStatusFilterQuery;
  is(column: string, value: null): ListingStatusFilterQuery;
  not(column: string, operator: string, value: string | null): ListingStatusFilterQuery;
};

function applyListingStatusFilter<T>(query: T, filter: ListingFilterId): T {
  const filterableQuery = query as unknown as ListingStatusFilterQuery;

  if (filter === "deleted") {
    return filterableQuery.not("deleted_at", "is", null) as unknown as T;
  }

  let nextQuery = filterableQuery.is("deleted_at", null);

  if (filter === "approved") {
    nextQuery = nextQuery.in("status", ["active", "approved"]);
  } else if (filter !== "all") {
    nextQuery = nextQuery.eq("status", filter);
  }

  return nextQuery as unknown as T;
}

async function resolveListingSearchContext(
  supabase: ReturnType<typeof getServiceSupabase>,
  pattern: string | null
) {
  if (!pattern) {
    return {
      areaIds: [] as string[],
      ownerIds: [] as string[],
    };
  }

  const [areasResult, ownersResult] = await Promise.all([
    supabase.from("areas").select("id").or(`name.ilike.${pattern},city.ilike.${pattern}`),
    supabase.from("users").select("id").or(`first_name.ilike.${pattern},last_name.ilike.${pattern},email.ilike.${pattern}`),
  ]);

  return {
    areaIds: uniqueDefinedIds(((areasResult.data as Array<Pick<Area, "id">> | null) || []).map((area) => area.id)),
    ownerIds: uniqueDefinedIds(((ownersResult.data as Array<Pick<PlatformUser, "id">> | null) || []).map((owner) => owner.id)),
  };
}

function buildListingSearchOrFilter(
  pattern: string | null,
  {
    areaIds,
    ownerIds,
  }: {
    areaIds: string[];
    ownerIds: string[];
  }
) {
  if (!pattern) {
    return null;
  }

  const clauses = [
    `title.ilike.${pattern}`,
    `developer.ilike.${pattern}`,
    `property_type.ilike.${pattern}`,
    `status.ilike.${pattern}`,
  ];

  if (areaIds.length) {
    clauses.push(`area_id.in.(${toInFilterValue(areaIds)})`);
  }

  if (ownerIds.length) {
    clauses.push(`created_by.in.(${toInFilterValue(ownerIds)})`);
  }

  return clauses.join(",");
}

async function fetchListingCount(
  supabase: ReturnType<typeof getServiceSupabase>,
  {
    endDate,
    filter,
    searchOrFilter,
    startDate,
  }: {
    endDate: string | null;
    filter: ListingFilterId;
    searchOrFilter: string | null;
    startDate: string | null;
  }
) {
  let query = supabase.from("listings").select("id", { count: "exact", head: true });
  query = applyListingStatusFilter(query, filter);

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
    throw new Error(error.message || "Failed to count listings.");
  }

  return count || 0;
}

async function fetchListingRows(
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
    filter: ListingFilterId;
    rangeFrom: number;
    rangeTo: number;
    searchOrFilter: string | null;
    startDate: string | null;
  }
) {
  let query = supabase.from("listings").select(ADMIN_LISTING_SELECT);
  query = applyListingStatusFilter(query, filter);

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
    throw new Error(error.message || "Failed to load listings.");
  }

  return (data as Array<
    Pick<
      Listing,
      | "id"
      | "title"
      | "property_type"
      | "deal_type"
      | "bedrooms"
      | "area_id"
      | "developer"
      | "price"
      | "status"
      | "is_visible"
      | "created_at"
      | "updated_at"
      | "deleted_at"
      | "created_by"
      | "approved_at"
    >
  > | null) || [];
}

async function hydrateListingRows(
  supabase: ReturnType<typeof getServiceSupabase>,
  listings: Awaited<ReturnType<typeof fetchListingRows>>
) {
  if (!listings.length) {
    return [] as AdminListingListItem[];
  }

  const areaIds = uniqueDefinedIds(listings.map((listing) => listing.area_id));
  const ownerIds = uniqueDefinedIds(listings.map((listing) => listing.created_by));
  const [areasResult, ownersResult] = await Promise.all([
    areaIds.length ? supabase.from("areas").select("id, name, city, slug").in("id", areaIds) : Promise.resolve({ data: [] as Area[] }),
    ownerIds.length
      ? supabase.from("users").select("id, first_name, last_name, email").in("id", ownerIds)
      : Promise.resolve({ data: [] as Array<Pick<PlatformUser, "id" | "first_name" | "last_name" | "email">> }),
  ]);
  const areaMap = new Map(((areasResult.data as Area[] | null) || []).map((area) => [area.id, area]));
  const ownerMap = new Map(
    (((ownersResult.data as Array<Pick<PlatformUser, "id" | "first_name" | "last_name" | "email">> | null) || []).map((owner) => [
      owner.id,
      owner,
    ]))
  );

  return listings.map((listing) => ({
    ...listing,
    area: listing.area_id ? areaMap.get(listing.area_id) || null : null,
    owner: ownerMap.get(listing.created_by) || null,
  }));
}

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if ("error" in auth) return auth.error;

  try {
    const supabase = getServiceSupabase();
    const { page, pageSize, rangeFrom, rangeTo } = getAdminPaginationParams(request);
    const filter = getListingFilter(request.nextUrl.searchParams.get("status"));
    const pattern = getSafeIlikePattern(getSearchParam(request, "search"));
    const startDate = getOptionalDateParam(request, "startDate");
    const endDate = getOptionalDateParam(request, "endDate");
    const searchContext = await resolveListingSearchContext(supabase, pattern);
    const searchOrFilter = buildListingSearchOrFilter(pattern, searchContext);

    const [counts, listingRows] = await Promise.all([
      Promise.all([
        fetchListingCount(supabase, { endDate, filter: "all", searchOrFilter, startDate }),
        fetchListingCount(supabase, { endDate, filter: "pending", searchOrFilter, startDate }),
        fetchListingCount(supabase, { endDate, filter: "approved", searchOrFilter, startDate }),
        fetchListingCount(supabase, { endDate, filter: "rejected", searchOrFilter, startDate }),
        fetchListingCount(supabase, { endDate, filter: "inactive", searchOrFilter, startDate }),
        fetchListingCount(supabase, { endDate, filter: "deleted", searchOrFilter, startDate }),
      ]),
      fetchListingRows(supabase, {
        endDate,
        filter,
        rangeFrom,
        rangeTo,
        searchOrFilter,
        startDate,
      }),
    ]);
    const items = await hydrateListingRows(supabase, listingRows);
    const [all, pending, approved, rejected, inactive, deleted] = counts;
    const total =
      filter === "pending"
        ? pending
        : filter === "approved"
        ? approved
        : filter === "rejected"
        ? rejected
        : filter === "inactive"
        ? inactive
        : filter === "deleted"
        ? deleted
        : all;
    const payload: AdminPaginatedResponse<AdminListingListItem, AdminListingListCounts> = {
      items,
      ...getPaginationResponseMeta(total, page, pageSize),
      counts: {
        all,
        pending,
        approved,
        rejected,
        inactive,
        deleted,
      },
    };

    return NextResponse.json(payload, withNoStore());
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Failed to load listings.", 500);
  }
}
