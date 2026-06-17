import { NextRequest, NextResponse } from "next/server";
import { getServiceSupabase, LEAD_SELECT, jsonError, requireAdmin, withNoStore } from "@/lib/deal-server";
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
  AdminEnquiryListCounts,
  AdminEnquiryListItem,
  AdminPaginatedResponse,
  EnquiryReply,
  Lead,
  Listing,
  PlatformUser,
} from "@/lib/deal-types";

type EnquiryFilterId = "all" | "unreplied" | "replied" | "failed";
type ReplyMeta = Pick<EnquiryReply, "enquiry_id" | "sent_at" | "status" | "created_at">;
type ReplyClassification = Pick<EnquiryReply, "enquiry_id" | "status">;

const ID_CHUNK_SIZE = 80;
const ENQUIRY_LISTING_SELECT = "id, title, price, property_type, status, deleted_at";
const ENQUIRY_BROKER_SELECT = "id, first_name, last_name, email";

function getEnquiryFilter(value: string | null): EnquiryFilterId {
  return value === "unreplied" || value === "replied" || value === "failed" ? value : "all";
}

function getReplyActivityDate(reply: Pick<EnquiryReply, "sent_at" | "created_at">) {
  return reply.sent_at || reply.created_at;
}

function chunkIds(ids: string[]) {
  const chunks: string[][] = [];
  for (let index = 0; index < ids.length; index += ID_CHUNK_SIZE) {
    chunks.push(ids.slice(index, index + ID_CHUNK_SIZE));
  }

  return chunks;
}

function createServerTiming() {
  const entries: string[] = [];

  return {
    async measure<T>(name: string, operation: () => Promise<T>) {
      const startedAt = Date.now();
      try {
        return await operation();
      } finally {
        entries.push(`${name};dur=${Math.max(Date.now() - startedAt, 0)}`);
      }
    },
    responseInit() {
      const init = withNoStore();
      const headers = new Headers(init.headers);
      if (entries.length) {
        headers.set("Server-Timing", entries.join(", "));
      }

      return {
        ...init,
        headers,
      };
    },
  };
}

async function fetchReplyMetaForEnquiryIds(supabase: ReturnType<typeof getServiceSupabase>, enquiryIds: string[]) {
  const ids = uniqueDefinedIds(enquiryIds);
  if (!ids.length) {
    return [] as ReplyMeta[];
  }

  const results = await Promise.all(
    chunkIds(ids).map((idChunk) =>
      supabase
        .from("enquiry_replies")
        .select("enquiry_id, sent_at, status, created_at")
        .in("enquiry_id", idChunk)
        .order("created_at", { ascending: false })
    )
  );

  const error = results.find((result) => result.error)?.error;
  if (error) {
    throw new Error(error.message || "Failed to load enquiry reply summaries.");
  }

  return results.flatMap((result) => (result.data as ReplyMeta[] | null) || []);
}

async function fetchReplyClassificationsForEnquiryIds(supabase: ReturnType<typeof getServiceSupabase>, enquiryIds: string[]) {
  const ids = uniqueDefinedIds(enquiryIds);
  if (!ids.length) {
    return [] as ReplyClassification[];
  }

  const results = await Promise.all(
    chunkIds(ids).map((idChunk) =>
      supabase
        .from("enquiry_replies")
        .select("enquiry_id, status")
        .in("enquiry_id", idChunk)
    )
  );

  const error = results.find((result) => result.error)?.error;
  if (error) {
    throw new Error(error.message || "Failed to load enquiry reply status counts.");
  }

  return results.flatMap((result) => (result.data as ReplyClassification[] | null) || []);
}

