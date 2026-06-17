import { NextRequest, NextResponse } from "next/server";
import { getLegacyAdminTabRedirectPath } from "./src/lib/admin-routes";
import { isLegalRoute } from "./src/lib/legal-routes";

const ACCESS_TOKEN_COOKIE = "dx-access-token";
const REFRESH_TOKEN_COOKIE = "dx-refresh-token";
const PASSWORD_RESET_PATH = "/update-password";
const PASSWORD_RESET_API_PATH = "/api/auth/password-reset";
const ALLOWED_PATHS_DURING_MAINTENANCE = new Set(["/maintenance", "/login", PASSWORD_RESET_PATH]);
const ALLOWED_API_PATHS_DURING_MAINTENANCE = new Set([
  "/api/auth/session",
  PASSWORD_RESET_API_PATH,
  "/api/early-access-leads",
  "/api/public/admin-login-check",
  "/api/public/maintenance-mode",
  "/api/public/site-modes",
]);
const COMING_SOON_PAGE_PATH = "/coming-soon";
const ADMIN_SIGN_IN_PATH = "/login";
const ADMIN_LOGIN_PATH = "/admin/login";
const LEGACY_ROUTE_REDIRECTS = new Map([
  ["/signin", "/login"],
  ["/apply", "/register"],
  ["/signup", "/register"],
]);
const COMING_SOON_PUBLIC_API_PATHS = new Set([
  PASSWORD_RESET_API_PATH,
  "/api/public/admin-login-check",
  "/api/public/coming-soon-mode",
  "/api/public/site-modes",
  "/api/coming-soon/roles",
  "/api/coming-soon/registrations",
]);
const MODE_STATUS_API_PATHS = new Set([
  "/api/public/coming-soon-mode",
  "/api/public/maintenance-mode",
  "/api/public/site-modes",
]);
const COMING_SOON_ADMIN_ALLOWED_PATH_PREFIXES = ["/admin", "/listings", "/requirements"];
const COMING_SOON_ADMIN_ALLOWED_API_PREFIXES = ["/api/admin", "/api/listings", "/api/requirements"];
const AUTH_SESSION_API_PATH = "/api/auth/session";
const AUTH_ME_API_PATH = "/api/public/overview";
const ADMIN_LOGIN_CHECK_API_PATH = "/api/public/admin-login-check";
const SITE_MODE_CACHE_TTL_MS = 5_000;
const USER_ROLE_CACHE_TTL_MS = 30_000;
const BROKER_PROTECTED_PATH_PREFIXES = ["/dashboard"];
const BROKER_PROTECTED_PATHS = new Set(["/my-requirements", "/post-listing", "/post-requirement", "/requirements"]);

type SiteModeState = {
  maintenanceEnabled: boolean;
  comingSoonEnabled: boolean;
};

type SiteModeLookup = {
  value: SiteModeState;
  cacheStatus: "hit" | "miss" | "coalesced";
  durationMs: number;
};

type UserAccess = {
  role: string | null;
  status: string | null;
};

let siteModeStateCache: { value: SiteModeState; expiresAt: number } | null = null;
let siteModeStatePromise: Promise<SiteModeState> | null = null;
const userAccessCache = new Map<string, { value: UserAccess; expiresAt: number }>();

function isStaticAsset(pathname: string) {
  return (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/images") ||
    pathname === "/favicon.ico" ||
    pathname === "/robots.txt" ||
    pathname === "/sitemap.xml" ||
    /\.[a-zA-Z0-9]+$/.test(pathname)
  );
}

function canAccessDuringMaintenance(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  if (isLegalRoute(pathname)) {
    return true;
  }

  if (ALLOWED_PATHS_DURING_MAINTENANCE.has(pathname)) {
    return true;
  }

  if (ALLOWED_API_PATHS_DURING_MAINTENANCE.has(pathname)) {
    return true;
  }

  return pathname === AUTH_ME_API_PATH && request.nextUrl.searchParams.get("scope") === "auth-me";
}

function isAdminRoute(pathname: string) {
  return pathname === "/admin" || pathname.startsWith("/admin/");
}

function isAdminApiRoute(pathname: string) {
  return pathname === "/api/admin" || pathname.startsWith("/api/admin/");
}

