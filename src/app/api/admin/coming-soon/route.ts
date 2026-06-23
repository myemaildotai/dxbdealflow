import { NextRequest, NextResponse } from "next/server";
import { getServiceSupabase, COMING_SOON_REGISTRATION_SELECT, jsonError, requireAdmin, withNoStore } from "@/lib/deal-server";
import {
  getAdminPaginationParams,
  getOptionalDateParam,
  getPaginationResponseMeta,
  getSafeIlikePattern,
  getSearchParam,
} from "@/lib/admin-api-utils";
import type {
  AdminComingSoonListItem,
  AdminPaginatedResponse,
} from "@/lib/deal-types";

type ComingSoonListCounts = {
  all: number;
};

type ComingSoonFilterQuery = {
  gte(column: string, value: string): ComingSoonFilterQuery;
  lte(column: string, value: string): ComingSoonFilterQuery;
  or(filter: string): ComingSoonFilterQuery;
};

function applyComingSoonFilters<T extends ComingSoonFilterQuery>(
  query: T,
  {
    endDate,
    pattern,
    startDate,
  }: {
    endDate: string | null;
    pattern: string | null;
    startDate: string | null;
  }
) {
  let nextQuery = query;

  if (startDate) {
    nextQuery = nextQuery.gte("created_at", startDate) as T;
  }

  if (endDate) {
    nextQuery = nextQuery.lte("created_at", endDate) as T;
  }

  if (pattern) {
    nextQuery = nextQuery.or(
      [
        `first_name.ilike.${pattern}`,
        `last_name.ilike.${pattern}`,
        `email.ilike.${pattern}`,
        `whatsapp_number.ilike.${pattern}`,
        `instagram_handle.ilike.${pattern}`,
        `company_agency_name.ilike.${pattern}`,
        `role_name.ilike.${pattern}`,
        `role_id.ilike.${pattern}`,
      ].join(",")
    ) as T;
  }

  return nextQuery;
}

async function fetchComingSoonCount(
  supabase: ReturnType<typeof getServiceSupabase>,
  {
    endDate,
    pattern,
    startDate,
  }: {
    endDate: string | null;
    pattern: string | null;
    startDate: string | null;
  }
) {
  const { count, error } = await applyComingSoonFilters(
    supabase.from("coming_soon_registrations").select("id", { count: "exact", head: true }),
    { endDate, pattern, startDate }
  );

  if (error) {
    throw new Error(error.message || "Failed to count leads.");
  }

  return count || 0;
}

async function fetchComingSoonRows(
  supabase: ReturnType<typeof getServiceSupabase>,
  {
    endDate,
    pattern,
    rangeFrom,
    rangeTo,
    startDate,
  }: {
    endDate: string | null;
    pattern: string | null;
    rangeFrom: number;
    rangeTo: number;
    startDate: string | null;
  }
) {
  const { data, error } = await applyComingSoonFilters(
    supabase.from("coming_soon_registrations").select(COMING_SOON_REGISTRATION_SELECT),
    { endDate, pattern, startDate }
  )
    .order("created_at", { ascending: false })
    .range(rangeFrom, rangeTo);

  if (error) {
    throw new Error(error.message || "Failed to load leads.");
  }

  return (data as AdminComingSoonListItem[] | null) || [];
}

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if ("error" in auth) return auth.error;

  try {
    const supabase = getServiceSupabase();
    const { page, pageSize, rangeFrom, rangeTo } = getAdminPaginationParams(request);
    const pattern = getSafeIlikePattern(getSearchParam(request, "search"));
    const startDate = getOptionalDateParam(request, "startDate");
    const endDate = getOptionalDateParam(request, "endDate");

    const [total, items] = await Promise.all([
      fetchComingSoonCount(supabase, { endDate, pattern, startDate }),
      fetchComingSoonRows(supabase, { endDate, pattern, rangeFrom, rangeTo, startDate }),
    ]);

    const payload: AdminPaginatedResponse<AdminComingSoonListItem, ComingSoonListCounts> = {
      items,
      ...getPaginationResponseMeta(total, page, pageSize),
      counts: {
        all: total,
      },
    };

    return NextResponse.json(payload, withNoStore());
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Failed to load leads.", 500);
  }
}
