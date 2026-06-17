import { NextResponse } from "next/server";
import { withNoStore } from "@/lib/deal-server";
import { getSharedSiteModeState } from "@/lib/site-mode-state";

export const dynamic = "force-dynamic";

function withSiteModeTiming(response: NextResponse, startedAt: number) {
  response.headers.set("Server-Timing", `site_mode_shared;dur=${(performance.now() - startedAt).toFixed(1)}`);
  return response;
}

export async function GET() {
  const startedAt = performance.now();

  try {
    const state = await getSharedSiteModeState();

    return withSiteModeTiming(
      NextResponse.json(
        {
          maintenance: {
            enabled: state.maintenance.enabled,
          },
          comingSoon: {
            enabled: state.comingSoon.enabled,
          },
        },
        withNoStore()
      ),
      startedAt
    );
  } catch {
    return withSiteModeTiming(
      NextResponse.json(
        {
          maintenance: {
            enabled: false,
          },
          comingSoon: {
            enabled: false,
          },
        },
        withNoStore()
      ),
      startedAt
    );
  }
}
