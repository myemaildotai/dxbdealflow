"use client";

import type { Agency, BrokerProfile, PlatformUser } from "@/lib/deal-types";

export type HydratedAuthProfile = {
  platformUser: PlatformUser | null;
  brokerProfile: BrokerProfile | null;
  agency: Agency | null;
};

type HydrationCacheEntry = {
  userId: string;
  payload: HydratedAuthProfile;
  expiresAt: number;
};

type InFlightHydration = {
  userId: string;
  request: Promise<HydratedAuthProfile | null>;
};

const AUTH_HYDRATION_CACHE_TTL_MS = 5_000;
const hydrationCache = new Map<string, HydrationCacheEntry>();
const inFlightHydrations = new Map<string, InFlightHydration>();

const sleep = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms));

function getCachedHydration(accessToken: string, userId: string) {
  const cached = hydrationCache.get(accessToken);

  if (!cached) {
    return null;
  }

  if (cached.userId !== userId || cached.expiresAt <= Date.now()) {
    hydrationCache.delete(accessToken);
    return null;
  }

  return cached.payload;
}

async function requestHydratedAuthProfile(accessToken: string, userId: string): Promise<HydratedAuthProfile | null> {
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const response = await fetch("/api/public/overview?scope=auth-me", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      credentials: "same-origin",
      cache: "no-store",
    });

    if (response.ok) {
      const payload = (await response.json()) as Partial<HydratedAuthProfile> | null;

      if (
        !payload ||
        (payload.platformUser && payload.platformUser.id !== userId) ||
        (payload.brokerProfile && payload.brokerProfile.user_id !== userId)
      ) {
        return null;
      }

      return {
        platformUser: payload.platformUser ?? null,
        brokerProfile: payload.brokerProfile ?? null,
        agency: payload.agency ?? null,
      };
    }

    if ((response.status === 401 || response.status === 403) && attempt < 3) {
      await sleep(150);
      continue;
    }

    return null;
  }

  return null;
}

export function getHydratedAuthProfile(accessToken: string, userId: string): Promise<HydratedAuthProfile | null> {
  const cached = getCachedHydration(accessToken, userId);

  if (cached) {
    return Promise.resolve(cached);
  }

  const inFlight = inFlightHydrations.get(accessToken);

  if (inFlight?.userId === userId) {
    return inFlight.request;
  }

  if (inFlight) {
    inFlightHydrations.delete(accessToken);
  }

  const inFlightHydration: InFlightHydration = {
    userId,
    request: Promise.resolve(null),
  };
  const request = requestHydratedAuthProfile(accessToken, userId)
    .then((payload) => {
      if (payload && inFlightHydrations.get(accessToken) === inFlightHydration) {
        const cacheEntry: HydrationCacheEntry = {
          userId,
          payload,
          expiresAt: Date.now() + AUTH_HYDRATION_CACHE_TTL_MS,
        };
        hydrationCache.set(accessToken, cacheEntry);
        window.setTimeout(() => {
          if (hydrationCache.get(accessToken) === cacheEntry) {
            hydrationCache.delete(accessToken);
          }
        }, AUTH_HYDRATION_CACHE_TTL_MS);
      }

      return payload;
    })
    .finally(() => {
      if (inFlightHydrations.get(accessToken) === inFlightHydration) {
        inFlightHydrations.delete(accessToken);
      }
    });

  inFlightHydration.request = request;
  inFlightHydrations.set(accessToken, inFlightHydration);
  return request;
}

export function clearHydratedAuthProfileCache(accessToken?: string) {
  if (accessToken) {
    hydrationCache.delete(accessToken);
    inFlightHydrations.delete(accessToken);
    return;
  }

  hydrationCache.clear();
  inFlightHydrations.clear();
}
