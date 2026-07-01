import { NextRequest, NextResponse } from "next/server";
import { getServiceSupabase, withNoStore } from "@/lib/deal-server";
import { createMaintenanceNotifyRequest, validateMaintenanceNotifyInput } from "@/lib/maintenance-notify";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);
    const validation = validateMaintenanceNotifyInput(body);

    if (!validation.isValid) {
      return NextResponse.json(
        {
          success: false,
          message: validation.message,
        },
        withNoStore({ status: 400 }),
      );
    }

    const supabase = getServiceSupabase();
    const result = await createMaintenanceNotifyRequest(supabase, validation.values);

    return NextResponse.json(
      result,
      withNoStore({
        status: result.success && !("duplicate" in result) ? 201 : 200,
      }),
    );
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : "Failed to save your notification request.",
      },
      withNoStore({ status: 500 }),
    );
  }
}
