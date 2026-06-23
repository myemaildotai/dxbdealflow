import { NextRequest, NextResponse } from "next/server";
import { fetchBrokerDashboardRequirementsSection } from "@/lib/broker-dashboard-server";
import { getServiceSupabase, requireApprovedBroker, withNoStore } from "@/lib/deal-server";

export async function GET(request: NextRequest) {
  const auth = await requireApprovedBroker(request, { includeBrokerProfileId: true });
  if ("error" in auth) return auth.error;

  const dashboard = await fetchBrokerDashboardRequirementsSection(getServiceSupabase(), auth.user.id, auth.brokerProfileId);
  return NextResponse.json(dashboard, withNoStore());
}