function matchesPathPrefix(pathname: string, prefixes: string[]) {
  return prefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

function isBrokerProtectedPath(pathname: string) {
  return BROKER_PROTECTED_PATHS.has(pathname) || matchesPathPrefix(pathname, BROKER_PROTECTED_PATH_PREFIXES);
}

function isActiveBrokerStatus(status: string | null | undefined) {
  return status === "active" || status === "approved";
}

function getBrokerStatusPageStatus(status: string | null | undefined) {
  return status === "rejected" || status === "deactivated" || status === "suspended" ? status : "pending";
}

function isAdminSignInRequest(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  return (
    pathname === ADMIN_LOGIN_PATH ||
    (pathname === ADMIN_SIGN_IN_PATH && request.nextUrl.searchParams.get("adminOnly") === "1")
  );
}

function isSupabaseAuthCallbackPath(pathname: string) {
  return (
    pathname === "/auth/callback" ||
    pathname.startsWith("/auth/callback/") ||
    pathname === "/api/auth/callback" ||
    pathname.startsWith("/api/auth/callback/")
  );
}

function isAuthBootstrapRequest(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  if (pathname === AUTH_SESSION_API_PATH) {
    return true;
  }

  // The sign-in flow uses this authenticated profile lookup to resolve whether
  // the submitted credentials belong to an admin before entering /admin.
  return pathname === AUTH_ME_API_PATH && request.nextUrl.searchParams.get("scope") === "auth-me";
}

function canSkipSiteModeCheck(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  return (
    MODE_STATUS_API_PATHS.has(pathname) ||
    pathname === ADMIN_LOGIN_CHECK_API_PATH ||
    isSupabaseAuthCallbackPath(pathname) ||
    isAuthBootstrapRequest(request)
  );
}

function canAccessDuringComingSoon(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // These are the only public surfaces left open while the product is gated:
  // the Coming Soon page, admin login/auth bootstrap, Supabase callbacks, and
  // the APIs needed by the Coming Soon form itself.
  return (
    isLegalRoute(pathname) ||
    pathname === COMING_SOON_PAGE_PATH ||
    pathname === PASSWORD_RESET_PATH ||
    isAdminSignInRequest(request) ||
    isSupabaseAuthCallbackPath(pathname) ||
    isAuthBootstrapRequest(request) ||
    COMING_SOON_PUBLIC_API_PATHS.has(pathname)
  );
}

function canAdminAccessDuringComingSoon(pathname: string) {
  return (
    matchesPathPrefix(pathname, COMING_SOON_ADMIN_ALLOWED_PATH_PREFIXES) ||
    matchesPathPrefix(pathname, COMING_SOON_ADMIN_ALLOWED_API_PREFIXES)
  );
}

function resolveSupabaseSettingsKey() {
  return process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || null;
}

async function loadSiteModeState(request: NextRequest): Promise<SiteModeState> {
  const fallback = {
    maintenanceEnabled: false,
    comingSoonEnabled: false,
  };
  const siteModeUrl = request.nextUrl.clone();
  siteModeUrl.pathname = "/api/public/site-modes";
  siteModeUrl.search = "";

  try {
    const response = await fetch(siteModeUrl, {
      headers: {
        Accept: "application/json",
      },
      cache: "no-store",
    });

    if (!response.ok) {
      return fallback;
    }

    const payload = (await response.json().catch(() => null)) as {
      maintenance?: { enabled?: boolean };
      comingSoon?: { enabled?: boolean };
    } | null;

    return {
      maintenanceEnabled: !!payload?.maintenance?.enabled,
      comingSoonEnabled: !!payload?.comingSoon?.enabled,
    };
  } catch {
    return fallback;
  }
}

async function getSiteModeState(request: NextRequest): Promise<SiteModeLookup> {
  const startedAt = performance.now();

  if (siteModeStateCache && siteModeStateCache.expiresAt > Date.now()) {
    return {
      value: siteModeStateCache.value,
      cacheStatus: "hit",
      durationMs: performance.now() - startedAt,
    };
  }

  const cacheStatus = siteModeStatePromise ? "coalesced" : "miss";

  if (!siteModeStatePromise) {
    const pendingRequest = loadSiteModeState(request)
      .then((value) => {
        siteModeStateCache = {
          value,
          expiresAt: Date.now() + SITE_MODE_CACHE_TTL_MS,
        };

        return value;
      })
      .finally(() => {
        if (siteModeStatePromise === pendingRequest) {
          siteModeStatePromise = null;
        }
      });

    siteModeStatePromise = pendingRequest;
  }

  return {
    value: await siteModeStatePromise,
    cacheStatus,
    durationMs: performance.now() - startedAt,
  };
}

function withMiddlewareTiming(response: NextResponse, middlewareStartedAt: number, siteModeLookup: SiteModeLookup) {
  const middlewareDurationMs = performance.now() - middlewareStartedAt;
  const existingTiming = response.headers.get("Server-Timing");
  const middlewareTiming = [
    `site_mode;dur=${siteModeLookup.durationMs.toFixed(1)};desc="${siteModeLookup.cacheStatus}"`,
    `middleware;dur=${middlewareDurationMs.toFixed(1)}`,
  ].join(", ");

  response.headers.set("Server-Timing", existingTiming ? `${existingTiming}, ${middlewareTiming}` : middlewareTiming);
  return response;
}

function redirectToPath(request: NextRequest, pathname: string) {
  const redirectUrl = request.nextUrl.clone();
  redirectUrl.pathname = pathname;
  redirectUrl.search = "";
  return redirectWithNoStore(redirectUrl);
}

function redirectToHome(request: NextRequest) {
  return redirectToPath(request, "/");
}

async function getVerifiedUserId(accessToken: string) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = resolveSupabaseSettingsKey();

  if (!supabaseUrl || !supabaseKey) {
    return null;
  }

  const response = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: {
      apikey: supabaseKey,
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    return null;
  }

  const payload = (await response.json().catch(() => null)) as { id?: string; sub?: string } | null;
  return payload?.id || payload?.sub || null;
}

