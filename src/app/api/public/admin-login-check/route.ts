import { NextRequest, NextResponse } from "next/server";
import { getServiceSupabase, withNoStore } from "@/lib/deal-server";

type AdminLoginCheckBody = {
  email?: string;
};

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => null)) as AdminLoginCheckBody | null;
    const normalizedEmail = body?.email?.trim().toLowerCase() || "";

    if (!normalizedEmail) {
      return NextResponse.json({ allowed: false }, withNoStore());
    }

    const supabase = getServiceSupabase();
    const { data } = await supabase
      .from("users")
      .select("role")
      .ilike("email", normalizedEmail)
      .maybeSingle();

    return NextResponse.json(
      {
        allowed: data?.role === "admin",
      },
      withNoStore()
    );
  } catch {
    return NextResponse.json({ allowed: false }, withNoStore());
  }
}
