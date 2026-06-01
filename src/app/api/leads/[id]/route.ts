import { NextRequest, NextResponse } from "next/server";
import { getServiceSupabase, jsonError, requireApprovedBroker, withNoStore } from "@/lib/deal-server";

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireApprovedBroker(request);
  if ("error" in auth) return auth.error;

  const body = await request.json().catch(() => ({}));
  if (body.action !== "mark_read") {
    return jsonError("Unsupported lead action.", 400);
  }

  const supabase = getServiceSupabase();
  const { data: lead, error: loadError } = await supabase
    .from("leads")
    .select("id, to_user_id, is_read")
    .eq("id", params.id)
    .maybeSingle();

  if (loadError) {
    return jsonError(loadError.message || "Failed to load lead.", 400);
  }

  if (!lead) {
    return jsonError("Lead not found.", 404);
  }

  if (lead.to_user_id !== auth.user.id) {
    return jsonError("You can only update enquiries assigned to you.", 403);
  }

  if (lead.is_read) {
    return NextResponse.json({ success: true }, withNoStore());
  }

  const { error } = await supabase
    .from("leads")
    .update({
      is_read: true,
      read_at: new Date().toISOString(),
    })
    .eq("id", params.id);

  if (error) {
    return jsonError(error.message || "Failed to update enquiry.", 400);
  }

  return NextResponse.json({ success: true }, withNoStore());
}
