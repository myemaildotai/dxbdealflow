import type { NextRequest } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  ACTIVITY_CATEGORY_IDS,
  createEmptyActivityCategoryCounts,
  getActivityCategory,
  getActivityFilter,
  NON_CHAT_ACTIVITY_OR_FILTER,
  SYSTEM_ACTIVITY_OR_FILTER,
  type ActivityCategoryCounts,
  type ActivityFilterId,
} from "@/lib/activity-categories";
import { LEAD_SELECT, USER_SELECT } from "@/lib/deal-server";
import {
  getAdminPaginationParams,
  getOptionalDateParam,
  getPaginationResponseMeta,
  getSafeIlikePattern,
  getSearchParam,
  toInFilterValue,
  uniqueDefinedIds,
} from "@/lib/admin-api-utils";
import { fetchUserBundle, hydrateActivityLogs } from "@/lib/platform-server-data";
import { enrichRequirementsWithSubmissionMeta } from "@/lib/requirements-server";
import { buildSearchText, normalizeSearchQuery } from "@/lib/search";
import type {
  ActivityLog,
  AdminBrokerActivityResponse,
  AdminBrokerOverview,
  AdminEnquiryListCounts,
  AdminEnquiryListItem,
  AdminListingListCounts,
  AdminListingListItem,
  AdminPaginatedResponse,
  AdminRequirementListCounts,
  AdminRequirementListItem,
  Area,
  BrokerProfile,
  EnquiryReply,
  Lead,
  Listing,
  PlatformUser,
  Requirement,
} from "@/lib/deal-types";

type ListingFilterId = "all" | "pending" | "approved" | "rejected" | "inactive" | "deleted";
type RequirementFilterId = "all" | "active" | "inactive" | "deleted";
type EnquiryFilterId = "all" | "unreplied" | "replied" | "failed";
type BrokerActivityRow = ActivityLog & { actor_user_id?: string | null };
type ReplyMeta = Pick<EnquiryReply, "enquiry_id" | "sent_at" | "status" | "created_at">;
type ReplyClassification = Pick<EnquiryReply, "enquiry_id" | "status">;

type BrokerDashboardMetricsRow = {
  total_listings: number | null;
  active_listings: number | null;
  pending_listings: number | null;
  public_enquiries: number | null;
  total_requirements: number | null;
  active_requirements: number | null;
  inactive_requirements: number | null;
};

type RequirementSubmissionMetaRow = {
  requirement_id: string;
  submission_count: number | null;
  latest_submission_at: string | null;
};

const ADMIN_BROKER_LISTING_SELECT =
  "id, title, property_type, deal_type, bedrooms, area_id, developer, price, status, is_visible, created_at, updated_at, deleted_at, created_by, approved_at";
const ADMIN_BROKER_REQUIREMENT_SELECT =
  "id, broker_id, posted_by, title, description, property_type, deal_type, bedrooms, budget_min, budget_max, area, area_id, urgency, timeline, notes, is_active, deactivated_by, deleted_at, created_at, updated_at";
const ENQUIRY_LISTING_SELECT = "id, title, price, property_type, status, deleted_at";
const BROKER_ACTIVITY_SELECT = "id, action, target_table, target_id, created_at, metadata, actor_user_id";
const ID_CHUNK_SIZE = 80;
const BROKER_ACTIVITY_SEARCH_METADATA_KEYS = [
  "listingTitle",
  "requirementTitle",
  "contactName",
  "contactEmail",
  "contactPhone",
  "message",
  "preferredChannel",
  "email",
  "notes",
  "area",
  "propertyType",
  "dealType",
  "status",
];

export class AdminBrokerNotFoundError extends Error {
  constructor() {
    super("Broker not found.");
    this.name = "AdminBrokerNotFoundError";
  }
}

async function requireBrokerTarget(
  supabase: SupabaseClient,
  userId: string,
  { includeBrokerProfileId = false }: { includeBrokerProfileId?: boolean } = {}
) {
  const [userResult, brokerProfileResult] = await Promise.all([
    supabase.from("users").select(USER_SELECT).eq("id", userId).maybeSingle(),
    includeBrokerProfileId
      ? supabase.from("broker_profiles").select("id").eq("user_id", userId).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
  ]);
  const targetError = userResult.error || brokerProfileResult.error;
  if (targetError) {
    throw new Error(targetError.message || "Failed to load broker target.");
  }
  const user = userResult.data as PlatformUser | null;

  if (!user || user.role !== "broker") {
    throw new AdminBrokerNotFoundError();
  }

  return {
    user,
    brokerProfileId: (brokerProfileResult.data as Pick<BrokerProfile, "id"> | null)?.id || null,
  };
}

function brokerMatchesSearch(user: PlatformUser, search: string | null) {
  const normalizedSearch = normalizeSearchQuery(search);
  if (!normalizedSearch) return false;
  return buildSearchText([user.first_name, user.last_name, user.email]).includes(normalizedSearch);
}

function getListingFilter(value: string | null): ListingFilterId {
  return value === "pending" || value === "approved" || value === "rejected" || value === "inactive" || value === "deleted"
    ? value
    : "all";
}

