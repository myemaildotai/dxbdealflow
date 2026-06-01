"use client";

import { supabase } from "@/lib/supabase";
import {
  Agency,
  Area,
  CommissionTerms,
  DashboardMetrics,
  Listing,
  ListingDocument,
  ListingFormValues,
  ListingImage,
  PlatformUser,
  Requirement,
  RequirementFormValues,
} from "@/lib/deal-types";
import { getRenewalMeta, parseNumber } from "@/lib/deal-utils";

const DAY_IN_MS = 24 * 60 * 60 * 1000;

export interface ListingFilters {
  dealType?: string;
  areaId?: string;
  bedrooms?: string;
  propertyType?: string;
  minPrice?: string;
  maxPrice?: string;
  search?: string;
  sort?: "newest" | "price_asc" | "price_desc" | "co_broke_desc";
}

export interface RequirementFilters {
  urgency?: string;
  areaId?: string;
  minBudget?: string;
  maxBudget?: string;
}

export async function fetchAreas(): Promise<Area[]> {
  const { data } = await supabase.from("areas").select("id, name, city, slug").order("name");
  return data || [];
}

async function hydrateListings(baseListings: Listing[]): Promise<Listing[]> {
  if (!baseListings.length) return [];

  const areaIds = Array.from(new Set(baseListings.map((listing) => listing.area_id).filter(Boolean))) as string[];
  const ownerIds = Array.from(new Set(baseListings.map((listing) => listing.created_by)));
  const agencyIds = Array.from(new Set(baseListings.map((listing) => listing.agency_id).filter(Boolean))) as string[];
  const listingIds = baseListings.map((listing) => listing.id);

  const [areasResult, ownersResult, agenciesResult, termsResult, imagesResult, documentsResult] = await Promise.all([
    areaIds.length ? supabase.from("areas").select("id, name, city, slug").in("id", areaIds) : Promise.resolve({ data: [] as Area[] }),
    ownerIds.length
      ? supabase
          .from("users")
          .select("id, email, first_name, last_name, phone, role, status, agency_id, created_at, updated_at")
          .in("id", ownerIds)
      : Promise.resolve({ data: [] as PlatformUser[] }),
    agencyIds.length ? supabase.from("agencies").select("id, name, rera_brn, status").in("id", agencyIds) : Promise.resolve({ data: [] as Agency[] }),
    supabase.from("commission_terms").select("listing_id, co_broke_percent, payment_terms, notes").in("listing_id", listingIds),
    supabase.from("listing_images").select("id, listing_id, file_name, storage_path, public_url, sort_order, is_cover").in("listing_id", listingIds).order("sort_order"),
    supabase.from("listing_documents").select("id, listing_id, file_name, storage_path, public_url").in("listing_id", listingIds),
  ]);

  const ownerListingCounts = new Map<string, number>();
  baseListings.forEach((listing) => {
    if (listing.status === "approved") {
      ownerListingCounts.set(listing.created_by, (ownerListingCounts.get(listing.created_by) || 0) + 1);
    }
  });

  const areaMap = new Map((areasResult.data || []).map((area) => [area.id, area]));
  const ownerMap = new Map((ownersResult.data || []).map((owner) => [owner.id, owner]));
  const agencyMap = new Map((agenciesResult.data || []).map((agency) => [agency.id, agency]));
  const termsMap = new Map((termsResult.data || []).map((term: CommissionTerms) => [term.listing_id, term]));
  const imagesMap = new Map<string, ListingImage[]>();
  const documentsMap = new Map<string, ListingDocument[]>();

  (imagesResult.data || []).forEach((image: ListingImage) => {
    imagesMap.set(image.listing_id, [...(imagesMap.get(image.listing_id) || []), image]);
  });

  (documentsResult.data || []).forEach((document: ListingDocument) => {
    documentsMap.set(document.listing_id, [...(documentsMap.get(document.listing_id) || []), document]);
  });

  return baseListings.map((listing) => ({
    ...listing,
    area: listing.area_id ? areaMap.get(listing.area_id) || null : null,
    owner: ownerMap.get(listing.created_by) || null,
    agency: listing.agency_id ? agencyMap.get(listing.agency_id) || null : null,
    commission_terms: termsMap.get(listing.id) || null,
    listing_images: imagesMap.get(listing.id) || [],
    listing_documents: documentsMap.get(listing.id) || [],
    owner_active_listings_count: ownerListingCounts.get(listing.created_by) || null,
  }));
}

