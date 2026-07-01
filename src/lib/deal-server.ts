import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { SUPABASE_CONFIG } from "@/config";
import type { PlatformUser } from "@/lib/deal-types";
import { isActiveBrokerStatus } from "@/lib/deal-utils";

export const USER_SELECT =
  "id, email, first_name, last_name, phone, role, status, agency_id, created_at, updated_at";
export const BROKER_PROFILE_SELECT =
  "id, user_id, agency_id, profile_photo, rera_brn, covered_area_ids, speciality, experience_years, whatsapp_number, instagram_profile, linkedin_profile, share_latest_deals, terms_accepted, bio, application_status, application_submitted_at, approved_at, created_at, updated_at";
export const CREDIT_SELECT =
  "id, user_id, available_credits, used_credits, total_credits_assigned, created_at, updated_at";
export const AGENCY_SELECT = "id, name, rera_brn, status, created_at, updated_at";
export const AREA_SELECT = "id, name, city, slug";
export const COMING_SOON_REGISTRATION_SELECT =
  "id, first_name, last_name, email, whatsapp_number, instagram_handle, company_agency_name, role_id, role_name, created_at, updated_at";
export const LISTING_SELECT =
  "id, title, property_type, deal_type, bedrooms, size_sqft, area_id, developer, price, payment_plan, handover_date, yield_percent, property_video_url, notes, description, status, is_visible, created_at, updated_at, deleted_at, created_by, agency_id, renewal_due_at, approved_at, approval_notification_read_at, last_new_deal_alert_sent_at, credits_used";
export const LISTING_IMAGE_SELECT =
  "id, listing_id, file_name, storage_path, public_url, sort_order, is_cover, created_at";
export const CHAT_MESSAGE_SELECT = "id, listing_id, sender_id, content, created_at, updated_at";
export const REQUIREMENT_SELECT =
  "id, broker_id, posted_by, title, description, property_type, deal_type, bedrooms, budget_min, budget_max, area, area_id, urgency, timeline, is_active, deactivated_by, deleted_at, created_at, updated_at";
export const REQUIREMENT_MATCH_SELECT =
  "id, requirement_id, sender_broker_id, receiver_broker_id, message, listing_id, status, created_at";
export const REQUIREMENT_NOTIFICATION_SELECT =
  "id, recipient_broker_id, actor_broker_id, requirement_id, requirement_match_id, title, message, is_read, read_at, created_at";
export const LEAD_SELECT =
  "id, listing_id, requirement_id, from_user_id, to_user_id, lead_type, lead_status, message, contact_name, contact_email, contact_phone, preferred_channel, email_triggered_at, whatsapp_triggered_at, is_read, read_at, created_at";
export const SESSION_COOKIE_NAMES = {
  accessToken: "dx-access-token",
  refreshToken: "dx-refresh-token",
} as const;
export const NO_STORE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate",
  Pragma: "no-cache",
  Expires: "0",
} as const;
export const SESSION_COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: 60 * 60 * 24 * 7,
};

export function withNoStore(init: ResponseInit = {}) {
  const headers = new Headers(init.headers);

  Object.entries(NO_STORE_HEADERS).forEach(([key, value]) => {
    headers.set(key, value);
  });

  return {
    ...init,
    headers,
  };
}

const noStoreFetch: typeof fetch = (input, init) =>
  fetch(input, {
    ...init,
    cache: "no-store",
  });

function createSupabaseWithKey(key: string, accessToken?: string | null): SupabaseClient {
  return createClient(SUPABASE_CONFIG.url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    global: {
      fetch: noStoreFetch,
      ...(accessToken
        ? {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          }
        : {}),
    },
  });
}

export function getServiceSupabase() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!SUPABASE_CONFIG.url || !serviceRoleKey) {
    throw new Error("Supabase server configuration is missing.");
  }

  return createSupabaseWithKey(serviceRoleKey);
}

export function getRequestAccessToken(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const headerToken = authHeader?.replace("Bearer ", "").trim();

  if (headerToken) {
    return headerToken;
  }

  return request.cookies.get(SESSION_COOKIE_NAMES.accessToken)?.value || null;
}

export function getRequestRefreshToken(request: NextRequest) {
  return request.cookies.get(SESSION_COOKIE_NAMES.refreshToken)?.value || null;
}

export function getRequestSupabase(request: NextRequest, accessToken?: string | null) {
  if (!SUPABASE_CONFIG.url || !SUPABASE_CONFIG.anonKey) {
    throw new Error("Supabase client configuration is missing.");
  }

  return createSupabaseWithKey(SUPABASE_CONFIG.anonKey, accessToken ?? getRequestAccessToken(request));
}

export function clearSessionCookies(response: NextResponse) {
  response.cookies.set(SESSION_COOKIE_NAMES.accessToken, "", { ...SESSION_COOKIE_OPTIONS, maxAge: 0 });
  response.cookies.set(SESSION_COOKIE_NAMES.refreshToken, "", { ...SESSION_COOKIE_OPTIONS, maxAge: 0 });
}

type ResolvedRequestAuth = {
  accessToken: string;
  authUserId: string;
};

