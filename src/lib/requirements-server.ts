import type { SupabaseClient } from "@supabase/supabase-js";
import {
  BROKER_PROFILE_SELECT,
  getServiceSupabase,
  LISTING_SELECT,
  REQUIREMENT_MATCH_SELECT,
  REQUIREMENT_SELECT,
} from "@/lib/deal-server";
import { hydrateListings, fetchAreas } from "@/lib/platform-server-data";
import type { BrokerRequirementNotificationSource } from "@/lib/broker-notifications";
import { getRequirementStatus, parseRequirementBedroomOption } from "@/lib/requirements";
import { normalizeArea, type MatchableRequirement } from "@/lib/requirement-matching";
import type {
  BrokerProfile,
  Listing,
  PlatformUser,
  Requirement,
  RequirementMatch,
  RequirementNotification,
} from "@/lib/deal-types";

const REQUIREMENT_MATCH_LISTING_BATCH_SIZE = 1000;
const REQUIREMENT_MATCH_PRICE_TOLERANCE = 0.1;
const REQUIREMENT_MATCH_LISTING_SELECT =
  "id, area_id, price, bedrooms, status, deleted_at, created_by, area:areas(name)";
const HYDRATED_REQUIREMENT_MATCH_LISTING_SELECT =
  "id, title, property_type, price, status, bedrooms, is_visible, deleted_at, area:areas(id, name, city, slug)";
const REQUIREMENT_MATCH_MODAL_LISTING_SELECT = "id, title, status, is_visible, deleted_at";
const REQUIREMENT_MATCH_ACTIVE_LISTING_STATUSES = ["active", "approved"] as const;
const REQUIREMENT_NOTIFICATION_REQUIREMENT_SELECT = "id, title, description, area, property_type";
const REQUIREMENT_NOTIFICATION_LISTING_SELECT = "id, title, property_type, price, status";
const REQUIREMENT_NOTIFICATION_RECENT_LIMIT = 50;

type RequirementSubmissionMeta = {
  count: number;
  latest: string | null;
};
type RequirementSubmissionMetaRpcRow = {
  requirement_id: string;
  submission_count: number | null;
  latest_submission_at: string | null;
};
export type RequirementMatchCandidateListing = Pick<Listing, "id" | "area_id" | "price" | "bedrooms" | "status" | "deleted_at" | "created_by"> & {
  area?: { name: string } | null;
};

type RequirementMatchListingRow = Pick<Listing, "id" | "area_id" | "price" | "bedrooms" | "status" | "deleted_at" | "created_by"> & {
  area?: unknown;
};

type RequirementMatchListingOptions = {
  excludeUserId?: string | null;
  previewRequirement?: MatchableRequirement | null;
};

type RequirementMatchBedroomFilter =
  | {
      type: "values";
      values: number[];
    }
  | {
      type: "min";
      value: number;
    };

type RequirementMatchCandidateQuery = {
  areaIds?: string[];
  bedrooms?: RequirementMatchBedroomFilter;
  priceMax?: number;
  priceMin?: number;
};

function getJoinedAreaName(value: unknown): string | null {
  const areaValue = Array.isArray(value) ? value[0] : value;

  if (!areaValue || typeof areaValue !== "object") {
    return null;
  }

  const name = (areaValue as { name?: unknown }).name;
  return typeof name === "string" && name.trim() ? name : null;
}

function normalizeRequirementMatchListing(row: RequirementMatchListingRow): RequirementMatchCandidateListing {
  const areaName = getJoinedAreaName(row.area);

  return {
    id: row.id,
    area_id: row.area_id,
    price: row.price,
    bedrooms: row.bedrooms,
    status: row.status,
    deleted_at: row.deleted_at || null,
    created_by: row.created_by,
    area: areaName ? { name: areaName } : null,
  };
}

function getPositiveFiniteNumber(value: number | null | undefined) {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) && numericValue > 0 ? numericValue : null;
}

