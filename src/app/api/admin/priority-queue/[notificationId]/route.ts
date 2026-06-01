import { NextRequest, NextResponse } from "next/server";
import { getServiceSupabase, jsonError, requireAdmin, withNoStore } from "@/lib/deal-server";
import { markAdminPriorityQueueNotificationRead } from "@/lib/admin-priority-queue-server";

export async function PATCH(request: NextRequest, { params }: { params: { notificationId: string } }) {
  const auth = await requireAdmin(request);
  if ("error" in auth) return auth.error;

  try {
    const supabase = getServiceSupabase();
    const payload = await markAdminPriorityQueueNotificationRead(supabase, {
      adminUserId: auth.user.id,
      notificationId: params.notificationId,
    });

    return NextResponse.json(
      {
        success: true,
        readAt: payload.readAt,
      },
      withNoStore()
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update notification state.";
    const status = message === "Notification not found." ? 404 : 500;
    return jsonError(message, status);
  }
}
