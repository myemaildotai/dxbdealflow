import { NextRequest, NextResponse } from "next/server";
import {
  NO_BROKER_ACCOUNT_MESSAGE,
  PASSWORD_RESET_FAILED_MESSAGE,
  PASSWORD_RESET_SENT_MESSAGE,
  isValidEmail,
  type PasswordResetRequestResult,
} from "@/auth/passwordReset";
import { getRequestSupabase, getServiceSupabase, withNoStore } from "@/lib/deal-server";

type PasswordResetBody = {
  email?: string;
};

function jsonResponse(payload: PasswordResetRequestResult, status = 200) {
  return NextResponse.json(payload, withNoStore({ status }));
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => null)) as PasswordResetBody | null;
    const email = body?.email?.trim().toLowerCase() || "";

    if (!isValidEmail(email)) {
      return jsonResponse(
        {
          status: "not_found",
          message: NO_BROKER_ACCOUNT_MESSAGE,
        },
        404
      );
    }

    const serviceSupabase = getServiceSupabase();
    const { data: brokerUser, error: lookupError } = await serviceSupabase
      .from("users")
      .select("id, role, status")
      .ilike("email", email)
      .eq("role", "broker")
      .maybeSingle();

    if (lookupError) {
      console.error("[password-reset] Failed to check broker account.", {
        email,
        error: lookupError.message,
      });

      return jsonResponse(
        {
          status: "send_failed",
          message: PASSWORD_RESET_FAILED_MESSAGE,
        },
        500
      );
    }

    if (!brokerUser) {
      return jsonResponse(
        {
          status: "not_found",
          message: NO_BROKER_ACCOUNT_MESSAGE,
        },
        404
      );
    }

    const authSupabase = getRequestSupabase(request, null);
    const { error: resetError } = await authSupabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${request.nextUrl.origin}/update-password`,
    });

    if (resetError) {
      console.error("[password-reset] Supabase reset email failed.", {
        email,
        brokerUserId: brokerUser.id,
        brokerStatus: brokerUser.status,
        error: resetError.message,
      });

      return jsonResponse(
        {
          status: "send_failed",
          message: PASSWORD_RESET_FAILED_MESSAGE,
        },
        500
      );
    }

    return jsonResponse({
      status: "sent",
      message: PASSWORD_RESET_SENT_MESSAGE,
    });
  } catch (error) {
    console.error("[password-reset] Unexpected reset request failure.", {
      error: error instanceof Error ? error.message : "Unknown error",
    });

    return jsonResponse(
      {
        status: "send_failed",
        message: PASSWORD_RESET_FAILED_MESSAGE,
      },
      500
    );
  }
}