function getRequirementMatchBudgetWindow(requirement: MatchableRequirement | null | undefined) {
  const budgetMin = getPositiveFiniteNumber(requirement?.budget_min);
  const budgetMax = getPositiveFiniteNumber(requirement?.budget_max);

  if (budgetMin === null || budgetMax === null || budgetMin > budgetMax) {
    return null;
  }

  return {
    exactMin: budgetMin,
    exactMax: budgetMax,
    toleranceMin: Math.floor(budgetMin * (1 - REQUIREMENT_MATCH_PRICE_TOLERANCE)),
    toleranceMax: Math.ceil(budgetMax * (1 + REQUIREMENT_MATCH_PRICE_TOLERANCE)),
  };
}

function getRequirementMatchBedroomFilter(value: string | null | undefined): RequirementMatchBedroomFilter | null {
  const parsedValue = parseRequirementBedroomOption(value);

  if (!parsedValue) {
    return null;
  }

  if (parsedValue === "Studio") {
    return { type: "values", values: [0, 1] };
  }

  if (parsedValue === "8BR+") {
    return { type: "min", value: 7 };
  }

  const numericMatch = parsedValue.match(/(\d+)/);
  if (!numericMatch) {
    return null;
  }

  const bedroomCount = Number(numericMatch[1]);
  if (!Number.isFinite(bedroomCount)) {
    return null;
  }

  const values = new Set<number>();
  for (let nextValue = Math.max(0, bedroomCount - 1); nextValue <= bedroomCount + 1; nextValue += 1) {
    values.add(nextValue);
  }

  return { type: "values", values: Array.from(values).sort((left, right) => left - right) };
}

async function resolveRequirementMatchAreaIds(supabase: SupabaseClient, area: string | null | undefined) {
  const normalizedArea = normalizeArea(area);

  if (!normalizedArea) {
    return null;
  }

  const areas = await fetchAreas(supabase);
  return areas
    .filter((candidateArea) => normalizeArea(candidateArea.name) === normalizedArea)
    .map((candidateArea) => candidateArea.id);
}

function getRequirementMatchCandidateQueries({
  areaIds,
  bedroomFilter,
  budgetWindow,
}: {
  areaIds: string[] | null;
  bedroomFilter: RequirementMatchBedroomFilter | null;
  budgetWindow: ReturnType<typeof getRequirementMatchBudgetWindow>;
}): RequirementMatchCandidateQuery[] {
  const baseQuery: RequirementMatchCandidateQuery = {};

  if (areaIds) {
    baseQuery.areaIds = areaIds;
  }

  if (budgetWindow && bedroomFilter) {
    return [
      {
        ...baseQuery,
        priceMin: budgetWindow.exactMin,
        priceMax: budgetWindow.exactMax,
      },
      {
        ...baseQuery,
        bedrooms: bedroomFilter,
        priceMin: budgetWindow.toleranceMin,
        priceMax: budgetWindow.toleranceMax,
      },
    ];
  }

  if (budgetWindow) {
    return [
      {
        ...baseQuery,
        priceMin: budgetWindow.toleranceMin,
        priceMax: budgetWindow.toleranceMax,
      },
    ];
  }

  if (bedroomFilter) {
    return [
      {
        ...baseQuery,
        bedrooms: bedroomFilter,
      },
    ];
  }

  return [baseQuery];
}

async function resolveRequirementMatchCandidateQueries(
  supabase: SupabaseClient,
  requirement: MatchableRequirement | null | undefined
) {
  if (!requirement) {
    return [{}] as RequirementMatchCandidateQuery[];
  }

  const areaIds = await resolveRequirementMatchAreaIds(supabase, requirement.area);
  if (areaIds?.length === 0) {
    return [] as RequirementMatchCandidateQuery[];
  }

  const budgetWindow = getRequirementMatchBudgetWindow(requirement);
  const bedroomFilter = getRequirementMatchBedroomFilter(requirement.bedrooms);

  if (!areaIds && !budgetWindow && !bedroomFilter) {
    return [] as RequirementMatchCandidateQuery[];
  }

  return getRequirementMatchCandidateQueries({
    areaIds,
    bedroomFilter,
    budgetWindow,
  });
}

function getRequirementOwnerUserId(
  requirement: Pick<Requirement, "posted_by" | "broker_id">,
  brokerProfileOwnerMap: Map<string, string>
) {
  return requirement.posted_by || brokerProfileOwnerMap.get(requirement.broker_id) || null;
}

