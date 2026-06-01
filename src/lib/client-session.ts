"use client";

import { SUPABASE_CONFIG } from "@/config";
import { setApiAccessToken, setApiSessionScope } from "@/lib/deal-api";
import { clearAllSessionResources } from "@/lib/session-resource";

const CLIENT_LOCAL_STORAGE_PREFIXES = ["admin-listing-approval-success:"];
const LEGACY_SUPABASE_AUTH_KEYS = new Set(["supabase.auth.token"]);
const SUPABASE_AUTH_STORAGE_KEY_PATTERN = /^sb-[a-z0-9]+-auth-token/i;
let clientSessionResetEpoch = 0;
const clientSessionResetListeners = new Set<(epoch: number) => void>();

type ResetClientSessionOptions = {
  clearAuthStorage?: boolean;
};

function getSupabaseAuthStoragePrefixes() {
  try {
    const hostname = new URL(SUPABASE_CONFIG.url).hostname;
    const projectRef = hostname.split(".")[0];

    return projectRef ? [`sb-${projectRef}-auth-token`] : [];
  } catch {
    return [];
  }
}

function shouldClearLocalStorageKey(key: string, { clearAuthStorage = false }: ResetClientSessionOptions) {
  if (CLIENT_LOCAL_STORAGE_PREFIXES.some((prefix) => key.startsWith(prefix))) {
    return true;
  }

  if (!clearAuthStorage) {
    return false;
  }

  if (LEGACY_SUPABASE_AUTH_KEYS.has(key) || SUPABASE_AUTH_STORAGE_KEY_PATTERN.test(key)) {
    return true;
  }

  return getSupabaseAuthStoragePrefixes().some((prefix) => key.startsWith(prefix));
}

function clearPersistedBrowserState(options: ResetClientSessionOptions = {}) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.sessionStorage.clear();
  } catch {
    // Ignore storage cleanup errors so auth transitions can continue.
  }

  try {
    for (let index = window.localStorage.length - 1; index >= 0; index -= 1) {
      const key = window.localStorage.key(index);
      if (!key) {
        continue;
      }

      if (shouldClearLocalStorageKey(key, options)) {
        window.localStorage.removeItem(key);
      }
    }
  } catch {
    // Ignore storage cleanup errors so auth transitions can continue.
  }
}

export function applyClientSession(accessToken: string | null, sessionUserId: string | null) {
  setApiSessionScope(sessionUserId);
  setApiAccessToken(accessToken);
}

export function getClientSessionResetEpoch() {
  return clientSessionResetEpoch;
}

export function subscribeClientSessionReset(listener: (epoch: number) => void) {
  clientSessionResetListeners.add(listener);

  return () => {
    clientSessionResetListeners.delete(listener);
  };
}

export function resetClientSessionState(nextSessionUserId: string | null = null, options: ResetClientSessionOptions = {}) {
  clientSessionResetEpoch += 1;
  setApiSessionScope(nextSessionUserId);
  setApiAccessToken(null);
  clearAllSessionResources();
  clearPersistedBrowserState(options);

  if (clientSessionResetListeners.size) {
    const resetEpoch = clientSessionResetEpoch;
    queueMicrotask(() => {
      clientSessionResetListeners.forEach((listener) => listener(resetEpoch));
    });
  }
}
