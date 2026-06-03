import { NextRequest, NextResponse } from "next/server";
import {
  getServiceSupabase,
  getRequestSupabase,
  getRequestUser,
  jsonError,
  LISTING_SELECT,
  REQUIREMENT_SELECT,
  withNoStore,
} from "@/lib/deal-server";
import { logActivity } from "@/lib/activity-log";
import { isActiveBrokerStatus } from "@/lib/deal-utils";
import { runEmailWorkflowInBackground } from "@/lib/email-service";
import { triggerRequirementMatchFoundForRequirement } from "@/lib/email-notifications";
import { buildPaginationMeta, DEFAULT_PAGE_SIZE, normalizePageNumber, normalizePageSize } from "@/lib/pagination";
import {
  enrichRequirementsWithSubmissionMeta,
  fetchBrokerProfileByUserId,
  fetchRequirementFilterAreas,
} from "@/lib/requirements-server";
import { hydrateListings } from "@/lib/platform-server-data";
import type { Listing, Requirement } from "@/lib/deal-types";
import { parseRequirementBedroomOption } from "@/lib/requirements";

function canAccessRequirementsWorkspace(role?: string | null, status?: string | null) {
  return role === "admin" || (role === "broker" && isActiveBrokerStatus(status));
}

const REQUIREMENT_FETCH_BATCH_SIZE = 250;
const REQUIREMENT_SORT_OPTIONS = ["newest", "oldest", "budget_high", "matches_high"] as const;

type RequirementSortOption = (typeof REQUIREMENT_SORT_OPTIONS)[number];

type RequirementQueryFilters = {
  area: string | null;
  propertyType: string | null;
  bedrooms: string | null;
  urgency: string | null;
  minBudget: number;
  maxBudget: number;
  searchTerm: string;
};

type RequirementQueryOptions = RequirementQueryFilters & {
  mine: boolean;
  includeInactive: boolean;
  viewerRole: string;
  brokerProfileId: string | null;
};

function resolveRequirementSortOption(value: string | null | undefined) {
  const normalizedValue = value?.trim().toLowerCase() || "";
  return REQUIREMENT_SORT_OPTIONS.find((option) => option === normalizedValue) || null;
}

function getRequirementBudgetSortValue(requirement: Pick<Requirement, "budget_min" | "budget_max">) {
  return requirement.budget_max ?? requirement.budget_min ?? -1;
}

function sortRequirements(requirements: Requirement[], sort: RequirementSortOption) {
  const sortedRequirements = [...requirements];

  switch (sort) {
    case "oldest":
      sortedRequirements.sort(
        (left, right) =>
          new Date(left.created_at).getTime() - new Date(right.created_at).getTime()
      );
      break;
    case "budget_high":
      sortedRequirements.sort(
        (left, right) =>
          getRequirementBudgetSortValue(right) - getRequirementBudgetSortValue(left) ||
          new Date(right.created_at).getTime() - new Date(left.created_at).getTime()
      );
      break;
    case "matches_high":
      sortedRequirements.sort(
        (left, right) =>
          (right.submitted_match_count || 0) - (left.submitted_match_count || 0) ||
          new Date(right.created_at).getTime() - new Date(left.created_at).getTime()
      );
      break;
    case "newest":
    default:
      sortedRequirements.sort(
        (left, right) =>
          new Date(right.created_at).getTime() - new Date(left.created_at).getTime()
      );
      break;
  }

  return sortedRequirements;
}

function buildBaseRequirementQuery(supabase: ReturnType<typeof getRequestSupabase>) {
  return supabase.from("requirements").select(REQUIREMENT_SELECT, { count: "exact" });
}

function applyRequirementFilters(query: ReturnType<typeof buildBaseRequirementQuery>, options: RequirementQueryOptions) {
  const {
    mine,
    includeInactive,
    viewerRole,
    brokerProfileId,
    area,
    propertyType,
    bedrooms,
    urgency,
    minBudget,
    maxBudget,
    searchTerm,
  } = options;

  if (mine && brokerProfileId) {
    query = query.eq("broker_id", brokerProfileId);
  } else {
    if (viewerRole !== "admin") {
      query = query.is("deleted_at", null);
    }

    if (!includeInactive) {
      query = query.eq("is_active", true);
    }

    if (viewerRole === "broker" && brokerProfileId) {
      query = query.neq("broker_id", brokerProfileId);
    }
  }

  if (area) {
    query = query.ilike("area", area);
  }

  if (propertyType) {
    query = query.eq("property_type", propertyType);
  }

  if (bedrooms) {
    query = query.eq("bedrooms", bedrooms);
  }

  if (urgency) {
    query = query.eq("urgency", urgency);
  }

  if (Number.isFinite(minBudget) && minBudget > 0) {
    query = query.gte("budget_max", minBudget);
  }

  if (Number.isFinite(maxBudget) && maxBudget > 0) {
    query = query.lte("budget_min", maxBudget);
  }

  if (searchTerm) {
    const escapedSearchTerm = searchTerm.replace(/,/g, " ");
    query = query.or(
      `title.ilike.%${escapedSearchTerm}%,description.ilike.%${escapedSearchTerm}%,area.ilike.%${escapedSearchTerm}%,property_type.ilike.%${escapedSearchTerm}%,deal_type.ilike.%${escapedSearchTerm}%,bedrooms.ilike.%${escapedSearchTerm}%,urgency.ilike.%${escapedSearchTerm}%`
    );
  }

  return query;
}