async function hydrateRequirements(baseRequirements: Requirement[]): Promise<Requirement[]> {
  if (!baseRequirements.length) return [];

  const areaIds = Array.from(new Set(baseRequirements.map((requirement) => requirement.area_id).filter(Boolean))) as string[];
  const ownerIds = Array.from(new Set(baseRequirements.map((requirement) => requirement.posted_by)));
  const [areasResult, ownersResult] = await Promise.all([
    areaIds.length ? supabase.from("areas").select("id, name, city, slug").in("id", areaIds) : Promise.resolve({ data: [] as Area[] }),
    ownerIds.length
      ? supabase
          .from("users")
          .select("id, email, first_name, last_name, phone, role, status, agency_id, created_at, updated_at")
          .in("id", ownerIds)
      : Promise.resolve({ data: [] as PlatformUser[] }),
  ]);

  const areaMap = new Map((areasResult.data || []).map((area) => [area.id, area]));
  const ownerMap = new Map((ownersResult.data || []).map((owner) => [owner.id, owner]));

  return baseRequirements.map((requirement) => ({
    ...requirement,
    area: requirement.area || (requirement.area_id ? areaMap.get(requirement.area_id)?.name || null : null),
    owner: ownerMap.get(requirement.posted_by) || null,
  }));
}

export async function fetchListings(filters: ListingFilters = {}): Promise<Listing[]> {
  let query = supabase
    .from("listings")
    .select(
      "id, title, property_type, deal_type, bedrooms, size_sqft, area_id, developer, price, payment_plan, handover_date, yield_percent, description, status, created_at, updated_at, created_by, agency_id, renewal_due_at, approved_at"
    )
    .eq("status", "approved");

  if (filters.dealType) query = query.eq("deal_type", filters.dealType);
  if (filters.areaId) query = query.eq("area_id", filters.areaId);
  if (filters.bedrooms) query = query.eq("bedrooms", Number(filters.bedrooms));
  if (filters.propertyType) query = query.eq("property_type", filters.propertyType);
  if (filters.minPrice) query = query.gte("price", Number(filters.minPrice));
  if (filters.maxPrice) query = query.lte("price", Number(filters.maxPrice));
  if (filters.search) {
    const escaped = filters.search.replace(/,/g, " ");
    query = query.or(`title.ilike.%${escaped}%,developer.ilike.%${escaped}%,description.ilike.%${escaped}%`);
  }

  switch (filters.sort) {
    case "price_asc":
      query = query.order("price", { ascending: true });
      break;
    case "price_desc":
      query = query.order("price", { ascending: false });
      break;
    default:
      query = query.order("created_at", { ascending: false });
      break;
  }

  const { data, error } = await query;
  if (error || !data) return [];

  const hydrated = await hydrateListings(data as Listing[]);
  if (filters.sort === "co_broke_desc") {
    hydrated.sort((a, b) => (b.commission_terms?.co_broke_percent || 0) - (a.commission_terms?.co_broke_percent || 0));
  }
  return hydrated;
}

export async function fetchListingById(id: string): Promise<Listing | null> {
  const { data, error } = await supabase
    .from("listings")
    .select(
      "id, title, property_type, deal_type, bedrooms, size_sqft, area_id, developer, price, payment_plan, handover_date, yield_percent, description, status, created_at, updated_at, created_by, agency_id, renewal_due_at, approved_at"
    )
    .eq("id", id)
    .eq("status", "approved")
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  const [listing] = await hydrateListings([data as Listing]);
  const { count } = await supabase
    .from("listings")
    .select("id", { count: "exact", head: true })
    .eq("created_by", data.created_by)
    .eq("status", "approved");

  return {
    ...listing,
    owner_active_listings_count: count || 0,
  };
}

