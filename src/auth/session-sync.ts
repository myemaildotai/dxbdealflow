"use client";

import type { Session } from "@supabase/supabase-js";

type SessionCookiePayload = {
  accessToken: string | null;
  refreshToken: string | null;
};

async function writeServerSession(payload: SessionCookiePayload, method: "POST" | "DELETE") {
  await fetch("/api/auth/session", {
    method,
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "same-origin",
    cache: "no-store",
    body: method === "POST" ? JSON.stringify(payload) : undefined,
  });
}

export async function syncServerSession(session: Session | null) {
  if (!session?.access_token || !session.refresh_token) {
    await clearServerSession();
    return;
  }

  await syncServerSessionTokens(session.access_token, session.refresh_token);
}

export async function syncServerSessionTokens(accessToken: string | null, refreshToken: string | null) {
  if (!accessToken || !refreshToken) {
    await clearServerSession();
    return;
  }

  await writeServerSession(
    {
      accessToken,
      refreshToken,
    },
    "POST"
  );
}

export async function clearServerSession() {
  await writeServerSession({ accessToken: null, refreshToken: null }, "DELETE");
}
