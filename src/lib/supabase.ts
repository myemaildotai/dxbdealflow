"use client";

import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { SUPABASE_CONFIG, API_CONFIG } from "@/config";

let supabaseClient: SupabaseClient | undefined;

if (SUPABASE_CONFIG.url && SUPABASE_CONFIG.anonKey) {
  supabaseClient = createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey);
}

export const supabase = supabaseClient!;

export async function syncSupabaseRealtimeAuth(accessToken?: string | null) {
  const realtimeToken =
    accessToken !== undefined
      ? accessToken
      : (await supabase.auth.getSession()).data.session?.access_token ?? null;

  await supabase.realtime.setAuth(realtimeToken);

  return realtimeToken;
}

export const api = {
  baseUrl: API_CONFIG.baseUrl,

  async request<TResponse>(endpoint: string, options: RequestInit = {}): Promise<TResponse> {
    const url = `${this.baseUrl}${endpoint}`;
    const { data: { session } } = await supabase.auth.getSession();

    const headers = new Headers(options.headers || {});
    if (!headers.has("Content-Type") && !(options.body instanceof FormData)) {
      headers.set("Content-Type", "application/json");
    }
    if (session?.access_token) {
      headers.set("Authorization", `Bearer ${session.access_token}`);
    }

    const response = await fetch(url, {
      ...options,
      cache: options.cache ?? "no-store",
      headers,
      credentials: "same-origin",
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.statusText}`);
    }

    if (response.status === 204) {
      return undefined as TResponse;
    }

    return (await response.json()) as TResponse;
  },

  get<TResponse>(endpoint: string) {
    return this.request<TResponse>(endpoint);
  },

  post<TResponse>(endpoint: string, data?: unknown) {
    return this.request<TResponse>(endpoint, {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  put<TResponse>(endpoint: string, data?: unknown) {
    return this.request<TResponse>(endpoint, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },

  delete<TResponse>(endpoint: string) {
    return this.request<TResponse>(endpoint, {
      method: "DELETE",
    });
  },
};
