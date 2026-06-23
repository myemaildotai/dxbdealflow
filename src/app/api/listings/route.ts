import { NextRequest, NextResponse } from "next/server";
import {
  attachBrowseIntel,
  buildListingIntel,
  compareByOpportunity,
  filterListingsByActiveTab,
  getBestDealIds,
  getBrowseTabCounts,
  sortListings,
  type BrowseClientFilters,
  type BrowseListingRecord,
  type BrowseServerFilters,
  type ListingComparableRecord,
  type ListingIntel,
  type BrowseTabId,
  type SortOption,
} from "@/components/browse-listings/browse-listings-utils";
import { getRequestUser, getServiceSupabase, withNoStore } from "@/lib/deal-server";
import { isActiveBrokerStatus } from "@/lib/deal-utils";
import { normalizeListingBedroomFilterValue } from "@/lib/listing-bedrooms";
import { buildPaginationMeta, DEFAULT_PAGE_SIZE, normalizePageNumber, normalizePageSize } from "@/lib/pagination";
import { fetchAreas, hydrateListings } from "@/lib/platform-server-data";
import type { Area, Listing } from "@/lib/deal-types";

const ACTIVE_LISTING_STATUSES = ["active", "approved"];
const DAY_IN_MS = 24 * 60 * 60 * 1000;
const MAX_LISTING_PRICE = 2_147_483_647;
const DERIVED_INTEL_CANDIDATE_LIMIT = 240;
const COMPARABLE_INTEL_LIMIT = 500;
const AREA_CACHE_TTL_MS = 5 * 60 * 1000;
const BROWSE_SUMMARY_CACHE_TTL_MS = 15 * 1000;
const COMPARABLE_CACHE_TTL_MS = 30 * 1000;
const BROWSE_SUMMARY_CACHE_MAX_ENTRIES = 64;
const BROWSE_LISTING_SELECT =
  "id, title, property_type, deal_type, bedrooms, size_sqft, area_id, developer, price, payment_plan, handover_date, yield_percent, notes, description, status, is_visible, created_at, updated_at, deleted_at, created_by, agency_id";
const COMPARABLE_LISTING_SELECT =
  "id, area_id, bedrooms, deleted_at, is_visible, price, property_type, status";
const BROWSE_TAB_IDS: BrowseTabId[] = [
  "all",
  "new-deals",
  "urgent-sellers",
  "below-market",
  "recent-price-drop",
  "best-deals",
  "off-market",
];
const SORT_OPTIONS: SortOption[] = ["newest", "price_asc", "roi_desc"];
const PROPERTY_TYPE_OPTIONS = [
  "apartment",
  "villa",
  "townhouse",
  "penthouse",
  "office",
  "retail",
  "warehouse",
  "land",
] as const;
const DEAL_TYPE_OPTIONS = ["urgent", "distressed", "off-market"] as const;
const ADDED_TIME_OPTIONS = ["today", "7d", "30d"] as const;
const ROI_OPTIONS = ["5", "6.5", "8", "10"] as const;
const SEARCH_COLUMNS = ["title", "developer", "description", "notes"] as const;
const DEAL_SIGNAL_COLUMNS = ["title", "notes", "description", "payment_plan"] as const;
const URGENT_SIGNAL_TERMS = [
  "urgent",
  "motivated",
  "must sell",
  "seller needs",
  "quick sale",
  "cashflow",
  "cash flow",
  "vacant on transfer",
] as const;
const PRICE_DROP_SIGNAL_TERMS = [
  "price drop",
  "price cut",
  "price reduced",
  "reduced",
  "discount",
  "discounted",
  "below ask",
  "cut price",
  "cheaper",
] as const;

type ListingQueryResult = {
  data: Listing[] | null;
  count: number | null;
  error: { message?: string } | null;
};

type ListingQueryBuilder = PromiseLike<ListingQueryResult> & {
  eq(column: string, value: unknown): ListingQueryBuilder;
  gte(column: string, value: unknown): ListingQueryBuilder;
  in(column: string, values: readonly unknown[]): ListingQueryBuilder;
  is(column: string, value: null): ListingQueryBuilder;
  limit(count: number): PromiseLike<ListingQueryResult>;
  lte(column: string, value: unknown): ListingQueryBuilder;
  or(filters: string): ListingQueryBuilder;
  order(
    column: string,
    options?: { ascending?: boolean; nullsFirst?: boolean },
  ): ListingQueryBuilder;
  range(from: number, to: number): PromiseLike<ListingQueryResult>;
};