async function fetchUserAccess(userId: string, accessToken: string): Promise<UserAccess> {
  const cachedAccess = userAccessCache.get(userId);
  if (cachedAccess && cachedAccess.expiresAt > Date.now()) {
    return cachedAccess.value;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const supabaseKey = serviceRoleKey || anonKey;

  if (!supabaseUrl || !supabaseKey) {
    return { role: null, status: null };
  }

  const response = await fetch(`${supabaseUrl}/rest/v1/users?id=eq.${userId}&select=role,status`, {
    headers: {
      apikey: supabaseKey,
      Authorization: `Bearer ${serviceRoleKey || accessToken}`,
      Accept: "application/json",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    return { role: null, status: null };
  }

  const payload = (await response.json().catch(() => null)) as Array<{ role?: string | null; status?: string | null }> | null;
  const access = {
    role: payload?.[0]?.role || null,
    status: payload?.[0]?.status || null,
  };

  userAccessCache.set(userId, {
    value: access,
    expiresAt: Date.now() + USER_ROLE_CACHE_TTL_MS,
  });

  return access;
}

async function getRequestAccess(request: NextRequest) {
  const accessToken = request.cookies.get(ACCESS_TOKEN_COOKIE)?.value;

  if (!accessToken) {
    return null;
  }

  const userId = await getVerifiedUserId(accessToken);
  if (!userId) {
    return null;
  }

  return fetchUserAccess(userId, accessToken);
}

async function getRequestRole(request: NextRequest) {
  return (await getRequestAccess(request))?.role ?? null;
}

async function isAdminRequest(request: NextRequest) {
  return (await getRequestRole(request)) === "admin";
}

function buildRedirect(request: NextRequest, pathname: string) {
  const redirectUrl = request.nextUrl.clone();
  redirectUrl.pathname = pathname;
  redirectUrl.searchParams.set(
    "from",
    `${request.nextUrl.pathname}${request.nextUrl.search ? request.nextUrl.search : ""}`
  );

  return redirectUrl;
}

function redirectWithNoStore(url: URL) {
  const response = NextResponse.redirect(url);
  response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate");
  response.headers.set("Pragma", "no-cache");
  response.headers.set("Expires", "0");
  return response;
}

function clearAuthCookies(response: NextResponse) {
  const cookieOptions = {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  };

  response.cookies.set(ACCESS_TOKEN_COOKIE, "", cookieOptions);
  response.cookies.set(REFRESH_TOKEN_COOKIE, "", cookieOptions);
}

function redirectBlockedBrokerToStatusPage(request: NextRequest, status: string | null | undefined) {
  const redirectUrl = request.nextUrl.clone();
  redirectUrl.pathname = "/pending";
  redirectUrl.search = "";
  redirectUrl.searchParams.set("status", getBrokerStatusPageStatus(status));

  const response = redirectWithNoStore(redirectUrl);
  clearAuthCookies(response);
  return response;
}

function redirectToCanonicalRoute(request: NextRequest) {
  const canonicalPath = LEGACY_ROUTE_REDIRECTS.get(request.nextUrl.pathname);

  if (!canonicalPath) {
    return null;
  }

  const redirectUrl = request.nextUrl.clone();
  redirectUrl.pathname = canonicalPath;
  return redirectWithNoStore(redirectUrl);
}

function redirectLegacyAdminTabRoute(request: NextRequest) {
  if (!request.nextUrl.searchParams.has("tab")) {
    return null;
  }

  const redirectPath = getLegacyAdminTabRedirectPath(
    request.nextUrl.pathname,
    request.nextUrl.searchParams.get("tab") || ""
  );

  if (!redirectPath) {
    return null;
  }

  const redirectUrl = request.nextUrl.clone();
  redirectUrl.pathname = redirectPath;
  redirectUrl.searchParams.delete("tab");
  return redirectWithNoStore(redirectUrl);
}

function redirectToAdminLogin(request: NextRequest) {
  const redirectUrl = buildRedirect(request, ADMIN_SIGN_IN_PATH);
  redirectUrl.searchParams.set("adminOnly", "1");
  return redirectWithNoStore(redirectUrl);
}

function redirectToComingSoon(request: NextRequest) {
  return redirectWithNoStore(buildRedirect(request, COMING_SOON_PAGE_PATH));
}

export async function middleware(request: NextRequest) {
  const middlewareStartedAt = performance.now();
  const pathname = request.nextUrl.pathname;

  if (isStaticAsset(pathname)) {
    return NextResponse.next();
  }

  const legacyAdminTabRedirect = redirectLegacyAdminTabRoute(request);
  if (legacyAdminTabRedirect) {
    return legacyAdminTabRedirect;
  }

  const canonicalRouteRedirect = redirectToCanonicalRoute(request);
  if (canonicalRouteRedirect) {
    return canonicalRouteRedirect;
  }

  if (canSkipSiteModeCheck(request)) {
    return NextResponse.next();
  }

  if (isBrokerProtectedPath(pathname)) {
    try {
      const access = await getRequestAccess(request);

      if (access?.role === "broker" && !isActiveBrokerStatus(access.status)) {
        return redirectBlockedBrokerToStatusPage(request, access.status);
      }
    } catch {
      // Let the existing page/API guards handle transient auth lookup failures.
    }
  }

  try {
    const siteModeLookup = await getSiteModeState(request);
    const { maintenanceEnabled, comingSoonEnabled } = siteModeLookup.value;
    const respond = (response: NextResponse) => withMiddlewareTiming(response, middlewareStartedAt, siteModeLookup);

    if (maintenanceEnabled) {
      if (pathname === ADMIN_SIGN_IN_PATH && !isAdminSignInRequest(request)) {
        return respond(redirectToAdminLogin(request));
      }

      if (canAccessDuringMaintenance(request)) {
        return respond(NextResponse.next());
      }

      if (await isAdminRequest(request)) {
        return respond(NextResponse.next());
      }

      if (pathname.startsWith("/api")) {
        return respond(
          NextResponse.json(
            {
              error: "Maintenance mode is enabled. Only admin access is currently available.",
            },
            { status: 503 }
          )
        );
      }

      return respond(redirectWithNoStore(buildRedirect(request, "/maintenance")));
    }

    if (pathname === "/maintenance") {
      return respond(comingSoonEnabled ? redirectToComingSoon(request) : redirectToHome(request));
    }

    if (!comingSoonEnabled) {
      if (pathname === COMING_SOON_PAGE_PATH) {
        return respond(redirectToHome(request));
      }

      return respond(NextResponse.next());
    }

    if (pathname === ADMIN_SIGN_IN_PATH && !isAdminSignInRequest(request)) {
      return respond(redirectToAdminLogin(request));
    }

    if (isAdminRoute(pathname) || isAdminApiRoute(pathname)) {
      const role = await getRequestRole(request);

      if (role === "admin") {
        return respond(NextResponse.next());
      }

      if (isAdminApiRoute(pathname)) {
        return respond(
          NextResponse.json({ error: "Admin access required while coming soon mode is enabled." }, { status: 403 })
        );
      }

      // Anonymous visitors can reach the admin sign-in page; authenticated
      // non-admin users are still blocked by the Coming Soon gate.
      return respond(role ? redirectToComingSoon(request) : redirectToAdminLogin(request));
    }

    if (canAccessDuringComingSoon(request)) {
      return respond(NextResponse.next());
    }

    if ((await isAdminRequest(request)) && canAdminAccessDuringComingSoon(pathname)) {
      return respond(NextResponse.next());
    }

    if (pathname.startsWith("/api")) {
      return respond(
        NextResponse.json(
          {
            error: "Coming soon mode is enabled. Public access is temporarily limited.",
          },
          { status: 503 }
        )
      );
    }

    return respond(redirectToComingSoon(request));
  } catch {
    return NextResponse.next();
  }
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\.[^/]+$).*)"],
};