function withRequirementStatus<TRequirement extends Requirement>(requirement: TRequirement): TRequirement {
  return {
    ...requirement,
    status: getRequirementStatus(requirement),
  };
}

async function fetchRequirementOwnerContext(supabase: SupabaseClient, requirements: Requirement[]) {
  const brokerIds = Array.from(new Set(requirements.map((requirement) => requirement.broker_id).filter(Boolean))) as string[];
  const { data: brokerProfiles } = brokerIds.length
    ? await supabase.from("broker_profiles").select("id, user_id").in("id", brokerIds)
    : { data: [] as Array<Pick<BrokerProfile, "id" | "user_id">> };
  const resolvedBrokerProfiles = (((brokerProfiles as Array<Pick<BrokerProfile, "id" | "user_id">>) || []).filter(
    (profile): profile is Pick<BrokerProfile, "id" | "user_id"> & { id: string } => !!profile.id
  ));

  const brokerProfileOwnerMap = new Map(
    resolvedBrokerProfiles.map((profile) => [profile.id, profile.user_id])
  );
  const ownerIds = Array.from(
    new Set(
      requirements
        .map((requirement) => getRequirementOwnerUserId(requirement, brokerProfileOwnerMap))
        .filter(Boolean)
    )
  ) as string[];

  const { data: ownerRows } = ownerIds.length
    ? await supabase.from("users").select("id, first_name, last_name, email").in("id", ownerIds)
    : { data: [] as Array<Pick<PlatformUser, "id" | "first_name" | "last_name" | "email">> };
  const ownerMap = new Map(
    (((ownerRows as Array<Pick<PlatformUser, "id" | "first_name" | "last_name" | "email">>) || []).map((user) => [user.id, user]))
  );

  return { brokerProfileOwnerMap, ownerMap };
}

async function fetchRequirementSubmissionMetaRpc(supabase: SupabaseClient, brokerProfileId: string) {
  const { data, error } = await supabase.rpc("get_requirement_submission_meta_for_broker", {
    p_broker_profile_id: brokerProfileId,
  });

  if (error) {
    return null;
  }

  return new Map(
    (((data as RequirementSubmissionMetaRpcRow[] | null) || []).map((row) => [
      row.requirement_id,
      {
        count: row.submission_count || 0,
        latest: row.latest_submission_at || null,
      },
    ]))
  );
}

async function fetchRequirementSubmissionMeta(supabase: SupabaseClient, requirementIds: string[], brokerProfileId?: string | null) {
  if (!requirementIds.length) {
    return new Map<string, RequirementSubmissionMeta>();
  }

  if (brokerProfileId) {
    const rpcMeta = await fetchRequirementSubmissionMetaRpc(supabase, brokerProfileId);
    if (rpcMeta) {
      return rpcMeta;
    }
  }

  let metadataSupabase = supabase;

  try {
    metadataSupabase = getServiceSupabase();
  } catch {
    metadataSupabase = supabase;
  }

  const { data: matchRows } = await metadataSupabase
    .from("requirement_matches")
    .select("requirement_id, created_at")
    .in("requirement_id", requirementIds)
    .order("created_at", { ascending: false });

  const submissionMeta = new Map<string, RequirementSubmissionMeta>();

  (((matchRows as Array<{ requirement_id: string; created_at: string }> | null) || []).forEach((row) => {
    const current = submissionMeta.get(row.requirement_id);

    if (!current) {
      submissionMeta.set(row.requirement_id, {
        count: 1,
        latest: row.created_at,
      });
      return;
    }

    submissionMeta.set(row.requirement_id, {
      count: current.count + 1,
      latest: current.latest || row.created_at,
    });
  }));

  return submissionMeta;
}

export async function fetchBrokerProfileByUserId(supabase: SupabaseClient, userId: string) {
  const { data } = await supabase.from("broker_profiles").select(BROKER_PROFILE_SELECT).eq("user_id", userId).maybeSingle();
  return (data as BrokerProfile | null) || null;
}