type PageListingResult = {
  listings: Listing[];
};

type RequestTimings = Map<string, number>;

type DbBackedTabCounts = {
  "new-deals": number;
  "urgent-sellers": number;
  "recent-price-drop": number;
  "off-market": number;
};

type BrowseSummary = {
  bestDealIds: Set<string>;
  comparableListings: ListingComparableRecord[];
  filteredCount: number;
  filteredIntelCandidates: ListingIntel[];
  tabCounts: Record<BrowseTabId, number>;
};

type BrowseCountRpcRow = {
  filtered_count: number | string | null;
  new_deals_count: number | string | null;
  urgent_sellers_count: number | string | null;
  recent_price_drop_count: number | string | null;
  off_market_count: number | string | null;
};

type PromiseCacheEntry<T> = {
  expiresAt: number;
  promise: Promise<T>;
};

const ZERO_UUID = "00000000-0000-0000-0000-000000000000";
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
let areasCache: PromiseCacheEntry<Area[]> | null = null;
let browseCountRpcAvailable: boolean | null = null;
const browseSummaryCache = new Map<string, PromiseCacheEntry<BrowseSummary>>();
const comparableListingsCache = new Map<
  string,
  PromiseCacheEntry<ListingComparableRecord[]>
>();

async function measure<T>(
  timings: RequestTimings,
  name: string,
  operation: () => Promise<T>,
) {
  const startedAt = performance.now();

  try {
    return await operation();
  } finally {
    timings.set(name, performance.now() - startedAt);
  }
}

function recordTiming(
  timings: RequestTimings,
  name: string,
  startedAt: number,
) {
  timings.set(name, performance.now() - startedAt);
}

function buildServerTimingHeader(timings: RequestTimings) {
  return Array.from(timings.entries())
    .map(([name, duration]) => `${name};dur=${duration.toFixed(1)}`)
    .join(", ");
}

function getCachedPromise<T>(
  cache: Map<string, PromiseCacheEntry<T>>,
  key: string,
  ttlMs: number,
  load: () => Promise<T>,
) {
  const now = Date.now();
  const cached = cache.get(key);

  if (cached && cached.expiresAt > now) {
    return cached.promise;
  }

  if (cached) {
    cache.delete(key);
  }

  while (cache.size >= BROWSE_SUMMARY_CACHE_MAX_ENTRIES) {
    const oldestKey = cache.keys().next().value as string | undefined;
    if (!oldestKey) {
      break;
    }
    cache.delete(oldestKey);
  }

  const promise = load().catch((error) => {
    cache.delete(key);
    throw error;
  });
  cache.set(key, { expiresAt: now + ttlMs, promise });
  return promise;
}

function fetchCachedAreas() {
  const now = Date.now();

  if (areasCache && areasCache.expiresAt > now) {
    return areasCache.promise;
  }

  const promise = fetchAreas(getServiceSupabase()).catch((error) => {
    areasCache = null;
    throw error;
  });
  areasCache = {
    expiresAt: now + AREA_CACHE_TTL_MS,
    promise,
  };
  return promise;
}

function normalizeLookupValue(value: string | null | undefined) {
  return value?.trim().toLowerCase() || "";
}

function normalizeNumericParam(value: string | null | undefined) {
  return String(value ?? "").replace(/[^\d]/g, "");
}

function normalizePropertyTypeParam(value: string | null | undefined) {
  const normalizedValue = normalizeLookupValue(value).replace(/\s+/g, "_");
  return PROPERTY_TYPE_OPTIONS.includes(normalizedValue as (typeof PROPERTY_TYPE_OPTIONS)[number])
    ? normalizedValue
    : "";
}

function normalizeOptionParam<T extends string>(
  value: string | null | undefined,
  options: readonly T[],
) {
  const normalizedValue = normalizeLookupValue(value);

  if (!normalizedValue) {
    return "";
  }

  return options.find((option) => option.toLowerCase() === normalizedValue) || "";
}

function resolveBrowseServerFilters(searchParams: URLSearchParams): BrowseServerFilters {
  return {
    areaId: String(searchParams.get("areaId") || "").trim(),
    minPrice: normalizeNumericParam(searchParams.get("minPrice")),
    maxPrice: normalizeNumericParam(searchParams.get("maxPrice")),
    propertyType: normalizePropertyTypeParam(searchParams.get("propertyType")),
  };
}