type ListingFilterQuery = {
  eq(column: string, value: string): ListingFilterQuery;
  in(column: string, values: string[]): ListingFilterQuery;
  is(column: string, value: null): ListingFilterQuery;
  not(column: string, operator: string, value: string | null): ListingFilterQuery;
};

function applyListingFilter<T>(query: T, userId: string, filter: ListingFilterId): T {
  let nextQuery = (query as unknown as ListingFilterQuery).eq("created_by", userId);

  if (filter === "deleted") {
    return nextQuery.not("deleted_at", "is", null) as unknown as T;
  }

  nextQuery = nextQuery.is("deleted_at", null);
  if (filter === "approved") {
    nextQuery = nextQuery.in("status", ["active", "approved"]);
  } else if (filter !== "all") {
    nextQuery = nextQuery.eq("status", filter);
  }

  return nextQuery as unknown as T;
}

async function resolveListingSearchAreaIds(supabase: SupabaseClient, pattern: string | null) {
  if (!pattern) {
    return [] as string[];
  }

  const { data, error } = await supabase.from("areas").select("id").or(`name.ilike.${pattern},city.ilike.${pattern}`);
  if (error) {
    throw new Error(error.message || "Failed to search listing areas.");
  }

  return uniqueDefinedIds(((data as Array<Pick<Area, "id">> | null) || []).map((area) => area.id));
}

function buildListingSearchOrFilter(pattern: string | null, areaIds: string[]) {
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

  return clauses.join(",");
}



export async function fetchAdminBrokerListings(
  supabase: SupabaseClient,
  userId: string,
  request: NextRequest
): Promise<AdminPaginatedResponse<AdminListingListItem, AdminListingListCounts>> {
  await requireBrokerTarget(supabase, userId);
  const { page, pageSize, rangeFrom, rangeTo } = getAdminPaginationParams(request);
  const filter = getListingFilter(request.nextUrl.searchParams.get("status"));
  const pattern = getSafeIlikePattern(getSearchParam(request, "search"));
  const startDate = getOptionalDateParam(request, "startDate");
  const endDate = getOptionalDateParam(request, "endDate");
  const areaIds = await resolveListingSearchAreaIds(supabase, pattern);
  const searchOrFilter = buildListingSearchOrFilter(pattern, areaIds);

  let rowsQuery = applyListingFilter(supabase.from("listings").select(ADMIN_BROKER_LISTING_SELECT), userId, filter);
  if (startDate) rowsQuery = rowsQuery.gte("created_at", startDate);
  if (endDate) rowsQuery = rowsQuery.lte("created_at", endDate);
  if (searchOrFilter) rowsQuery = rowsQuery.or(searchOrFilter);

  let countQuery = supabase.from("listings").select("status, deleted_at").eq("created_by", userId);
  if (startDate) countQuery = countQuery.gte("created_at", startDate);
  if (endDate) countQuery = countQuery.lte("created_at", endDate);
  if (searchOrFilter) countQuery = countQuery.or(searchOrFilter);

  const [countsResult, rowsResult] = await Promise.all([
    countQuery,
    rowsQuery.order("created_at", { ascending: false }).range(rangeFrom, rangeTo),
  ]);

  if (countsResult.error) {
    throw new Error(countsResult.error.message || "Failed to count broker listings.");
  }
  if (rowsResult.error) {
    throw new Error(rowsResult.error.message || "Failed to load broker listings.");
  }

  const rows = (rowsResult.data as AdminListingListItem[] | null) || [];
  const rowAreaIds = uniqueDefinedIds(rows.map((listing) => listing.area_id));
  const { data: areaRows, error: areaError } = rowAreaIds.length
    ? await supabase.from("areas").select("id, name, city, slug").in("id", rowAreaIds)
    : { data: [] as Area[], error: null };
  if (areaError) {
    throw new Error(areaError.message || "Failed to hydrate broker listing areas.");
  }

  const areaMap = new Map(((areaRows as Area[] | null) || []).map((area) => [area.id, area]));
  const items = rows.map((listing) => ({
    ...listing,
    area: listing.area_id ? areaMap.get(listing.area_id) || null : null,
  }));

  let all = 0;
  let pending = 0;
  let approved = 0;
  let rejected = 0;
  let inactive = 0;
  let deleted = 0;

  if (countsResult.data) {
    for (const item of countsResult.data) {
      if (item.deleted_at !== null) {
        deleted++;
      } else {
        all++;
        if (item.status === "pending") {
          pending++;
        } else if (item.status === "active" || item.status === "approved") {
          approved++;
        } else if (item.status === "rejected") {
          rejected++;
        } else if (item.status === "inactive") {
          inactive++;
        }
      }
    }
  }

  const counts = { all, pending, approved, rejected, inactive, deleted };

  return {
    items,
    ...getPaginationResponseMeta(counts[filter], page, pageSize),
    counts,
  };
}

function getRequirementFilter(value: string | null): RequirementFilterId {
  return value === "active" || value === "inactive" || value === "deleted" ? value : "all";
}

type RequirementFilterQuery = {
  eq(column: string, value: string | boolean): RequirementFilterQuery;
  is(column: string, value: null): RequirementFilterQuery;
  not(column: string, operator: string, value: string | null): RequirementFilterQuery;
  or(filter: string): RequirementFilterQuery;
};

