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
        enabled: state.maintenance.enabled,
      },
      withNoStore()
    );
  } catch {
    return NextResponse.json(
      {
        enabled: false,
      },
      withNoStore()
    );
  }
}
