import { NextRequest, NextResponse } from "next/server";
import {
  attachBrowseIntel,
  buildListingIntel,
  compareByOpportunity,
  filterListingsByActiveTab,
  filterListingsByClientFilters,
  getBestDealIds,
  getBrowseTabCounts,
  matchesListingServerFilters,
  sortListings,
  type BrowseClientFilters,
  type BrowseListingRecord,
  type BrowseServerFilters,
  type BrowseTabId,
  type SortOption,
} from "@/components/browse-listings/browse-listings-utils";
import { getRequestUser, getServiceSupabase, LISTING_SELECT, withNoStore } from "@/lib/deal-server";
import { isActiveBrokerStatus } from "@/lib/deal-utils";
import { normalizeListingBedroomFilterValue } from "@/lib/listing-bedrooms";
import { buildPaginationMeta, DEFAULT_PAGE_SIZE, normalizePageNumber, normalizePageSize } from "@/lib/pagination";
import { fetchAreas, hydrateListings } from "@/lib/platform-server-data";
import type { Listing } from "@/lib/deal-types";

const ACTIVE_LISTING_STATUSES = ["active", "approved"];
const FETCH_BATCH_SIZE = 1000;
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
const DEAL_TYPE_OPTIONS = ["urgent", "distressed", "off-market"] as const;
const ADDED_TIME_OPTIONS = ["today", "7d", "30d"] as const;
const ROI_OPTIONS = ["5", "6.5", "8", "10"] as const;

function normalizeLookupValue(value: string | null | undefined) {
  return value?.trim().toLowerCase() || "";
}

function normalizeNumericParam(value: string | null | undefined) {
  return String(value ?? "").replace(/[^\d]/g, "");
}

function normalizePropertyTypeParam(value: string | null | undefined) {
  const normalizedValue = normalizeLookupValue(value).replace(/\s+/g, "_");
  return normalizedValue || "";
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

async function fetchAllMarketListings(supabase: ReturnType<typeof getServiceSupabase>, serverFilters: BrowseServerFilters) {
  const listings: Listing[] = [];
  let rangeFrom = 0;

  while (true) {
    let query = supabase
      .from("listings")
      .select(LISTING_SELECT)
      .eq("is_visible", true)
      .is("deleted_at", null)
      .in("status", ACTIVE_LISTING_STATUSES);

    if (serverFilters.areaId) {
      query = query.eq("area_id", serverFilters.areaId);
    }

    if (serverFilters.propertyType) {
      query = query.eq("property_type", serverFilters.propertyType);
    }

    if (serverFilters.minPrice) {
      query = query.gte("price", Number(serverFilters.minPrice));
    }

    if (serverFilters.maxPrice) {
      query = query.lte("price", Number(serverFilters.maxPrice));
    }

    const { data, error } = await query.order("created_at", { ascending: false }).range(rangeFrom, rangeFrom + FETCH_BATCH_SIZE - 1);

    if (error) {
      throw new Error(error.message || "Failed to load listings.");
    }

    const batch = (data as Listing[] | null) || [];
    listings.push(...batch);

    if (batch.length < FETCH_BATCH_SIZE) {
      break;
    }

    rangeFrom += FETCH_BATCH_SIZE;
  }

  return listings;
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
    commission_terms: viewerCanSeeInternal ? listing.commission_terms : null,
    owner: viewerCanSeeInternal ? listing.owner : null,
    agency: viewerCanSeeInternal ? listing.agency : null,
    owner_active_listings_count: viewerCanSeeInternal ? listing.owner_active_listings_count : null,
  };
}

