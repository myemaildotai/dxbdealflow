import { NextRequest, NextResponse } from "next/server";
import { getServiceSupabase, jsonError, requireApprovedBroker } from "@/lib/deal-server";

export async function POST(request: NextRequest) {
  const auth = await requireApprovedBroker(request);
  if ("error" in auth) return auth.error;

  try {
    const body = await request.json();
    const supabase = getServiceSupabase();
    const now = new Date().toISOString();

    const { data, error } = await supabase
      .from("leads")
      .insert({
        listing_id: body.listingId || null,
        requirement_id: body.requirementId || null,
        from_user_id: auth.user.id,
        to_user_id: body.targetUserId,
        lead_type: body.leadType,
        lead_status: "new",
        message: body.message,
        contact_name: body.contactName,
        contact_email: body.contactEmail,
        contact_phone: body.contactPhone || null,
        preferred_channel: body.preferredChannel || "both",
        email_triggered_at: body.preferredChannel === "whatsapp" ? null : now,
        whatsapp_triggered_at: body.preferredChannel === "email" ? null : now,
      })
      .select("id")
      .single();

    if (error || !data) return jsonError("Failed to create lead.", 500);

    await supabase.from("activity_log").insert({
      actor_user_id: auth.user.id,
      action: "lead_created",
      target_table: "leads",
      target_id: data.id,
      metadata: {
        listingId: body.listingId || null,
        requirementId: body.requirementId || null,
        contactName: body.contactName || null,
        contactEmail: body.contactEmail || null,
        contactPhone: body.contactPhone || null,
        message: body.message || null,
        preferredChannel: body.preferredChannel || "both",
        submittedAt: now,
      },
    });

    return NextResponse.json({ success: true, id: data.id });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Failed to create lead.", 500);
  }
}

