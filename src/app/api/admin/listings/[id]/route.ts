import { NextRequest, NextResponse } from "next/server";
import { getServiceSupabase, jsonError, requireAdmin, withNoStore } from "@/lib/deal-server";
import { fetchInternalListingDetail } from "@/lib/listing-detail-server";
import type { AdminListingDetail } from "@/lib/deal-types";

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAdmin(request);
  if ("error" in auth) return auth.error;

  try {
    const supabase = getServiceSupabase();
    const listing = await fetchInternalListingDetail(supabase, params.id, {
      includeOwnerBrokerProfile: true,
    });

    if (!listing) {
      return jsonError("Listing not found.", 404);
    }

    const payload: AdminListingDetail = {
      listing: {
        ...listing,
      },
    };

    return NextResponse.json(payload, withNoStore());
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Failed to load listing detail.", 500);
  }
}
