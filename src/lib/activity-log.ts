import type { SupabaseClient } from "@supabase/supabase-js";

export async function logActivity(
  supabase: SupabaseClient,
  actorUserId: string | null,
  action: string,
  targetTable: string | null,
  targetId: string | null,
  metadata: Record<string, unknown> = {}
) {
  const { error } = await supabase.from("activity_log").insert({
    actor_user_id: actorUserId,
    action,
    target_table: targetTable,
    target_id: targetId,
    metadata,
  });

  if (error) {
    console.error("Failed to write activity log", { action, targetTable, targetId, error: error.message });
  }
}
