import type { SupabaseClient } from "@supabase/supabase-js";
import {
  AGENCY_SELECT,
  AREA_SELECT,
  LISTING_IMAGE_SELECT,
  LISTING_SELECT,
  USER_SELECT,
} from "@/lib/deal-server";
import type { Agency, BrokerProfile, CommissionTerms, Listing, ListingDocument, ListingImage, PlatformUser } from "@/lib/deal-types";

type ListingDetailBundle = {
  agency: Listing["agency"];
  area: Listing["area"];
  commission_terms: Listing["commission_terms"];
  listing: Listing | null;
  listing_images: Listing["listing_images"];
  owner: Listing["owner"];
  owner_active_listings_count: number | string | null;
  public_broker: Listing["public_broker"];
};

type OwnerBrokerProfileSocialLinks = Pick<BrokerProfile, "whatsapp_number" | "instagram_profile" | "linkedin_profile">;

export type InternalListingDetail = Listing & {
  ownerBrokerProfile?: OwnerBrokerProfileSocialLinks | null;
};

type InternalListingDetailOptions = {
  includeDocuments?: boolean;
  includeOwnerBrokerProfile?: boolean;
};

let listingDetailBundleRpcAvailable: boolean | null = null;

function normalizeCount(value: number | string | null | undefined) {
  const count = Number(value || 0);
  return Number.isFinite(count) ? count : 0;
}

function assertQuerySucceeded(error: { message?: string | null } | null | undefined, fallbackMessage: string) {
  if (error) {
    throw new Error(error.message || fallbackMessage);
  }
}

async function fetchListingDetailBundle(supabase: SupabaseClient, listingId: string) {
  if (listingDetailBundleRpcAvailable === false) {
    return { available: false, bundle: null as ListingDetailBundle | null };
  }

  const { data, error } = await supabase.rpc("get_listing_detail_bundle", {
    p_include_internal: true,
    p_listing_id: listingId,
  });

  if (error) {
    listingDetailBundleRpcAvailable = false;
    return { available: false, bundle: null as ListingDetailBundle | null };
  }

  listingDetailBundleRpcAvailable = true;
  return {
    available: true,
    bundle: (data as ListingDetailBundle | null) || null,
  };
}

function mergeListingBundle(bundle: ListingDetailBundle): Listing | null {
  if (!bundle.listing) {
    return null;
  }

  return {
    ...bundle.listing,
    area: bundle.area || null,
    owner: bundle.owner || null,
    agency: bundle.agency || null,
    commission_terms: bundle.commission_terms || null,
    listing_images: bundle.listing_images || [],
    listing_documents: [],
    owner_active_listings_count: normalizeCount(bundle.owner_active_listings_count),
    public_broker: bundle.public_broker || null,
  };
}

async function fetchListingDetailFallback(supabase: SupabaseClient, listingId: string): Promise<Listing | null> {
  const listingResult = await supabase
    .from("listings")
    .select(`${LISTING_SELECT}, area:areas(${AREA_SELECT})`)
    .eq("id", listingId)
    .maybeSingle();

  assertQuerySucceeded(listingResult.error, "Failed to load listing detail.");

  const listing = (listingResult.data as unknown as Listing | null) || null;
  if (!listing) {
    return null;
  }

  const [ownerResult, agencyResult, termsResult, imagesResult, ownerActiveCountResult] = await Promise.all([
    supabase.from("users").select(USER_SELECT).eq("id", listing.created_by).maybeSingle(),
    listing.agency_id
      ? supabase.from("agencies").select(AGENCY_SELECT).eq("id", listing.agency_id).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    supabase
      .from("commission_terms")
      .select("listing_id, co_broke_percent, payment_terms, notes")
      .eq("listing_id", listing.id)
      .maybeSingle(),
    supabase
      .from("listing_images")
      .select(LISTING_IMAGE_SELECT)
      .eq("listing_id", listing.id)
      .order("sort_order", { ascending: true })
      .order("id", { ascending: true }),
    supabase
      .from("listings")
      .select("id", { count: "exact", head: true })
      .eq("created_by", listing.created_by)
      .is("deleted_at", null)
      .in("status", ["active", "approved"]),
  ]);

  assertQuerySucceeded(ownerResult.error, "Failed to load listing owner.");
  assertQuerySucceeded(agencyResult.error, "Failed to load listing agency.");
  assertQuerySucceeded(termsResult.error, "Failed to load commission terms.");
  assertQuerySucceeded(imagesResult.error, "Failed to load listing images.");
  assertQuerySucceeded(ownerActiveCountResult.error, "Failed to load owner listing count.");

  return {
    ...listing,
    area: listing.area || null,
    owner: (ownerResult.data as PlatformUser | null) || null,
    agency: (agencyResult.data as Agency | null) || null,
    commission_terms: (termsResult.data as CommissionTerms | null) || null,
    listing_images: (imagesResult.data as ListingImage[] | null) || [],
    listing_documents: [],
    owner_active_listings_count: ownerActiveCountResult.count || 0,
  };
}

async function fetchInternalListingBase(supabase: SupabaseClient, listingId: string): Promise<Listing | null> {
  const detailBundleResult = await fetchListingDetailBundle(supabase, listingId);

  if (detailBundleResult.available && detailBundleResult.bundle) {
    return mergeListingBundle(detailBundleResult.bundle);
  }

  return fetchListingDetailFallback(supabase, listingId);
}

export async function fetchInternalListingDocuments(supabase: SupabaseClient, listingId: string) {
  const { data, error } = await supabase
    .from("listing_documents")
    .select("id, listing_id, file_name, storage_path, public_url")
    .eq("listing_id", listingId);

  assertQuerySucceeded(error, "Failed to load listing documents.");
  return (data as ListingDocument[] | null) || [];
}

async function fetchOwnerBrokerProfileSocialLinks(supabase: SupabaseClient, ownerUserId: string) {
  const { data, error } = await supabase
    .from("broker_profiles")
    .select("whatsapp_number, instagram_profile, linkedin_profile")
    .eq("user_id", ownerUserId)
    .maybeSingle();

  assertQuerySucceeded(error, "Failed to load broker social links.");
  return (data as OwnerBrokerProfileSocialLinks | null) || null;
}

export async function fetchInternalListingDetail(
  supabase: SupabaseClient,
  listingId: string,
  { includeDocuments = true, includeOwnerBrokerProfile = false }: InternalListingDetailOptions = {}
): Promise<InternalListingDetail | null> {
  const [listing, documents] = await Promise.all([
    fetchInternalListingBase(supabase, listingId),
    includeDocuments ? fetchInternalListingDocuments(supabase, listingId) : Promise.resolve([] as ListingDocument[]),
  ]);

  if (!listing) {
    return null;
  }

  const ownerBrokerProfile = includeOwnerBrokerProfile
    ? await fetchOwnerBrokerProfileSocialLinks(supabase, listing.created_by)
    : null;

  return {
    ...listing,
    listing_documents: documents,
    ...(includeOwnerBrokerProfile ? { ownerBrokerProfile } : {}),
  };
}