function applyRequirementScope<T>(query: T, userId: string, brokerProfileId: string | null): T {
  const filterableQuery = query as unknown as RequirementFilterQuery;
  return (brokerProfileId
    ? filterableQuery.or(`broker_id.eq.${brokerProfileId},posted_by.eq.${userId}`)
    : filterableQuery.eq("posted_by", userId)) as unknown as T;
}

function applyRequirementFilter<T>(query: T, userId: string, brokerProfileId: string | null, filter: RequirementFilterId): T {
  let nextQuery = applyRequirementScope(query, userId, brokerProfileId) as unknown as RequirementFilterQuery;

  if (filter === "deleted") {
    return nextQuery.not("deleted_at", "is", null) as unknown as T;
  }

  nextQuery = nextQuery.is("deleted_at", null);
  if (filter === "active") {
    nextQuery = nextQuery.eq("is_active", true);
  } else if (filter === "inactive") {
    nextQuery = nextQuery.eq("is_active", false);
  }

  return nextQuery as unknown as T;
}

function buildRequirementSearchOrFilter(pattern: string | null) {
  if (!pattern) {
    return null;
  }

  return [
    `title.ilike.${pattern}`,
    `description.ilike.${pattern}`,
    `area.ilike.${pattern}`,
    `property_type.ilike.${pattern}`,
    `deal_type.ilike.${pattern}`,
    `bedrooms.ilike.${pattern}`,
    `urgency.ilike.${pattern}`,
    `timeline.ilike.${pattern}`,
  ].join(",");
}



export async function fetchAdminBrokerRequirements(
  supabase: SupabaseClient,
  userId: string,
  request: NextRequest
): Promise<AdminPaginatedResponse<AdminRequirementListItem, AdminRequirementListCounts>> {
  const { user, brokerProfileId } = await requireBrokerTarget(supabase, userId, { includeBrokerProfileId: true });
  const { page, pageSize, rangeFrom, rangeTo } = getAdminPaginationParams(request);
  const filter = getRequirementFilter(request.nextUrl.searchParams.get("status"));
  const search = getSearchParam(request, "search");
  const pattern = getSafeIlikePattern(search);
  const startDate = getOptionalDateParam(request, "startDate");
  const endDate = getOptionalDateParam(request, "endDate");
  const searchOrFilter = brokerMatchesSearch(user, search) ? null : buildRequirementSearchOrFilter(pattern);

  let rowsQuery = applyRequirementFilter(
    supabase.from("requirements").select(ADMIN_BROKER_REQUIREMENT_SELECT),
    userId,
    brokerProfileId,
    filter
  );
  if (startDate) rowsQuery = rowsQuery.gte("created_at", startDate);
  if (endDate) rowsQuery = rowsQuery.lte("created_at", endDate);
  if (searchOrFilter) rowsQuery = rowsQuery.or(searchOrFilter);

  let countQuery = applyRequirementScope(
    supabase.from("requirements").select("is_active, deleted_at"),
    userId,
    brokerProfileId
  );
  if (startDate) countQuery = countQuery.gte("created_at", startDate);
  if (endDate) countQuery = countQuery.lte("created_at", endDate);
  if (searchOrFilter) countQuery = countQuery.or(searchOrFilter);

  const [countsResult, rowsResult] = await Promise.all([
    countQuery,
    rowsQuery.order("created_at", { ascending: false }).range(rangeFrom, rangeTo),
  ]);

  if (countsResult.error) {
    throw new Error(countsResult.error.message || "Failed to count broker requirements.");
  }
  if (rowsResult.error) {
    throw new Error(rowsResult.error.message || "Failed to load broker requirements.");
  }

  const requirements = (rowsResult.data as Requirement[] | null) || [];
  const canUseBrokerSubmissionMetaRpc =
    !!brokerProfileId && requirements.every((requirement) => requirement.broker_id === brokerProfileId);
  const enrichedRequirements = await enrichRequirementsWithSubmissionMeta(
    supabase,
    requirements,
    canUseBrokerSubmissionMetaRpc ? brokerProfileId : null,
    { includeOwner: false }
  );
  const brokerSummary = {
    id: user.id,
    first_name: user.first_name,
    last_name: user.last_name,
    email: user.email,
  };
  const items = enrichedRequirements.map((requirement) => ({
    ...requirement,
    owner: brokerSummary,
  }));

  let all = 0;
  let active = 0;
  let inactive = 0;
  let deleted = 0;

  if (countsResult.data) {
    for (const item of countsResult.data) {
      if (item.deleted_at !== null) {
        deleted++;
      } else {
        all++;
        if (item.is_active === true) {
          active++;
        } else if (item.is_active === false) {
          inactive++;
        }
      }
    }
  }

  const counts = { all, active, inactive, deleted };

  return {
    items,
    ...getPaginationResponseMeta(counts[filter], page, pageSize),
    counts,
  };
}

function getEnquiryFilter(value: string | null): EnquiryFilterId {
  return value === "unreplied" || value === "replied" || value === "failed" ? value : "all";
}

function chunkIds(ids: string[], chunkSize = ID_CHUNK_SIZE) {
  const chunks: string[][] = [];
  for (let index = 0; index < ids.length; index += chunkSize) {
    chunks.push(ids.slice(index, index + chunkSize));
  }
  return chunks;
}

