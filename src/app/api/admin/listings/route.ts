import { NextRequest, NextResponse } from "next/server";
import { getServiceSupabase, jsonError, requireAdmin } from "@/lib/deal-server";

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if ("error" in auth) return auth.error;

  try {
    const supabase = getServiceSupabase();

    // Fetch pending/rejected listings for moderation
    const { data: listings, error: listingsError } = await supabase
      .from("listings")
      .select(
        `
        id,
        title,
        property_type,
        deal_type,
        price,
        bedrooms,
        status,
        created_at,
        created_by,
        users!listings_created_by_fkey (id, first_name, last_name, email),
        agencies (id, name),
        areas (id, name, city)
      `
      )
      .is("deleted_at", null)
      .in("status", ["pending", "rejected"])
      .order("created_at", { ascending: false });

    if (listingsError) {
      return jsonError("Failed to fetch listings.", 500);
    }

    return NextResponse.json({ listings: listings || [] });
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : "Failed to fetch listings.",
      500
    );
  }
}