function buildReplyMetaMap(replyRows: ReplyMeta[]) {
  const replyMetaMap = new Map<string, { count: number; latestAt: string | null; latestStatus: EnquiryReply["status"] | null; hasFailed: boolean }>();

  replyRows.forEach((reply) => {
    const replyDate = getReplyActivityDate(reply);
    const current = replyMetaMap.get(reply.enquiry_id);
    if (!current) {
      replyMetaMap.set(reply.enquiry_id, {
        count: 1,
        latestAt: replyDate,
        latestStatus: reply.status,
        hasFailed: reply.status === "failed",
      });
      return;
    }

    const isNewer = !current.latestAt || replyDate.localeCompare(current.latestAt) > 0;
    replyMetaMap.set(reply.enquiry_id, {
      count: current.count + 1,
      latestAt: isNewer ? replyDate : current.latestAt,
      latestStatus: isNewer ? reply.status : current.latestStatus,
      hasFailed: current.hasFailed || reply.status === "failed",
    });
  });

  return replyMetaMap;
}

function buildReplyClassificationMap(replyRows: ReplyClassification[]) {
  const replyClassificationMap = new Map<string, { count: number; hasFailed: boolean }>();

  replyRows.forEach((reply) => {
    const current = replyClassificationMap.get(reply.enquiry_id);
    if (!current) {
      replyClassificationMap.set(reply.enquiry_id, {
        count: 1,
        hasFailed: reply.status === "failed",
      });
      return;
    }

    replyClassificationMap.set(reply.enquiry_id, {
      count: current.count + 1,
      hasFailed: current.hasFailed || reply.status === "failed",
    });
  });

  return replyClassificationMap;
}

function getCountsForBaseIds(baseIds: string[], replyClassificationMap: ReturnType<typeof buildReplyClassificationMap>): AdminEnquiryListCounts {
  const counts: AdminEnquiryListCounts = {
    all: baseIds.length,
    unreplied: 0,
    replied: 0,
    failed: 0,
  };

  baseIds.forEach((enquiryId) => {
    const meta = replyClassificationMap.get(enquiryId);
    if (!meta || meta.count === 0) {
      counts.unreplied += 1;
      return;
    }

    if (meta.hasFailed) {
      counts.failed += 1;
      return;
    }

    counts.replied += 1;
  });

  return counts;
}

function getFilteredEnquiryIds(baseIds: string[], replyClassificationMap: ReturnType<typeof buildReplyClassificationMap>, filter: EnquiryFilterId) {
  if (filter === "all") {
    return baseIds;
  }

  return baseIds.filter((enquiryId) => {
    const meta = replyClassificationMap.get(enquiryId);
    if (filter === "unreplied") {
      return !meta || meta.count === 0;
    }

    if (!meta || meta.count === 0) {
      return false;
    }

    return filter === "failed" ? meta.hasFailed : !meta.hasFailed;
  });
}

async function resolveEnquirySearchContext(
  supabase: ReturnType<typeof getServiceSupabase>,
  pattern: string | null
) {
  if (!pattern) {
    return {
      brokerIds: [] as string[],
      listingIds: [] as string[],
      replyEnquiryIds: [] as string[],
    };
  }

  const [brokersResult, listingsResult, repliesResult] = await Promise.all([
    supabase.from("users").select("id").or(`first_name.ilike.${pattern},last_name.ilike.${pattern},email.ilike.${pattern}`),
    supabase.from("listings").select("id").or(`title.ilike.${pattern},property_type.ilike.${pattern},status.ilike.${pattern}`),
    supabase
      .from("enquiry_replies")
      .select("enquiry_id")
      .or(`subject.ilike.${pattern},message.ilike.${pattern},enquirer_email.ilike.${pattern},status.ilike.${pattern},failure_reason.ilike.${pattern}`),
  ]);

  return {
    brokerIds: uniqueDefinedIds(((brokersResult.data as Array<Pick<PlatformUser, "id">> | null) || []).map((broker) => broker.id)),
    listingIds: uniqueDefinedIds(((listingsResult.data as Array<Pick<Listing, "id">> | null) || []).map((listing) => listing.id)),
    replyEnquiryIds: uniqueDefinedIds(((repliesResult.data as Array<Pick<EnquiryReply, "enquiry_id">> | null) || []).map((reply) => reply.enquiry_id)),
  };
}