async function fetchAllMatchingRequirements(supabase: ReturnType<typeof getRequestSupabase>, options: RequirementQueryOptions) {
  const requirements: Requirement[] = [];
  let rangeFrom = 0;
  let totalCount = 0;

  while (true) {
    const { data, count, error } = await applyRequirementFilters(
      buildBaseRequirementQuery(supabase),
      options
    )
      .order("created_at", { ascending: false })
      .range(rangeFrom, rangeFrom + REQUIREMENT_FETCH_BATCH_SIZE - 1);

    if (error) {
      throw new Error(error.message || "Failed to load requirements.");
    }

    const batch = (data as Requirement[] | null) || [];
    requirements.push(...batch);
    totalCount = count || totalCount;

    if (batch.length < REQUIREMENT_FETCH_BATCH_SIZE) {
      break;
    }

    rangeFrom += REQUIREMENT_FETCH_BATCH_SIZE;
  }

  return { requirements, totalCount };
}

export async function GET(request: NextRequest) {
  const viewer = await getRequestUser(request);
  if (!viewer || !canAccessRequirementsWorkspace(viewer.role, viewer.status)) {
    return jsonError("Broker or admin access required.", 403);
  }

  const supabase = getRequestSupabase(request);
  const searchParams = request.nextUrl.searchParams;
  const mine = searchParams.get("mine") === "1";
  const includeInactive = searchParams.get("includeInactive") === "1" && viewer.role === "admin";
  const searchTerm = searchParams.get("search")?.trim() || "";
  const area = searchParams.get("area");
  const propertyType = searchParams.get("propertyType");
  const bedrooms = parseRequirementBedroomOption(searchParams.get("bedrooms"));
  const urgency = searchParams.get("urgency");
  const minBudget = Number(searchParams.get("minBudget") || 0);
  const maxBudget = Number(searchParams.get("maxBudget") || 0);
  const sortOption = resolveRequirementSortOption(searchParams.get("sort") || searchParams.get("sortBy"));
  const page = normalizePageNumber(searchParams.get("page"));
  const pageSize = normalizePageSize(searchParams.get("pageSize") || DEFAULT_PAGE_SIZE);
  const rangeFrom = (page - 1) * pageSize;
  const rangeTo = rangeFrom + pageSize - 1;

  const brokerProfile = viewer.role === "broker" ? await fetchBrokerProfileByUserId(supabase, viewer.id) : null;

  if (mine && (!brokerProfile?.id || viewer.role !== "broker")) {
    return jsonError("Broker profile not found.", 404);
  }

  const [areas, myListingRows] = await Promise.all([
    fetchRequirementFilterAreas(supabase),
    viewer.role === "broker"
      ? supabase
          .from("listings")
          .select(LISTING_SELECT)
          .eq("created_by", viewer.id)
          .is("deleted_at", null)
          .in("status", ["active", "approved"])
          .order("updated_at", { ascending: false })
      : Promise.resolve({ data: [] as Listing[] }),
  ]);

  const myListings =
    viewer.role === "broker"
      ? await hydrateListings(supabase, (myListingRows.data as Listing[]) || [], {
          includeAgencies: false,
          includeCommissionTerms: false,
          includeOwnerActiveCount: false,
          includeOwners: false,
        })
      : [];
  let requirements: Requirement[] = [];
  let totalCount = 0;
  const requirementQueryOptions: RequirementQueryOptions = {
    mine,
    includeInactive,
    viewerRole: viewer.role,
    brokerProfileId: brokerProfile?.id || null,
    area,
    propertyType,
    bedrooms,
    urgency,
    minBudget,
    maxBudget,
    searchTerm,
  };

  try {
    if (sortOption === "budget_high") {
      const { requirements: matchedRequirements, totalCount: matchedCount } = await fetchAllMatchingRequirements(supabase, requirementQueryOptions);
      const sortedRequirements = sortRequirements(matchedRequirements, sortOption);
      requirements = await enrichRequirementsWithSubmissionMeta(supabase, sortedRequirements.slice(rangeFrom, rangeTo + 1));
      totalCount = matchedCount;
    } else if (sortOption === "matches_high") {
      const { requirements: matchedRequirements, totalCount: matchedCount } = await fetchAllMatchingRequirements(supabase, requirementQueryOptions);
      const enrichedRequirements = await enrichRequirementsWithSubmissionMeta(supabase, matchedRequirements);
      requirements = sortRequirements(enrichedRequirements, sortOption).slice(rangeFrom, rangeTo + 1);
      totalCount = matchedCount;
    } else {
      let query = applyRequirementFilters(
        buildBaseRequirementQuery(supabase),
        requirementQueryOptions
      );

      if (sortOption === "oldest") {
        query = query.order("created_at", { ascending: true });
      } else if (sortOption === "newest") {
        query = query.order("created_at", { ascending: false });
      } else if (mine) {
        query = query.order("updated_at", { ascending: false });
      } else {
        query = query.order("created_at", { ascending: false });
      }

      const { data, count, error } = await query.range(rangeFrom, rangeTo);

      if (error) {
        return jsonError(error.message || "Failed to load requirements.", 400);
      }

      requirements = await enrichRequirementsWithSubmissionMeta(supabase, (data as Requirement[]) || []);
      totalCount = count || 0;
    }
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Failed to load requirements.", 400);
  }

  const response = NextResponse.json(
    {
      viewerRole: viewer.role,
      brokerProfileId: brokerProfile?.id || null,
      areas,
      pagination: buildPaginationMeta({
        page,
        pageSize,
        totalCount,
      }),
      requirements,
      myListings: myListings.map((listing) => ({
        id: listing.id,
        title: listing.title,
        property_type: listing.property_type,
        price: listing.price,
        bedrooms: listing.bedrooms,
        status: listing.status,
        area_id: listing.area_id,
        area: listing.area,
      })),
    },
    withNoStore()
  );
  return response;
}

