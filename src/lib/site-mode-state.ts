import type { SupabaseClient } from "@supabase/supabase-js";
import { unstable_cache } from "next/cache";
import {
  COMING_SOON_MODE_SETTING_KEY,
  parseComingSoonModeState,
  type ComingSoonModeState,
} from "@/lib/coming-soon";
import { getServiceSupabase } from "@/lib/deal-server";
import {
  MAINTENANCE_MODE_SETTING_KEY,
  parseMaintenanceModeState,
  type MaintenanceModeState,
} from "@/lib/maintenance-mode";

type SiteModeSettingsRow = {
  key: string;
  value: { enabled?: boolean } | null;
  updated_at: string | null;
  updated_by: string | null;
};

export type SiteModeState = {
  maintenance: MaintenanceModeState;
  comingSoon: ComingSoonModeState;
};

export const SITE_MODE_STATE_CACHE_TAG = "site-mode-state";
const SITE_MODE_CACHE_TTL_MS = 5_000;
// Admin writes invalidate and prewarm this cache. The timed revalidation is a
// backstop for operational changes made outside those supported write paths.
const SHARED_SITE_MODE_REVALIDATE_SECONDS = 60;

let siteModeStateCache: { value: SiteModeState; expiresAt: number } | null = null;
let siteModeStatePromise: Promise<SiteModeState> | null = null;

function createDefaultSiteModeState(): SiteModeState {
  return {
    maintenance: parseMaintenanceModeState(null),
    comingSoon: parseComingSoonModeState(null),
  };
}

async function loadSiteModeState(supabase: SupabaseClient): Promise<SiteModeState> {
  const { data, error } = await supabase
    .from("settings")
    .select("key, value, updated_at, updated_by")
    .in("key", [MAINTENANCE_MODE_SETTING_KEY, COMING_SOON_MODE_SETTING_KEY]);

  if (error) {
    throw new Error("Failed to load site mode state.");
  }

  const rows = ((data as SiteModeSettingsRow[] | null) || []).reduce<Record<string, SiteModeSettingsRow>>((accumulator, row) => {
    accumulator[row.key] = row;
    return accumulator;
  }, {});

  return {
    maintenance: parseMaintenanceModeState(rows[MAINTENANCE_MODE_SETTING_KEY] || null),
    comingSoon: parseComingSoonModeState(rows[COMING_SOON_MODE_SETTING_KEY] || null),
  };
}

export const getSharedSiteModeState = unstable_cache(
  async () => loadSiteModeState(getServiceSupabase()),
  ["shared-site-mode-state-v1"],
  {
    revalidate: SHARED_SITE_MODE_REVALIDATE_SECONDS,
    tags: [SITE_MODE_STATE_CACHE_TAG],
  }
);

export function clearSiteModeStateCache() {
  siteModeStateCache = null;
  siteModeStatePromise = null;
}

export async function getSiteModeState(
  supabase: SupabaseClient,
  {
    force = false,
    ttlMs = SITE_MODE_CACHE_TTL_MS,
  }: {
    force?: boolean;
    ttlMs?: number;
  } = {}
) {
  if (!force && siteModeStateCache && siteModeStateCache.expiresAt > Date.now()) {
    return siteModeStateCache.value;
  }

  if (!force && siteModeStatePromise) {
    return siteModeStatePromise;
  }

  const request = loadSiteModeState(supabase)
    .catch(() => createDefaultSiteModeState())
    .then((value) => {
      siteModeStateCache = {
        value,
        expiresAt: Date.now() + ttlMs,
      };

      return value;
    })
    .finally(() => {
      if (siteModeStatePromise === request) {
        siteModeStatePromise = null;
      }
    });

  siteModeStatePromise = request;
  return request;
}
