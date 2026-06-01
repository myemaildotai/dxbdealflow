import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { SUPABASE_CONFIG } from "@/config";
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
  "id, title, property_type, deal_type, bedrooms, size_sqft, area_id, developer, price, payment_plan, handover_date, yield_percent, property_video_url, notes, description, status, is_visible, created_at, updated_at, deleted_at, created_by, agency_id, renewal_due_at, approved_at, approval_notification_read_at, credits_used";
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

async function resolveRequestAuth(request: NextRequest): Promise<ResolvedRequestAuth | null> {
  const serviceSupabase = getServiceSupabase();
  const accessToken = getRequestAccessToken(request);

  if (accessToken) {
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

export async function getRequestUser(request: NextRequest) {
  const auth = await resolveRequestAuth(request);

  if (!auth) {
    return null;
  }

  const serviceSupabase = getServiceSupabase();
  const { data: profile } = await serviceSupabase.from("users").select(USER_SELECT).eq("id", auth.authUserId).maybeSingle();
  return profile ?? null;
}

export async function requireApprovedBroker(request: NextRequest) {
  const user = await getRequestUser(request);
  if (!user || user.role !== "broker" || !isActiveBrokerStatus(user.status)) {
    return { error: NextResponse.json({ error: "Broker access required." }, { status: 403 }) };
  }
  return { user };
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
