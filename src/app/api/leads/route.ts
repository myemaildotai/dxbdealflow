import { NextRequest, NextResponse } from "next/server";
import { getServiceSupabase, jsonError, requireApprovedBroker } from "@/lib/deal-server";
import { validateEnquiryInput } from "@/lib/enquiry-validation";

export async function POST(request: NextRequest) {
  const auth = await requireApprovedBroker(request);
  if ("error" in auth) return auth.error;

  try {
    const body = await request.json();
    const supabase = getServiceSupabase();
    const now = new Date().toISOString();
    const validation = validateEnquiryInput(body, { normalizePhone: true });

    if (!validation.isValid) {
      return jsonError(Object.values(validation.errors)[0] || "Invalid enquiry details.", 400);
    }

    const { contactName, contactEmail, contactPhone, message } = validation.values;
    const preferredChannel =
      body.preferredChannel === "email" || body.preferredChannel === "whatsapp" || body.preferredChannel === "both"
        ? body.preferredChannel
        : "both";

    const { data, error } = await supabase
      .from("leads")
      .insert({
        listing_id: body.listingId || null,
        requirement_id: body.requirementId || null,
        from_user_id: auth.user.id,
        to_user_id: body.targetUserId,
        lead_type: body.leadType,
        lead_status: "new",
        message,
        contact_name: contactName,
        contact_email: contactEmail,
        contact_phone: contactPhone || null,
        preferred_channel: preferredChannel,
        email_triggered_at: preferredChannel === "whatsapp" ? null : now,
        whatsapp_triggered_at: preferredChannel === "email" ? null : now,
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
        contactName,
        contactEmail,
        contactPhone: contactPhone || null,
        message,
        preferredChannel,
        submittedAt: now,
      },
    });

    return NextResponse.json({ success: true, id: data.id });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Failed to create lead.", 500);
  }
}
