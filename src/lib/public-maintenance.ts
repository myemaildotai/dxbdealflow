import { fetchPublicSiteModeState } from "@/lib/public-site-modes";

export type PublicMaintenanceModeState = {
  enabled: boolean;
};

export async function fetchPublicMaintenanceModeState(): Promise<PublicMaintenanceModeState> {
  const state = await fetchPublicSiteModeState();
  return state.maintenance;
}

export async function getPostSignOutRoute() {
  const state = await fetchPublicSiteModeState();

  if (state.maintenance.enabled || state.comingSoon.enabled) {
    return "/login?adminOnly=1";
  }

  return "/login";
}
