import { parseRequirementBedroomOption } from "@/lib/requirements";
import type { Listing, ListingStatus, Requirement } from "@/lib/deal-types";

export type MatchableRequirement = Pick<Requirement, "area" | "area_id" | "bedrooms" | "budget_min" | "budget_max">;
export type MatchableListing = Pick<Listing, "area_id" | "bedrooms" | "price"> & {
  area?: Pick<NonNullable<Listing["area"]>, "name"> | null;
  status?: ListingStatus | null;
  deleted_at?: string | null;
};

export type RequirementListingMatchBreakdown = {
  areaScore: number;
  priceScore: number;
  bedroomScore: number;
  matchPercentage: number;
  isMatched: boolean;
};

export type RequirementListingMatchResult<TListing extends MatchableListing = MatchableListing> = RequirementListingMatchBreakdown & {
  listing: TListing;
};

export type RequirementListingMatchSummary = {
  bestMatchPercentage: number;
  matchedListingsCount: number;
  totalListingsConsidered: number;
};

type NormalizedBedroomValue = {
  value: number;
  isOpenEnded: boolean;
};

const AREA_WEIGHT = 0.4;
const PRICE_WEIGHT = 0.4;
const BEDROOM_WEIGHT = 0.2;
const ACTIVE_MATCHABLE_LISTING_STATUSES: ListingStatus[] = ["active", "approved"];
export const REQUIREMENT_MATCH_THRESHOLD = 70;

function normalizeText(value: string | null | undefined) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function clampPercentage(value: number) {
  if (!Number.isFinite(value) || value <= 0) {
    return 0;
  }

  if (value >= 100) {
    return 100;
  }

  return Math.round(value);
}

function normalizeRequirementBedrooms(value: string | null | undefined): NormalizedBedroomValue | null {
  const parsedValue = parseRequirementBedroomOption(value);

  if (!parsedValue) {
    return null;
  }

  if (parsedValue === "Studio") {
    return { value: 0, isOpenEnded: false };
  }

  if (parsedValue === "8BR+") {
    return { value: 8, isOpenEnded: true };
  }

  const numericMatch = parsedValue.match(/(\d+)/);
  if (!numericMatch) {
    return null;
  }

  return {
    value: Number(numericMatch[1]),
    isOpenEnded: false,
  };
}

function normalizeListingBedrooms(value: number | null | undefined) {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return null;
  }

  if (value <= 0) {
    return 0;
  }

  return Math.round(value);
}

export function normalizeArea(value: string | null | undefined) {
  return normalizeText(value);
}

export function getAreaScore(requirementArea: string | null | undefined, listingArea: string | null | undefined) {
  const normalizedRequirementArea = normalizeArea(requirementArea);
  const normalizedListingArea = normalizeArea(listingArea);

  if (!normalizedRequirementArea || !normalizedListingArea) {
    return 0;
  }

  return normalizedRequirementArea === normalizedListingArea ? 100 : 0;
}

export function getPriceScore(requirement: Pick<MatchableRequirement, "budget_min" | "budget_max">, listing: Pick<MatchableListing, "price">) {
  const listingPrice = Number(listing.price);
  const budgetMin = requirement.budget_min !== null && requirement.budget_min !== undefined ? Number(requirement.budget_min) : null;
  const budgetMax = requirement.budget_max !== null && requirement.budget_max !== undefined ? Number(requirement.budget_max) : null;

  if (!Number.isFinite(listingPrice) || budgetMin === null || budgetMax === null || !Number.isFinite(budgetMin) || !Number.isFinite(budgetMax) || budgetMin > budgetMax) {
    return 0;
  }

  if (listingPrice >= budgetMin && listingPrice <= budgetMax) {
    return 100;
  }

  const minimumWithTolerance = budgetMin * 0.9;
  const maximumWithTolerance = budgetMax * 1.1;

  if ((listingPrice < budgetMin && listingPrice >= minimumWithTolerance) || (listingPrice > budgetMax && listingPrice <= maximumWithTolerance)) {
    return 70;
  }

  return 0;
}

export function getBedroomScore(requirementBedrooms: string | null | undefined, listingBedrooms: number | null | undefined) {
  const normalizedRequirementBedrooms = normalizeRequirementBedrooms(requirementBedrooms);
  const normalizedListingBedrooms = normalizeListingBedrooms(listingBedrooms);

  if (!normalizedRequirementBedrooms || normalizedListingBedrooms === null) {
    return 0;
  }

  if (normalizedRequirementBedrooms.isOpenEnded && normalizedListingBedrooms >= normalizedRequirementBedrooms.value) {
    return 100;
  }

  const difference = Math.abs(normalizedListingBedrooms - normalizedRequirementBedrooms.value);

  if (difference === 0) {
    return 100;
  }

  if (difference === 1) {
    return 50;
  }

  return 0;
}

export function isListingActiveForRequirementMatch(listing: MatchableListing) {
  if (listing.deleted_at) {
    return false;
  }

  if (listing.status && !ACTIVE_MATCHABLE_LISTING_STATUSES.includes(listing.status)) {
    return false;
  }

  return true;
}

export function calculateRequirementListingMatch(requirement: MatchableRequirement, listing: MatchableListing): RequirementListingMatchBreakdown {
  const areaScore = getAreaScore(requirement.area, listing.area?.name);
  const priceScore = getPriceScore(requirement, listing);
  const bedroomScore = getBedroomScore(requirement.bedrooms, listing.bedrooms);
  const matchPercentage = clampPercentage(areaScore * AREA_WEIGHT + priceScore * PRICE_WEIGHT + bedroomScore * BEDROOM_WEIGHT);

  return {
    areaScore,
    priceScore,
    bedroomScore,
    matchPercentage,
    isMatched: matchPercentage >= REQUIREMENT_MATCH_THRESHOLD,
  };
}

export function getRequirementMatchedListings<TListing extends MatchableListing>(
  requirement: MatchableRequirement,
  listings: TListing[],
  threshold = REQUIREMENT_MATCH_THRESHOLD
): RequirementListingMatchResult<TListing>[] {
  return listings
    .filter(isListingActiveForRequirementMatch)
    .map((listing) => ({
      listing,
      ...calculateRequirementListingMatch(requirement, listing),
    }))
    .filter((result) => result.matchPercentage >= threshold)
    .sort((left, right) => right.matchPercentage - left.matchPercentage || Number(right.listing.price || 0) - Number(left.listing.price || 0));
}

export function getRequirementMatchSummary<TListing extends MatchableListing>(
  requirement: MatchableRequirement,
  listings: TListing[],
  threshold = REQUIREMENT_MATCH_THRESHOLD
): RequirementListingMatchSummary {
  const activeListings = listings.filter(isListingActiveForRequirementMatch);

  if (!activeListings.length) {
    return {
      bestMatchPercentage: 0,
      matchedListingsCount: 0,
      totalListingsConsidered: 0,
    };
  }

  let bestMatchPercentage = 0;
  let matchedListingsCount = 0;

  for (const listing of activeListings) {
    const { matchPercentage } = calculateRequirementListingMatch(requirement, listing);
    bestMatchPercentage = Math.max(bestMatchPercentage, matchPercentage);

    if (matchPercentage >= threshold) {
      matchedListingsCount += 1;
    }
  }

  return {
    bestMatchPercentage,
    matchedListingsCount,
    totalListingsConsidered: activeListings.length,
  };
}

export function isListingMatchingRequirement(requirement: MatchableRequirement, listing: MatchableListing) {
  return calculateRequirementListingMatch(requirement, listing).isMatched;
}