async function resolveEnquirySearchContext(supabase: SupabaseClient, userId: string, pattern: string | null) {
  if (!pattern) {
    return { listingIds: [] as string[], replyEnquiryIds: [] as string[] };
  }

  const [listingsResult, repliesResult] = await Promise.all([
    supabase
      .from("listings")
      .select("id")
      .eq("created_by", userId)
      .or(`title.ilike.${pattern},property_type.ilike.${pattern},status.ilike.${pattern}`),
    supabase
      .from("enquiry_replies")
      .select("enquiry_id")
      .eq("broker_id", userId)
      .or(`subject.ilike.${pattern},message.ilike.${pattern},enquirer_email.ilike.${pattern},status.ilike.${pattern},failure_reason.ilike.${pattern}`),
  ]);
  const error = listingsResult.error || repliesResult.error;
  if (error) {
    throw new Error(error.message || "Failed to search broker enquiries.");
  }

  return {
    listingIds: uniqueDefinedIds(((listingsResult.data as Array<Pick<Listing, "id">> | null) || []).map((listing) => listing.id)),
    replyEnquiryIds: uniqueDefinedIds(
      ((repliesResult.data as Array<Pick<EnquiryReply, "enquiry_id">> | null) || []).map((reply) => reply.enquiry_id)
    ),
  };
}

function buildEnquirySearchOrFilter(
  pattern: string | null,
  { listingIds, replyEnquiryIds }: { listingIds: string[]; replyEnquiryIds: string[] }
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
  if (listingIds.length) clauses.push(`listing_id.in.(${toInFilterValue(listingIds)})`);
  if (replyEnquiryIds.length) clauses.push(`id.in.(${toInFilterValue(replyEnquiryIds)})`);
  return clauses.join(",");
}

type EnquiryFilterQuery = {
  eq(column: string, value: string): EnquiryFilterQuery;
  gte(column: string, value: string): EnquiryFilterQuery;
  lte(column: string, value: string): EnquiryFilterQuery;
  or(filter: string): EnquiryFilterQuery;
};

function applyEnquiryFilters<T>(
  query: T,
  userId: string,
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
  let nextQuery = (query as unknown as EnquiryFilterQuery).eq("to_user_id", userId);
  if (startDate) nextQuery = nextQuery.gte("created_at", startDate);
  if (endDate) nextQuery = nextQuery.lte("created_at", endDate);
  if (searchOrFilter) nextQuery = nextQuery.or(searchOrFilter);
  return nextQuery as unknown as T;
}

async function fetchReplyClassifications(supabase: SupabaseClient, enquiryIds: string[]) {
  if (!enquiryIds.length) return [] as ReplyClassification[];
  const results = await Promise.all(
    chunkIds(enquiryIds).map((idChunk) =>
      supabase.from("enquiry_replies").select("enquiry_id, status").in("enquiry_id", idChunk)
    )
  );
  const error = results.find((result) => result.error)?.error;
  if (error) throw new Error(error.message || "Failed to load broker enquiry reply counts.");
  return results.flatMap((result) => (result.data as ReplyClassification[] | null) || []);
}

async function fetchReplyMeta(supabase: SupabaseClient, enquiryIds: string[]) {
  if (!enquiryIds.length) return [] as ReplyMeta[];
  const results = await Promise.all(
    chunkIds(enquiryIds).map((idChunk) =>
      supabase
        .from("enquiry_replies")
        .select("enquiry_id, sent_at, status, created_at")
        .in("enquiry_id", idChunk)
        .order("created_at", { ascending: false })
    )
  );
  const error = results.find((result) => result.error)?.error;
  if (error) throw new Error(error.message || "Failed to load broker enquiry reply summaries.");
  return results.flatMap((result) => (result.data as ReplyMeta[] | null) || []);
}

function buildReplyClassificationMap(rows: ReplyClassification[]) {
  const map = new Map<string, { count: number; hasFailed: boolean }>();
  rows.forEach((reply) => {
    const current = map.get(reply.enquiry_id);
    map.set(reply.enquiry_id, {
      count: (current?.count || 0) + 1,
      hasFailed: current?.hasFailed || reply.status === "failed",
    });
  });
  return map;
}

function getEnquiryCounts(baseIds: string[], replyMap: ReturnType<typeof buildReplyClassificationMap>): AdminEnquiryListCounts {
  const counts: AdminEnquiryListCounts = { all: baseIds.length, unreplied: 0, replied: 0, failed: 0 };
  baseIds.forEach((id) => {
    const meta = replyMap.get(id);
    if (!meta?.count) counts.unreplied += 1;
    else if (meta.hasFailed) counts.failed += 1;
    else counts.replied += 1;
  });
  return counts;
}

function getFilteredEnquiryIds(baseIds: string[], replyMap: ReturnType<typeof buildReplyClassificationMap>, filter: EnquiryFilterId) {
  if (filter === "all") return baseIds;
  return baseIds.filter((id) => {
    const meta = replyMap.get(id);
    if (filter === "unreplied") return !meta?.count;
    if (!meta?.count) return false;
    return filter === "failed" ? meta.hasFailed : !meta.hasFailed;
  });
}

