import { NextRequest, NextResponse } from "next/server";
import {
  getRequestSupabase,
  getRequestUser,
  jsonError,
  withNoStore,
} from "@/lib/deal-server";
import { isActiveBrokerStatus } from "@/lib/deal-utils";
import {
  calculateRequirementListingMatch,
  isListingActiveForRequirementMatch,
  REQUIREMENT_MATCH_THRESHOLD,
  type MatchableRequirement,
} from "@/lib/requirement-matching";
import { parseRequirementBedroomOption } from "@/lib/requirements";
import { fetchRequirementMatchCandidateListings } from "@/lib/requirements-server";

type RequirementMatchPreviewTopListing = {
  id: string;
  matchPercentage: number;
  price: number;
};

function parsePositiveNumber(value: string | null) {
  const parsedValue = Number(value || "");
  return Number.isFinite(parsedValue) && parsedValue > 0 ? parsedValue : null;
}

function getPreviewRequirement(searchParams: URLSearchParams): MatchableRequirement {
  const area = searchParams.get("area")?.trim() || null;
  const rawBedrooms = searchParams.get("bedrooms")?.trim() || "";

  return {
    area,
    area_id: null,
    bedrooms: parseRequirementBedroomOption(rawBedrooms) || rawBedrooms || null,
    budget_min: parsePositiveNumber(searchParams.get("budgetMin")),
    budget_max: parsePositiveNumber(searchParams.get("budgetMax")),
  };
}

function summarizeRequirementMatchPreview(
  requirement: MatchableRequirement,
  listings: Awaited<ReturnType<typeof fetchRequirementMatchCandidateListings>>
) {
  let matchCount = 0;
  let bestScore = 0;
  let totalListingsConsidered = 0;
  const topMatches: RequirementMatchPreviewTopListing[] = [];

  listings.forEach((listing) => {
    if (!isListingActiveForRequirementMatch(listing)) {
      return;
    }

    totalListingsConsidered += 1;
    const { matchPercentage } = calculateRequirementListingMatch(requirement, listing);
    bestScore = Math.max(bestScore, matchPercentage);

    if (matchPercentage < REQUIREMENT_MATCH_THRESHOLD) {
      return;
    }

    matchCount += 1;
    topMatches.push({
      id: listing.id,
      matchPercentage,
      price: Number(listing.price || 0),
    });
  });

  topMatches.sort((left, right) => right.matchPercentage - left.matchPercentage || right.price - left.price);

  return {
    matchCount,
    bestScore,
    totalListingsConsidered,
    topListingIds: topMatches.slice(0, 5).map((listing) => listing.id),
  };
}

export async function GET(request: NextRequest) {
  const viewer = await getRequestUser(request);
  if (!viewer || viewer.role !== "broker" || !isActiveBrokerStatus(viewer.status)) {
    return jsonError("Active broker access required.", 403);
  }

  const requirement = getPreviewRequirement(request.nextUrl.searchParams);
  let listings: Awaited<ReturnType<typeof fetchRequirementMatchCandidateListings>>;

  try {
    listings = await fetchRequirementMatchCandidateListings(getRequestSupabase(request), {
      excludeUserId: viewer.id,
      previewRequirement: requirement,
    });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Failed to load match preview.", 400);
  }

  const summary = summarizeRequirementMatchPreview(requirement, listings);

  return NextResponse.json(
    {
      matchCount: summary.matchCount,
      bestScore: summary.bestScore,
      totalListingsConsidered: summary.totalListingsConsidered,
      topListingIds: summary.topListingIds,
    },
    withNoStore()
  );
}
