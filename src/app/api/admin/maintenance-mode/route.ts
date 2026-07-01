import { revalidateTag } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { getServiceSupabase, jsonError, requireAdmin, withNoStore } from "@/lib/deal-server";
import { sendMaintenanceAvailabilityNotifications } from "@/lib/email-notifications";
import { runEmailWorkflowInBackground } from "@/lib/email-service";
import { getMaintenanceModeState, setMaintenanceModeState } from "@/lib/maintenance-mode";
import { clearSiteModeStateCache, SITE_MODE_STATE_CACHE_TAG } from "@/lib/site-mode-state";

async function triggerMaintenanceAvailabilityNotifications() {
  const workflow = sendMaintenanceAvailabilityNotifications()
    .then((result) => {
      console.info("[maintenance-mode] Availability notification workflow completed.", result);
    })
    .catch((error) => {
      console.error("[maintenance-mode] Availability notification workflow failed.", {
        error: error instanceof Error ? error.message : "Unknown maintenance notification error.",
      });
    });

  if (!runEmailWorkflowInBackground(workflow, "maintenance-mode-disabled-availability-notifications")) {
    await workflow;
  }
}

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if ("error" in auth) return auth.error;

  try {
    const supabase = getServiceSupabase();
    const state = await getMaintenanceModeState(supabase);
    return NextResponse.json(state, withNoStore());
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Failed to load maintenance mode.", 500);
  }
}

export async function PUT(request: NextRequest) {
  const auth = await requireAdmin(request);
  if ("error" in auth) return auth.error;

  try {
    const body = await request.json().catch(() => null);

    if (typeof body?.enabled !== "boolean") {
      return jsonError("A boolean enabled flag is required.", 400);
    }

    const supabase = getServiceSupabase();
    const previousState = await getMaintenanceModeState(supabase);
    const state = await setMaintenanceModeState(supabase, body.enabled, auth.user.id);
    clearSiteModeStateCache();
    revalidateTag(SITE_MODE_STATE_CACHE_TAG);

    await supabase.from("activity_log").insert({
      actor_user_id: auth.user.id,
      action: body.enabled ? "maintenance_mode_enabled" : "maintenance_mode_disabled",
      target_table: "settings",
      target_id: null,
      metadata: {
        key: "maintenance_mode",
        enabled: body.enabled,
      },
    });

    if (previousState.enabled && !state.enabled) {
      await triggerMaintenanceAvailabilityNotifications();
    }

    return NextResponse.json(state, withNoStore());
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Failed to update maintenance mode.", 500);
  }
}
