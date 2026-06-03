import { NextRequest, NextResponse } from "next/server";
import { getServiceSupabase, jsonError } from "@/lib/deal-server";
import { getFullName } from "@/lib/deal-utils";
import { notifyBrokerPublicEnquiry } from "@/lib/email-notifications";
import { isValidInternationalPhoneNumber, normalizePhoneNumber } from "@/lib/phone";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const supabase = getServiceSupabase();
    const contactName = typeof body.contactName === "string" ? body.contactName.trim() : "";
    const contactEmail = typeof body.contactEmail === "string" ? body.contactEmail.trim() : "";
    const contactPhone = typeof body.contactPhone === "string" ? normalizePhoneNumber(body.contactPhone) : "";
    const message = typeof body.message === "string" ? body.message.trim() : "";
    const preferredChannel = body.preferredChannel === "whatsapp" || body.preferredChannel === "both" ? body.preferredChannel : "email";
    const listingId = typeof body.listingId === "string" ? body.listingId.trim() : "";

    // Validate required fields
    const required = [
      "listingId",
      "contactName",
      "contactEmail",
    ];
    for (const field of required) {
      if (!body[field]) {
        return jsonError(`${field} is required.`, 400);
      }
    }

    if (!UUID_REGEX.test(listingId)) {
      return jsonError("A valid listing id is required.", 400);
    }

    if (!contactName) {
      return jsonError("contactName is required.", 400);
    }

    if (!contactEmail) {
      return jsonError("contactEmail is required.", 400);
    }

    if (!EMAIL_REGEX.test(contactEmail)) {
      return jsonError("Enter a valid email address.", 400);
    }

    if (contactPhone && !isValidInternationalPhoneNumber(contactPhone)) {
      return jsonError("Enter a valid phone number including country code.", 400);
    }

    // Get listing and broker
    const { data: listing } = await supabase
      .from("listings")
      .select("id, title, created_by, is_visible")
      .eq("id", listingId)
      .is("deleted_at", null)
      .in("status", ["active", "approved"])
      .eq("is_visible", true)
      .single();

    if (!listing) {
      return jsonError("Listing not found.", 404);
    }

    const { data: listingOwner } = await supabase
      .from("users")
      .select("id, email, first_name, last_name")
      .eq("id", listing.created_by)
      .maybeSingle();

    const now = new Date().toISOString();

    // Create lead for public enquiry
    const { data: lead, error: leadError } = await supabase
      .from("leads")
      .insert({
        listing_id: listingId,
        requirement_id: null,
        from_user_id: null, // Public user
        to_user_id: listing.created_by,
        lead_type: "listing_enquiry",
        lead_status: "new",
        message: message || null,
        contact_name: contactName,
        contact_email: contactEmail,
        contact_phone: contactPhone || null,
        preferred_channel: preferredChannel,
        email_triggered_at: now,
        whatsapp_triggered_at: ["whatsapp", "both"].includes(preferredChannel) ? now : null,
      })
      .select("id")
      .single();

    if (leadError || !lead) {
      return jsonError("Failed to submit enquiry.", 500);
    }

    // Log activity
    await supabase.from("activity_log").insert({
      actor_user_id: null,
      action: "public_enquiry_submitted",
      target_table: "leads",
      target_id: lead.id,
      metadata: {
        listingId,
        contactName,
        contactEmail,
        contactPhone: contactPhone || null,
        message: message || null,
        preferredChannel,
        submittedAt: now,
      },
    });

    if (listingOwner?.email) {
      await notifyBrokerPublicEnquiry({
        brokerName: getFullName(listingOwner.first_name, listingOwner.last_name),
        brokerEmail: listingOwner.email,
        brokerUserId: listingOwner.id,
        leadId: lead.id,
        contactName,
        contactEmail,
        contactPhone: contactPhone || null,
        message: message || null,
        listingTitle: listing.title,
        enquiryDate: now,
      });
    }

    return NextResponse.json({
      success: true,
      id: lead.id,
      message: "Enquiry submitted successfully. The broker will contact you soon.",
    });
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : "Failed to submit enquiry.",
      500
    );
  }
}