function resolveBrowseClientFilters(searchParams: URLSearchParams): BrowseClientFilters {
  return {
    search: String(searchParams.get("keyword") || searchParams.get("search") || "").trim(),
    beds: normalizeListingBedroomFilterValue(searchParams.get("beds")),
    developer: String(searchParams.get("developer") || "").trim(),
    roi: normalizeOptionParam(searchParams.get("roi"), ROI_OPTIONS),
    dealType: normalizeOptionParam(searchParams.get("dealType"), DEAL_TYPE_OPTIONS),
    addedTime: normalizeOptionParam(searchParams.get("addedTime"), ADDED_TIME_OPTIONS),
    sort: (normalizeOptionParam(searchParams.get("sort"), SORT_OPTIONS) as SortOption) || "newest",
  };
}

function resolveActiveTab(searchParams: URLSearchParams): BrowseTabId {
  const activeTab = normalizeLookupValue(searchParams.get("tab"));

  return BROWSE_TAB_IDS.includes(activeTab as BrowseTabId)
    ? (activeTab as BrowseTabId)
    : "all";
}

function createListingsQuery(
  supabase: ReturnType<typeof getServiceSupabase>,
  options: { count?: "exact"; head?: boolean } = {},
  select = BROWSE_LISTING_SELECT,
) {
  return supabase
    .from("listings")
    .select(select, options) as unknown as ListingQueryBuilder;
}

function isUuid(value: string) {
  return UUID_PATTERN.test(value);
}

function applyNoMatches(query: ListingQueryBuilder) {
  return query.eq("id", ZERO_UUID);
}

function applyVisibleListingScope(query: ListingQueryBuilder) {
  return query
    .eq("is_visible", true)
    .is("deleted_at", null)
    .in("status", ACTIVE_LISTING_STATUSES);
}

function applyBrowseServerFilters(
  query: ListingQueryBuilder,
  serverFilters: BrowseServerFilters,
) {
  let nextQuery = query;

  if (serverFilters.areaId) {
    nextQuery = isUuid(serverFilters.areaId)
      ? nextQuery.eq("area_id", serverFilters.areaId)
      : applyNoMatches(nextQuery);
  }

  if (serverFilters.propertyType) {
    nextQuery = nextQuery.eq("property_type", serverFilters.propertyType);
  }

  if (serverFilters.minPrice) {
    const minPrice = Number(serverFilters.minPrice);
    nextQuery = minPrice > MAX_LISTING_PRICE
      ? applyNoMatches(nextQuery)
      : nextQuery.gte("price", minPrice);
  }

  if (serverFilters.maxPrice) {
    nextQuery = nextQuery.lte(
      "price",
      Math.min(Number(serverFilters.maxPrice), MAX_LISTING_PRICE),
    );
  }

  return nextQuery;
}

function sanitizePostgrestPattern(value: string) {
  return value.replace(/[(),%]/g, " ").replace(/\s+/g, " ").trim();
}

function buildIlikeClauses(
  columns: readonly string[],
  value: string,
) {
  const pattern = sanitizePostgrestPattern(value);

  if (!pattern) {
    return [];
  }

  return columns.map((column) => `${column}.ilike.%${pattern}%`);
}

function buildKeywordClauses(
  columns: readonly string[],
  values: readonly string[],
) {
  return values.flatMap((value) => buildIlikeClauses(columns, value));
}

function applyOrClauses(query: ListingQueryBuilder, clauses: string[]) {
  return clauses.length ? query.or(clauses.join(",")) : applyNoMatches(query);
}

function getSearchAreaIds(search: string, areas: Area[]) {
  const normalizedSearch = search.trim().toLowerCase();

  if (!normalizedSearch) {
    return [];
  }

  return areas
    .filter((area) => {
      const areaTokens = [area.name, area.city]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return areaTokens.includes(normalizedSearch);
    })
    .map((area) => area.id);
}

function applySearchFilter(
  query: ListingQueryBuilder,
  search: string,
  areas: Area[],
) {
  const normalizedSearch = search.trim();

  if (!normalizedSearch) {
    return query;
  }

  const clauses = buildIlikeClauses(SEARCH_COLUMNS, normalizedSearch);
  const areaIds = getSearchAreaIds(normalizedSearch, areas);

  if (areaIds.length) {
    clauses.push(`area_id.in.(${areaIds.join(",")})`);
  }

  return applyOrClauses(query, clauses);
}