export async function GET(request: NextRequest) {
  const supabase = getServiceSupabase();
  const viewer = await getRequestUser(request);
  const viewerIsBroker = !!viewer && viewer.role === "broker" && isActiveBrokerStatus(viewer.status);
  const viewerCanSeeInternal = viewerIsBroker || viewer?.role === "admin";

  const searchParams = request.nextUrl.searchParams;
  const page = normalizePageNumber(searchParams.get("page"));
  const pageSize = normalizePageSize(searchParams.get("pageSize") || DEFAULT_PAGE_SIZE);
  const rangeFrom = (page - 1) * pageSize;
  const rangeTo = rangeFrom + pageSize;
  const serverFilters = resolveBrowseServerFilters(searchParams);
  const clientFilters = resolveBrowseClientFilters(searchParams);
  const activeTab = resolveActiveTab(searchParams);

  const [areas, rawMarketListings] = await Promise.all([
    fetchAreas(supabase),
    fetchAllMarketListings(supabase, serverFilters),
  ]);
  const areaMap = new Map(areas.map((area) => [area.id, area]));
  const marketListings = rawMarketListings.map((listing) => ({
    ...listing,
    area: listing.area_id ? areaMap.get(listing.area_id) || null : null,
  }));
  const marketIntelMap = new Map(
    marketListings.map((listing) => [
      listing.id,
      buildListingIntel(listing, marketListings),
    ]),
  );
  const baseListings = marketListings
    .filter((listing) => matchesListingServerFilters(listing, serverFilters))
    .map((listing) => marketIntelMap.get(listing.id) || buildListingIntel(listing, marketListings));
  const filteredListings = filterListingsByClientFilters(baseListings, clientFilters);
  const bestDealIds = getBestDealIds(filteredListings);
  const tabCounts = getBrowseTabCounts(filteredListings, bestDealIds);
  const tabFilteredListings = filterListingsByActiveTab(filteredListings, activeTab, bestDealIds);
  const sortedListings = sortListings(tabFilteredListings, clientFilters.sort);
  const pageItems = sortedListings.slice(rangeFrom, rangeTo);
  const hydratedPageListings = await hydrateListings(
    supabase,
    pageItems.map((item) => item.listing),
    {
      includeAgencies: viewerCanSeeInternal,
      includeCommissionTerms: viewerCanSeeInternal,
      includeOwnerActiveCount: viewerCanSeeInternal,
      includeOwners: viewerCanSeeInternal,
    }
  );
  const browseListings = hydratedPageListings.map((listing) => {
    const matchedItem = pageItems.find((item) => item.listing.id === listing.id);
    const intel = matchedItem || buildListingIntel(listing, marketListings);

    return applyBrowseViewerState(
      attachBrowseIntel(listing, intel, {
        isBestDeal: bestDealIds.has(listing.id),
      }),
      viewer?.id || null,
      viewerIsBroker,
      viewerCanSeeInternal,
    );
  });
  const topDealSource = tabFilteredListings;
  const topDealItem =
    [...topDealSource].sort(compareByOpportunity)[0] || null;
  const topDealListingFromPage = topDealItem
    ? browseListings.find((listing) => listing.id === topDealItem.listing.id) || null
    : null;
  const topDealListing =
    topDealItem && !topDealListingFromPage
      ? (
          await hydrateListings(supabase, [topDealItem.listing], {
            includeAgencies: viewerCanSeeInternal,
            includeCommissionTerms: viewerCanSeeInternal,
            includeOwnerActiveCount: viewerCanSeeInternal,
            includeOwners: viewerCanSeeInternal,
          }).then((listings) => {
            const listing = listings[0];

            if (!listing) {
              return null;
            }

            return applyBrowseViewerState(
              attachBrowseIntel(listing, topDealItem, {
                isBestDeal: bestDealIds.has(listing.id),
              }),
              viewer?.id || null,
              viewerIsBroker,
              viewerCanSeeInternal,
            );
          })
        )
      : topDealListingFromPage;
  const pagination = buildPaginationMeta({
    page,
    pageSize,
    totalCount: sortedListings.length,
  });

  const response = NextResponse.json(
    {
      viewerIsBroker,
      areas,
      pagination,
      summary: {
        totalCount: sortedListings.length,
        filteredCount: filteredListings.length,
        tabCounts,
        topDeal: topDealListing,
      },
      listings: browseListings,
    },
    withNoStore()
  );
  return response;
}