export async function fetchRequirementMatchCandidateListings(
  supabase: SupabaseClient,
  { excludeUserId, previewRequirement }: RequirementMatchListingOptions = {}
) {
  const candidateQueries = await resolveRequirementMatchCandidateQueries(supabase, previewRequirement);
  const listingsById = new Map<string, RequirementMatchCandidateListing>();

  for (const candidateQuery of candidateQueries) {
    let rangeFrom = 0;

    while (true) {
      let query = supabase
        .from("listings")
        .select(REQUIREMENT_MATCH_LISTING_SELECT)
        .eq("is_visible", true)
        .is("deleted_at", null)
        .in("status", REQUIREMENT_MATCH_ACTIVE_LISTING_STATUSES)
        .order("created_at", { ascending: false });

      if (excludeUserId) {
        query = query.neq("created_by", excludeUserId);
      }

      if (candidateQuery.areaIds?.length) {
        query = query.in("area_id", candidateQuery.areaIds);
      }

      if (typeof candidateQuery.priceMin === "number") {
        query = query.gte("price", candidateQuery.priceMin);
      }

      if (typeof candidateQuery.priceMax === "number") {
        query = query.lte("price", candidateQuery.priceMax);
      }

      if (candidateQuery.bedrooms?.type === "values") {
        query = query.in("bedrooms", candidateQuery.bedrooms.values);
      } else if (candidateQuery.bedrooms?.type === "min") {
        query = query.gte("bedrooms", candidateQuery.bedrooms.value);
      }

      const { data, error } = await query.range(rangeFrom, rangeFrom + REQUIREMENT_MATCH_LISTING_BATCH_SIZE - 1);

      if (error) {
        throw new Error(error.message || "Failed to load match preview listings.");
      }

      const batch = ((data as unknown as RequirementMatchListingRow[] | null) || []).map(normalizeRequirementMatchListing);
      batch.forEach((listing) => {
        listingsById.set(listing.id, listing);
      });

      if (batch.length < REQUIREMENT_MATCH_LISTING_BATCH_SIZE) {
        break;
      }

      rangeFrom += REQUIREMENT_MATCH_LISTING_BATCH_SIZE;
    }
  }

  return Array.from(listingsById.values());
}

export async function fetchHydratedRequirementMatchCandidateListings(
  supabase: SupabaseClient,
  { excludeUserId }: RequirementMatchListingOptions = {}
) {
  const listings: Listing[] = [];
  let rangeFrom = 0;

  while (true) {
    let query = supabase
      .from("listings")
      .select(LISTING_SELECT)
      .eq("is_visible", true)
      .is("deleted_at", null)
      .in("status", REQUIREMENT_MATCH_ACTIVE_LISTING_STATUSES)
      .order("created_at", { ascending: false });

    if (excludeUserId) {
      query = query.neq("created_by", excludeUserId);
    }

    const { data, error } = await query.range(rangeFrom, rangeFrom + REQUIREMENT_MATCH_LISTING_BATCH_SIZE - 1);

    if (error) {
      throw new Error(error.message || "Failed to load requirement match listings.");
    }

    const batch = (data as Listing[] | null) || [];
    listings.push(...batch);

    if (batch.length < REQUIREMENT_MATCH_LISTING_BATCH_SIZE) {
      break;
    }

    rangeFrom += REQUIREMENT_MATCH_LISTING_BATCH_SIZE;
  }

  return hydrateListings(supabase, listings);
}

export async function enrichRequirementsWithSubmissionMeta(
  supabase: SupabaseClient,
  requirements: Requirement[],
  brokerProfileId?: string | null,
  { includeOwner = true }: { includeOwner?: boolean } = {}
) {
  if (!requirements.length) {
    return [] as Requirement[];
  }

  const requirementIds = requirements.map((requirement) => requirement.id);
  const [submissionMeta, ownerContext] = await Promise.all([
    fetchRequirementSubmissionMeta(supabase, requirementIds, brokerProfileId),
    includeOwner
      ? fetchRequirementOwnerContext(supabase, requirements)
      : Promise.resolve({
          brokerProfileOwnerMap: new Map<string, string>(),
          ownerMap: new Map<string, Pick<PlatformUser, "id" | "first_name" | "last_name" | "email">>(),
        }),
  ]);

  return requirements.map((requirement) => {
    const submission = submissionMeta.get(requirement.id);
    const ownerUserId = includeOwner ? getRequirementOwnerUserId(requirement, ownerContext.brokerProfileOwnerMap) : null;

    return withRequirementStatus({
      ...requirement,
      ...(includeOwner
        ? { owner: ownerUserId ? ownerContext.ownerMap.get(ownerUserId) || requirement.owner || null : requirement.owner || null }
        : {}),
      submitted_match_count: submission?.count || 0,
      latest_submission_at: submission?.latest || null,
    });
  });
}