function applyBedroomFilter(query: ListingQueryBuilder, beds: string) {
  if (!beds) {
    return query;
  }

  if (beds === "0") {
    return query.eq("bedrooms", 0);
  }

  if (beds === "4+") {
    return query.gte("bedrooms", 4);
  }

  if (beds === "8+") {
    return query.gte("bedrooms", 8);
  }

  return query.eq("bedrooms", Number(beds));
}

function getAddedTimeThreshold(value: string) {
  switch (value) {
    case "today":
      return new Date(Date.now() - DAY_IN_MS).toISOString();
    case "7d":
      return new Date(Date.now() - 7 * DAY_IN_MS).toISOString();
    case "30d":
      return new Date(Date.now() - 30 * DAY_IN_MS).toISOString();
    default:
      return null;
  }
}

function applyAddedTimeFilter(query: ListingQueryBuilder, addedTime: string) {
  const threshold = getAddedTimeThreshold(addedTime);

  return threshold ? query.gte("created_at", threshold) : query;
}

function applyUrgentSellerCondition(query: ListingQueryBuilder) {
  return applyOrClauses(query, [
    "deal_type.eq.urgent_sale",
    ...buildKeywordClauses(DEAL_SIGNAL_COLUMNS, URGENT_SIGNAL_TERMS),
  ]);
}

function applyPriceDropSignalCondition(query: ListingQueryBuilder) {
  return applyOrClauses(
    query.gte("updated_at", new Date(Date.now() - 21 * DAY_IN_MS).toISOString()),
    buildKeywordClauses(DEAL_SIGNAL_COLUMNS, PRICE_DROP_SIGNAL_TERMS),
  );
}

function applyDealTypeFilter(
  query: ListingQueryBuilder,
  dealType: BrowseClientFilters["dealType"],
) {
  switch (dealType) {
    case "urgent":
      return applyUrgentSellerCondition(query);
    case "distressed":
      return query.eq("deal_type", "distressed");
    case "off-market":
      return query.eq("deal_type", "secondary");
    default:
      return query;
  }
}

function applyBrowseClientFilters(
  query: ListingQueryBuilder,
  clientFilters: BrowseClientFilters,
  areas: Area[],
) {
  let nextQuery = query;

  nextQuery = applySearchFilter(nextQuery, clientFilters.search, areas);
  nextQuery = applyBedroomFilter(nextQuery, clientFilters.beds);

  if (clientFilters.developer) {
    nextQuery = nextQuery.eq("developer", clientFilters.developer);
  }

  if (clientFilters.roi) {
    nextQuery = nextQuery.gte("yield_percent", Number(clientFilters.roi));
  }

  nextQuery = applyDealTypeFilter(nextQuery, clientFilters.dealType);
  nextQuery = applyAddedTimeFilter(nextQuery, clientFilters.addedTime);

  return nextQuery;
}

function applyBaseBrowseFilters(
  query: ListingQueryBuilder,
  serverFilters: BrowseServerFilters,
  clientFilters: BrowseClientFilters,
  areas: Area[],
) {
  let nextQuery = applyVisibleListingScope(query);
  nextQuery = applyBrowseServerFilters(nextQuery, serverFilters);
  nextQuery = applyBrowseClientFilters(nextQuery, clientFilters, areas);

  return nextQuery;
}

function applyActiveTabFilter(
  query: ListingQueryBuilder,
  activeTab: BrowseTabId,
) {
  switch (activeTab) {
    case "new-deals":
      return query.gte("created_at", new Date(Date.now() - DAY_IN_MS).toISOString());
    case "urgent-sellers":
      return applyUrgentSellerCondition(query);
    case "recent-price-drop":
      return applyPriceDropSignalCondition(query);
    case "off-market":
      return query.eq("deal_type", "secondary");
    case "all":
    case "below-market":
    case "best-deals":
    default:
      return query;
  }
}

function canApplyActiveTabInDatabase(activeTab: BrowseTabId) {
  return activeTab !== "below-market" && activeTab !== "best-deals";
}

function applyListingSort(query: ListingQueryBuilder, sort: SortOption) {
  switch (sort) {
    case "price_asc":
      return query
        .order("price", { ascending: true })
        .order("created_at", { ascending: false })
        .order("id", { ascending: true });
    case "roi_desc":
      return query
        .order("yield_percent", { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: false })
        .order("id", { ascending: true });
    case "newest":
    default:
      return query
        .order("created_at", { ascending: false })
        .order("id", { ascending: true });
  }
}

