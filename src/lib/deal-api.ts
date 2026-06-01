"use client";

import { fetchSessionResource, getSessionResource, invalidateSessionResource, prefetchSessionResource, setSessionResource } from "@/lib/session-resource";
import { supabase } from "@/lib/supabase";

let cachedAccessToken: string | null | undefined;
let sessionAccessTokenPromise: Promise<string | null> | null = null;
let accessTokenGeneration = 0;
let apiCacheScope = "guest";

function resolveApiCacheScope() {
  return apiCacheScope || "guest";
}

async function getAccessToken() {
  if (cachedAccessToken !== undefined) {
    return cachedAccessToken;
  }

  if (!sessionAccessTokenPromise) {
    const requestGeneration = accessTokenGeneration;
    const accessTokenRequest = supabase.auth
      .getSession()
      .then(({ data }) => {
        if (requestGeneration !== accessTokenGeneration) {
          return cachedAccessToken ?? null;
        }

        const nextAccessToken = data.session?.access_token ?? null;
        cachedAccessToken = nextAccessToken;
        return nextAccessToken;
      })
      .finally(() => {
        if (sessionAccessTokenPromise === accessTokenRequest) {
          sessionAccessTokenPromise = null;
        }
      });

    sessionAccessTokenPromise = accessTokenRequest;
  }

  return sessionAccessTokenPromise;
}

export function getApiCacheKey(input: string, init: RequestInit = {}) {
  const method = (init.method || "GET").toUpperCase();
  return `api:${resolveApiCacheScope()}:${method}:${input}`;
}

export function getCachedApiData<T>(input: string, init: RequestInit = {}) {
  return getSessionResource<T>(getApiCacheKey(input, init));
}

export function setCachedApiData<T>(input: string, data: T, init: RequestInit = {}, ttlMs?: number) {
  return setSessionResource(getApiCacheKey(input, init), data, ttlMs);
}

export function setApiAccessToken(accessToken: string | null) {
  accessTokenGeneration += 1;
  cachedAccessToken = accessToken;
  sessionAccessTokenPromise = null;
}

export function setApiSessionScope(sessionUserId: string | null | undefined) {
  apiCacheScope = sessionUserId ? `user:${sessionUserId}` : "guest";
}

export async function apiFetch<T>(input: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers || {});
  if (!headers.has("Content-Type") && init.body && !(init.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  const accessToken = await getAccessToken();
  if (accessToken) {
    headers.set("Authorization", `Bearer ${accessToken}`);
  }

  const response = await fetch(input, {
    ...init,
    cache: init.cache ?? "no-store",
    headers,
    credentials: "same-origin",
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({ error: "Request failed" }));
    throw new Error(payload.error || "Request failed");
  }

  return response.json();
}

export async function apiFetchCached<T>(
  input: string,
  init: RequestInit = {},
  options: {
    force?: boolean;
    ttlMs?: number;
  } = {}
) {
  return fetchSessionResource(getApiCacheKey(input, init), () => apiFetch<T>(input, init), options);
}

export function prefetchApi<T>(
  input: string,
  init: RequestInit = {},
  options?: {
    force?: boolean;
    ttlMs?: number;
  }
) {
  prefetchSessionResource(getApiCacheKey(input, init), () => apiFetch<T>(input, init), options);
}

export function invalidateApiCache(input: string | RegExp | ((key: string) => boolean), init?: RequestInit) {
  if (typeof input === "string" && init) {
    invalidateSessionResource(getApiCacheKey(input, init));
    return;
  }

  if (typeof input === "string") {
    invalidateSessionResource((key) => key.startsWith("api:") && key.includes(input));
    return;
  }

  invalidateSessionResource((key) => {
    if (!key.startsWith("api:")) {
      return false;
    }

    if (input instanceof RegExp) {
      return input.test(key);
    }

    return input(key);
  });
}
