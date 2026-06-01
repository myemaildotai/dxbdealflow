"use client";

import { useContext, useEffect } from "react";
import { applyClientSession, resetClientSessionState } from "@/lib/client-session";
import { supabase, syncSupabaseRealtimeAuth } from "@/lib/supabase";
import { AuthContext } from "./authContext";
import { AuthUser } from "./types";
import { Agency, BrokerProfile, PlatformUser } from "@/lib/deal-types";
import { isBlockedBroker } from "@/lib/route-access";
import { clearServerSession, syncServerSessionTokens } from "./session-sync";

type SessionUser = {
  id: string;
  email?: string;
  email_confirmed_at?: string | null;
  is_anonymous?: boolean;
  user_metadata?: Record<string, unknown>;
};

type HydratedProfilePayload = {
  platformUser: PlatformUser | null;
  brokerProfile: BrokerProfile | null;
  agency: Agency | null;
};

const sleep = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms));
const PASSWORD_RESET_PATH = "/update-password";
const pickFirstString = (...values: unknown[]): string | null => {
  for (const value of values) {
    if (typeof value === "string" && value.length > 0) {
      return value;
    }
  }

  return null;
};

function isPasswordResetRoute() {
  return typeof window !== "undefined" && window.location.pathname === PASSWORD_RESET_PATH;
}

function buildBaseUser(user: SessionUser): AuthUser {
  const metadata = user.user_metadata || {};

  return {
    uid: user.id,
    email: user.email || null,
    displayName: pickFirstString(metadata.display_name, metadata.full_name),
    photoURL: pickFirstString(metadata.avatar_url),
    emailVerified: user.email_confirmed_at !== null,
    isAnonymous: user.is_anonymous || false,
    role: null,
    status: null,
    firstName: null,
    lastName: null,
    platformUser: null,
    brokerProfile: null,
    agency: null,
  };
}

async function fetchHydratedProfile(accessToken: string): Promise<HydratedProfilePayload | null> {
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const response = await fetch("/api/public/overview?scope=auth-me", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      credentials: "same-origin",
      cache: "no-store",
    });

    if (response.ok) {
      return (await response.json()) as HydratedProfilePayload;
    }

    if ((response.status === 401 || response.status === 403) && attempt < 3) {
      await sleep(150);
      continue;
    }

    return null;
  }

  return null;
}

async function hydrateUser(user: SessionUser, accessToken?: string | null): Promise<AuthUser> {
  const baseUser = buildBaseUser(user);

  if (!accessToken) {
    return baseUser;
  }

  const payload = await fetchHydratedProfile(accessToken);
  const platformUser = payload?.platformUser ?? null;

  if (!platformUser) {
    return baseUser;
  }

  return {
    ...baseUser,
    photoURL: payload?.brokerProfile?.profile_photo ?? baseUser.photoURL,
    displayName:
      baseUser.displayName ||
      [platformUser.first_name, platformUser.last_name].filter(Boolean).join(" ") ||
      baseUser.email,
    emailVerified:
      platformUser.role === "broker"
        ? Boolean(platformUser.email_verified_at)
        : baseUser.emailVerified,
    role: platformUser.role,
    status: platformUser.status,
    firstName: platformUser.first_name,
    lastName: platformUser.last_name,
    platformUser,
    brokerProfile: payload?.brokerProfile ?? null,
    agency: payload?.agency ?? null,
  };
}

export function useAuthInit(
  setUser: (user: AuthUser | null) => void,
  setLoading: (loading: boolean) => void,
  setError: (error: Error | null) => void
) {
  useEffect(() => {
    let isMounted = true;
    let currentUser: AuthUser | null = null;
    let syncGeneration = 0;

    const commitUser = (nextUser: AuthUser | null) => {
      currentUser = nextUser;
      if (isMounted) {
        setUser(nextUser);
      }
    };

    const commitLoading = (nextLoading: boolean) => {
      if (isMounted) {
        setLoading(nextLoading);
      }
    };

    const commitError = (nextError: Error | null) => {
      if (isMounted) {
        setError(nextError);
      }
    };

    const syncSessionUser = async (
      sessionUser: SessionUser | null,
      accessToken?: string | null,
      refreshToken?: string | null,
      options?: {
        clearUserBeforeSync?: boolean;
        showLoader?: boolean;
      }
    ) => {
      const requestGeneration = syncGeneration + 1;
      syncGeneration = requestGeneration;
      const nextSessionUserId = sessionUser?.id ?? null;
      const isCurrentSync = () => isMounted && syncGeneration === requestGeneration;

      if (options?.showLoader) {
        commitLoading(true);
      }

      if (options?.clearUserBeforeSync) {
        resetClientSessionState(nextSessionUserId);
        commitUser(null);
        commitError(null);
      } else {
        commitError(null);
      }

      try {
        if (sessionUser) {
          const hydratedUser = await hydrateUser(sessionUser, accessToken);

          if (!isCurrentSync()) {
            return;
          }

          if (isBlockedBroker(hydratedUser) && !isPasswordResetRoute()) {
            resetClientSessionState(null);
            commitUser(null);
            commitError(null);
            commitLoading(false);
            await clearServerSession().catch(() => undefined);
            await supabase.auth.signOut({ scope: "local" }).catch(() => undefined);
            resetClientSessionState(null, { clearAuthStorage: true });
            return;
          }

          if (isPasswordResetRoute()) {
            await syncServerSessionTokens(null, null);
          } else {
            await syncServerSessionTokens(accessToken ?? null, refreshToken ?? null);
          }

          if (!isCurrentSync()) {
            return;
          }

          applyClientSession(accessToken ?? null, nextSessionUserId);
          await syncSupabaseRealtimeAuth(accessToken ?? null);
          commitUser(hydratedUser);
        } else {
          await syncServerSessionTokens(null, null);

          if (!isCurrentSync()) {
            return;
          }

          await syncSupabaseRealtimeAuth(null);
          resetClientSessionState(null, { clearAuthStorage: true });
          commitUser(null);
        }
        commitError(null);
      } catch (error) {
        if (!isCurrentSync()) {
          return;
        }

        commitError(error as Error);
        applyClientSession(accessToken ?? null, nextSessionUserId);
        commitUser(sessionUser && currentUser?.uid === sessionUser.id ? currentUser : sessionUser ? buildBaseUser(sessionUser) : null);
      } finally {
        if (isCurrentSync()) {
          commitLoading(false);
        }
      }
    };

    const getInitialSession = async () => {
      try {
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();

        if (error) {
          commitError(error);
          commitUser(null);
          commitLoading(false);
          return;
        }

        await syncSessionUser(session?.user ?? null, session?.access_token ?? null, session?.refresh_token ?? null);
      } catch (error) {
        commitError(error as Error);
        commitUser(null);
        commitLoading(false);
      }
    };

    getInitialSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const sessionUser = session?.user ?? null;
      const isUserSwitch = !!sessionUser && !!currentUser && currentUser.uid !== sessionUser.id;
      const shouldShowLoader = !!sessionUser && (!currentUser || isUserSwitch);

      window.setTimeout(() => {
        void syncSessionUser(sessionUser, session?.access_token ?? null, session?.refresh_token ?? null, {
          clearUserBeforeSync: !sessionUser || isUserSwitch,
          showLoader: shouldShowLoader,
        });
      }, 0);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [setUser, setLoading, setError]);
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