function attachAreasToListings(listings: Listing[], areaMap: Map<string, Area>) {
  return listings.map((listing) => ({
    ...listing,
    area: listing.area_id ? areaMap.get(listing.area_id) || null : null,
  }));
}

async function countBrowseListings(
  supabase: ReturnType<typeof getServiceSupabase>,
  serverFilters: BrowseServerFilters,
  clientFilters: BrowseClientFilters,
  areas: Area[],
  activeTab?: BrowseTabId,
) {
  let query = createListingsQuery(supabase, { count: "exact", head: true }, "id");
  query = applyBaseBrowseFilters(query, serverFilters, clientFilters, areas);

  if (activeTab && canApplyActiveTabInDatabase(activeTab)) {
    query = applyActiveTabFilter(query, activeTab);
  }

  const { count, error } = await query;

  if (error) {
    throw new Error(error.message || "Failed to count listings.");
  }

  return count || 0;
}

async function fetchPagedBrowseListings(
  supabase: ReturnType<typeof getServiceSupabase>,
  serverFilters: BrowseServerFilters,
  clientFilters: BrowseClientFilters,
  areas: Area[],
  areaMap: Map<string, Area>,
  activeTab: BrowseTabId,
  rangeFrom: number,
  rangeTo: number,
): Promise<PageListingResult> {
  let query = createListingsQuery(supabase);
  query = applyBaseBrowseFilters(query, serverFilters, clientFilters, areas);

  if (canApplyActiveTabInDatabase(activeTab)) {
    query = applyActiveTabFilter(query, activeTab);
  }

  query = applyListingSort(query, clientFilters.sort);

  const { data, error } = await query.range(rangeFrom, rangeTo);

  if (error) {
    throw new Error(error.message || "Failed to load listings.");
  }

  return {
    listings: attachAreasToListings(data || [], areaMap),
  };
}

async function fetchFilteredIntelCandidateListings(
  supabase: ReturnType<typeof getServiceSupabase>,
  serverFilters: BrowseServerFilters,
  clientFilters: BrowseClientFilters,
  areas: Area[],
  areaMap: Map<string, Area>,
) {
  let query = createListingsQuery(supabase);
  query = applyBaseBrowseFilters(query, serverFilters, clientFilters, areas);
  query = query
    .order("yield_percent", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false })
    .order("id", { ascending: true });

  const { data, error } = await query.limit(DERIVED_INTEL_CANDIDATE_LIMIT);

  if (error) {
    throw new Error(error.message || "Failed to load listing intel.");
  }

  return attachAreasToListings(data || [], areaMap);
}

async function fetchComparableMarketListings(
  supabase: ReturnType<typeof getServiceSupabase>,
  listings: Listing[],
) {
  const areaIds = Array.from(
    new Set(listings.map((listing) => listing.area_id).filter(Boolean)),
  ) as string[];

  if (!areaIds.length) {
    return listings;
  }

  const { data, error } = await supabase
    .from("listings")
    .select(COMPARABLE_LISTING_SELECT)
    .eq("is_visible", true)
    .is("deleted_at", null)
    .in("status", ACTIVE_LISTING_STATUSES)
    .in("area_id", areaIds)
    .order("created_at", { ascending: false })
    .limit(COMPARABLE_INTEL_LIMIT);

  if (error) {
    throw new Error(error.message || "Failed to load comparable listings.");
  }

  return (data as ListingComparableRecord[] | null) || [];
}

function fetchCachedComparableMarketListings(
  supabase: ReturnType<typeof getServiceSupabase>,
  listings: Listing[],
) {
  const areaIds = Array.from(
    new Set(listings.map((listing) => listing.area_id).filter(Boolean)),
  ).sort() as string[];

  if (!areaIds.length) {
    return Promise.resolve([] as ListingComparableRecord[]);
  }

  return getCachedPromise(
    comparableListingsCache,
    areaIds.join(","),
    COMPARABLE_CACHE_TTL_MS,
    () => fetchComparableMarketListings(supabase, listings),
  );
}

function buildIntelForListings(
  listings: Listing[],
  marketListings: ListingComparableRecord[],
) {
  return listings.map((listing) => buildListingIntel(listing, marketListings));
}