function buildEnquirySearchOrFilter(
  pattern: string | null,
  {
    brokerIds,
    listingIds,
    replyEnquiryIds,
  }: {
    brokerIds: string[];
    listingIds: string[];
    replyEnquiryIds: string[];
  }
) {
  if (!pattern) {
    return null;
  }

  const clauses = [
    `contact_name.ilike.${pattern}`,
    `contact_email.ilike.${pattern}`,
    `contact_phone.ilike.${pattern}`,
    `message.ilike.${pattern}`,
    `lead_status.ilike.${pattern}`,
    `preferred_channel.ilike.${pattern}`,
  ];

  if (brokerIds.length) {
    clauses.push(`to_user_id.in.(${toInFilterValue(brokerIds)})`);
  }

  if (listingIds.length) {
    clauses.push(`listing_id.in.(${toInFilterValue(listingIds)})`);
  }

  if (replyEnquiryIds.length) {
    clauses.push(`id.in.(${toInFilterValue(replyEnquiryIds)})`);
  }

  return clauses.join(",");
}

type EnquiryBaseFilterQuery = {
  gte(column: string, value: string): EnquiryBaseFilterQuery;
  lte(column: string, value: string): EnquiryBaseFilterQuery;
  or(filter: string): EnquiryBaseFilterQuery;
};

