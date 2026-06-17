import { NextRequest, NextResponse } from "next/server";
import {
  AGENCY_SELECT,
  BROKER_PROFILE_SELECT,
  CREDIT_SELECT,
  getRequestUser,
  getRequestSupabase,
  getServiceSupabase,
  LISTING_SELECT,
  withNoStore,
} from "@/lib/deal-server";
import { fetchAreas, hydrateListings } from "@/lib/platform-server-data";
import type { Listing } from "@/lib/deal-types";

export async function GET(request: NextRequest) {
  const supabase = getServiceSupabase();
  const scope = request.nextUrl.searchParams.get("scope");

  if (scope === "auth-me") {
    const user = await getRequestUser(request);
    const requestSupabase = getRequestSupabase(request);

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, withNoStore({ status: 401 }));
    }

    const [brokerProfileResult, agencyResult, creditsResult, emailVerificationResult] = await Promise.all([
      requestSupabase.from("broker_profiles").select(BROKER_PROFILE_SELECT).eq("user_id", user.id).maybeSingle(),
      user.agency_id
        ? requestSupabase.from("agencies").select(AGENCY_SELECT).eq("id", user.agency_id).maybeSingle()
        : Promise.resolve({ data: null }),
      requestSupabase.from("broker_credits").select(CREDIT_SELECT).eq("user_id", user.id).maybeSingle(),
      user.role === "broker"
        ? supabase.from("broker_email_verifications").select("email, verified_at").eq("user_id", user.id).maybeSingle()
        : Promise.resolve({ data: null }),
    ]);
    const emailVerification = emailVerificationResult.data as { email?: string | null; verified_at?: string | null } | null;
    const platformUser =
      user.role === "broker"
        ? {
            ...user,
            email_verified_at:
              emailVerification?.email?.toLowerCase() === user.email?.toLowerCase()
                ? emailVerification?.verified_at || null
                : null,
          }
        : user;

    return NextResponse.json(
      {
        platformUser,
        brokerProfile: brokerProfileResult.data || null,
        agency: agencyResult.data || null,
        credits: creditsResult.data || null,
      },
      withNoStore()
    );
  }

  if (scope === "home") {
    const [areas, brokerCountResult, listingCountResult] = await Promise.all([
      fetchAreas(supabase),
      supabase.from("users").select("id", { count: "exact", head: true }).eq("role", "broker").in("status", ["active", "approved"]),
      supabase
        .from("listings")
        .select("id", { count: "exact", head: true })
        .eq("is_visible", true)
        .is("deleted_at", null)
        .in("status", ["active", "approved"]),
    ]);

    return NextResponse.json(
      {
        activeBrokerCount: brokerCountResult.count || 0,
        activeListingCount: listingCountResult.count || 0,
        recentListings: [],
        areas,
      },
      withNoStore()
    );
  }

  const [areas, brokerCountResult, listingCountResult, latestListingsResult] = await Promise.all([
    fetchAreas(supabase),
    supabase.from("users").select("id", { count: "exact", head: true }).eq("role", "broker").in("status", ["active", "approved"]),
    supabase
      .from("listings")
      .select("id", { count: "exact", head: true })
      .eq("is_visible", true)
      .is("deleted_at", null)
      .in("status", ["active", "approved"]),
    supabase
      .from("listings")
      .select(LISTING_SELECT)
      .eq("is_visible", true)
      .is("deleted_at", null)
      .in("status", ["active", "approved"])
      .order("created_at", { ascending: false })
      .limit(6),
  ]);

  const listings = await hydrateListings(supabase, (latestListingsResult.data as Listing[]) || [], {
    includeAgencies: false,
    includeCommissionTerms: false,
    includeOwnerActiveCount: false,
    includeOwners: false,
  });

  const response = NextResponse.json(
    {
      activeBrokerCount: brokerCountResult.count || 0,
      activeListingCount: listingCountResult.count || 0,
      recentListings: listings.map((listing) => ({
        ...listing,
        commission_terms: null,
        listing_documents: [],
        owner: null,
        agency: null,
        owner_active_listings_count: null,
        can_chat: false,
        can_edit: false,
      })),
      areas,
    },
    withNoStore()
  );
  return response;
}
