import { NextRequest, NextResponse } from "next/server";
import { getServiceSupabase, jsonError, requireAdmin } from "@/lib/deal-server";

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if ("error" in auth) return auth.error;

  try {
    const supabase = getServiceSupabase();

    // Fetch pending broker applications
    const { data: brokers, error: brokersError } = await supabase
      .from("users")
      .select(
        `
        id,
        email,
        first_name,
        last_name,
        phone,
        status,
        created_at,
        agencies (id, name, rera_brn, status),
        broker_profiles (
          user_id,
          profile_photo,
          rera_brn,
          covered_area_ids,
          speciality,
          experience_years,
          whatsapp_number,
          instagram_profile,
          linkedin_profile,
          share_latest_deals,
          terms_accepted,
          application_status,
          application_submitted_at
        )
      `
      )
      .eq("role", "broker")
      .eq("status", "pending")
      .order("created_at", { ascending: false });

    if (brokersError) {
      return jsonError("Failed to fetch applications.", 500);
    }

    return NextResponse.json({ applications: brokers || [] });
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : "Failed to fetch applications.",
      500
    );
  }
}
