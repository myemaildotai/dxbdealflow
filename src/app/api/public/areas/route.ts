import { NextResponse } from "next/server";
import { getServiceSupabase, withNoStore } from "@/lib/deal-server";
import { fetchAreas } from "@/lib/platform-server-data";

export async function GET() {
  const areas = await fetchAreas(getServiceSupabase());

  return NextResponse.json({ areas }, withNoStore());
}