function buildReplyMetaMap(rows: ReplyMeta[]) {
  const map = new Map<string, { count: number; latestAt: string | null; latestStatus: EnquiryReply["status"] | null }>();
  rows.forEach((reply) => {
    const replyDate = reply.sent_at || reply.created_at;
    const current = map.get(reply.enquiry_id);
    const isNewer = !current?.latestAt || replyDate.localeCompare(current.latestAt) > 0;
    map.set(reply.enquiry_id, {
      count: (current?.count || 0) + 1,
      latestAt: isNewer ? replyDate : current?.latestAt || null,
      latestStatus: isNewer ? reply.status : current?.latestStatus || null,
    });
  });
  return map;
}

export async function fetchAdminBrokerEnquiries(
  supabase: SupabaseClient,
  userId: string,
  request: NextRequest
): Promise<AdminPaginatedResponse<AdminEnquiryListItem, AdminEnquiryListCounts>> {
  const { user } = await requireBrokerTarget(supabase, userId);
  const { page, pageSize, rangeFrom, rangeTo } = getAdminPaginationParams(request);
  const filter = getEnquiryFilter(request.nextUrl.searchParams.get("status"));
  const search = getSearchParam(request, "search");
  const pattern = getSafeIlikePattern(search);
  const startDate = getOptionalDateParam(request, "startDate");
  const endDate = getOptionalDateParam(request, "endDate");
  const brokerMatches = brokerMatchesSearch(user, search);
  const searchContext = await resolveEnquirySearchContext(supabase, userId, brokerMatches ? null : pattern);
  const searchOrFilter = brokerMatches ? null : buildEnquirySearchOrFilter(pattern, searchContext);
  const baseIdsResult = await applyEnquiryFilters(
    supabase.from("leads").select("id").order("created_at", { ascending: false }),
    userId,
    { endDate, searchOrFilter, startDate }
  );
  if (baseIdsResult.error) {
    throw new Error(baseIdsResult.error.message || "Failed to load broker enquiry ids.");
  }

  const baseIds = uniqueDefinedIds(((baseIdsResult.data as Array<Pick<Lead, "id">> | null) || []).map((lead) => lead.id));
  const replyClassificationMap = buildReplyClassificationMap(await fetchReplyClassifications(supabase, baseIds));
  const counts = getEnquiryCounts(baseIds, replyClassificationMap);
  const filteredIds = getFilteredEnquiryIds(baseIds, replyClassificationMap, filter);
  const pageIds = filteredIds.slice(rangeFrom, rangeTo + 1);
  let rows: Lead[] = [];

  if (pageIds.length) {
    const { data, error } = await supabase.from("leads").select(LEAD_SELECT).in("id", pageIds).order("created_at", { ascending: false });
    if (error) throw new Error(error.message || "Failed to load broker enquiries.");
    rows = (data as Lead[] | null) || [];
  }

  const [listingRowsResult, replyMetaRows] = await Promise.all([
    rows.some((row) => row.listing_id)
      ? supabase.from("listings").select(ENQUIRY_LISTING_SELECT).in("id", uniqueDefinedIds(rows.map((row) => row.listing_id)))
      : Promise.resolve({ data: [] as Array<Pick<Listing, "id" | "title" | "price" | "property_type" | "status" | "deleted_at">>, error: null }),
    fetchReplyMeta(supabase, rows.map((row) => row.id)),
  ]);
  if (listingRowsResult.error) {
    throw new Error(listingRowsResult.error.message || "Failed to hydrate broker enquiry listings.");
  }

  const listingMap = new Map(
    (((listingRowsResult.data as Array<Pick<Listing, "id" | "title" | "price" | "property_type" | "status" | "deleted_at">> | null) || []).map(
      (listing) => [listing.id, listing]
    ))
  );
  const replyMetaMap = buildReplyMetaMap(replyMetaRows);
  const brokerSummary = {
    id: user.id,
    first_name: user.first_name,
    last_name: user.last_name,
    email: user.email,
  };
  const items = rows.map((enquiry) => {
    const replyMeta = replyMetaMap.get(enquiry.id);
    const replyClassification = replyClassificationMap.get(enquiry.id);
    return {
      ...enquiry,
      listing: enquiry.listing_id ? listingMap.get(enquiry.listing_id) || null : null,
      broker: brokerSummary,
      replies: [],
      reply_count: replyClassification?.count ?? replyMeta?.count ?? 0,
      latest_reply_at: replyMeta?.latestAt || null,
      latest_reply_status: replyMeta?.latestStatus || null,
    };
  });

  return {
    items,
    ...getPaginationResponseMeta(counts[filter], page, pageSize),
    counts,
  };
}

type BrokerActivityQuery = {
  eq(column: string, value: string): BrokerActivityQuery;
  gte(column: string, value: string): BrokerActivityQuery;
  in(column: string, values: string[]): BrokerActivityQuery;
  lte(column: string, value: string): BrokerActivityQuery;
  or(filters: string): BrokerActivityQuery;
  order(column: string, options: { ascending: boolean }): BrokerActivityQuery;
  range(from: number, to: number): PromiseLike<{
    count: number | null;
    data: BrokerActivityRow[] | null;
    error: { message?: string | null } | null;
  }>;
};

type BrokerActivitySourceResult = {
  count: number;
  rows: BrokerActivityRow[];
};

type BrokerActivityTargetSource = {
  category: Exclude<ActivityFilterId, "all">;
  ids: string[];
  table: string;
};

