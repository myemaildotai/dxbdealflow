"use client";

import Image from "next/image";
import Link from "next/link";
import type { FormEvent, ReactNode } from "react";
import { Suspense, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { authOperations } from "@/auth/authOperations";
import {
  PASSWORD_UPDATED_LOGIN_MESSAGE,
  getFriendlyPasswordUpdateError,
  validateNewPassword,
} from "@/auth/passwordReset";
import { PublicHeader } from "@/components/PublicHeader";
import { supabase } from "@/lib/supabase";

type RecoveryStatus = "checking" | "ready" | "invalid" | "updated";

const RECOVERY_MARKER_KEY = "dx-password-recovery";
const RECOVERY_MARKER_MAX_AGE_MS = 2 * 60 * 60 * 1000;

type RecoveryMarker = {
  userId: string | null;
  createdAt: number;
};

export default function UpdatePasswordPage() {
  return (
    <Suspense fallback={null}>
      <UpdatePasswordPageContent />
    </Suspense>
  );
}

function readRecoveryMarker() {
  try {
    const raw = window.sessionStorage.getItem(RECOVERY_MARKER_KEY);
    if (!raw) {
      return null;
    }

    const marker = JSON.parse(raw) as Partial<RecoveryMarker>;
    if (typeof marker.createdAt !== "number") {
      return null;
    }

    if (Date.now() - marker.createdAt > RECOVERY_MARKER_MAX_AGE_MS) {
      window.sessionStorage.removeItem(RECOVERY_MARKER_KEY);
      return null;
    }

    return {
      userId: typeof marker.userId === "string" ? marker.userId : null,
      createdAt: marker.createdAt,
    };
  } catch {
    return null;
  }
}

function writeRecoveryMarker(userId?: string | null) {
  window.sessionStorage.setItem(
    RECOVERY_MARKER_KEY,
    JSON.stringify({
      userId: userId ?? null,
      createdAt: Date.now(),
    } satisfies RecoveryMarker)
  );
}

function clearRecoveryMarker() {
  window.sessionStorage.removeItem(RECOVERY_MARKER_KEY);
}

function hasRecentRecoveryMarker(userId?: string | null) {
  const marker = readRecoveryMarker();
  if (!marker) {
    return false;
  }

  return !marker.userId || !userId || marker.userId === userId;
}

function hasRecentRecoverySentAt(recoverySentAt?: string | null) {
  if (!recoverySentAt) {
    return false;
  }

  const sentAt = Date.parse(recoverySentAt);
  return Number.isFinite(sentAt) && Date.now() - sentAt <= RECOVERY_MARKER_MAX_AGE_MS;
}

function getCurrentUrlParams() {
  const url = new URL(window.location.href);
  const hashParams = new URLSearchParams(url.hash.startsWith("#") ? url.hash.slice(1) : url.hash);
  const searchParams = url.searchParams;
  const read = (key: string) => hashParams.get(key) ?? searchParams.get(key);

  return {
    url,
    hashParams,
    searchParams,
    read,
  };
}

function cleanRecoveryUrl() {
  const url = new URL(window.location.href);
  ["code", "token_hash", "type", "error", "error_code", "error_description"].forEach((key) => {
    url.searchParams.delete(key);
  });

  const nextUrl = `${url.pathname}${url.search}`;
  window.history.replaceState(window.history.state, "", nextUrl);
}

function AuthCard({ children }: { children: ReactNode }) {
  return (
    <div className="panel w-full max-w-[500px] p-5 sm:p-7 lg:p-9">
      <div className="relative h-12 w-[190px] sm:h-14 sm:w-[220px]">
        <Image src="/assets/Logo-Blue.png" alt="DXB Deal Flow" fill className="object-contain object-left" sizes="220px" priority />
      </div>
      {children}
    </div>
  );
}

function UpdatePasswordPageContent() {
  const router = useRouter();
  const [status, setStatus] = useState<RecoveryStatus>("checking");
  const [statusMessage, setStatusMessage] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const markReady = (userId?: string | null) => {
      writeRecoveryMarker(userId);
      if (!cancelled) {
        setStatus("ready");
        setStatusMessage("");
      }
    };

    const markInvalid = (message = "This reset link is invalid or has expired. Please request a new one.") => {
      if (!cancelled) {
        setStatus("invalid");
        setStatusMessage(message);
      }
    };

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" && session?.user) {
        markReady(session.user.id);
      }
    });

    const resolveRecoverySession = async () => {
      const { read } = getCurrentUrlParams();
      const linkType = read("type");
      const code = read("code");
      const tokenHash = read("token_hash");
      const accessToken = read("access_token");
      const refreshToken = read("refresh_token");
      const urlError = read("error") || read("error_description") || read("error_code");

      if (urlError) {
        cleanRecoveryUrl();
        markInvalid();
        return;
      }

      try {
        if (tokenHash) {
          if (linkType && linkType !== "recovery") {
            throw new Error("Invalid recovery link.");
          }

          const { data, error } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type: "recovery",
          });

          if (error || !data.session) {
            throw error ?? new Error("Missing recovery session.");
          }

          cleanRecoveryUrl();
          markReady(data.user?.id ?? data.session.user.id);
          return;
        }

        if (accessToken && refreshToken) {
          if (linkType && linkType !== "recovery") {
            throw new Error("Invalid recovery link.");
          }

          const { data, error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });

          if (error || !data.session) {
            throw error ?? new Error("Missing recovery session.");
          }

          cleanRecoveryUrl();
          markReady(data.user?.id ?? data.session.user.id);
          return;
        }

        if (code) {
          const { data, error } = await supabase.auth.exchangeCodeForSession(code);

          if (error || !data.session) {
            throw error ?? new Error("Missing recovery session.");
          }

          cleanRecoveryUrl();
          markReady(data.user?.id ?? data.session.user.id);
          return;
        }

        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();

        if (error || !session?.user) {
          throw error ?? new Error("Missing recovery session.");
        }

        if (hasRecentRecoveryMarker(session.user.id) || hasRecentRecoverySentAt(session.user.recovery_sent_at)) {
          markReady(session.user.id);
          return;
        }

        markInvalid();
      } catch (error) {
        cleanRecoveryUrl();
        markInvalid(getFriendlyPasswordUpdateError(error));
      }
    };

    void resolveRecoverySession();

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();

    if (submitting || status !== "ready") {
      return;
    }

    const validationError = validateNewPassword(password, confirmPassword);
    if (validationError) {
      setFormError(validationError);
      return;
    }

    setSubmitting(true);
    setFormError("");

    try {
      await authOperations.updatePassword(password);
      setStatus("updated");
      setStatusMessage(PASSWORD_UPDATED_LOGIN_MESSAGE);
      setPassword("");
      setConfirmPassword("");
      clearRecoveryMarker();
      await authOperations.signOut().catch(() => undefined);

      window.setTimeout(() => {
        const params = new URLSearchParams({ message: PASSWORD_UPDATED_LOGIN_MESSAGE });
        router.replace(`/login?${params.toString()}`);
      }, 900);
    } catch (error) {
      setFormError(getFriendlyPasswordUpdateError(error));
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-brand-bg text-brand-ink">
      <div className="relative min-h-screen overflow-x-clip bg-[url('/assets/Login-Register-page-background.png')] bg-cover bg-center">
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(251,252,253,0.96)_0%,rgba(245,246,248,0.92)_42%,rgba(245,246,248,0.76)_100%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(212,175,55,0.16)_0%,transparent_34%),radial-gradient(circle_at_right_center,rgba(46,79,140,0.18)_0%,transparent_38%)]" />

        <div className="relative z-10 flex min-h-screen flex-col">
          <PublicHeader hidePublicNav forceGuestState />

          <main className="flex flex-1 items-center justify-center px-4 py-8 sm:px-6 md:px-8 lg:px-12">
            <AuthCard>
              {status === "checking" ? (
                <div className="mt-7">
                  <p className="page-kicker text-brand-gold">Password reset</p>
                  <h1 className="mt-3 font-heading text-2xl font-semibold text-brand-navy sm:text-3xl">Checking reset link</h1>
                  <p className="mt-4 text-sm leading-7 text-brand-slate">Please wait while we prepare your password reset.</p>
                </div>
              ) : null}

              {status === "invalid" ? (
                <div className="mt-7">
                  <p className="page-kicker text-brand-gold">Password reset</p>
                  <h1 className="mt-3 font-heading text-2xl font-semibold text-brand-navy sm:text-3xl">Reset link expired</h1>
                  <p className="mt-4 text-sm leading-7 text-brand-slate">{statusMessage}</p>
                  <div className="mt-6">
                    <Link href="/login" className="btn-accent w-full">
                      Back to Login
                    </Link>
                  </div>
                </div>
              ) : null}

              {status === "ready" || status === "updated" ? (
                <div className="mt-7">
                  <p className="page-kicker text-brand-gold">Password reset</p>
                  <h1 className="mt-3 font-heading text-2xl font-semibold text-brand-navy sm:text-3xl">Update password</h1>
                  <p className="mt-4 text-sm leading-7 text-brand-slate">Choose a new password for your account.</p>

                  <form onSubmit={handleSubmit} className="mt-6 grid gap-4">
                    <div>
                      <label htmlFor="new-password" className="label">
                        New password
                      </label>
                      <input
                        id="new-password"
                        className="input h-12"
                        type="password"
                        value={password}
                        onChange={(event) => {
                          setPassword(event.target.value);
                          setFormError("");
                        }}
                        disabled={submitting || status === "updated"}
                        autoComplete="new-password"
                      />
                    </div>

                    <div>
                      <label htmlFor="confirm-password" className="label">
                        Confirm password
                      </label>
                      <input
                        id="confirm-password"
                        className="input h-12"
                        type="password"
                        value={confirmPassword}
                        onChange={(event) => {
                          setConfirmPassword(event.target.value);
                          setFormError("");
                        }}
                        disabled={submitting || status === "updated"}
                        autoComplete="new-password"
                      />
                    </div>

                    <div aria-live="polite">
                      {formError ? (
                        <p className="rounded-md border border-[#f0c6c1] bg-[#fff4f1] px-3 py-2 text-sm leading-6 text-brand-danger">{formError}</p>
                      ) : null}
                      {status === "updated" ? (
                        <p className="rounded-md border border-[#bfe8ce] bg-[#f1fbf5] px-3 py-2 text-sm leading-6 text-[#227a45]">{statusMessage}</p>
                      ) : null}
                    </div>

                    <button type="submit" className="btn-accent min-h-[48px] w-full" disabled={submitting || status === "updated"}>
                      {submitting ? "Updating..." : "Update Password"}
                    </button>
                  </form>
                </div>
              ) : null}
            </AuthCard>
          </main>
        </div>
      </div>
    </div>
  );
}
