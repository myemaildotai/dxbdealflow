import { NextRequest, NextResponse } from "next/server";
import { getComingSoonModeState, setComingSoonModeState } from "@/lib/coming-soon";
import { getServiceSupabase, jsonError, requireAdmin, withNoStore } from "@/lib/deal-server";
import { clearSiteModeStateCache } from "@/lib/site-mode-state";

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if ("error" in auth) return auth.error;

  try {
    const supabase = getServiceSupabase();
    const state = await getComingSoonModeState(supabase);
    return NextResponse.json(state, withNoStore());
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Failed to load coming soon mode.", 500);
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
    const state = await setComingSoonModeState(supabase, body.enabled, auth.user.id);
    clearSiteModeStateCache();

    await supabase.from("activity_log").insert({
      actor_user_id: auth.user.id,
      action: body.enabled ? "coming_soon_mode_enabled" : "coming_soon_mode_disabled",
      target_table: "settings",
      target_id: null,
      metadata: {
        key: "coming_soon_mode",
        enabled: body.enabled,
      },
    });

    return NextResponse.json(state, withNoStore());
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Failed to update coming soon mode.", 500);
  }
}
