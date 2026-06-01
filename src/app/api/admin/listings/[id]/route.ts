import { NextRequest, NextResponse } from "next/server";
import { getServiceSupabase, jsonError, LISTING_SELECT, requireAdmin } from "@/lib/deal-server";
import { fetchUserBundle, hydrateListings } from "@/lib/platform-server-data";
import type { AdminListingDetail, Listing, ListingDocument, CommissionTerms } from "@/lib/deal-types";

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAdmin(request);
  if ("error" in auth) return auth.error;

  try {
    const supabase = getServiceSupabase();
    const { data: listingRow } = await supabase.from("listings").select(LISTING_SELECT).eq("id", params.id).maybeSingle();

    if (!listingRow) {
      return jsonError("Listing not found.", 404);
    }

    const [listing] = await hydrateListings(supabase, [listingRow as Listing]);
    const [commissionTermsResult, documentsResult, ownerBundle] = await Promise.all([
      supabase
        .from("commission_terms")
        .select("listing_id, co_broke_percent, payment_terms, notes")
        .eq("listing_id", listing.id)
        .maybeSingle(),
      supabase
        .from("listing_documents")
        .select("id, listing_id, file_name, storage_path, public_url")
        .eq("listing_id", listing.id),
      fetchUserBundle(supabase, listing.created_by),
    ]);

    const payload: AdminListingDetail = {
      listing: {
        ...listing,
        commission_terms: (commissionTermsResult.data as CommissionTerms | null) || null,
        listing_documents: (documentsResult.data as ListingDocument[] | null) || [],
        ownerBrokerProfile: ownerBundle.brokerProfile
          ? {
              whatsapp_number: ownerBundle.brokerProfile.whatsapp_number,
              instagram_profile: ownerBundle.brokerProfile.instagram_profile,
              linkedin_profile: ownerBundle.brokerProfile.linkedin_profile,
            }
          : null,
      },
    };

    return NextResponse.json(payload);
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Failed to load listing detail.", 500);
  }
}
