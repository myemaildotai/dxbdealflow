"use client";

import Image from "next/image";
import Link from "next/link";
import { FormEvent, Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSnackbar } from "notistack";
import { BrokerAccessBlockedError, authOperations } from "@/auth/authOperations";
import {
  PASSWORD_RESET_FAILED_MESSAGE,
  PASSWORD_UPDATED_LOGIN_MESSAGE,
  isValidEmail,
} from "@/auth/passwordReset";
import { useAuth } from "@/auth/useAuth";
import { BrokerEmailVerificationModal } from "@/components/BrokerEmailVerificationModal";
import { PublicHeader } from "@/components/PublicHeader";
import { apiFetch } from "@/lib/deal-api";
import { canAccessBrokerWorkspace, getBrokerStatusRedirectPath, getDefaultRouteForUser, isBlockedBroker } from "@/lib/route-access";

type Feature = {
  label: string;
};

const brokerFeatures: Feature[] = [
  { label: "Access deals before public release" },
  { label: "Connect directly with active buyers and brokers" },
  { label: "Close faster with real opportunities" },
];

const adminFeatures: Feature[] = [
  { label: "Restricted mode access for verified admins" },
  { label: "Admin panel entry during launch or maintenance windows" },
  { label: "Switch securely from an active broker session" },
];

export default function SignInPage() {
  return (
    <Suspense fallback={null}>
      <SignInPageContent />
    </Suspense>
  );
}

function BrandMark() {
  return (
    <div className="relative h-14 w-[220px] sm:h-16 sm:w-[250px]">
      <Image src="/assets/Logo-Blue.png" alt="DXB Deal Flow" fill className="object-contain object-left" sizes="250px" priority />
    </div>
  );
}

function EmailIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" className={className} aria-hidden="true">
      <rect x="2.1" y="4.2" width="15.8" height="11.6" rx="3" stroke="currentColor" strokeWidth="1.6" />
      <path d="M4.8 6.5L10 10.5L15.2 6.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function LockIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" className={className} aria-hidden="true">
      <path d="M5.8 8.2V6.9A4.2 4.2 0 0 1 10 2.7a4.2 4.2 0 0 1 4.2 4.2v1.3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <rect x="3.7" y="8.2" width="12.6" height="9.1" rx="2.4" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="10" cy="12.6" r="1.1" fill="currentColor" />
    </svg>
  );
}

function CheckCircleIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" className={className} aria-hidden="true">
      <circle cx="10" cy="10" r="9" fill="#D4AF37" />
      <path d="M6.2 10.1L8.75 12.65L13.9 7.5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function WhatsAppIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <Image src="/assets/WhatsApp-Logo.svg" alt="WhatsApp" width={24} height={24} className={className} />
  );
}