async function verifyJWTLocal(accessToken: string): Promise<string | null> {
  const secret = process.env.SUPABASE_JWT_SECRET;
  if (!secret) {
    return null;
  }

  try {
    const parts = accessToken.split(".");
    if (parts.length !== 3) {
      return null;
    }

    const [headerB64, payloadB64, signatureB64] = parts;

    const base64ToUint8Array = (str: string) => {
      let base64 = str.replace(/-/g, "+").replace(/_/g, "/");
      while (base64.length % 4) {
        base64 += "=";
      }
      const binary = atob(base64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      return bytes;
    };

    const signatureBytes = base64ToUint8Array(signatureB64);
    const encoder = new TextEncoder();
    const secretBytes = encoder.encode(secret);
    const key = await crypto.subtle.importKey(
      "raw",
      secretBytes,
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"]
    );

    const dataToVerify = encoder.encode(`${headerB64}.${payloadB64}`);
    const isValid = await crypto.subtle.verify(
      "HMAC",
      key,
      signatureBytes,
      dataToVerify
    );

    if (!isValid) {
      return null;
    }

    let base64 = payloadB64.replace(/-/g, "+").replace(/_/g, "/");
    while (base64.length % 4) {
      base64 += "=";
    }
    const payloadJSON = JSON.parse(atob(base64)) as { exp?: number; sub?: string; id?: string };

    const exp = payloadJSON.exp;
    if (typeof exp === "number" && Date.now() >= exp * 1000) {
      return null;
    }

    return payloadJSON.sub || payloadJSON.id || null;
  } catch {
    return null;
  }
}

async function resolveRequestAuth(request: NextRequest): Promise<ResolvedRequestAuth | null> {
  const accessToken = getRequestAccessToken(request);

  if (accessToken) {
    const localUserId = await verifyJWTLocal(accessToken);
    if (localUserId) {
      return {
        accessToken,
        authUserId: localUserId,
      };
    }

    // Fallback:
    const serviceSupabase = getServiceSupabase();
    const { data, error } = await serviceSupabase.auth.getUser(accessToken);
    if (!error && data.user) {
      return {
        accessToken,
        authUserId: data.user.id,
      };
    }
  }

  const refreshToken = getRequestRefreshToken(request);
  if (!refreshToken) {
    return null;
  }

  const requestSupabase = getRequestSupabase(request, null);
  const {
    data: { session },
    error,
  } = await requestSupabase.auth.refreshSession({
    refresh_token: refreshToken,
  });

  if (error || !session?.access_token) {
    return null;
  }

  return {
    accessToken: session.access_token,
    authUserId: session.user.id,
  };
}

type RequestUserContext = {
  user: PlatformUser | null;
  brokerProfileId: string | null;
};

type ProfileCacheEntry = {
  value: RequestUserContext;
  expiresAt: number;
};
const userProfileCache = new Map<string, ProfileCacheEntry>();

async function getRequestUserContext(
  request: NextRequest,
  { includeBrokerProfileId = false }: { includeBrokerProfileId?: boolean } = {}
): Promise<RequestUserContext> {
  const auth = await resolveRequestAuth(request);

  if (!auth) {
    return { user: null, brokerProfileId: null };
  }

  const cacheKey = `${auth.authUserId}:${includeBrokerProfileId}`;
  const cached = userProfileCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.value;
  }

  const serviceSupabase = getServiceSupabase();
  const select = includeBrokerProfileId ? `${USER_SELECT}, broker_profiles(id)` : USER_SELECT;
  const { data: profile } = await serviceSupabase.from("users").select(select).eq("id", auth.authUserId).maybeSingle();

  let context: RequestUserContext;
  if (!profile) {
    context = { user: null, brokerProfileId: null };
  } else if (!includeBrokerProfileId) {
    context = { user: profile as unknown as PlatformUser, brokerProfileId: null };
  } else {
    const { broker_profiles: brokerProfile, ...user } = profile as unknown as PlatformUser & {
      broker_profiles?: { id?: string | null } | null;
    };
    context = {
      user: user as PlatformUser,
      brokerProfileId: brokerProfile?.id ?? null,
    };
  }

  userProfileCache.set(cacheKey, {
    value: context,
    expiresAt: Date.now() + 10000, // 10 seconds TTL
  });

  return context;
}

export async function getRequestUser(request: NextRequest) {
  const context = await getRequestUserContext(request);
  return context.user;
}

export async function getRequestUserWithBrokerProfileId(request: NextRequest) {
  return getRequestUserContext(request, { includeBrokerProfileId: true });
}

export async function requireApprovedBroker(
  request: NextRequest,
  options: { includeBrokerProfileId?: boolean } = {}
) {
  const { user, brokerProfileId } = await getRequestUserContext(request, options);
  if (!user || user.role !== "broker" || !isActiveBrokerStatus(user.status)) {
    return { error: NextResponse.json({ error: "Broker access required." }, { status: 403 }) };
  }
  return { user, brokerProfileId };
}

export async function requireAdmin(request: NextRequest) {
  const user = await getRequestUser(request);
  if (!user || user.role !== "admin") {
    return { error: NextResponse.json({ error: "Admin access required." }, { status: 403 }) };
  }
  return { user };
}

export function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, withNoStore({ status }));
}
