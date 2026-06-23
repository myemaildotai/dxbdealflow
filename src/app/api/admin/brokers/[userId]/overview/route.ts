import { NextRequest, NextResponse } from "next/server";
import { AdminBrokerNotFoundError, fetchAdminBrokerOverview } from "@/lib/admin-broker-detail-server";
import { getServiceSupabase, jsonError, requireAdmin, withNoStore } from "@/lib/deal-server";

export async function GET(request: NextRequest, { params }: { params: { userId: string } }) {
  const auth = await requireAdmin(request);
  if ("error" in auth) return auth.error;

  try {
    const payload = await fetchAdminBrokerOverview(getServiceSupabase(), params.userId);
    return NextResponse.json(payload, withNoStore());
  } catch (error) {
    if (error instanceof AdminBrokerNotFoundError) return jsonError(error.message, 404);
    return jsonError(error instanceof Error ? error.message : "Failed to load broker overview.", 500);
  }
}