function activityFilterIncludesTargetTable(filter: ActivityFilterId, targetTable: string) {
  return filter === "all" || getActivityCategory({ target_table: targetTable }) === filter;
}

function applyBrokerActivityCategoryFilter<T>(query: T, filter: ActivityFilterId): T {
  const nextQuery = query as unknown as BrokerActivityQuery;
  if (filter === "all") return nextQuery.or(NON_CHAT_ACTIVITY_OR_FILTER) as unknown as T;
  if (filter === "listings") return nextQuery.eq("target_table", "listings") as unknown as T;
  if (filter === "brokers") return nextQuery.or("target_table.in.(users,broker_profiles)") as unknown as T;
  if (filter === "credits") return nextQuery.eq("target_table", "broker_credits") as unknown as T;
  if (filter === "requirements") {
    return nextQuery.or("target_table.in.(requirements,requirement_matches)") as unknown as T;
  }
  if (filter === "system") {
    return nextQuery.or(SYSTEM_ACTIVITY_OR_FILTER) as unknown as T;
  }
  return query;
}

function applyBrokerActivityRequestFilters<T>(
  query: T,
  {
    endDate,
    filter,
    searchOrFilter,
    startDate,
  }: {
    endDate: string | null;
    filter?: ActivityFilterId;
    searchOrFilter: string | null;
    startDate: string | null;
  }
) {
  let nextQuery = query as unknown as BrokerActivityQuery;
  if (filter) nextQuery = applyBrokerActivityCategoryFilter(nextQuery, filter);
  if (startDate) nextQuery = nextQuery.gte("created_at", startDate);
  if (endDate) nextQuery = nextQuery.lte("created_at", endDate);
  if (searchOrFilter) nextQuery = nextQuery.or(searchOrFilter);
  return nextQuery;
}

function buildBrokerActivitySearchOrFilter(user: PlatformUser, search: string) {
  if (brokerMatchesSearch(user, search)) return null;
  const pattern = getSafeIlikePattern(search);
  if (!pattern) return null;

  const clauses = [
    `action.ilike.${pattern}`,
    `target_table.ilike.${pattern}`,
    ...BROKER_ACTIVITY_SEARCH_METADATA_KEYS.map((key) => `metadata->>${key}.ilike.${pattern}`),
  ];
  const actionPattern = getSafeIlikePattern(search.replace(/\s+/g, "_"));
  if (actionPattern && actionPattern !== pattern) clauses.push(`action.ilike.${actionPattern}`);
  return clauses.join(",");
}

async function discoverBrokerActivityTargetSources(
  supabase: SupabaseClient,
  userId: string,
  brokerProfileId: string | null
): Promise<BrokerActivityTargetSource[]> {
  const [listingIdsResult, requirementIdsResult, leadIdsResult] = await Promise.all([
    supabase.from("listings").select("id").eq("created_by", userId),
    applyRequirementScope(supabase.from("requirements").select("id"), userId, brokerProfileId),
    supabase.from("leads").select("id").eq("to_user_id", userId),
  ]);
  const idError = listingIdsResult.error || requirementIdsResult.error || leadIdsResult.error;
  if (idError) throw new Error(idError.message || "Failed to discover broker activity targets.");

  const listingIds = uniqueDefinedIds(((listingIdsResult.data as Array<{ id: string }> | null) || []).map((row) => row.id));
  const requirementIds = uniqueDefinedIds(((requirementIdsResult.data as Array<{ id: string }> | null) || []).map((row) => row.id));
  const leadIds = uniqueDefinedIds(((leadIdsResult.data as Array<{ id: string }> | null) || []).map((row) => row.id));
  const [incomingMatchesResult, submittedMatchesResult] = await Promise.all([
    requirementIds.length
      ? supabase.from("requirement_matches").select("id").in("requirement_id", requirementIds)
      : Promise.resolve({ data: [] as Array<{ id: string }>, error: null }),
    brokerProfileId
      ? supabase.from("requirement_matches").select("id").eq("sender_broker_id", brokerProfileId)
      : Promise.resolve({ data: [] as Array<{ id: string }>, error: null }),
  ]);
  const matchError = incomingMatchesResult.error || submittedMatchesResult.error;
  if (matchError) throw new Error(matchError.message || "Failed to discover broker match activity.");
  const requirementMatchIds = uniqueDefinedIds([
    ...(((incomingMatchesResult.data as Array<{ id: string }> | null) || []).map((row) => row.id)),
    ...(((submittedMatchesResult.data as Array<{ id: string }> | null) || []).map((row) => row.id)),
  ]);

  return [
    { category: "brokers", ids: [userId], table: "users" },
    { category: "credits", ids: [userId], table: "broker_credits" },
    { category: "brokers", ids: brokerProfileId ? [brokerProfileId] : [], table: "broker_profiles" },
    { category: "listings", ids: listingIds, table: "listings" },
    { category: "requirements", ids: requirementIds, table: "requirements" },
    { category: "requirements", ids: requirementMatchIds, table: "requirement_matches" },
    { category: "system", ids: leadIds, table: "leads" },
  ];
}

