import { NextRequest, NextResponse } from "next/server";
import { getServiceSupabase, jsonError, requireAdmin } from "@/lib/deal-server";

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if ("error" in auth) return auth.error;

  try {
    const body = await request.json();
    const supabase = getServiceSupabase();
    const userId = String(body.userId || "");
    const creditsToAdd = Number(body.creditsToAdd || 0);

    if (!userId || !Number.isFinite(creditsToAdd) || creditsToAdd <= 0) {
      return jsonError("userId and a positive creditsToAdd value are required.", 400);
    }

    const { data: current } = await supabase
      .from("broker_credits")
      .select("available_credits, used_credits, total_credits_assigned")
      .eq("user_id", userId)
      .maybeSingle();

    const nextAvailable = (current?.available_credits || 0) + creditsToAdd;
    const nextAssigned = (current?.total_credits_assigned || 0) + creditsToAdd;

    const { error } = await supabase.from("broker_credits").upsert(
      {
        user_id: userId,
        available_credits: nextAvailable,
        used_credits: current?.used_credits || 0,
        total_credits_assigned: nextAssigned,
      },
      { onConflict: "user_id" }
    );

    if (error) {
      return jsonError(error.message || "Failed to assign credits.", 500);
    }

    await supabase.from("activity_log").insert({
      actor_user_id: auth.user.id,
      action: "credits_assigned",
      target_table: "broker_credits",
      target_id: userId,
      metadata: { creditsToAdd },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Failed to assign credits.", 500);
  }
}
