"use client";

import { resetClientSessionState } from "@/lib/client-session";
import { supabase, syncSupabaseRealtimeAuth } from "@/lib/supabase";
import { getBrokerStatusRedirectPath, getDefaultRouteForUser, isBlockedBrokerStatus } from "@/lib/route-access";
import type { UserStatus } from "@/lib/deal-types";
import { PASSWORD_RESET_FAILED_MESSAGE, type PasswordResetRequestResult } from "@/auth/passwordReset";
import type { User } from "@supabase/supabase-js";
import { clearHydratedAuthProfileCache, getHydratedAuthProfile } from "./auth-hydration";
import { clearServerSession, syncServerSession } from "./session-sync";

type PostSignInResolution = {
  destination: string;
  requiresBrokerEmailVerification: boolean;
};

export class BrokerAccessBlockedError extends Error {
  status: UserStatus | null;
  redirectPath: string;

  constructor(status: UserStatus | null) {
    const redirectPath = getBrokerStatusRedirectPath(status);
    super(getBrokerAccessBlockedMessage(status));
    this.name = "BrokerAccessBlockedError";
    this.status = status;
    this.redirectPath = redirectPath;
  }
}

function getBrokerAccessBlockedMessage(status: UserStatus | null) {
  switch (status) {
    case "pending":
      return "Your broker account is still pending approval.";
    case "rejected":
      return "Your broker application was not approved.";
    case "deactivated":
      return "Your broker account has been deactivated.";
    case "suspended":
      return "Your broker account is not active.";
    default:
      return "Your broker account is not active.";
  }
}

async function clearBlockedBrokerAuthAttempt() {
  clearHydratedAuthProfileCache();
  resetClientSessionState(null);
  await supabase.auth.signOut({ scope: "local" }).catch(() => undefined);
  resetClientSessionState(null, { clearAuthStorage: true });
  await clearServerSession().catch(() => undefined);
}

async function fetchResolvedRoute(accessToken: string, userId: string) {
  const resolution = await fetchPostSignInResolution(accessToken, userId);
  return resolution.destination;
}

async function fetchPostSignInResolution(accessToken: string, userId: string): Promise<PostSignInResolution> {
  const payload = await getHydratedAuthProfile(accessToken, userId);

  if (!payload) {
    return {
      destination: "/login",
      requiresBrokerEmailVerification: false,
    };
  }

  const platformUser = payload.platformUser ?? null;
  const destination = getDefaultRouteForUser({
    uid: userId,
    email: null,
    displayName: null,
    photoURL: null,
    emailVerified: platformUser?.role === "broker" ? Boolean(platformUser.email_verified_at) : true,
    isAnonymous: false,
    role: platformUser?.role ?? null,
    status: platformUser?.status ?? null,
    firstName: null,
    lastName: null,
    platformUser: null,
    brokerProfile: null,
    agency: null,
  });

  return {
    destination,
    requiresBrokerEmailVerification:
      destination === "/dashboard" && platformUser?.role === "broker" && !platformUser.email_verified_at,
  };
}

async function assertBrokerCanCreateSession(accessToken: string, userId: string) {
  const payload = await getHydratedAuthProfile(accessToken, userId);
  const platformUser = payload?.platformUser ?? null;

  if (platformUser?.role === "broker" && isBlockedBrokerStatus(platformUser.status)) {
    await clearBlockedBrokerAuthAttempt();
    throw new BrokerAccessBlockedError(platformUser.status ?? null);
  }
}

export const authOperations = {
  async signIn(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    if (!data.user || !data.session?.access_token) {
      throw new Error("Logged in but no user session was returned.");
    }
    resetClientSessionState(data.user.id);
    await assertBrokerCanCreateSession(data.session.access_token, data.user.id);
    await syncServerSession(data.session);
    return data;
  },

  async signUp(email: string, password: string, displayName?: string) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          display_name: displayName,
        },
      },
    });
    if (error) throw error;
    if (data.user && displayName && data.session?.access_token) {
      await this.updateProfile(data.user, { displayName });
    }
    if (data.session) {
      await syncServerSession(data.session);
    }
    return data;
  },

  async signOut() {
    clearHydratedAuthProfileCache();
    resetClientSessionState(null);
    const { error } = await supabase.auth.signOut({ scope: "local" });
    if (error) throw error;
    await syncSupabaseRealtimeAuth(null).catch(() => undefined);
    await clearServerSession();
    resetClientSessionState(null, { clearAuthStorage: true });
  },

  async sendPasswordResetEmail(email: string): Promise<PasswordResetRequestResult> {
    const response = await fetch("/api/auth/password-reset", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "same-origin",
      cache: "no-store",
      body: JSON.stringify({ email }),
    });

    const payload = (await response.json().catch(() => null)) as Partial<PasswordResetRequestResult> | null;

    if (
      payload?.status === "sent" ||
      payload?.status === "not_found" ||
      payload?.status === "send_failed"
    ) {
      return {
        status: payload.status,
        message: typeof payload.message === "string" && payload.message ? payload.message : PASSWORD_RESET_FAILED_MESSAGE,
      };
    }

    return {
      status: "send_failed",
      message: PASSWORD_RESET_FAILED_MESSAGE,
    };
  },

  async updatePassword(password: string) {
    const { error } = await supabase.auth.updateUser({
      password,
    });
    if (error) throw error;
  },

  async updateProfile(user: User, profile: { displayName?: string; photoURL?: string }) {
    const updates: Record<string, string> = {};
    if (profile.displayName) updates.display_name = profile.displayName;
    if (profile.photoURL) updates.avatar_url = profile.photoURL;

    const { error } = await supabase.auth.updateUser({
      data: updates,
    });
    if (error) throw error;
  },

  async resendEmailConfirmation(email: string) {
    const { error } = await supabase.auth.resend({
      type: "signup",
      email,
    });
    if (error) throw error;
  },

  async getSession() {
    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;
    return data.session;
  },

  async getUser() {
    const { data, error } = await supabase.auth.getUser();
    if (error) throw error;
    return data.user;
  },

  async resolvePostSignInRoute(accessToken: string, userId: string) {
    return fetchResolvedRoute(accessToken, userId);
  },

  async resolvePostSignIn(accessToken: string, userId: string) {
    return fetchPostSignInResolution(accessToken, userId);
  },
};
