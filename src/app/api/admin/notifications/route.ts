import { NextRequest, NextResponse } from "next/server";
import { getServiceSupabase, requireAdmin, withNoStore } from "@/lib/deal-server";
import { ADMIN_PRIORITY_NOTIFICATION_TYPES } from "@/lib/notifications";
import { getNotificationsPage } from "@/lib/notifications-server";

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if ("error" in auth) return auth.error;

  const limit = Number(request.nextUrl.searchParams.get("limit"));
  const cursor = request.nextUrl.searchParams.get("cursor");
  const priorityOnlyParam = request.nextUrl.searchParams.get("priorityOnly");
  const priorityOnly = priorityOnlyParam === "1" || priorityOnlyParam === "true";
  const payload = await getNotificationsPage(getServiceSupabase(), {
    cursor,
    includePriorityCounts: true,
    limit,
    recipientRole: "admin",
    recipientUserId: auth.user.id,
    types: priorityOnly ? ADMIN_PRIORITY_NOTIFICATION_TYPES : undefined,
    unhandledOnly: true,
  });

  return NextResponse.json(payload, withNoStore());
}
