import { NextRequest, NextResponse } from "next/server";
import {
  clearSessionCookies,
  getServiceSupabase,
  SESSION_COOKIE_NAMES,
  SESSION_COOKIE_OPTIONS,
  USER_SELECT,
  withNoStore,
} from "@/lib/deal-server";
import { isActiveBrokerStatus } from "@/lib/deal-utils";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const accessToken = typeof body?.accessToken === "string" ? body.accessToken : null;
  const refreshToken = typeof body?.refreshToken === "string" ? body.refreshToken : null;

  if (!accessToken || !refreshToken) {
    return NextResponse.json({ error: "Access token and refresh token are required." }, withNoStore({ status: 400 }));
  }

  const supabase = getServiceSupabase();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser(accessToken);

  if (authError || !user) {
    const response = NextResponse.json({ error: "Invalid auth session." }, withNoStore({ status: 401 }));
    clearSessionCookies(response);
    return response;
  }

  const { data: platformUser } = await supabase.from("users").select(USER_SELECT).eq("id", user.id).maybeSingle();

  if (platformUser?.role === "broker" && !isActiveBrokerStatus(platformUser.status)) {
    const response = NextResponse.json(
      {
        error: "Broker account is not active.",
        brokerStatus: platformUser.status,
      },
      withNoStore({ status: 403 })
    );
    clearSessionCookies(response);
    return response;
  }

  const response = NextResponse.json({ success: true }, withNoStore());
  response.cookies.set(SESSION_COOKIE_NAMES.accessToken, accessToken, SESSION_COOKIE_OPTIONS);
  response.cookies.set(SESSION_COOKIE_NAMES.refreshToken, refreshToken, SESSION_COOKIE_OPTIONS);
  return response;
}

export async function DELETE() {
  const response = NextResponse.json({ success: true }, withNoStore());
  clearSessionCookies(response);
  return response;
}
