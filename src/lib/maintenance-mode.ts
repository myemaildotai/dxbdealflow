import type { SupabaseClient } from "@supabase/supabase-js";

export const MAINTENANCE_MODE_SETTING_KEY = "maintenance_mode";

export type MaintenanceModeState = {
  enabled: boolean;
  updated_at: string | null;
  updated_by: string | null;
};

type SettingsRow = {
  value: { enabled?: boolean } | null;
  updated_at: string | null;
  updated_by: string | null;
};

export function parseMaintenanceModeState(row: SettingsRow | null | undefined): MaintenanceModeState {
  return {
    enabled: !!row?.value?.enabled,
    updated_at: row?.updated_at || null,
    updated_by: row?.updated_by || null,
  };
}

export async function getMaintenanceModeState(supabase: SupabaseClient): Promise<MaintenanceModeState> {
  const { data, error } = await supabase
    .from("settings")
    .select("value, updated_at, updated_by")
    .eq("key", MAINTENANCE_MODE_SETTING_KEY)
    .maybeSingle();

  if (error) {
    throw new Error("Failed to load maintenance mode state.");
  }

  return parseMaintenanceModeState((data as SettingsRow | null) || null);
}

export async function setMaintenanceModeState(supabase: SupabaseClient, enabled: boolean, updatedBy: string) {
  const { data, error } = await supabase
    .from("settings")
    .upsert(
      {
        key: MAINTENANCE_MODE_SETTING_KEY,
        value: { enabled },
        updated_by: updatedBy,
      },
      { onConflict: "key" }
    )
    .select("value, updated_at, updated_by")
    .single();

  if (error) {
    throw new Error("Failed to update maintenance mode state.");
  }

  return parseMaintenanceModeState(data as SettingsRow);
}
