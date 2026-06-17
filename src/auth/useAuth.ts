"use client";

import { useContext, useEffect } from "react";
import { applyClientSession, resetClientSessionState } from "@/lib/client-session";
import { supabase, syncSupabaseRealtimeAuth } from "@/lib/supabase";
import { AuthContext } from "./authContext";
import { AuthUser } from "./types";
import { isBlockedBroker } from "@/lib/route-access";
import { clearHydratedAuthProfileCache, getHydratedAuthProfile } from "./auth-hydration";
import { clearServerSession, syncServerSessionTokens } from "./session-sync";

type SessionUser = {
  id: string;
  email?: string;
  email_confirmed_at?: string | null;
  is_anonymous?: boolean;
  user_metadata?: Record<string, unknown>;
};

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

async function hydrateUser(
  user: SessionUser,
  accessToken?: string | null,
  forceHydrationRefresh = false
): Promise<AuthUser> {
  const baseUser = buildBaseUser(user);

  if (!accessToken) {
    return baseUser;
  }

  if (forceHydrationRefresh) {
    clearHydratedAuthProfileCache(accessToken);
  }

  const payload = await getHydratedAuthProfile(accessToken, user.id);
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
        forceHydrationRefresh?: boolean;
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
          const hydratedUser = await hydrateUser(sessionUser, accessToken, options?.forceHydrationRefresh);

          if (!isCurrentSync()) {
            return;
          }

          if (isBlockedBroker(hydratedUser) && !isPasswordResetRoute()) {
            clearHydratedAuthProfileCache();
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
          clearHydratedAuthProfileCache();
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
    } = supabase.auth.onAuthStateChange((event, session) => {
      const sessionUser = session?.user ?? null;
      const isUserSwitch = !!sessionUser && !!currentUser && currentUser.uid !== sessionUser.id;
      const shouldShowLoader = !!sessionUser && (!currentUser || isUserSwitch);
      const forceHydrationRefresh =
        event === "USER_UPDATED" || event === "PASSWORD_RECOVERY" || event === "MFA_CHALLENGE_VERIFIED";

      window.setTimeout(() => {
        void syncSessionUser(sessionUser, session?.access_token ?? null, session?.refresh_token ?? null, {
          clearUserBeforeSync: !sessionUser || isUserSwitch,
          forceHydrationRefresh,
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
