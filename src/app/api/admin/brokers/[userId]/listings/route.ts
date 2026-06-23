import { NextRequest, NextResponse } from "next/server";
import { AdminBrokerNotFoundError, fetchAdminBrokerListings } from "@/lib/admin-broker-detail-server";
import { getServiceSupabase, jsonError, requireAdmin, withNoStore } from "@/lib/deal-server";

export async function GET(request: NextRequest, { params }: { params: { userId: string } }) {
  const auth = await requireAdmin(request);
  if ("error" in auth) return auth.error;

  try {
    const payload = await fetchAdminBrokerListings(getServiceSupabase(), params.userId, request);
    return NextResponse.json(payload, withNoStore());
  } catch (error) {
    if (error instanceof AdminBrokerNotFoundError) return jsonError(error.message, 404);
    return jsonError(error instanceof Error ? error.message : "Failed to load broker listings.", 500);
  }
}