function applyEnquiryBaseFilters<T extends EnquiryBaseFilterQuery>(
  query: T,
  {
    endDate,
    searchOrFilter,
    startDate,
  }: {
    endDate: string | null;
    searchOrFilter: string | null;
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

  if (searchOrFilter) {
    nextQuery = nextQuery.or(searchOrFilter) as T;
  }

  return nextQuery;
}

async function fetchBaseEnquiryIds(
  supabase: ReturnType<typeof getServiceSupabase>,
  {
    endDate,
    searchOrFilter,
    startDate,
  }: {
    endDate: string | null;
    searchOrFilter: string | null;
    startDate: string | null;
  }
) {
  const { data, error } = await applyEnquiryBaseFilters(
    supabase.from("leads").select("id").order("created_at", { ascending: false }),
    { endDate, searchOrFilter, startDate }
  );

  if (error) {
    throw new Error(error.message || "Failed to count enquiries.");
  }

  return uniqueDefinedIds(((data as Array<Pick<Lead, "id">> | null) || []).map((lead) => lead.id));
}

async function fetchEnquiryRows(
  supabase: ReturnType<typeof getServiceSupabase>,
  {
    endDate,
    filterIds,
    rangeFrom,
    rangeTo,
    searchOrFilter,
    startDate,
  }: {
    endDate: string | null;
    filterIds: string[] | null;
    rangeFrom: number;
    rangeTo: number;
    searchOrFilter: string | null;
    startDate: string | null;
  }
) {
  if (filterIds && !filterIds.length) {
    return [] as Lead[];
  }

  let query = applyEnquiryBaseFilters(supabase.from("leads").select(LEAD_SELECT), {
    endDate,
    searchOrFilter,
    startDate,
  });

  if (filterIds) {
    query = query.in("id", filterIds);
  }

  const { data, error } = await query.order("created_at", { ascending: false }).range(rangeFrom, rangeTo);
  if (error) {
    throw new Error(error.message || "Failed to load enquiries.");
  }

  return (data as Lead[] | null) || [];
}

async function hydrateEnquiryRows(
  supabase: ReturnType<typeof getServiceSupabase>,
  enquiries: Lead[],
  replyMetaMap: ReturnType<typeof buildReplyMetaMap>,
  replyClassificationMap: ReturnType<typeof buildReplyClassificationMap>
) {
  if (!enquiries.length) {
    return [] as AdminEnquiryListItem[];
  }

  const listingIds = uniqueDefinedIds(enquiries.map((enquiry) => enquiry.listing_id));
  const brokerIds = uniqueDefinedIds(enquiries.map((enquiry) => enquiry.to_user_id));
  const [listingsResult, brokersResult] = await Promise.all([
    listingIds.length
      ? supabase.from("listings").select(ENQUIRY_LISTING_SELECT).in("id", listingIds)
      : Promise.resolve({ data: [] as Array<Pick<Listing, "id" | "title" | "price" | "property_type" | "status" | "deleted_at">> }),
    brokerIds.length
      ? supabase.from("users").select(ENQUIRY_BROKER_SELECT).in("id", brokerIds)
      : Promise.resolve({ data: [] as Array<Pick<PlatformUser, "id" | "first_name" | "last_name" | "email">> }),
  ]);

  const listingMap = new Map(
    (((listingsResult.data as Array<Pick<Listing, "id" | "title" | "price" | "property_type" | "status" | "deleted_at">> | null) || []).map((listing) => [
      listing.id,
      listing,
    ]))
  );
  const brokerMap = new Map(
    (((brokersResult.data as Array<Pick<PlatformUser, "id" | "first_name" | "last_name" | "email">> | null) || []).map((broker) => [
      broker.id,
      broker,
    ]))
  );

  return enquiries.map((enquiry) => {
    const replyMeta = replyMetaMap.get(enquiry.id);
    const replyClassification = replyClassificationMap.get(enquiry.id);

    return {
      ...enquiry,
      listing: enquiry.listing_id ? listingMap.get(enquiry.listing_id) || null : null,
      broker: brokerMap.get(enquiry.to_user_id) || null,
      replies: [],
      reply_count: replyClassification?.count ?? replyMeta?.count ?? 0,
      latest_reply_at: replyMeta?.latestAt || null,
      latest_reply_status: replyMeta?.latestStatus || null,
    };
  });
}

export async function GET(request: NextRequest) {
  const timing = createServerTiming();
  const auth = await timing.measure("admin_auth", () => requireAdmin(request));
  if ("error" in auth) return auth.error;

  try {
    const supabase = getServiceSupabase();
    const { page, pageSize, rangeFrom, rangeTo } = getAdminPaginationParams(request);
    const filter = getEnquiryFilter(request.nextUrl.searchParams.get("status"));
    const pattern = getSafeIlikePattern(getSearchParam(request, "search"));
    const startDate = getOptionalDateParam(request, "startDate");
    const endDate = getOptionalDateParam(request, "endDate");
    const searchContext = await timing.measure("enquiry_search", () => resolveEnquirySearchContext(supabase, pattern));
    const searchOrFilter = buildEnquirySearchOrFilter(pattern, searchContext);
    const baseIdsPromise = timing.measure("enquiry_base_ids", () => fetchBaseEnquiryIds(supabase, { endDate, searchOrFilter, startDate }));
    const allRowsPromise =
      filter === "all"
        ? timing.measure("enquiry_page_rows", () =>
            fetchEnquiryRows(supabase, {
              endDate,
              filterIds: null,
              rangeFrom,
              rangeTo,
              searchOrFilter,
              startDate,
            })
          )
        : null;
    const [baseIds, allRows] = allRowsPromise ? await Promise.all([baseIdsPromise, allRowsPromise]) : [await baseIdsPromise, null];
    const replyClassificationRows = await timing.measure("enquiry_reply_counts", () =>
      fetchReplyClassificationsForEnquiryIds(supabase, baseIds)
    );
    const replyClassificationMap = buildReplyClassificationMap(replyClassificationRows);
    const counts = getCountsForBaseIds(baseIds, replyClassificationMap);
    const filteredIds = getFilteredEnquiryIds(baseIds, replyClassificationMap, filter);
    const total = counts[filter];
    const rows = allRows
      ? allRows
      : await timing.measure("enquiry_page_rows", () =>
          fetchEnquiryRows(supabase, {
            endDate,
            filterIds: filteredIds,
            rangeFrom,
            rangeTo,
            searchOrFilter,
            startDate,
          })
        );
    const replyRows = await timing.measure("enquiry_page_replies", () =>
      fetchReplyMetaForEnquiryIds(supabase, rows.map((row) => row.id))
    );
    const replyMetaMap = buildReplyMetaMap(replyRows);
    const items = await timing.measure("enquiry_hydrate", () => hydrateEnquiryRows(supabase, rows, replyMetaMap, replyClassificationMap));
    const payload: AdminPaginatedResponse<AdminEnquiryListItem, AdminEnquiryListCounts> = {
      items,
      ...getPaginationResponseMeta(total, page, pageSize),
      counts,
    };

    return NextResponse.json(payload, timing.responseInit());
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Failed to load enquiries.", 500);
  }
}
