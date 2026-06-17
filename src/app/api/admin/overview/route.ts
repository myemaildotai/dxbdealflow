import { NextRequest, NextResponse } from "next/server";
import { NON_CHAT_ACTIVITY_OR_FILTER } from "@/lib/activity-categories";
import { getServiceSupabase, requireAdmin, withNoStore } from "@/lib/deal-server";
import { fetchAreas } from "@/lib/platform-server-data";
import type { AdminOverview } from "@/lib/deal-types";

function countValue(result: { count: number | null }) {
  return result.count || 0;
}

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if ("error" in auth) return auth.error;

  const supabase = getServiceSupabase();
  const weekStart = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const [
    areas,
    totalUsersResult,
    totalBrokersResult,
    pendingApplicationsResult,
    activeBrokersResult,
    pendingBrokerUsersThisWeekResult,
    approvedBrokerUsersThisWeekResult,
    totalListingsResult,
    activeListingsResult,
    pendingListingsResult,
    pendingListingsThisWeekResult,
    approvedListingsThisWeekResult,
    totalRequirementsResult,
    activeRequirementsResult,
    activeRequirementsThisWeekResult,
    publicEnquiriesResult,
    comingSoonRegistrationsResult,
    totalChatsResult,
    activityCountResult,
  ] = await Promise.all([
    fetchAreas(supabase),
    supabase.from("users").select("id", { count: "exact", head: true }),
    supabase.from("users").select("id", { count: "exact", head: true }).eq("role", "broker"),
    supabase.from("users").select("id", { count: "exact", head: true }).eq("role", "broker").eq("status", "pending"),
    supabase.from("users").select("id", { count: "exact", head: true }).eq("role", "broker").in("status", ["active", "approved"]),
    supabase
      .from("users")
      .select("id", { count: "exact", head: true })
      .eq("role", "broker")
      .eq("status", "pending")
      .gte("created_at", weekStart),
    supabase
      .from("users")
      .select("id", { count: "exact", head: true })
      .eq("role", "broker")
      .in("status", ["active", "approved"])
      .gte("updated_at", weekStart),
    supabase.from("listings").select("id", { count: "exact", head: true }),
    supabase
      .from("listings")
      .select("id", { count: "exact", head: true })
      .is("deleted_at", null)
      .in("status", ["active", "approved"]),
    supabase
      .from("listings")
      .select("id", { count: "exact", head: true })
      .is("deleted_at", null)
      .eq("status", "pending"),
    supabase
      .from("listings")
      .select("id", { count: "exact", head: true })
      .is("deleted_at", null)
      .eq("status", "pending")
      .gte("created_at", weekStart),
    supabase
      .from("listings")
      .select("id", { count: "exact", head: true })
      .is("deleted_at", null)
      .in("status", ["active", "approved"])
      .or(`approved_at.gte.${weekStart},updated_at.gte.${weekStart}`),
    supabase.from("requirements").select("id", { count: "exact", head: true }),
    supabase
      .from("requirements")
      .select("id", { count: "exact", head: true })
      .is("deleted_at", null)
      .eq("is_active", true),
    supabase
      .from("requirements")
      .select("id", { count: "exact", head: true })
      .is("deleted_at", null)
      .eq("is_active", true)
      .gte("created_at", weekStart),
    supabase.from("leads").select("id", { count: "exact", head: true }),
    supabase.from("coming_soon_registrations").select("id", { count: "exact", head: true }),
    supabase.from("chat_conversations").select("id", { count: "exact", head: true }),
    supabase
      .from("activity_log")
      .select("id", { count: "exact", head: true })
      .or(NON_CHAT_ACTIVITY_OR_FILTER),
  ]);

  const totalChats = countValue(totalChatsResult);
  const publicEnquiries = countValue(publicEnquiriesResult);
  const leads = countValue(comingSoonRegistrationsResult);
  const activity = countValue(activityCountResult);

  const payload: AdminOverview = {
    metrics: {
      pendingApplications: countValue(pendingApplicationsResult),
      activeBrokers: countValue(activeBrokersResult),
      totalUsers: countValue(totalUsersResult),
      activeListings: countValue(activeListingsResult),
      pendingListings: countValue(pendingListingsResult),
      activeRequirements: countValue(activeRequirementsResult),
      publicEnquiries,
      totalChats,
      pendingBrokerUsersThisWeek: countValue(pendingBrokerUsersThisWeekResult),
      approvedBrokerUsersThisWeek: countValue(approvedBrokerUsersThisWeekResult),
      pendingListingsThisWeek: countValue(pendingListingsThisWeekResult),
      approvedListingsThisWeek: countValue(approvedListingsThisWeekResult),
      activeRequirementsThisWeek: countValue(activeRequirementsThisWeekResult),
    },
    tabCounts: {
      brokers: countValue(totalBrokersResult),
      listings: countValue(totalListingsResult),
      chats: totalChats,
      requirements: countValue(totalRequirementsResult),
      enquiries: publicEnquiries,
      leads,
      activity,
    },
    areas,
  };

  return NextResponse.json(payload, withNoStore());
}