export async function hydrateRequirementMatches(
  supabase: SupabaseClient,
  matches: RequirementMatch[],
  {
    includeListingDetails = true,
    includeRequirement = true,
    knownRequirements = [],
  }: {
    includeListingDetails?: boolean;
    includeRequirement?: boolean;
    knownRequirements?: Requirement[];
  } = {}
) {
  if (!matches.length) {
    return [] as RequirementMatch[];
  }

  const senderBrokerIds = Array.from(new Set(matches.map((match) => match.sender_broker_id).filter(Boolean)));
  const listingIds = Array.from(new Set(matches.map((match) => match.listing_id).filter(Boolean))) as string[];
  const requirementIds = includeRequirement
    ? (Array.from(new Set(matches.map((match) => match.requirement_id).filter(Boolean))) as string[])
    : [];
  const knownRequirementMap = new Map(
    includeRequirement ? knownRequirements.map((requirement) => [requirement.id, withRequirementStatus(requirement)] as const) : []
  );
  const missingRequirementIds = requirementIds.filter((requirementId) => !knownRequirementMap.has(requirementId));

  const [brokerProfilesResult, listingRowsResult, requirementRowsResult] = await Promise.all([
    senderBrokerIds.length
      ? supabase.from("broker_profiles").select("id, user_id").in("id", senderBrokerIds)
      : Promise.resolve({ data: [] as Array<Pick<BrokerProfile, "id" | "user_id">> }),
    listingIds.length
      ? supabase
          .from("listings")
          .select(includeListingDetails ? HYDRATED_REQUIREMENT_MATCH_LISTING_SELECT : REQUIREMENT_MATCH_MODAL_LISTING_SELECT)
          .in("id", listingIds)
      : Promise.resolve({ data: [] as Listing[] }),
    missingRequirementIds.length
      ? supabase.from("requirements").select(REQUIREMENT_SELECT).in("id", missingRequirementIds)
      : Promise.resolve({ data: [] as Requirement[] }),
  ]);

  const senderProfiles = ((brokerProfilesResult.data as Array<Pick<BrokerProfile, "id" | "user_id">>) || []).filter(
    (profile): profile is Pick<BrokerProfile, "id" | "user_id"> => !!profile.id
  );
  const senderUserIds = Array.from(new Set(senderProfiles.map((profile) => profile.user_id)));
  const { data: senderUsers } = senderUserIds.length
    ? await supabase.from("users").select("id, first_name, last_name, email").in("id", senderUserIds)
    : { data: [] as Array<Pick<PlatformUser, "id" | "first_name" | "last_name" | "email">> };

  const senderProfileMap = new Map(senderProfiles.map((profile) => [profile.id!, profile.user_id]));
  const senderUserMap = new Map(
    (((senderUsers as Array<Pick<PlatformUser, "id" | "first_name" | "last_name" | "email">>) || []).map((user) => [user.id, user]))
  );
  const listingMap = new Map(
    (((listingRowsResult.data as unknown as Listing[]) || []).map((listing) => [listing.id, listing]))
  );
  const requirementMap = new Map(
    [
      ...knownRequirementMap,
      ...(((requirementRowsResult.data as Requirement[]) || []).map(
        (requirement) => [requirement.id, withRequirementStatus(requirement)] as const
      )),
    ]
  );

  return matches.map((match) => {
    const listing = match.listing_id ? listingMap.get(match.listing_id) || null : null;

    return {
      ...match,
      receiver_broker_id: match.receiver_broker_id || null,
      status: match.status || "new",
      listing: listing
        ? {
            id: listing.id,
            title: listing.title,
            status: listing.status,
            is_visible: listing.is_visible,
            deleted_at: listing.deleted_at || null,
            ...(includeListingDetails
              ? {
                  property_type: listing.property_type,
                  price: listing.price,
                  bedrooms: listing.bedrooms,
                  area: listing.area,
                }
              : {}),
          }
        : null,
      sender: senderUserMap.get(senderProfileMap.get(match.sender_broker_id) || "") || null,
      ...(includeRequirement ? { requirement: requirementMap.get(match.requirement_id) || null } : {}),
    };
  });
}

