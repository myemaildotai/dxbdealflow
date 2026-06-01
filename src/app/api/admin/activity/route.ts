import { NextRequest, NextResponse } from "next/server";
import { getServiceSupabase, jsonError, requireAdmin } from "@/lib/deal-server";
import { fetchActivityLog } from "@/lib/platform-server-data";

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if ("error" in auth) return auth.error;

  try {
    const supabase = getServiceSupabase();
    const searchParams = request.nextUrl.searchParams;
    const page = Number(searchParams.get("page") || "1");
    const pageSize = Number(searchParams.get("pageSize") || "10");
    const category = searchParams.get("category") || "all";
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const search = searchParams.get("search");
    const includeCounts = searchParams.get("includeCounts") !== "0";

    const payload = await fetchActivityLog(supabase, {
      page,
      pageSize,
      category: ["all", "listings", "brokers", "credits", "requirements", "system"].includes(category)
        ? (category as "all" | "listings" | "brokers" | "credits" | "requirements" | "system")
        : "all",
      startDate,
      endDate,
      searchQuery: search,
      includeCounts,
    });

    return NextResponse.json(payload);
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Failed to load activity logs.", 500);
  }
}