export async function POST(request: NextRequest) {
  const viewer = await getRequestUser(request);
  if (!viewer || viewer.role !== "broker" || !isActiveBrokerStatus(viewer.status)) {
    return jsonError("Active broker access required.", 403);
  }

  const supabase = getRequestSupabase(request);
  const brokerProfile = await fetchBrokerProfileByUserId(supabase, viewer.id);
  if (!brokerProfile?.id) {
    return jsonError("Broker profile not found.", 404);
  }

  const body = await request.json();
  const title = String(body.title || "").trim() || null;
  const description = String(body.description || "").trim();
  const propertyType = String(body.propertyType || "apartment").trim();
  const dealType = String(body.dealType || "secondary").trim();
  const rawBedrooms = String(body.bedrooms || "").trim();
  const bedrooms = parseRequirementBedroomOption(rawBedrooms) || rawBedrooms || null;
  const budgetMin = body.budgetMin ? Number(body.budgetMin) : null;
  const budgetMax = body.budgetMax ? Number(body.budgetMax) : null;
  const area = String(body.area || "").trim();
  const urgency = String(body.urgency || "medium").trim();
  const timeline = String(body.timeline || "").trim() || null;

  if (!area) {
    return jsonError("Area is required.", 400);
  }

  if (budgetMin !== null && !Number.isFinite(budgetMin)) {
    return jsonError("Minimum budget must be numeric.", 400);
  }

  if (budgetMax !== null && !Number.isFinite(budgetMax)) {
    return jsonError("Maximum budget must be numeric.", 400);
  }

  if (budgetMin !== null && budgetMax !== null && budgetMin > budgetMax) {
    return jsonError("Minimum budget cannot be higher than maximum budget.", 400);
  }

  const { data, error } = await supabase
    .from("requirements")
    .insert({
      broker_id: brokerProfile.id,
      posted_by: viewer.id,
      title,
      description,
      property_type: propertyType,
      deal_type: dealType,
      bedrooms,
      budget_min: budgetMin,
      budget_max: budgetMax,
      area,
      urgency,
      timeline,
      is_active: true,
      deleted_at: null,
    })
    .select("id")
    .single();

  if (error || !data) {
    return jsonError(error?.message || "Failed to create requirement.", 400);
  }

  await logActivity(getServiceSupabase(), viewer.id, "requirement_created", "requirements", data.id, {
    requirementTitle: title,
    propertyType,
    dealType,
    bedrooms,
    budgetMin,
    budgetMax,
    area,
    urgency,
  });

  // Email trigger: find existing listings that match this new buyer requirement.
  const requirementMatchEmailWorkflow = triggerRequirementMatchFoundForRequirement({ requirementId: data.id });
  if (!runEmailWorkflowInBackground(requirementMatchEmailWorkflow, "requirement-created-match-email")) {
    await requirementMatchEmailWorkflow;
  }

  return NextResponse.json(
    {
      success: true,
      requirementId: data.id,
      message: "Buyer requirement created.",
    },
    withNoStore()
  );
}

