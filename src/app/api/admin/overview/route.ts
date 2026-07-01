import { NextRequest, NextResponse } from "next/server";
import { getServiceSupabase, requireAdmin, withNoStore } from "@/lib/deal-server";
import { fetchAreas } from "@/lib/platform-server-data";
import type { AdminOverview } from "@/lib/deal-types";


export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if ("error" in auth) return auth.error;

  const supabase = getServiceSupabase();
  const weekStart = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const [areas, metricsRes] = await Promise.all([
    fetchAreas(supabase),
    supabase.rpc("get_admin_dashboard_metrics", { p_week_start: weekStart }),
  ]);

  const { data: metricsRows, error: metricsError } = metricsRes;
  if (metricsError || !metricsRows || metricsRows.length === 0) {
    return NextResponse.json({ error: metricsError?.message || "Failed to load admin metrics." }, { status: 500 });
  }

  const row = metricsRows[0];

  const totalChats = row.total_chats || 0;
  const publicEnquiries = row.public_enquiries || 0;
  const leads = row.coming_soon_registrations || 0;
  const activity = row.activity_count || 0;

  const payload: AdminOverview = {
    metrics: {
      pendingApplications: row.pending_applications || 0,
      activeBrokers: row.active_brokers || 0,
      totalUsers: row.total_users || 0,
      activeListings: row.active_listings || 0,
      pendingListings: row.pending_listings || 0,
      activeRequirements: row.active_requirements || 0,
      publicEnquiries,
      totalChats,
      pendingBrokerUsersThisWeek: row.pending_broker_users_this_week || 0,
      approvedBrokerUsersThisWeek: row.approved_broker_users_this_week || 0,
      pendingListingsThisWeek: row.pending_listings_this_week || 0,
      approvedListingsThisWeek: row.approved_listings_this_week || 0,
      activeRequirementsThisWeek: row.active_requirements_this_week || 0,
    },
    tabCounts: {
      brokers: row.total_brokers || 0,
      listings: row.total_listings || 0,
      chats: totalChats,
      requirements: row.total_requirements || 0,
      enquiries: publicEnquiries,
      leads,
      activity,
    },
    areas,
  };

  return NextResponse.json(payload, withNoStore());
}
