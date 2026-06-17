import { NextRequest, NextResponse } from "next/server";
import { getServiceSupabase, jsonError, requireAdmin, withNoStore } from "@/lib/deal-server";
import { markNotificationRead } from "@/lib/notifications-server";

export async function PATCH(request: NextRequest, { params }: { params: { notificationId: string } }) {
  const auth = await requireAdmin(request);
  if ("error" in auth) return auth.error;

  try {
    const payload = await markNotificationRead(getServiceSupabase(), {
      notificationId: params.notificationId,
      recipientUserId: auth.user.id,
    });

    return NextResponse.json({ success: true, readAt: payload.readAt }, withNoStore());
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update notification state.";
    return jsonError(message, message === "Notification not found." ? 404 : 500);
  }
}