async function ensureComparableListingsForPage(
  supabase: ReturnType<typeof getServiceSupabase>,
  comparableListings: ListingComparableRecord[],
  pageListings: Listing[],
) {
  const coveredAreaIds = new Set(
    comparableListings.map((listing) => listing.area_id).filter(Boolean),
  );
  const listingsInMissingAreas = pageListings.filter(
    (listing) => listing.area_id && !coveredAreaIds.has(listing.area_id),
  );

  if (!listingsInMissingAreas.length) {
    return comparableListings;
  }

  const additionalListings = await fetchCachedComparableMarketListings(
    supabase,
    listingsInMissingAreas,
  );
  return [...comparableListings, ...additionalListings];
}

function getBestDealCount(filteredCount: number) {
  if (!filteredCount) {
    return 0;
  }

  return Math.min(Math.max(Math.ceil(filteredCount * 0.2), 1), 12);
}

function normalizeCount(value: number | string | null | undefined) {
  const count = Number(value || 0);
  return Number.isFinite(count) ? count : 0;
}

async function getBrowseCountsFallback(
  supabase: ReturnType<typeof getServiceSupabase>,
  serverFilters: BrowseServerFilters,
  clientFilters: BrowseClientFilters,
  areas: Area[],
) {
  const [filteredCount, newDeals, urgentSellers, recentPriceDrop, offMarket] = await Promise.all([
    countBrowseListings(supabase, serverFilters, clientFilters, areas),
    countBrowseListings(supabase, serverFilters, clientFilters, areas, "new-deals"),
    countBrowseListings(supabase, serverFilters, clientFilters, areas, "urgent-sellers"),
    countBrowseListings(supabase, serverFilters, clientFilters, areas, "recent-price-drop"),
    countBrowseListings(supabase, serverFilters, clientFilters, areas, "off-market"),
  ]);

  return {
    filteredCount,
    dbBackedTabCounts: {
      "new-deals": newDeals,
      "urgent-sellers": urgentSellers,
      "recent-price-drop": recentPriceDrop,
      "off-market": offMarket,
    } satisfies DbBackedTabCounts,
  };
}

async function fetchBrowseCounts(
  supabase: ReturnType<typeof getServiceSupabase>,
  serverFilters: BrowseServerFilters,
  clientFilters: BrowseClientFilters,
  areas: Area[],
) {
  if (serverFilters.areaId && !isUuid(serverFilters.areaId)) {
    return {
      filteredCount: 0,
      dbBackedTabCounts: {
        "new-deals": 0,
        "urgent-sellers": 0,
        "recent-price-drop": 0,
        "off-market": 0,
      } satisfies DbBackedTabCounts,
    };
  }

  if (browseCountRpcAvailable === false) {
    return getBrowseCountsFallback(supabase, serverFilters, clientFilters, areas);
  }

  const search = sanitizePostgrestPattern(clientFilters.search) || null;
  const searchAreaIds = search ? getSearchAreaIds(search, areas) : [];
  const addedAfter = getAddedTimeThreshold(clientFilters.addedTime);
  const { data, error } = await supabase.rpc("get_listing_browse_counts", {
    p_added_after: addedAfter,
    p_area_id: isUuid(serverFilters.areaId) ? serverFilters.areaId : null,
    p_bedrooms: clientFilters.beds || null,
    p_deal_type: clientFilters.dealType || null,
    p_developer: clientFilters.developer || null,
    p_max_price: serverFilters.maxPrice ? Number(serverFilters.maxPrice) : null,
    p_min_price: serverFilters.minPrice ? Number(serverFilters.minPrice) : null,
    p_min_roi: clientFilters.roi ? Number(clientFilters.roi) : null,
    p_property_type: serverFilters.propertyType || null,
    p_search: search,
    p_search_area_ids: searchAreaIds,
  });
  const [row] = (data || []) as BrowseCountRpcRow[];

  if (!error && row) {
    browseCountRpcAvailable = true;
    return {
      filteredCount: normalizeCount(row.filtered_count),
      dbBackedTabCounts: {
        "new-deals": normalizeCount(row.new_deals_count),
        "urgent-sellers": normalizeCount(row.urgent_sellers_count),
        "recent-price-drop": normalizeCount(row.recent_price_drop_count),
        "off-market": normalizeCount(row.off_market_count),
      } satisfies DbBackedTabCounts,
    };
  }

  browseCountRpcAvailable = false;
  return getBrowseCountsFallback(supabase, serverFilters, clientFilters, areas);
}