function mergeBrokerActivityRows(rowGroups: BrokerActivityRow[][], rangeFrom: number, rangeTo: number) {
  const activityMap = new Map<string, BrokerActivityRow>();
  rowGroups.flat().forEach((row) => activityMap.set(row.id, row));
  return Array.from(activityMap.values())
    .sort(
      (left, right) =>
        right.created_at.localeCompare(left.created_at) || right.id.localeCompare(left.id)
    )
    .slice(rangeFrom, rangeTo + 1);
}

async function fetchBrokerActivitySource(
  query: BrokerActivityQuery,
  rangeTo: number
): Promise<BrokerActivitySourceResult> {
  const { count, data, error } = await query
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .range(0, rangeTo);
  if (error) throw new Error(error.message || "Failed to load broker activity.");
  return {
    count: count || 0,
    rows: data || [],
  };
}

async function fetchBrokerActivityRowsByTargetIds(
  supabase: SupabaseClient,
  userId: string,
  targetTable: string,
  targetIds: string[],
  {
    endDate,
    rangeTo,
    searchOrFilter,
    startDate,
  }: {
    endDate: string | null;
    rangeTo: number;
    searchOrFilter: string | null;
    startDate: string | null;
  }
): Promise<BrokerActivitySourceResult[]> {
  const ids = uniqueDefinedIds(targetIds);
  if (!ids.length) return [] as BrokerActivitySourceResult[];

  const query = applyBrokerActivityRequestFilters(
    supabase
      .from("activity_log")
      .select(BROKER_ACTIVITY_SELECT, { count: "exact" })
      .eq("target_table", targetTable)
      .in("target_id", ids)
      .or(`actor_user_id.is.null,actor_user_id.neq.${userId}`) as unknown as BrokerActivityQuery,
    { endDate, searchOrFilter, startDate }
  );

  const result = await fetchBrokerActivitySource(query, rangeTo);
  return [result];
}

async function fetchBrokerActivityCategoryCounts(
  supabase: SupabaseClient,
  userId: string,
  targetSources: BrokerActivityTargetSource[],
  {
    endDate,
    searchOrFilter,
    startDate,
  }: {
    endDate: string | null;
    searchOrFilter: string | null;
    startDate: string | null;
  }
): Promise<ActivityCategoryCounts> {
  const [actorResults, targetGroups] = await Promise.all([
    Promise.all(
      ACTIVITY_CATEGORY_IDS.map((category) => {
        const query = applyBrokerActivityRequestFilters(
          supabase
            .from("activity_log")
            .select(BROKER_ACTIVITY_SELECT, { count: "exact" })
            .eq("actor_user_id", userId) as unknown as BrokerActivityQuery,
          { endDate, filter: category, searchOrFilter, startDate }
        );
        return fetchBrokerActivitySource(query, 0);
      })
    ),
    Promise.all(
      targetSources.map((source) =>
        fetchBrokerActivityRowsByTargetIds(supabase, userId, source.table, source.ids, {
          endDate,
          rangeTo: 0,
          searchOrFilter,
          startDate,
        })
      )
    ),
  ]);
  const counts = createEmptyActivityCategoryCounts();

  ACTIVITY_CATEGORY_IDS.forEach((category, index) => {
    counts[category] += actorResults[index].count;
  });
  targetGroups.forEach((sourceResults, sourceIndex) => {
    counts[targetSources[sourceIndex].category] += sourceResults.reduce((sum, result) => sum + result.count, 0);
  });
  counts.all = ACTIVITY_CATEGORY_IDS.reduce((sum, category) => sum + counts[category], 0);
  return counts;
}

export async function fetchAdminBrokerActivity(
  supabase: SupabaseClient,
  userId: string,
  request: NextRequest
): Promise<AdminBrokerActivityResponse> {
  const { user, brokerProfileId } = await requireBrokerTarget(supabase, userId, { includeBrokerProfileId: true });
  const { page, pageSize, rangeFrom, rangeTo } = getAdminPaginationParams(request);
  const filter = getActivityFilter(request.nextUrl.searchParams.get("category"));
  const searchOrFilter = buildBrokerActivitySearchOrFilter(user, getSearchParam(request, "search"));
  const startDate = getOptionalDateParam(request, "startDate");
  const endDate = getOptionalDateParam(request, "endDate");
  const targetSources = await discoverBrokerActivityTargetSources(supabase, userId, brokerProfileId);
  const actorQuery = applyBrokerActivityRequestFilters(
    supabase
      .from("activity_log")
      .select(BROKER_ACTIVITY_SELECT, { count: "exact" })
      .eq("actor_user_id", userId) as unknown as BrokerActivityQuery,
    { endDate, filter, searchOrFilter, startDate }
  );
  const selectedTargetSources = targetSources.filter((source) => activityFilterIncludesTargetTable(filter, source.table));
  const [categoryCounts, sourceGroups] = await Promise.all([
    fetchBrokerActivityCategoryCounts(supabase, userId, targetSources, { endDate, searchOrFilter, startDate }),
    Promise.all([
      fetchBrokerActivitySource(actorQuery, rangeTo),
      ...selectedTargetSources.map((source) =>
        fetchBrokerActivityRowsByTargetIds(supabase, userId, source.table, source.ids, {
          endDate,
          rangeTo,
          searchOrFilter,
          startDate,
        })
      ),
    ]),
  ]);
  const sourceResults = sourceGroups.flat() as BrokerActivitySourceResult[];
  const total = categoryCounts[filter];
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const activityRows = mergeBrokerActivityRows(
    sourceResults.map((source) => source.rows),
    rangeFrom,
    rangeTo
  );
  const activity = await hydrateActivityLogs(supabase, activityRows);
  return {
    activity,
    pagination: {
      page,
      pageSize,
      total,
      totalPages,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
    },
    totalCount: categoryCounts.all,
    filteredCount: total,
    categoryCounts,
  };
}

