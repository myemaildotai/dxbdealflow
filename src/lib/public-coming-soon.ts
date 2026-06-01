import { fetchPublicSiteModeState } from "@/lib/public-site-modes";

export type PublicComingSoonModeState = {
  enabled: boolean;
};

export async function fetchPublicComingSoonModeState(): Promise<PublicComingSoonModeState> {
  const state = await fetchPublicSiteModeState();
  return state.comingSoon;
}
