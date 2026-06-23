import { Listing } from "@/lib/deal-types";
import { formatDate, formatPropertyType } from "@/lib/deal-utils";
import { matchesListingBedroomFilter } from "@/lib/listing-bedrooms";

const ACTIVE_STATUSES = new Set(["active", "approved"]);
const PRICE_DROP_PATTERN =
  /\b(price\s*drop|price\s*cut|price\s*reduced|reduced|discount|discounted|below ask|cut price|cheaper)\b/i;
const URGENT_PATTERN =
  /\b(urgent|motivated|must sell|seller needs|quick sale|cashflow|cash flow|vacant on transfer)\b/i;
const DAY_IN_MS = 24 * 60 * 60 * 1000;

export type BrowseTabId =
  | "all"
  | "new-deals"
  | "urgent-sellers"
  | "below-market"
  | "recent-price-drop"
  | "best-deals"
  | "off-market";
export type SortOption = "newest" | "price_asc" | "roi_desc";
export type DealIntelTone = "gold" | "amber" | "navy" | "slate";

export type SelectOption = {
  value: string;
  label: string;
};

export type BrowseTab = {
  id: BrowseTabId;
  label: string;
  count: number;
};

export type DealIntelItem = {
  id: Extract<
    BrowseTabId,
    "new-deals" | "urgent-sellers" | "below-market" | "recent-price-drop"
  >;
  label: string;
  value: number;
  tone: DealIntelTone;
};

export type BrowseServerFilters = {
  areaId: string;
  minPrice: string;
  maxPrice: string;
  propertyType: string;
};

export type BrowseClientFilters = {
  search: string;
  beds: string;
  developer: string;
  roi: string;
  dealType: string;
  addedTime: string;
  sort: SortOption;
};

export type BrowseListingRecord = Listing & {
  market_average_price?: number | null;
  below_market_percent?: number | null;
  below_market_amount?: number | null;
  comparable_count?: number | null;
  is_urgent_seller?: boolean | null;
  is_off_market?: boolean | null;
  is_distressed?: boolean | null;
  is_price_drop_signal?: boolean | null;
  opportunity_reason?: string | null;
  opportunity_highlight?: string | null;
  opportunity_score?: number | null;
  is_best_deal?: boolean | null;
};

export type ListingComparableRecord = Pick<
  Listing,
  | "id"
  | "area_id"
  | "bedrooms"
  | "deleted_at"
  | "is_visible"
  | "price"
  | "property_type"
  | "status"
>;

export type ListingIntel = {
  listing: Listing;
  marketAveragePrice: number | null;
  belowMarketPercent: number;
  belowMarketAmount: number;
  roiPercent: number;
  comparableCount: number;
  isUrgentSeller: boolean;
  isOffMarket: boolean;
  isDistressed: boolean;
  isPriceDropSignal: boolean;
  reason: string | null;
  highlight: string;
  opportunityScore: number;
};

function isFiniteNumber(value: number | null | undefined): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function normalizeText(value?: string | null) {
  return value?.replace(/\s+/g, " ").trim() || "";
}