function getBrowseSummaryCacheKey(
  serverFilters: BrowseServerFilters,
  clientFilters: BrowseClientFilters,
) {
  return JSON.stringify({
    ...serverFilters,
    ...clientFilters,
    sort: undefined,
  });
}

async function buildBrowseSummary(
  supabase: ReturnType<typeof getServiceSupabase>,
  serverFilters: BrowseServerFilters,
  clientFilters: BrowseClientFilters,
  areas: Area[],
  areaMap: Map<string, Area>,
): Promise<BrowseSummary> {
  const [counts, candidateListings] = await Promise.all([
    fetchBrowseCounts(supabase, serverFilters, clientFilters, areas),
    fetchFilteredIntelCandidateListings(supabase, serverFilters, clientFilters, areas, areaMap),
  ]);
  const comparableListings = await fetchCachedComparableMarketListings(supabase, candidateListings);
  const filteredIntelCandidates = buildIntelForListings(candidateListings, comparableListings);
  const bestDealIds = getBestDealIds(filteredIntelCandidates);
  const candidateTabCounts = getBrowseTabCounts(filteredIntelCandidates, bestDealIds);

  return {
    bestDealIds,
    comparableListings,
    filteredCount: counts.filteredCount,
    filteredIntelCandidates,
    tabCounts: {
      ...candidateTabCounts,
      all: counts.filteredCount,
      ...counts.dbBackedTabCounts,
      "best-deals": getBestDealCount(counts.filteredCount),
    },
  };
}

function getCachedBrowseSummary(
  supabase: ReturnType<typeof getServiceSupabase>,
  serverFilters: BrowseServerFilters,
  clientFilters: BrowseClientFilters,
  areas: Area[],
  areaMap: Map<string, Area>,
) {
  const cacheKey = getBrowseSummaryCacheKey(serverFilters, clientFilters);
  return getCachedPromise(
    browseSummaryCache,
    cacheKey,
    BROWSE_SUMMARY_CACHE_TTL_MS,
    () => buildBrowseSummary(supabase, serverFilters, clientFilters, areas, areaMap),
  );
}

async function hydrateBrowseListingsFromIntel(
  supabase: ReturnType<typeof getServiceSupabase>,
  items: ListingIntel[],
  bestDealIds: Set<string>,
  viewerId: string | null,
  viewerIsBroker: boolean,
  viewerCanSeeInternal: boolean,
) {
  const hydratedListings = await hydrateListings(
    supabase,
    items.map((item) => item.listing),
    {
      includeAgencies: false,
      includeAreas: false,
      includeCommissionTerms: false,
      includeOwnerActiveCount: false,
      includeOwners: false,
    },
  );
  const itemMap = new Map(items.map((item) => [item.listing.id, item]));

  return hydratedListings.map((listing) => {
    const intel = itemMap.get(listing.id) || buildListingIntel(listing, hydratedListings);

    return applyBrowseViewerState(
      attachBrowseIntel(listing, intel, {
        isBestDeal: bestDealIds.has(listing.id),
      }),
      viewerId,
      viewerIsBroker,
      viewerCanSeeInternal,
    );
  });
}

function applyBrowseViewerState(
  listing: BrowseListingRecord,
  viewerId: string | null,
  viewerIsBroker: boolean,
  viewerCanSeeInternal: boolean,
) {
  return {
    ...listing,
    can_chat: viewerIsBroker,
    can_edit: viewerId === listing.created_by,
    commission_terms: viewerCanSeeInternal ? listing.commission_terms || null : null,
    owner: viewerCanSeeInternal ? listing.owner || null : null,
    agency: viewerCanSeeInternal ? listing.agency || null : null,
    owner_active_listings_count: viewerCanSeeInternal
      ? listing.owner_active_listings_count ?? null
      : null,
  };
}

