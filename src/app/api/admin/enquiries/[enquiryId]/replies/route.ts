import { NextRequest, NextResponse } from "next/server";
import { getServiceSupabase, jsonError, requireAdmin, withNoStore } from "@/lib/deal-server";
import type { EnquiryReply, PlatformUser } from "@/lib/deal-types";
import { uniqueDefinedIds } from "@/lib/admin-api-utils";

export async function GET(request: NextRequest, { params }: { params: { enquiryId: string } }) {
  const auth = await requireAdmin(request);
  if ("error" in auth) return auth.error;

  const enquiryId = params.enquiryId;
  if (!enquiryId) {
    return jsonError("Enquiry id is required.", 400);
  }

  try {
    const supabase = getServiceSupabase();
    const { data: enquiry } = await supabase.from("leads").select("id").eq("id", enquiryId).maybeSingle();

    if (!enquiry) {
      return jsonError("Enquiry not found.", 404);
    }

    const { data, error } = await supabase
      .from("enquiry_replies")
      .select("id, enquiry_id, listing_id, broker_id, enquirer_email, subject, message, sent_at, status, failure_reason, created_at")
      .eq("enquiry_id", enquiryId)
      .order("created_at", { ascending: false });

    if (error) {
      throw new Error(error.message || "Failed to load enquiry replies.");
    }

    const replies = (data as EnquiryReply[] | null) || [];
    const brokerIds = uniqueDefinedIds(replies.map((reply) => reply.broker_id));
    const { data: brokers } = brokerIds.length
      ? await supabase.from("users").select("id, first_name, last_name, email").in("id", brokerIds)
      : { data: [] as Array<Pick<PlatformUser, "id" | "first_name" | "last_name" | "email">> };
    const brokerMap = new Map(
      (((brokers as Array<Pick<PlatformUser, "id" | "first_name" | "last_name" | "email">> | null) || []).map((broker) => [
        broker.id,
        broker,
      ]))
    );

    return NextResponse.json(
      {
        replies: replies.map((reply) => ({
          ...reply,
          broker: brokerMap.get(reply.broker_id) || null,
        })),
      },
      withNoStore()
    );
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Failed to load enquiry replies.", 500);
  }
}