function ForgotPasswordModal({
  open,
  initialEmail,
  onClose,
}: {
  open: boolean;
  initialEmail: string;
  onClose: () => void;
}) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    if (!open) {
      return;
    }

    setEmail(initialEmail.trim());
    setError("");
    setSuccess("");
    setLoading(false);
  }, [initialEmail, open]);

  if (!open) {
    return null;
  }

  const handleClose = () => {
    if (!loading) {
      onClose();
    }
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();

    if (loading) {
      return;
    }

    const nextEmail = email.trim();

    if (!isValidEmail(nextEmail)) {
      setSuccess("");
      setError("Please enter a valid email address.");
      return;
    }

    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const result = await authOperations.sendPasswordResetEmail(nextEmail);

      if (result.status === "sent") {
        setSuccess(result.message);
        return;
      }

      setError(result.message);
    } catch {
      setError(PASSWORD_RESET_FAILED_MESSAGE);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="modal-backdrop z-[120]"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          handleClose();
        }
      }}
    >
      <div className="modal-surface w-full max-w-[28rem] p-5 sm:p-6" role="dialog" aria-modal="true" aria-labelledby="forgot-password-title">
        <div>
          <p className="page-kicker text-brand-gold">Password reset</p>
          <h2 id="forgot-password-title" className="mt-2 font-heading text-2xl font-semibold text-brand-navy">
            Reset your password
          </h2>
          <p className="mt-3 text-sm leading-6 text-brand-slate">
            Enter your email and we will send reset instructions if the account can receive them.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 grid gap-4">
          <div>
            <label htmlFor="forgot-password-email" className="label">
              Email
            </label>
            <input
              id="forgot-password-email"
              className="input h-12"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(event) => {
                setEmail(event.target.value);
                setError("");
              }}
              disabled={loading}
              autoComplete="email"
            />
          </div>

          <div aria-live="polite">
            {error ? (
              <p className="rounded-md border border-[#f0c6c1] bg-[#fff4f1] px-3 py-2 text-sm leading-6 text-brand-danger">{error}</p>
            ) : null}
            {success ? (
              <p className="rounded-md border border-[#bfe8ce] bg-[#f1fbf5] px-3 py-2 text-sm leading-6 text-[#227a45]">{success}</p>
            ) : null}
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            <button type="button" className="btn-secondary min-h-[44px] w-full" onClick={handleClose} disabled={loading}>
              Cancel
            </button>
            <button type="submit" className="btn-accent min-h-[44px] w-full" disabled={loading}>
              {loading ? "Sending..." : "Send Reset Link"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function SignInPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const resolvedSearchParams = searchParams ?? new URLSearchParams();
  const { enqueueSnackbar } = useSnackbar();
  const { user, loading: authLoading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [resettingSession, setResettingSession] = useState(false);
  const [awaitingBrokerEmailVerification, setAwaitingBrokerEmailVerification] = useState(false);
  const [forgotModalOpen, setForgotModalOpen] = useState(false);
  const handledLoginMessageRef = useRef<string | null>(null);
  const adminOnly = resolvedSearchParams.get("adminOnly") === "1";
  const loginMessage = searchParams?.get("message") ?? "";
  const loginQueryString = searchParams?.toString() ?? "";

  const ensureAdminAccess = async (nextEmail: string) => {
    if (!adminOnly) {
      return true;
    }

    const payload = await apiFetch<{ allowed: boolean }>("/api/public/admin-login-check", {
      method: "POST",
      body: JSON.stringify({ email: nextEmail.trim() }),
    });

    return payload.allowed;
  };

  useEffect(() => {
    if (loginMessage !== PASSWORD_UPDATED_LOGIN_MESSAGE) {
      return;
    }

    const loginMessageKey = loginQueryString || loginMessage;
    if (handledLoginMessageRef.current === loginMessageKey) {
      return;
    }

    handledLoginMessageRef.current = loginMessageKey;
    enqueueSnackbar(PASSWORD_UPDATED_LOGIN_MESSAGE, { variant: "success", preventDuplicate: true });

    const nextParams = new URLSearchParams(loginQueryString);
    nextParams.delete("message");
    const nextQuery = nextParams.toString();

    router.replace(nextQuery ? `/login?${nextQuery}` : "/login", { scroll: false });
  }, [enqueueSnackbar, loginMessage, loginQueryString, router]);

  useEffect(() => {
    if (authLoading || loading || !user?.platformUser) {
      return;
    }

    if (!adminOnly) {
      if (isBlockedBroker(user)) {
        const redirectPath = getBrokerStatusRedirectPath(user.status);
        void authOperations.signOut().catch(() => undefined);
        router.replace(redirectPath);
        return;
      }

      if (user.role === "broker" && canAccessBrokerWorkspace(user) && !user.platformUser.email_verified_at) {
        if (awaitingBrokerEmailVerification) {
          return;
        }

        router.replace(getDefaultRouteForUser(user));
        return;
      }

      setAwaitingBrokerEmailVerification(false);
      router.replace(getDefaultRouteForUser(user));
      return;
    }

    if (user.role === "admin") {
      router.replace("/admin");
      return;
    }

    setResettingSession(true);

    authOperations
      .signOut()
      .catch(() => undefined)
      .finally(() => setResettingSession(false));
  }, [adminOnly, authLoading, awaitingBrokerEmailVerification, loading, router, user]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);

    try {
      const allowed = await ensureAdminAccess(email);

      if (!allowed) {
        enqueueSnackbar("Restricted mode is enabled. Admin access only.", { variant: "warning" });
        setLoading(false);
        return;
      }

      const signInResult = await authOperations.signIn(email, password);
      const postSignIn = await authOperations.resolvePostSignIn(signInResult.session.access_token, signInResult.user.id);
      const destination = postSignIn.destination;

      if (adminOnly && destination !== "/admin") {
        await authOperations.signOut();
        enqueueSnackbar("Restricted mode is enabled. Admin access only.", { variant: "warning" });
        router.replace("/coming-soon?from=/login");
        return;
      }

      if (destination.startsWith("/pending")) {
        enqueueSnackbar("Your broker account is not active yet.", { variant: "warning" });
        router.replace(destination);
        return;
      }

      if (postSignIn.requiresBrokerEmailVerification) {
        setAwaitingBrokerEmailVerification(true);
        enqueueSnackbar("Logged in successfully. Please verify your broker email.", { variant: "success" });
        setLoading(false);
        return;
      }

      enqueueSnackbar("Logged in successfully.", { variant: "success" });
      router.replace(destination);
    } catch (error) {
      if (error instanceof BrokerAccessBlockedError) {
        enqueueSnackbar(error.message, { variant: "warning" });
        router.replace(error.redirectPath);
        setLoading(false);
        return;
      }

      enqueueSnackbar(error instanceof Error ? error.message : "Failed to sign in.", { variant: "error" });
      setLoading(false);
    }
  };

  const features = adminOnly ? adminFeatures : brokerFeatures;
  const leftTitle = adminOnly ? "Admin control access" : "Dubai's private off-market deal network";
  const leftSubtitle = adminOnly
    ? "Launch, maintenance, oversight, and platform control."
    : "If it is already public, the timing edge is gone.";
  const leftParagraphs = adminOnly
    ? [
        "Only admin accounts can access the platform while restricted mode is enabled.",
        "Use this screen to safely clear an active broker session and continue into the admin panel.",
      ]
    : [
        "Access verified off-market and distressed opportunities before they hit the wider market.",
        "Built for serious brokers who want stronger signal quality, tighter deal flow, and faster execution.",
      ];
  const leftNote = adminOnly ? "Admin access is restricted to verified operators only." : "Limited broker access per area";
  const rightHeading = adminOnly ? "Admin Access" : "Member Access";
  const rightSubtitleLines = adminOnly
    ? ["For admin access during restricted mode only.", "Use your verified admin credentials."]
    : ["For approved brokers only.", "Access is granted upon verification."];
  const helpTitle = adminOnly ? "Need help with admin access?" : "Fast-track your application via WhatsApp";
  const helpBody = adminOnly ? "WhatsApp: X" : "WhatsApp: X";
  const secondaryTitle = adminOnly ? "Admin access only" : "Apply for access";
  const secondaryCopy = adminOnly
    ? "If you are currently signed in as a broker, this screen will clear that session so you can enter admin credentials."
    : "Applications are reviewed and not every broker is approved.";
  const submitLabel = resettingSession
    ? "Preparing admin login..."
    : loading
      ? adminOnly
        ? "Accessing admin..."
        : "Entering network..."
      : adminOnly
        ? "Admin Access"
        : "Enter Network";

  return (
    <div className="min-h-screen bg-brand-bg text-brand-ink">
      <ForgotPasswordModal open={forgotModalOpen} initialEmail={email} onClose={() => setForgotModalOpen(false)} />
      <BrokerEmailVerificationModal
        forceOpen={awaitingBrokerEmailVerification}
        redirectAfterVerified="/dashboard"
        showDashboardBanner={false}
      />
      <div className="relative min-h-screen overflow-x-clip bg-[url('/assets/Login-Register-page-background.png')] bg-cover bg-center">
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(251,252,253,0.96)_0%,rgba(245,246,248,0.92)_42%,rgba(245,246,248,0.72)_100%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(212,175,55,0.16)_0%,transparent_34%),radial-gradient(circle_at_right_center,rgba(46,79,140,0.18)_0%,transparent_38%)]" />

        <div className="relative z-10 flex min-h-screen flex-col">
          <PublicHeader hidePublicNav={adminOnly} />

          <div className="flex flex-1 items-center px-4 py-6 sm:px-6 sm:py-8 md:px-8 lg:px-12">
            <div className="shell-boundary grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(420px,500px)] lg:items-center lg:gap-12 xl:gap-20">
              <section className="flex justify-center lg:justify-start">
                <div className="max-w-[640px]">
                  <BrandMark />

                  <div className="mt-6">
                    <p className="page-kicker text-brand-gold">DXB Deal Flow</p>
                    <h1 className="mt-4 font-heading text-4xl font-bold leading-[1.03] tracking-[-0.05em] text-brand-navy sm:text-5xl xl:text-[3.7rem]">
                      {leftTitle}
                    </h1>
                    <p className="mt-4 font-heading text-xl font-medium tracking-[-0.03em] text-brand-ink sm:text-2xl lg:text-[1.85rem]">{leftSubtitle}</p>
                    <div className="mt-5 space-y-4 text-sm leading-7 text-[#3b4352] sm:mt-7 sm:space-y-5 sm:text-base lg:text-lg">
                      {leftParagraphs.map((paragraph) => (
                        <p key={paragraph}>{paragraph}</p>
                      ))}
                    </div>
                  </div>

                  <div className="mt-6 space-y-4">
                    {features.map((feature) => (
                      <div key={feature.label} className="flex items-start gap-4 rounded-[20px] border border-white/70 bg-white/75 p-4 shadow-[0_14px_34px_rgba(15,42,95,0.08)] backdrop-blur-sm">
                        <span className="mt-0.5 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[linear-gradient(135deg,#F7D86A_0%,#D4AF37_100%)] shadow-[0_10px_18px_rgba(212,175,55,0.22)]">
                          <CheckCircleIcon className="h-5 w-5" />
                        </span>
                        <p className="text-base font-medium leading-7 text-brand-ink">{feature.label}</p>
                      </div>
                    ))}
                  </div>

                  <div className="mt-8 max-w-[320px] border-t border-brand-line/80 pt-6">
                    <p className="text-sm uppercase tracking-[0.12em] text-brand-slate">{leftNote}</p>
                  </div>
                </div>
              </section>

              <section className="flex justify-center lg:justify-end">
                <div className="panel w-full max-w-[500px] p-5 sm:p-7 lg:p-9">
                  <div>
                    <p className="page-kicker text-brand-gold">{rightHeading}</p>
                    <h2 className="mt-3 font-heading text-xl font-semibold text-brand-navy sm:text-2xl md:text-3xl">{rightHeading}</h2>
                    <div className="mt-4 space-y-1.5 text-sm leading-7 text-brand-slate sm:text-base">
                      {rightSubtitleLines.map((line) => (
                        <p key={line}>{line}</p>
                      ))}
                    </div>
                  </div>

                  <form onSubmit={handleSubmit} className="mt-5 grid gap-3 sm:mt-6 sm:gap-4">
                    <div className="relative">
                      <label htmlFor="signin-email" className="sr-only">
                        Email
                      </label>
                      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-brand-slate sm:left-4 md:left-5">
                        <EmailIcon />
                      </span>
                      <input
                        id="signin-email"
                        className="input h-11 rounded-md px-3 py-2 pl-10 text-sm sm:h-12 sm:pl-12 sm:text-base md:h-14 md:pl-14 md:text-sm"
                        type="email"
                        placeholder="Email"
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                        required
                      />
                    </div>

                    <div className="relative">
                      <label htmlFor="signin-password" className="sr-only">
                        Password
                      </label>
                      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-brand-slate sm:left-4 md:left-5">
                        <LockIcon />
                      </span>
                      <input
                        id="signin-password"
                        className="input h-11 rounded-md px-3 py-2 pl-10 text-sm sm:h-12 sm:pl-12 sm:text-base md:h-14 md:pl-14 md:text-sm"
                        type="password"
                        placeholder="Password"
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                        required
                      />
                    </div>

                    <button type="submit" className="btn-accent mt-1 min-h-[44px] w-full sm:mt-2 md:min-h-[52px]" disabled={loading || resettingSession}>
                      {submitLabel}
                    </button>
                  </form>

                    {!adminOnly ? (
                      
                      <div className="mt-4 text-center text-sm font-medium text-brand-slate">
                         {/* <p>Forgot password?</p> */}
                        <button
                          type="button"
                          className="text-sm font-semibold text-brand-navy transition hover:text-brand-gold disabled:cursor-not-allowed disabled:opacity-60"
                          onClick={() => setForgotModalOpen(true)}
                          disabled={loading || resettingSession}
                        >
                          Forgot Password?
                        </button>
                      </div>
                    ) : null}
                 

                  <div className="mt-6 border-t border-brand-line/80 pt-6">
                    <p className="font-heading text-xl font-semibold text-brand-navy">{secondaryTitle}</p>
                    <p className="mt-3 text-sm leading-7 text-brand-slate">{secondaryCopy}</p>
                    {!adminOnly ? (
                      <div className="mt-5">
                        <Link href="/register" className="btn-accent w-full">
                          Apply for Access
                        </Link>
                      </div>
                    ) : null}
                  </div>

                  <div className="mt-6 border-t border-brand-line/80 pt-6">
                    <div className="subtle-panel flex items-start gap-4 p-4">
                      <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white shadow-[0_10px_18px_rgba(37,211,102,0.18)]">
                        <WhatsAppIcon className="h-7 w-7" />
                      </span>
                      <div className="text-sm leading-7 text-brand-slate">
                        <p className="font-semibold text-brand-ink">{helpTitle}</p>
                        <p className="mt-1">{helpBody}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </section>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