export async function GET(request: NextRequest) {
  const requestStartedAt = performance.now();
  const timings: RequestTimings = new Map();
  const supabase = getServiceSupabase();

  const searchParams = request.nextUrl.searchParams;
  const page = normalizePageNumber(searchParams.get("page"));
  const pageSize = normalizePageSize(searchParams.get("pageSize") || DEFAULT_PAGE_SIZE);
  const rangeFrom = (page - 1) * pageSize;
  const rangeTo = rangeFrom + pageSize - 1;
  const serverFilters = resolveBrowseServerFilters(searchParams);
  const clientFilters = resolveBrowseClientFilters(searchParams);
  const activeTab = resolveActiveTab(searchParams);

  const [viewer, areas] = await Promise.all([
    measure(timings, "auth", () => getRequestUser(request)),
    measure(timings, "areas", fetchCachedAreas),
  ]);
  const viewerIsBroker = !!viewer && viewer.role === "broker" && isActiveBrokerStatus(viewer.status);
  const viewerCanSeeInternal = viewerIsBroker || viewer?.role === "admin";
  const areaMap = new Map(areas.map((area) => [area.id, area]));

  const summaryPromise = measure(timings, "summary", () =>
    getCachedBrowseSummary(supabase, serverFilters, clientFilters, areas, areaMap),
  );
  const pageResultPromise = canApplyActiveTabInDatabase(activeTab)
    ? measure(timings, "page_query", () =>
        fetchPagedBrowseListings(
          supabase,
          serverFilters,
          clientFilters,
          areas,
          areaMap,
          activeTab,
          rangeFrom,
          rangeTo,
        ),
      )
    : Promise.resolve<PageListingResult | null>(null);
  const [summary, pageResult] = await Promise.all([summaryPromise, pageResultPromise]);

  const {
    bestDealIds,
    filteredCount,
    filteredIntelCandidates,
    tabCounts,
  } = summary;
  let pageItems: ListingIntel[] = [];
  let totalCount = 0;

  if (pageResult) {
    const comparableListings = await measure(timings, "page_comparables", () =>
      ensureComparableListingsForPage(
        supabase,
        summary.comparableListings,
        pageResult.listings,
      ),
    );
    const pageIntelStartedAt = performance.now();
    pageItems = buildIntelForListings(pageResult.listings, comparableListings);
    recordTiming(timings, "page_intel", pageIntelStartedAt);
    totalCount = activeTab === "all" ? filteredCount : tabCounts[activeTab];
  } else {
    const derivedPageStartedAt = performance.now();
    const tabFilteredCandidates = filterListingsByActiveTab(
      filteredIntelCandidates,
      activeTab,
      bestDealIds,
    );
    const sortedCandidates = sortListings(tabFilteredCandidates, clientFilters.sort);

    pageItems = sortedCandidates.slice(rangeFrom, rangeFrom + pageSize);
    totalCount = sortedCandidates.length;
    recordTiming(timings, "derived_page", derivedPageStartedAt);
  }

  const topDealComputeStartedAt = performance.now();
  const topDealSource = filterListingsByActiveTab(
    filteredIntelCandidates,
    activeTab,
    bestDealIds,
  );
  const topDealItem =
    [...topDealSource].sort(compareByOpportunity)[0] || null;
  recordTiming(timings, "top_deal_compute", topDealComputeStartedAt);

  const hydrationItems = [...pageItems];
  if (
    topDealItem &&
    !hydrationItems.some((item) => item.listing.id === topDealItem.listing.id)
  ) {
    hydrationItems.push(topDealItem);
  }
  const hydratedListings = await measure(timings, "hydration", () =>
    hydrateBrowseListingsFromIntel(
      supabase,
      hydrationItems,
      bestDealIds,
      viewer?.id || null,
      viewerIsBroker,
      viewerCanSeeInternal,
    ),
  );
  const hydratedListingMap = new Map(
    hydratedListings.map((listing) => [listing.id, listing]),
  );
  const browseListings = pageItems.flatMap((item) => {
    const listing = hydratedListingMap.get(item.listing.id);
    return listing ? [listing] : [];
  });
  const topDealListing = topDealItem
    ? hydratedListingMap.get(topDealItem.listing.id) || null
    : null;
  const pagination = buildPaginationMeta({
    page,
    pageSize,
    totalCount,
  });

  const responseBuildStartedAt = performance.now();
  const response = NextResponse.json(
    {
      viewerIsBroker,
      areas,
      pagination,
      summary: {
        totalCount,
        filteredCount,
        tabCounts,
        topDeal: topDealListing,
      },
      listings: browseListings,
    },
    withNoStore()
  );
  recordTiming(timings, "response_build", responseBuildStartedAt);
  recordTiming(timings, "total", requestStartedAt);
  response.headers.set("Server-Timing", buildServerTimingHeader(timings));
  return response;
}
