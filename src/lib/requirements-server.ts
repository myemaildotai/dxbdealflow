import type { SupabaseClient } from "@supabase/supabase-js";
import {
  BROKER_PROFILE_SELECT,
  getServiceSupabase,
  LISTING_SELECT,
  REQUIREMENT_MATCH_SELECT,
  REQUIREMENT_NOTIFICATION_SELECT,
  REQUIREMENT_SELECT,
} from "@/lib/deal-server";
import { hydrateListings, fetchAreas } from "@/lib/platform-server-data";
import { getRequirementStatus } from "@/lib/requirements";
import type {
  BrokerProfile,
  Listing,
  PlatformUser,
  Requirement,
  RequirementMatch,
  RequirementNotification,
} from "@/lib/deal-types";

type RequirementSubmissionMeta = {
  count: number;
  latest: string | null;
};

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

async function fetchRequirementSubmissionMeta(supabase: SupabaseClient, requirementIds: string[]) {
  if (!requirementIds.length) {
    return new Map<string, RequirementSubmissionMeta>();
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

export async function enrichRequirementsWithSubmissionMeta(supabase: SupabaseClient, requirements: Requirement[]) {
  if (!requirements.length) {
    return [] as Requirement[];
  }

  const requirementIds = requirements.map((requirement) => requirement.id);
  const [submissionMeta, ownerContext] = await Promise.all([
    fetchRequirementSubmissionMeta(supabase, requirementIds),
    fetchRequirementOwnerContext(supabase, requirements),
  ]);

  return requirements.map((requirement) => {
    const submission = submissionMeta.get(requirement.id);
    const ownerUserId = getRequirementOwnerUserId(requirement, ownerContext.brokerProfileOwnerMap);

    return withRequirementStatus({
      ...requirement,
      owner: ownerUserId ? ownerContext.ownerMap.get(ownerUserId) || requirement.owner || null : requirement.owner || null,
      submitted_match_count: submission?.count || 0,
      latest_submission_at: submission?.latest || null,
    });
  });
}

export async function hydrateRequirementMatches(supabase: SupabaseClient, matches: RequirementMatch[]) {
  if (!matches.length) {
    return [] as RequirementMatch[];
  }

  const senderBrokerIds = Array.from(new Set(matches.map((match) => match.sender_broker_id).filter(Boolean)));
  const listingIds = Array.from(new Set(matches.map((match) => match.listing_id).filter(Boolean))) as string[];
  const requirementIds = Array.from(new Set(matches.map((match) => match.requirement_id).filter(Boolean))) as string[];

  const [brokerProfilesResult, listingRowsResult, requirementRowsResult] = await Promise.all([
    senderBrokerIds.length
      ? supabase.from("broker_profiles").select("id, user_id").in("id", senderBrokerIds)
      : Promise.resolve({ data: [] as Array<Pick<BrokerProfile, "id" | "user_id">> }),
    listingIds.length
      ? supabase.from("listings").select(LISTING_SELECT).in("id", listingIds)
      : Promise.resolve({ data: [] as Listing[] }),
    requirementIds.length
      ? supabase.from("requirements").select(REQUIREMENT_SELECT).in("id", requirementIds)
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
  const hydratedListings = await hydrateListings(supabase, (listingRowsResult.data as Listing[]) || []);
  const listingMap = new Map(hydratedListings.map((listing) => [listing.id, listing]));
  const requirementMap = new Map(
    (((requirementRowsResult.data as Requirement[]) || []).map((requirement) => [
      requirement.id,
      withRequirementStatus(requirement),
    ]))
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
            property_type: listing.property_type,
            price: listing.price,
            status: listing.status,
            bedrooms: listing.bedrooms,
            area: listing.area,
            is_visible: listing.is_visible,
            deleted_at: listing.deleted_at || null,
          }
        : null,
      sender: senderUserMap.get(senderProfileMap.get(match.sender_broker_id) || "") || null,
      requirement: requirementMap.get(match.requirement_id) || null,
    };
  });
}

export async function hydrateRequirementNotifications(supabase: SupabaseClient, notifications: RequirementNotification[]) {
  if (!notifications.length) {
    return [] as RequirementNotification[];
  }

  const requirementIds = Array.from(new Set(notifications.map((notification) => notification.requirement_id).filter(Boolean))) as string[];
  const matchIds = Array.from(new Set(notifications.map((notification) => notification.requirement_match_id).filter(Boolean))) as string[];
  const [{ data: requirementRows }, { data: matchRows }] = await Promise.all([
    requirementIds.length
      ? supabase.from("requirements").select(REQUIREMENT_SELECT).in("id", requirementIds)
      : Promise.resolve({ data: [] as Requirement[] }),
    matchIds.length
      ? supabase.from("requirement_matches").select(REQUIREMENT_MATCH_SELECT).in("id", matchIds)
      : Promise.resolve({ data: [] as RequirementMatch[] }),
  ]);

  const requirementMap = new Map(
    (((requirementRows as Requirement[]) || []).map((requirement) => [
      requirement.id,
      withRequirementStatus(requirement),
    ]))
  );
  const hydratedMatches = await hydrateRequirementMatches(supabase, (matchRows as RequirementMatch[]) || []);
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

  return enrichRequirementsWithSubmissionMeta(supabase, requirements);
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

export async function fetchRequirementNotificationsForBroker(supabase: SupabaseClient, brokerProfileId: string) {
  const { data } = await supabase
    .from("broker_notifications")
    .select(REQUIREMENT_NOTIFICATION_SELECT)
    .eq("recipient_broker_id", brokerProfileId)
    .order("created_at", { ascending: false });

  return hydrateRequirementNotifications(supabase, (data as RequirementNotification[]) || []);
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
