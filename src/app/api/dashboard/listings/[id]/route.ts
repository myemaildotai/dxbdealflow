import { NextRequest, NextResponse } from "next/server";
import { getServiceSupabase, jsonError, requireApprovedBroker, withNoStore } from "@/lib/deal-server";
import { fetchInternalListingDetail, fetchInternalListingDocuments } from "@/lib/listing-detail-server";
import type { BrokerListingDetail } from "@/lib/deal-types";

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireApprovedBroker(request);
  if ("error" in auth) return auth.error;

  try {
    const supabase = getServiceSupabase();
    const listing = await fetchInternalListingDetail(supabase, params.id, {
      includeDocuments: false,
    });

    if (!listing || listing.deleted_at) {
      return jsonError("Listing not found.", 404);
    }

    if (listing.created_by !== auth.user.id) {
      return jsonError("You can only view your own listings here.", 403);
    }

    const documents = await fetchInternalListingDocuments(supabase, listing.id);

    const payload: BrokerListingDetail = {
      listing: {
        ...listing,
        can_edit: true,
        can_chat: false,
        listing_documents: documents,
      },
    };

    return NextResponse.json(payload, withNoStore());
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Failed to load listing detail.", 500);
  }
}