export async function hydrateRequirementNotifications(supabase: SupabaseClient, notifications: RequirementNotification[]) {
  if (!notifications.length) {
    return [] as RequirementNotification[];
  }

  const requirementIds = Array.from(new Set(notifications.map((notification) => notification.requirement_id).filter(Boolean))) as string[];
  const matchIds = Array.from(new Set(notifications.map((notification) => notification.requirement_match_id).filter(Boolean))) as string[];
  const [requirementRowsResult, matchRowsResult] = await Promise.all([
    requirementIds.length
      ? supabase.from("requirements").select(REQUIREMENT_NOTIFICATION_REQUIREMENT_SELECT).in("id", requirementIds)
      : Promise.resolve({ data: [] as Requirement[], error: null }),
    matchIds.length
      ? supabase.from("requirement_matches").select(REQUIREMENT_MATCH_SELECT).in("id", matchIds)
      : Promise.resolve({ data: [] as RequirementMatch[], error: null }),
  ]);

  if (requirementRowsResult.error || matchRowsResult.error) {
    throw new Error(
      requirementRowsResult.error?.message ||
        matchRowsResult.error?.message ||
        "Failed to load requirement notification context."
    );
  }

  const matches = (matchRowsResult.data as RequirementMatch[] | null) || [];
  const senderBrokerIds = Array.from(new Set(matches.map((match) => match.sender_broker_id).filter(Boolean)));
  const listingIds = Array.from(new Set(matches.map((match) => match.listing_id).filter(Boolean))) as string[];
  const [senderProfilesResult, listingRowsResult] = await Promise.all([
    senderBrokerIds.length
      ? supabase.from("broker_profiles").select("id, user_id").in("id", senderBrokerIds)
      : Promise.resolve({ data: [] as Array<Pick<BrokerProfile, "id" | "user_id">>, error: null }),
    listingIds.length
      ? supabase.from("listings").select(REQUIREMENT_NOTIFICATION_LISTING_SELECT).in("id", listingIds)
      : Promise.resolve({
          data: [] as Array<Pick<Listing, "id" | "title" | "property_type" | "price" | "status">>,
          error: null,
        }),
  ]);

  if (senderProfilesResult.error || listingRowsResult.error) {
    throw new Error(
      senderProfilesResult.error?.message ||
        listingRowsResult.error?.message ||
        "Failed to load requirement notification listing context."
    );
  }

  const senderProfiles =
    (senderProfilesResult.data as Array<Pick<BrokerProfile, "id" | "user_id">> | null) || [];
  const senderUserIds = Array.from(new Set(senderProfiles.map((profile) => profile.user_id).filter(Boolean)));
  const senderUsersResult = senderUserIds.length
    ? await supabase.from("users").select("id, first_name, last_name, email").in("id", senderUserIds)
    : { data: [] as Array<Pick<PlatformUser, "id" | "first_name" | "last_name" | "email">>, error: null };

  if (senderUsersResult.error) {
    throw new Error(senderUsersResult.error.message || "Failed to load requirement notification sender context.");
  }

  const requirementMap = new Map(
    (((requirementRowsResult.data as Requirement[]) || []).map((requirement) => [requirement.id, requirement]))
  );
  const senderProfileMap = new Map(senderProfiles.map((profile) => [profile.id, profile.user_id]));
  const senderUserMap = new Map(
    (((senderUsersResult.data as Array<Pick<PlatformUser, "id" | "first_name" | "last_name" | "email">>) || []).map(
      (user) => [user.id, user]
    ))
  );
  const listingMap = new Map(
    (((listingRowsResult.data as Array<Pick<Listing, "id" | "title" | "property_type" | "price" | "status">>) || []).map(
      (listing) => [listing.id, listing]
    ))
  );
  const hydratedMatches = matches.map((match) => ({
    ...match,
    listing: match.listing_id ? listingMap.get(match.listing_id) || null : null,
    sender: senderUserMap.get(senderProfileMap.get(match.sender_broker_id) || "") || null,
  }));
  const matchMap = new Map(hydratedMatches.map((match) => [match.id, match]));

  return notifications.map((notification) => ({
    ...notification,
    requirement: notification.requirement_id ? requirementMap.get(notification.requirement_id) || null : null,
    match: notification.requirement_match_id ? matchMap.get(notification.requirement_match_id) || null : null,
    listing_id: notification.requirement_match_id ? matchMap.get(notification.requirement_match_id)?.listing_id || null : null,
  }));
}

