"use client";

import type { Session } from "@supabase/supabase-js";

type SessionCookiePayload = {
  accessToken: string | null;
  refreshToken: string | null;
};

let lastRequestedServerSessionKey: string | null = null;
let activeServerSessionWrite: Promise<void> | null = null;

function getTokenFingerprint(value: string | null) {
  return value ? `${value.length}:${value.slice(0, 8)}:${value.slice(-8)}` : "";
}

function getServerSessionKey(payload: SessionCookiePayload, method: "POST" | "DELETE") {
  if (method === "DELETE") {
    return "DELETE";
  }

  return `POST:${getTokenFingerprint(payload.accessToken)}:${getTokenFingerprint(payload.refreshToken)}`;
}

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

function queueServerSessionWrite(payload: SessionCookiePayload, method: "POST" | "DELETE") {
  const sessionKey = getServerSessionKey(payload, method);

  if (lastRequestedServerSessionKey === sessionKey) {
    return activeServerSessionWrite ?? Promise.resolve();
  }

  lastRequestedServerSessionKey = sessionKey;
  const writePromise = writeServerSession(payload, method).finally(() => {
    if (activeServerSessionWrite === writePromise) {
      activeServerSessionWrite = null;
    }
  });

  activeServerSessionWrite = writePromise;
  return writePromise;
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

  await queueServerSessionWrite(
    {
      accessToken,
      refreshToken,
    },
    "POST"
  );
}

export async function clearServerSession() {
  await queueServerSessionWrite({ accessToken: null, refreshToken: null }, "DELETE");
}