async function fetchBrokerAllActivityCount(
  supabase: SupabaseClient,
  user: PlatformUser,
  brokerProfileId: string | null
) {
  const targetSources = await discoverBrokerActivityTargetSources(supabase, user.id, brokerProfileId);
  const actorQuery = applyBrokerActivityRequestFilters(
    supabase
      .from("activity_log")
      .select(BROKER_ACTIVITY_SELECT, { count: "exact" })
      .eq("actor_user_id", user.id) as unknown as BrokerActivityQuery,
    { endDate: null, filter: "all", searchOrFilter: null, startDate: null }
  );
  const [actorResult, targetGroups] = await Promise.all([
    fetchBrokerActivitySource(actorQuery, 0),
    Promise.all(
      targetSources.map((source) =>
        fetchBrokerActivityRowsByTargetIds(supabase, user.id, source.table, source.ids, {
          endDate: null,
          rangeTo: 0,
          searchOrFilter: null,
          startDate: null,
        })
      )
    ),
  ]);
  return actorResult.count + targetGroups.flat().reduce((sum, result) => sum + result.count, 0);
}

export async function fetchAdminBrokerOverview(supabase: SupabaseClient, userId: string): Promise<AdminBrokerOverview> {
  const bundle = await fetchUserBundle(supabase, userId);
  if (!bundle.user || bundle.user.role !== "broker") {
    throw new AdminBrokerNotFoundError();
  }

  const brokerProfileId = bundle.brokerProfile?.id || null;
  const coveredAreaIds = uniqueDefinedIds(bundle.brokerProfile?.covered_area_ids || []);
  const [
    coveredAreasResult,
    metricsResult,
    deletedListingsResult,
    deletedRequirementIdsResult,
    submissionMetaResult,
    activityCount,
  ] = await Promise.all([
    coveredAreaIds.length
      ? supabase.from("areas").select("id, name, city, slug").in("id", coveredAreaIds)
      : Promise.resolve({ data: [] as Area[], error: null }),
    supabase.rpc("get_broker_dashboard_metrics", {
      p_user_id: userId,
      p_broker_profile_id: brokerProfileId,
    }),
    supabase.from("listings").select("id", { count: "exact", head: true }).eq("created_by", userId).not("deleted_at", "is", null),
    applyRequirementScope(
      supabase.from("requirements").select("id").not("deleted_at", "is", null),
      userId,
      brokerProfileId
    ),
    brokerProfileId
      ? supabase.rpc("get_requirement_submission_meta_for_broker", { p_broker_profile_id: brokerProfileId })
      : Promise.resolve({ data: [] as RequirementSubmissionMetaRow[], error: null }),
    fetchBrokerAllActivityCount(supabase, bundle.user, brokerProfileId),
  ]);
  const error =
    coveredAreasResult.error ||
    metricsResult.error ||
    deletedListingsResult.error ||
    deletedRequirementIdsResult.error ||
    submissionMetaResult.error;
  if (error) {
    throw new Error(error.message || "Failed to load broker overview.");
  }

  const metrics = ((metricsResult.data as BrokerDashboardMetricsRow[] | null) || [])[0];
  const deletedRequirementIds = new Set(
    (((deletedRequirementIdsResult.data as Array<{ id: string }> | null) || []).map((row) => row.id))
  );
  const currentSubmissionMeta = ((submissionMetaResult.data as RequirementSubmissionMetaRow[] | null) || []).filter(
    (row) => !deletedRequirementIds.has(row.requirement_id)
  );
  const submittedMatches = currentSubmissionMeta.reduce((total, row) => total + Number(row.submission_count || 0), 0);
  const withSubmittedMatches = currentSubmissionMeta.filter((row) => Number(row.submission_count || 0) > 0).length;
  const deletedRequirements = deletedRequirementIds.size;
  const totalRequirements = Math.max(0, Number(metrics?.total_requirements || 0) - deletedRequirements);

  return {
    broker: {
      ...bundle.user,
      brokerProfile: bundle.brokerProfile,
      agency: bundle.agency,
      credits: bundle.credits,
      coveredAreas: (coveredAreasResult.data as Area[] | null) || [],
    },
    counts: {
      listings: {
        total: Number(metrics?.total_listings || 0),
        active: Number(metrics?.active_listings || 0),
        pending: Number(metrics?.pending_listings || 0),
        deleted: deletedListingsResult.count || 0,
      },
      requirements: {
        total: totalRequirements,
        active: Number(metrics?.active_requirements || 0),
        inactive: Number(metrics?.inactive_requirements || 0),
        deleted: deletedRequirements,
        submittedMatches,
        withSubmittedMatches,
      },
      enquiries: Number(metrics?.public_enquiries || 0),
      activity: activityCount,
    },
  };
}