export async function fetchRequirements(filters: RequirementFilters = {}): Promise<Requirement[]> {
  let query = supabase
    .from("requirements")
    .select(
      "id, broker_id, title, description, deal_type, property_type, bedrooms, area, area_id, budget_min, budget_max, urgency, timeline, notes, is_active, deactivated_by, deleted_at, created_at, updated_at, posted_by"
    )
    .order("created_at", { ascending: false });

  if (filters.urgency) query = query.eq("urgency", filters.urgency);
  if (filters.areaId) query = query.eq("area_id", filters.areaId);
  if (filters.minBudget) query = query.gte("budget_max", Number(filters.minBudget));
  if (filters.maxBudget) query = query.lte("budget_min", Number(filters.maxBudget));

  const { data, error } = await query;
  if (error || !data) return [];

  return hydrateRequirements(data as Requirement[]);
}

export async function fetchDashboardData(
  userId: string,
  coveredAreaIds: string[] = []
): Promise<{ metrics: DashboardMetrics; recentListings: Listing[]; recentRequirements: Requirement[]; renewalListings: Listing[] }> {
  const requirementQuery = coveredAreaIds.length
    ? supabase
        .from("requirements")
        .select(
          "id, broker_id, title, description, deal_type, property_type, bedrooms, area, area_id, budget_min, budget_max, urgency, timeline, notes, is_active, deactivated_by, deleted_at, created_at, updated_at, posted_by"
        )
        .in("area_id", coveredAreaIds)
        .order("created_at", { ascending: false })
        .limit(4)
    : supabase
        .from("requirements")
        .select(
          "id, broker_id, title, description, deal_type, property_type, bedrooms, area, area_id, budget_min, budget_max, urgency, timeline, notes, is_active, deactivated_by, deleted_at, created_at, updated_at, posted_by"
        )
        .order("created_at", { ascending: false })
        .limit(4);

  const [
    myListingsResult,
    enquiriesResult,
    pendingResult,
    recentListingsResult,
    requirementsResult,
    renewalListingsResult,
  ] = await Promise.all([
    supabase.from("listings").select("id", { count: "exact", head: true }).eq("created_by", userId),
    supabase.from("leads").select("id", { count: "exact", head: true }).eq("to_user_id", userId),
    supabase.from("listings").select("id", { count: "exact", head: true }).eq("created_by", userId).eq("status", "pending"),
    supabase
      .from("listings")
      .select(
        "id, title, property_type, deal_type, bedrooms, size_sqft, area_id, developer, price, payment_plan, handover_date, yield_percent, description, status, created_at, updated_at, created_by, agency_id, renewal_due_at, approved_at"
      )
      .eq("created_by", userId)
      .order("updated_at", { ascending: false })
      .limit(3),
    requirementQuery,
    supabase
      .from("listings")
      .select(
        "id, title, property_type, deal_type, bedrooms, size_sqft, area_id, developer, price, payment_plan, handover_date, yield_percent, description, status, created_at, updated_at, created_by, agency_id, renewal_due_at, approved_at"
      )
      .eq("created_by", userId)
      .eq("status", "approved")
      .not("renewal_due_at", "is", null)
      .order("renewal_due_at", { ascending: true })
      .limit(6),
  ]);

  const recentListings = recentListingsResult.data?.length ? await hydrateListings(recentListingsResult.data as Listing[]) : [];
  const recentRequirements = requirementsResult.data?.length ? await hydrateRequirements(requirementsResult.data as Requirement[]) : [];
  const renewalListings = renewalListingsResult.data?.length
    ? (await hydrateListings(renewalListingsResult.data as Listing[])).filter((listing) => {
        const daysUntilDue = getRenewalMeta(listing.renewal_due_at).daysUntilDue;
        return daysUntilDue !== null && daysUntilDue <= 7;
      })
    : [];

  return {
    metrics: {
      totalListings: myListingsResult.count || 0,
      activeListings: recentListings.filter((listing) => listing.status === "active" || listing.status === "approved").length,
      publicEnquiries: enquiriesResult.count || 0,
      activeChats: 0,
      myListings: myListingsResult.count || 0,
      myEnquiries: enquiriesResult.count || 0,
      pendingListings: pendingResult.count || 0,
    },
    recentListings,
    recentRequirements,
    renewalListings,
  };
}

