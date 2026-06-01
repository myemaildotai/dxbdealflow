"use client";

type CacheEntry<T> = {
  data: T;
  expiresAt: number;
};

const sessionResourceCache = new Map<string, CacheEntry<unknown>>();
const inflightSessionResources = new Map<string, Promise<unknown>>();
const sessionResourceListeners = new Set<(key: string, data: unknown | null) => void>();
let sessionResourceGeneration = 0;

const DEFAULT_TTL_MS = 30_000;

export function getSessionResource<T>(key: string): T | null {
  const cached = sessionResourceCache.get(key);

  if (!cached) {
    return null;
  }

  if (cached.expiresAt <= Date.now()) {
    sessionResourceCache.delete(key);
    return null;
  }

  return cached.data as T;
}

export function setSessionResource<T>(key: string, data: T, ttlMs = DEFAULT_TTL_MS) {
  sessionResourceCache.set(key, {
    data,
    expiresAt: Date.now() + ttlMs,
  });

  notifySessionResourceListeners(key, data);

  return data;
}

export function invalidateSessionResource(matcher: string | RegExp | ((key: string) => boolean)) {
  for (const key of sessionResourceCache.keys()) {
    const shouldDelete =
      typeof matcher === "string" ? key === matcher || key.startsWith(matcher) : matcher instanceof RegExp ? matcher.test(key) : matcher(key);

    if (shouldDelete) {
      sessionResourceCache.delete(key);
      notifySessionResourceListeners(key, null);
    }
  }
}

export function clearAllSessionResources() {
  const clearedKeys = Array.from(sessionResourceCache.keys());

  sessionResourceGeneration += 1;
  sessionResourceCache.clear();
  inflightSessionResources.clear();

  clearedKeys.forEach((key) => notifySessionResourceListeners(key, null));
}

export function getSessionResourceGeneration() {
  return sessionResourceGeneration;
}

function notifySessionResourceListeners(key: string, data: unknown | null) {
  if (!sessionResourceListeners.size) {
    return;
  }

  queueMicrotask(() => {
    sessionResourceListeners.forEach((listener) => listener(key, data));
  });
}

export function subscribeSessionResource(listener: (key: string, data: unknown | null) => void) {
  sessionResourceListeners.add(listener);

  return () => {
    sessionResourceListeners.delete(listener);
  };
}

export async function fetchSessionResource<T>(
  key: string,
  loader: () => Promise<T>,
  options: {
    force?: boolean;
    ttlMs?: number;
  } = {}
) {
  if (!options.force) {
    const cached = getSessionResource<T>(key);
    if (cached !== null) {
      return cached;
    }

    const inflight = inflightSessionResources.get(key);
    if (inflight) {
      return inflight as Promise<T>;
    }
  }

  const requestGeneration = sessionResourceGeneration;
  const request = loader()
    .then((payload) => {
      if (requestGeneration !== sessionResourceGeneration) {
        return payload;
      }

      return setSessionResource(key, payload, options.ttlMs);
    })
    .finally(() => {
      if (inflightSessionResources.get(key) === request) {
        inflightSessionResources.delete(key);
      }
    });

  inflightSessionResources.set(key, request as Promise<unknown>);

  return request;
}

export function prefetchSessionResource<T>(
  key: string,
  loader: () => Promise<T>,
  options?: {
    force?: boolean;
    ttlMs?: number;
  }
) {
  void fetchSessionResource(key, loader, options).catch(() => undefined);
}
