export type PublicSiteModeState = {
  maintenance: {
    enabled: boolean;
  };
  comingSoon: {
    enabled: boolean;
  };
};

const PUBLIC_SITE_MODE_CACHE_TTL_MS = 15_000;
const FALLBACK_SITE_MODE_STATE: PublicSiteModeState = {
  maintenance: {
    enabled: false,
  },
  comingSoon: {
    enabled: false,
  },
};

let siteModeStateCache: { value: PublicSiteModeState; expiresAt: number } | null = null;
let siteModeStatePromise: Promise<PublicSiteModeState> | null = null;

function normalizeSiteModeState(payload: Partial<PublicSiteModeState> | null | undefined): PublicSiteModeState {
  return {
    maintenance: {
      enabled: !!payload?.maintenance?.enabled,
    },
    comingSoon: {
      enabled: !!payload?.comingSoon?.enabled,
    },
  };
}

export function invalidatePublicSiteModeState() {
  siteModeStateCache = null;
  siteModeStatePromise = null;
}

export function setPublicSiteModeState(value: PublicSiteModeState) {
  siteModeStateCache = {
    value: normalizeSiteModeState(value),
    expiresAt: Date.now() + PUBLIC_SITE_MODE_CACHE_TTL_MS,
  };

  return siteModeStateCache.value;
}

export async function fetchPublicSiteModeState({ force = false }: { force?: boolean } = {}) {
  if (!force && siteModeStateCache && siteModeStateCache.expiresAt > Date.now()) {
    return siteModeStateCache.value;
  }

  if (!force && siteModeStatePromise) {
    return siteModeStatePromise;
  }

  const request = fetch("/api/public/site-modes", {
    cache: "no-store",
    credentials: "same-origin",
  })
    .then(async (response) => {
      if (!response.ok) {
        return FALLBACK_SITE_MODE_STATE;
      }

      return normalizeSiteModeState((await response.json().catch(() => null)) as Partial<PublicSiteModeState> | null);
    })
    .catch(() => FALLBACK_SITE_MODE_STATE)
    .then((value) => setPublicSiteModeState(value))
    .finally(() => {
      if (siteModeStatePromise === request) {
        siteModeStatePromise = null;
      }
    });

  siteModeStatePromise = request;
  return request;
}