function validateFile(file: File) {
  if (file.size > 2 * 1024 * 1024) {
    throw new Error(`${file.name} exceeds the 2MB upload limit.`);
  }
}

export async function createListing(args: {
  values: ListingFormValues;
  userId: string;
  agencyId: string | null;
  images: File[];
  documents: File[];
}) {
  const { values, userId, agencyId, images, documents } = args;

  images.forEach(validateFile);
  documents.forEach(validateFile);

  const payload = {
    title: values.title,
    property_type: values.propertyType,
    deal_type: values.dealType,
    bedrooms: parseNumber(values.bedrooms),
    size_sqft: parseNumber(values.sizeSqft),
    area_id: values.areaId || null,
    developer: values.developer || null,
    price: Number(values.price),
    payment_plan: values.paymentPlan || null,
    handover_date: values.handoverDate || null,
    yield_percent: parseNumber(values.yieldPercent),
    notes: values.notes || null,
    description: values.description || null,
    status: "pending",
    created_by: userId,
    agency_id: agencyId,
    renewal_due_at: new Date(Date.now() + 14 * DAY_IN_MS).toISOString(),
  };

  const { data: listing, error } = await supabase.from("listings").insert(payload).select("id").single();
  if (error || !listing) throw error || new Error("Failed to create listing.");

  const listingId = listing.id as string;

  const { error: termsError } = await supabase.from("commission_terms").insert({
    listing_id: listingId,
    co_broke_percent: Number(values.coBrokePercent),
    payment_terms: values.paymentTerms || null,
    notes: values.notes || null,
  });
  if (termsError) throw termsError;

  for (let index = 0; index < images.length; index += 1) {
    const file = images[index];
    const path = `${userId}/${listingId}/${Date.now()}-${file.name}`;
    const { error: uploadError } = await supabase.storage.from("listing-images").upload(path, file, { upsert: false });
    if (uploadError) throw uploadError;
    const { data: publicUrl } = supabase.storage.from("listing-images").getPublicUrl(path);
    await supabase.from("listing_images").insert({
      listing_id: listingId,
      file_name: file.name,
      storage_path: path,
      public_url: publicUrl.publicUrl,
      sort_order: index,
      is_cover: index === 0,
    });
  }

  for (const file of documents) {
    const path = `${userId}/${listingId}/${Date.now()}-${file.name}`;
    const { error: uploadError } = await supabase.storage.from("listing-documents").upload(path, file, { upsert: false });
    if (uploadError) throw uploadError;
    const { data: publicUrl } = supabase.storage.from("listing-documents").getPublicUrl(path);
    await supabase.from("listing_documents").insert({
      listing_id: listingId,
      file_name: file.name,
      storage_path: path,
      public_url: publicUrl.publicUrl,
    });
  }

  return listingId;
}

export async function createRequirement(args: { values: RequirementFormValues; userId: string }) {
  const { values, userId } = args;

  const payload = {
    title: values.title,
    deal_type: values.dealType,
    property_type: values.propertyType,
    bedrooms: parseNumber(values.bedrooms),
    area_id: values.areaId,
    budget_min: parseNumber(values.budgetMin),
    budget_max: parseNumber(values.budgetMax),
    urgency: values.urgency,
    notes: values.notes || null,
    posted_by: userId,
  };

  const { data, error } = await supabase.from("requirements").insert(payload).select("id").single();
  if (error || !data) throw error || new Error("Failed to post buyer requirement.");
  return data.id as string;
}

export async function reconfirmListing(listingId: string) {
  const renewalDueAt = new Date(Date.now() + 14 * DAY_IN_MS).toISOString();
  const { error } = await supabase.from("listings").update({ renewal_due_at: renewalDueAt }).eq("id", listingId);
  if (error) throw error;
  return renewalDueAt;
}
