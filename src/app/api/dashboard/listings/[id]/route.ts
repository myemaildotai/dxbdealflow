import { NextRequest, NextResponse } from "next/server";
import { getServiceSupabase, jsonError, LISTING_SELECT, requireApprovedBroker } from "@/lib/deal-server";
import { hydrateListings } from "@/lib/platform-server-data";
import type { BrokerListingDetail, CommissionTerms, Listing, ListingDocument } from "@/lib/deal-types";

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireApprovedBroker(request);
  if ("error" in auth) return auth.error;

  try {
    const supabase = getServiceSupabase();
    const { data: listingRow } = await supabase
      .from("listings")
      .select(LISTING_SELECT)
      .eq("id", params.id)
      .is("deleted_at", null)
      .maybeSingle();

    if (!listingRow) {
      return jsonError("Listing not found.", 404);
    }

    if (listingRow.created_by !== auth.user.id) {
      return jsonError("You can only view your own listings here.", 403);
    }

    const [listing] = await hydrateListings(supabase, [listingRow as Listing]);
    const [commissionTermsResult, documentsResult] = await Promise.all([
      supabase
        .from("commission_terms")
        .select("listing_id, co_broke_percent, payment_terms, notes")
        .eq("listing_id", listing.id)
        .maybeSingle(),
      supabase
        .from("listing_documents")
        .select("id, listing_id, file_name, storage_path, public_url")
        .eq("listing_id", listing.id),
    ]);

    const payload: BrokerListingDetail = {
      listing: {
        ...listing,
        can_edit: true,
        can_chat: false,
        commission_terms: (commissionTermsResult.data as CommissionTerms | null) || null,
        listing_documents: (documentsResult.data as ListingDocument[] | null) || [],
      },
    };

    return NextResponse.json(payload);
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Failed to load listing detail.", 500);
  }
}
