import { NextResponse } from "next/server";
import { getActiveComingSoonRoleOptions } from "@/lib/coming-soon";
import { getServiceSupabase, withNoStore } from "@/lib/deal-server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = getServiceSupabase();
    const roles = await getActiveComingSoonRoleOptions(supabase);

    return NextResponse.json({ roles }, withNoStore());
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to load role options.",
        roles: [],
      },
      withNoStore({ status: 500 })
    );
  }
}