export async function fetchMyRequirements(supabase: SupabaseClient, brokerProfileId: string) {
  const { data } = await supabase
    .from("requirements")
    .select(REQUIREMENT_SELECT)
    .eq("broker_id", brokerProfileId)
    .order("updated_at", { ascending: false });

  const requirements = (data as Requirement[]) || [];
  if (!requirements.length) {
    return [] as Requirement[];
  }

  return enrichRequirementsWithSubmissionMeta(supabase, requirements, brokerProfileId, { includeOwner: false });
}

export async function fetchRequirementMatchesForOwner(supabase: SupabaseClient, brokerProfileId: string) {
  const { data: ownedRequirements } = await supabase
    .from("requirements")
    .select("id")
    .eq("broker_id", brokerProfileId);
  const requirementIds = (((ownedRequirements as Array<{ id: string }>) || []).map((requirement) => requirement.id));

  if (!requirementIds.length) {
    return [] as RequirementMatch[];
  }

  const { data } = await supabase
    .from("requirement_matches")
    .select(REQUIREMENT_MATCH_SELECT)
    .in("requirement_id", requirementIds)
    .order("created_at", { ascending: false });

  return hydrateRequirementMatches(supabase, (data as RequirementMatch[]) || []);
}

export async function fetchRequirementNotificationsForBroker(
  supabase: SupabaseClient,
  brokerProfileId: string,
  { recentLimit = REQUIREMENT_NOTIFICATION_RECENT_LIMIT }: { recentLimit?: number } = {}
) {
  const resolvedRecentLimit =
    Number.isFinite(recentLimit) && recentLimit > 0 ? Math.floor(recentLimit) : REQUIREMENT_NOTIFICATION_RECENT_LIMIT;
  const { data: brokerProfile, error: brokerProfileError } = await supabase
    .from("broker_profiles")
    .select("user_id")
    .eq("id", brokerProfileId)
    .maybeSingle();

  if (brokerProfileError || !brokerProfile?.user_id) {
    if (brokerProfileError) {
      throw new Error(brokerProfileError.message || "Failed to load broker notification identity.");
    }
    return [];
  }

  const createQuery = () =>
    supabase
      .from("notifications")
      .select("id, title, message, is_read, read_at, metadata, created_at")
      .eq("recipient_user_id", brokerProfile.user_id)
      .eq("recipient_role", "broker")
      .eq("type", "requirement_match_found")
      .eq("status", "active")
      .order("created_at", { ascending: false });
  const [recentResult, unreadResult] = await Promise.all([
    createQuery().limit(resolvedRecentLimit),
    createQuery().eq("is_read", false),
  ]);

  if (recentResult.error || unreadResult.error) {
    throw new Error(
      recentResult.error?.message ||
        unreadResult.error?.message ||
        "Failed to load requirement notifications."
    );
  }

  type UnifiedRequirementNotificationRow = {
    id: string;
    title: string;
    message: string | null;
    is_read: boolean;
    read_at: string | null;
    metadata: Record<string, unknown> | null;
    created_at: string;
  };
  const notificationsById = new Map<string, UnifiedRequirementNotificationRow>();
  [
    ...(((unreadResult.data as UnifiedRequirementNotificationRow[] | null) || [])),
    ...(((recentResult.data as UnifiedRequirementNotificationRow[] | null) || [])),
  ].forEach((notification) => {
    notificationsById.set(notification.id, notification);
  });
  const notifications = Array.from(notificationsById.values())
    .flatMap<RequirementNotification>((notification) => {
      const requirementId = notification.metadata?.requirementId;
      const requirementMatchId = notification.metadata?.requirementMatchId;
      if (typeof requirementId !== "string") return [];

      return [{
        id: notification.id,
        recipient_broker_id: brokerProfileId,
        actor_broker_id: null,
        requirement_id: requirementId,
        requirement_match_id: typeof requirementMatchId === "string" ? requirementMatchId : null,
        title: notification.title,
        message: notification.message || "",
        is_read: notification.is_read,
        read_at: notification.read_at,
        created_at: notification.created_at,
      }];
    })
    .sort((left, right) => right.created_at.localeCompare(left.created_at));

  return hydrateRequirementNotifications(supabase, notifications);
}

