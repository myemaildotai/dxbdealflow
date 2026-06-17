import { NextRequest, NextResponse } from "next/server";
import { getServiceSupabase, requireApprovedBroker, withNoStore } from "@/lib/deal-server";
import { fetchBrokerDashboardLegacy } from "@/lib/broker-dashboard-server";

export async function GET(request: NextRequest) {
  const auth = await requireApprovedBroker(request);
  if ("error" in auth) return auth.error;

  const supabase = getServiceSupabase();
  const notificationScope = request.nextUrl.searchParams.get("scope") === "notifications";
  const dashboard = await fetchBrokerDashboardLegacy(supabase, auth.user.id, notificationScope, auth.user);

  return NextResponse.json(dashboard, withNoStore());
}
