import { NextRequest, NextResponse } from "next/server";
import { fetchBrokerDashboardChatsSection } from "@/lib/broker-dashboard-server";
import { getServiceSupabase, requireApprovedBroker, withNoStore } from "@/lib/deal-server";

export async function GET(request: NextRequest) {
  const auth = await requireApprovedBroker(request);
  if ("error" in auth) return auth.error;

  const dashboard = await fetchBrokerDashboardChatsSection(getServiceSupabase(), auth.user.id);
  return NextResponse.json(dashboard, withNoStore());
}