export async function fetchBrokerRequirementNotificationSources(
  supabase: SupabaseClient,
  brokerProfileId: string,
  { recentLimit = REQUIREMENT_NOTIFICATION_RECENT_LIMIT }: { recentLimit?: number } = {}
): Promise<BrokerRequirementNotificationSource[]> {
  const resolvedRecentLimit =
    Number.isFinite(recentLimit) && recentLimit > 0 ? Math.floor(recentLimit) : REQUIREMENT_NOTIFICATION_RECENT_LIMIT;
  const { data: brokerProfile, error: brokerProfileError } = await supabase
    .from("broker_profiles")
    .select("user_id")
    .eq("id", brokerProfileId)
    .maybeSingle();

  if (brokerProfileError || !brokerProfile?.user_id) {
    if (brokerProfileError) {
      throw new Error(brokerProfileError.message || "Failed to load broker notification identity.");
    }
    return [];
  }

  const createQuery = () =>
    supabase
      .from("notifications")
      .select("id, is_read, read_at, metadata, created_at")
      .eq("recipient_user_id", brokerProfile.user_id)
      .eq("recipient_role", "broker")
      .eq("type", "requirement_match_found")
      .eq("status", "active")
      .order("created_at", { ascending: false });
  const [recentResult, unreadResult] = await Promise.all([
    createQuery().limit(resolvedRecentLimit),
    createQuery().eq("is_read", false),
  ]);

  if (recentResult.error || unreadResult.error) {
    throw new Error(
      recentResult.error?.message ||
        unreadResult.error?.message ||
        "Failed to load requirement notifications."
    );
  }

  type NotificationRow = {
    id: string;
    is_read: boolean;
    read_at: string | null;
    metadata: Record<string, unknown> | null;
    created_at: string;
  };

  const notificationsById = new Map<string, NotificationRow>();
  [
    ...(((unreadResult.data as NotificationRow[] | null) || [])),
    ...(((recentResult.data as NotificationRow[] | null) || [])),
  ].forEach((notification) => {
    notificationsById.set(notification.id, notification);
  });
  return Array.from(notificationsById.values())
    .flatMap<BrokerRequirementNotificationSource>((notification) => {
      const requirementId = notification.metadata?.requirementId;
      if (typeof requirementId !== "string") return [];

      return [{
        id: notification.id,
        requirementId,
        requirementTitle:
          typeof notification.metadata?.requirementTitle === "string"
            ? notification.metadata.requirementTitle
            : null,
        actorFirstName: null,
        actorLastName: null,
        isRead: notification.is_read,
        readAt: notification.read_at,
        createdAt: notification.created_at,
      }];
    })
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
}

export async function fetchRequirementFilterAreas(supabase: SupabaseClient) {
  const areas = await fetchAreas(supabase);
  const normalizedNames = new Map<string, string>();

  areas.forEach((area) => {
    const normalizedAreaName = area.name.replace(/\s+/g, " ").trim();
    if (!normalizedAreaName) return;
    const key = normalizedAreaName.toLowerCase();
    if (!normalizedNames.has(key)) normalizedNames.set(key, normalizedAreaName);
  });

  return Array.from(normalizedNames.values()).sort((left, right) => left.localeCompare(right));
}