function truncateText(value: string, maxLength = 120) {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength - 3).trim()}...`;
}

function getReasonSnippet(listing: Listing) {
  const candidates = [listing.notes, listing.description, listing.payment_plan]
    .map(normalizeText)
    .filter(Boolean);
  if (!candidates.length) {
    return null;
  }

  const firstSentence =
    candidates[0].split(/[.!?]\s+/)[0]?.trim() || candidates[0];
  return truncateText(firstSentence);
}

function average(values: number[]) {
  if (!values.length) {
    return null;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function isRecent(value: string | null | undefined, days: number) {
  if (!value) {
    return false;
  }

  const timestamp = new Date(value).getTime();
  if (Number.isNaN(timestamp)) {
    return false;
  }

  return Date.now() - timestamp <= days * DAY_IN_MS;
}

function getComparableListings(
  listing: Listing,
  marketListings: ListingComparableRecord[],
) {
  if (!listing.area_id) {
    return [];
  }

  const sameAreaListings = marketListings.filter(
    (candidate) =>
      candidate.id !== listing.id &&
      candidate.area_id === listing.area_id &&
      !candidate.deleted_at &&
      candidate.is_visible &&
      ACTIVE_STATUSES.has(candidate.status),
  );

  if (!sameAreaListings.length) {
    return [];
  }

  if (listing.bedrooms !== null) {
    const exactBedMatches = sameAreaListings.filter(
      (candidate) => candidate.bedrooms === listing.bedrooms,
    );

    if (exactBedMatches.length >= 2) {
      return exactBedMatches;
    }

    if (exactBedMatches.length) {
      return exactBedMatches;
    }
  }

  const samePropertyType = sameAreaListings.filter(
    (candidate) => candidate.property_type === listing.property_type,
  );

  if (samePropertyType.length >= 2) {
    return samePropertyType;
  }

  if (samePropertyType.length) {
    return samePropertyType;
  }

  return sameAreaListings;
}

export function isListingVisibleForBrowse(listing: Listing) {
  return (
    ACTIVE_STATUSES.has(listing.status) &&
    !listing.deleted_at &&
    listing.is_visible
  );
}

export function getCoverImage(listing: Listing) {
  return (
    listing.listing_images?.find((image) => image.is_cover)?.public_url ||
    listing.listing_images?.[0]?.public_url ||
    null
  );
}

export function getListingAreaLabel(listing: Listing) {
  return listing.area?.name || listing.area?.city || "Dubai";
}

export function getListingDeveloperLabel(listing: Listing) {
  return listing.developer || formatPropertyType(listing.property_type);
}

export function getListingRoiPercent(listing: Listing) {
  return isFiniteNumber(listing.yield_percent) ? listing.yield_percent : 0;
}

export function formatPercentValue(value: number, fractionDigits = 1) {
  return `${new Intl.NumberFormat("en-US", { maximumFractionDigits: fractionDigits }).format(value)}%`;
}

export function formatRelativeTime(value: string | null | undefined) {
  if (!value) {
    return "Recently updated";
  }

  const timestamp = new Date(value).getTime();
  if (Number.isNaN(timestamp)) {
    return formatDate(value);
  }

  const diff = Date.now() - timestamp;

  if (diff < 0) {
    return "Recently updated";
  }

  const minutes = Math.max(1, Math.round(diff / 60000));

  if (minutes < 60) {
    return `${minutes} min ago`;
  }

  const hours = Math.round(diff / 3600000);

  if (hours < 24) {
    return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  }

  const days = Math.round(diff / DAY_IN_MS);

  if (days < 7) {
    return `${days} day${days === 1 ? "" : "s"} ago`;
  }

  return formatDate(value);
}

export function buildListingIntel(
  listing: Listing,
  marketListings: ListingComparableRecord[],
): ListingIntel {
  const comparableListings = getComparableListings(listing, marketListings);
  const marketAveragePrice = average(
    comparableListings
      .map((candidate) => candidate.price)
      .filter(isFiniteNumber),
  );
  const roiPercent = getListingRoiPercent(listing);
  const marketDelta = marketAveragePrice
    ? marketAveragePrice - listing.price
    : 0;
  const rawBelowMarketPercent = marketAveragePrice
    ? (marketDelta / marketAveragePrice) * 100
    : 0;
  const belowMarketPercent =
    rawBelowMarketPercent > 0 ? rawBelowMarketPercent : 0;
  const belowMarketAmount = marketDelta > 0 ? marketDelta : 0;
  const combinedText = [
    listing.title,
    listing.notes,
    listing.description,
    listing.payment_plan,
  ]
    .map(normalizeText)
    .filter(Boolean)
    .join(" ");
  const isUrgentSeller =
    listing.deal_type === "urgent_sale" || URGENT_PATTERN.test(combinedText);
  const isOffMarket = listing.deal_type === "secondary";
  const isDistressed = listing.deal_type === "distressed";
  const isPriceDropSignal =
    PRICE_DROP_PATTERN.test(combinedText) &&
    isRecent(listing.updated_at || listing.created_at, 21);
  const reason =
    getReasonSnippet(listing) ||
    (isUrgentSeller
      ? "Seller urgency is signaled in the current listing copy."
      : isDistressed
        ? "Distressed inventory flag is active on this listing."
        : belowMarketPercent > 0
          ? `Comparable listings in ${getListingAreaLabel(listing)} are priced higher right now.`
          : null);

  let highlight = "Broker-listed opportunity";

  if (isPriceDropSignal) {
    highlight = "Recent price-drop signal";
  } else if (belowMarketPercent > 0) {
    highlight = `${formatPercentValue(belowMarketPercent)} below market`;
  } else if (isUrgentSeller) {
    highlight = "Motivated seller signal";
  } else if (roiPercent > 0) {
    highlight = `${formatPercentValue(roiPercent)} projected ROI`;
  } else if (listing.payment_plan) {
    highlight = truncateText(listing.payment_plan, 72);
  }

  return {
    listing,
    marketAveragePrice,
    belowMarketPercent,
    belowMarketAmount,
    roiPercent,
    comparableCount: comparableListings.length,
    isUrgentSeller,
    isOffMarket,
    isDistressed,
    isPriceDropSignal,
    reason,
    highlight,
    opportunityScore:
      Math.max(belowMarketPercent, roiPercent) +
      (isUrgentSeller ? 1.2 : 0) +
      (isPriceDropSignal ? 0.8 : 0) +
      (isOffMarket ? 0.35 : 0),
  };
}

function hasPrecomputedBrowseIntel(listing: BrowseListingRecord) {
  return (
    typeof listing.opportunity_score === "number" ||
    typeof listing.market_average_price === "number" ||
    typeof listing.below_market_percent === "number" ||
    typeof listing.is_urgent_seller === "boolean" ||
    typeof listing.is_off_market === "boolean" ||
    typeof listing.is_price_drop_signal === "boolean"
  );
}

export function buildListingIntelFromRecord(
  listing: BrowseListingRecord,
  marketListings: ListingComparableRecord[] = [],
): ListingIntel {
  if (!hasPrecomputedBrowseIntel(listing)) {
    return buildListingIntel(listing, marketListings);
  }

  const roiPercent = getListingRoiPercent(listing);
  const belowMarketPercent =
    typeof listing.below_market_percent === "number" &&
    listing.below_market_percent > 0
      ? listing.below_market_percent
      : 0;
  const belowMarketAmount =
    typeof listing.below_market_amount === "number" &&
    listing.below_market_amount > 0
      ? listing.below_market_amount
      : 0;
  const isUrgentSeller = Boolean(listing.is_urgent_seller);
  const isOffMarket = Boolean(listing.is_off_market);
  const isDistressed = Boolean(listing.is_distressed);
  const isPriceDropSignal = Boolean(listing.is_price_drop_signal);

  return {
    listing,
    marketAveragePrice:
      typeof listing.market_average_price === "number"
        ? listing.market_average_price
        : null,
    belowMarketPercent,
    belowMarketAmount,
    roiPercent,
    comparableCount:
      typeof listing.comparable_count === "number"
        ? listing.comparable_count
        : 0,
    isUrgentSeller,
    isOffMarket,
    isDistressed,
    isPriceDropSignal,
    reason: listing.opportunity_reason ?? getReasonSnippet(listing),
    highlight:
      listing.opportunity_highlight ||
      (roiPercent > 0
        ? `${formatPercentValue(roiPercent)} projected ROI`
        : "Broker-listed opportunity"),
    opportunityScore:
      typeof listing.opportunity_score === "number"
        ? listing.opportunity_score
        : Math.max(belowMarketPercent, roiPercent) +
          (isUrgentSeller ? 1.2 : 0) +
          (isPriceDropSignal ? 0.8 : 0) +
          (isOffMarket ? 0.35 : 0),
  };
}

export function attachBrowseIntel(
  listing: Listing,
  intel: ListingIntel,
  options: {
    isBestDeal?: boolean;
  } = {},
): BrowseListingRecord {
  return {
    ...listing,
    market_average_price: intel.marketAveragePrice,
    below_market_percent: intel.belowMarketPercent,
    below_market_amount: intel.belowMarketAmount,
    comparable_count: intel.comparableCount,
    is_urgent_seller: intel.isUrgentSeller,
    is_off_market: intel.isOffMarket,
    is_distressed: intel.isDistressed,
    is_price_drop_signal: intel.isPriceDropSignal,
    opportunity_reason: intel.reason,
    opportunity_highlight: intel.highlight,
    opportunity_score: intel.opportunityScore,
    is_best_deal: options.isBestDeal ?? false,
  };
}

export function compareByOpportunity(left: ListingIntel, right: ListingIntel) {
  return (
    right.opportunityScore - left.opportunityScore ||
    right.belowMarketPercent - left.belowMarketPercent ||
    right.roiPercent - left.roiPercent ||
    new Date(right.listing.updated_at).getTime() -
      new Date(left.listing.updated_at).getTime()
  );
}

export function getPrimaryBadgeLabel(item: ListingIntel, isBestDeal: boolean) {
  if (isBestDeal) {
    return "Best Deal";
  }

  if (item.isUrgentSeller) {
    return "Urgent";
  }

  if (item.isOffMarket) {
    return "Off Market";
  }

  if (item.isDistressed) {
    return "Distressed";
  }

  return "Deal";
}

export function getHeroTagLabel(item: ListingIntel) {
  if (item.isUrgentSeller) {
    return "Motivated Seller";
  }

  if (item.isDistressed) {
    return "Distressed";
  }

  if (item.isOffMarket) {
    return "Off Market";
  }

  if (item.belowMarketPercent > 0) {
    return "Below Market";
  }

  return "High Interest";
}

export function matchesSearchQuery(query: string, item: ListingIntel) {
  if (!query.trim()) {
    return true;
  }

  const normalizedQuery = query.trim().toLowerCase();
  const listing = item.listing;
  const searchTokens = [
    listing.title,
    listing.developer,
    listing.description,
    listing.notes,
    listing.area?.name,
    listing.area?.city,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return searchTokens.includes(normalizedQuery);
}

export function matchesListingServerFilters(
  listing: Listing,
  serverFilters: BrowseServerFilters,
) {
  if (serverFilters.areaId && listing.area_id !== serverFilters.areaId) {
    return false;
  }

  if (
    serverFilters.propertyType &&
    listing.property_type !== serverFilters.propertyType
  ) {
    return false;
  }

  if (
    serverFilters.minPrice &&
    listing.price < Number(serverFilters.minPrice)
  ) {
    return false;
  }

  if (
    serverFilters.maxPrice &&
    listing.price > Number(serverFilters.maxPrice)
  ) {
    return false;
  }

  return true;
}

export function filterListingsByClientFilters(
  items: ListingIntel[],
  clientFilters: BrowseClientFilters,
  searchQuery = clientFilters.search,
) {
  return items.filter((item) => {
    if (!matchesSearchQuery(searchQuery, item)) {
      return false;
    }

    if (
      !matchesListingBedroomFilter(clientFilters.beds, item.listing.bedrooms)
    ) {
      return false;
    }

    if (
      clientFilters.developer &&
      item.listing.developer !== clientFilters.developer
    ) {
      return false;
    }

    if (clientFilters.roi && item.roiPercent < Number(clientFilters.roi)) {
      return false;
    }

    if (clientFilters.dealType === "urgent" && !item.isUrgentSeller) {
      return false;
    }

    if (clientFilters.dealType === "distressed" && !item.isDistressed) {
      return false;
    }

    if (clientFilters.dealType === "off-market" && !item.isOffMarket) {
      return false;
    }

    if (
      !matchesAddedTimeFilter(clientFilters.addedTime, item.listing.created_at)
    ) {
      return false;
    }

    return true;
  });
}

export function filterListingsByActiveTab(
  items: ListingIntel[],
  activeTab: BrowseTabId,
  bestDealIds: Set<string>,
) {
  switch (activeTab) {
    case "new-deals":
      return items.filter((item) =>
        matchesAddedTimeFilter("today", item.listing.created_at),
      );
    case "best-deals":
      return items.filter((item) => bestDealIds.has(item.listing.id));
    case "urgent-sellers":
      return items.filter((item) => item.isUrgentSeller);
    case "below-market":
      return items.filter((item) => item.belowMarketPercent > 0);
    case "off-market":
      return items.filter((item) => item.isOffMarket);
    case "recent-price-drop":
      return items.filter((item) => item.isPriceDropSignal);
    case "all":
    default:
      return items;
  }
}

export function sortListings(items: ListingIntel[], sort: SortOption) {
  const sortedItems = [...items];

  switch (sort) {
    case "price_asc":
      sortedItems.sort(
        (left, right) =>
          left.listing.price - right.listing.price ||
          compareByOpportunity(left, right),
      );
      break;
    case "roi_desc":
      sortedItems.sort(
        (left, right) =>
          right.roiPercent - left.roiPercent ||
          right.belowMarketPercent - left.belowMarketPercent ||
          compareByOpportunity(left, right),
      );
      break;
    case "newest":
    default:
      sortedItems.sort(
        (left, right) =>
          new Date(right.listing.created_at).getTime() -
            new Date(left.listing.created_at).getTime() ||
          compareByOpportunity(left, right),
      );
      break;
  }

  return sortedItems;
}

export function getBestDealIds(items: ListingIntel[]) {
  if (!items.length) {
    return new Set<string>();
  }

  const rankedItems = [...items].sort(compareByOpportunity);
  const bestDealCount = Math.min(
    Math.max(Math.ceil(rankedItems.length * 0.2), 1),
    12,
  );
  return new Set(
    rankedItems.slice(0, bestDealCount).map((item) => item.listing.id),
  );
}

export function getBrowseTabCounts(
  items: ListingIntel[],
  bestDealIds: Set<string>,
): Record<BrowseTabId, number> {
  return {
    all: items.length,
    "new-deals": items.filter((item) =>
      matchesAddedTimeFilter("today", item.listing.created_at),
    ).length,
    "urgent-sellers": items.filter((item) => item.isUrgentSeller).length,
    "below-market": items.filter((item) => item.belowMarketPercent > 0).length,
    "recent-price-drop": items.filter((item) => item.isPriceDropSignal).length,
    "best-deals": bestDealIds.size,
    "off-market": items.filter((item) => item.isOffMarket).length,
  };
}

export function matchesAddedTimeFilter(value: string, createdAt: string) {
  if (!value) {
    return true;
  }

  const createdTimestamp = new Date(createdAt).getTime();

  if (Number.isNaN(createdTimestamp)) {
    return false;
  }

  const ageInMs = Date.now() - createdTimestamp;

  switch (value) {
    case "today":
      return ageInMs <= DAY_IN_MS;
    case "7d":
      return ageInMs <= 7 * DAY_IN_MS;
    case "30d":
      return ageInMs <= 30 * DAY_IN_MS;
    default:
      return true;
  }
}
