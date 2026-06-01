import { NextResponse } from "next/server";
import { getServiceSupabase, withNoStore } from "@/lib/deal-server";
import { getSiteModeState } from "@/lib/site-mode-state";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = getServiceSupabase();
    const state = await getSiteModeState(supabase);

    return NextResponse.json(
      {
        maintenance: {
          enabled: state.maintenance.enabled,
        },
        comingSoon: {
          enabled: state.comingSoon.enabled,
        },
      },
      withNoStore()
    );
  } catch {
    return NextResponse.json(
      {
        maintenance: {
          enabled: false,
        },
        comingSoon: {
          enabled: false,
        },
      },
      withNoStore()
    );
  }
}
