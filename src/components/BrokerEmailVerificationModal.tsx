"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useSnackbar } from "notistack";
import { useAuth } from "@/auth/useAuth";
import { apiFetch } from "@/lib/deal-api";
import { cn } from "@/lib/deal-utils";
import { canAccessBrokerWorkspace } from "@/lib/route-access";

const DISMISS_KEY_PREFIX = "broker-email-verification-modal-dismissed:";

type SendOtpResponse = {
  success: boolean;
  alreadyVerified?: boolean;
  expiresAt?: string;
  emailVerifiedAt?: string;
};

type VerifyOtpResponse = {
  success: boolean;
  alreadyVerified?: boolean;
  emailVerifiedAt: string;
};

type VerificationDialogMode = "intro" | "otp" | null;

type BenefitItem = {
  label: string;
  icon: "tag" | "users" | "shield";
};

const BENEFITS: BenefitItem[] = [
  { label: "Access off-market deals", icon: "tag" },
  { label: "Submit & receive matches", icon: "users" },
  { label: "Connect with verified brokers", icon: "shield" },
];

const CONFETTI = [
  "left-[17%] top-8 h-2 w-2 rotate-45 bg-[#2fbf71]",
  "left-[30%] top-9 h-2 w-2 rotate-[58deg] bg-[#f3b615]",
  "right-[31%] top-10 h-1.5 w-1.5 rotate-45 bg-[#f3b615]",
  "right-[16%] top-14 h-2 w-2 rotate-45 bg-[#3987c7]",
  "left-[6%] top-[5.1rem] h-1.5 w-1.5 rotate-45 bg-[#58b6cd]",
  "left-[24%] top-[5rem] h-1.5 w-2.5 -rotate-45 bg-[#277fb6]",
  "right-[20%] top-[5.3rem] h-2 w-2 rotate-45 bg-[#54b89d]",
  "right-[7%] top-[6.2rem] h-1.5 w-2.5 -rotate-45 bg-[#278651]",
];

export function clearBrokerEmailVerificationModalDismissal(userId?: string | null) {
  if (typeof window === "undefined" || !userId) {
    return;
  }

  const prefix = `${DISMISS_KEY_PREFIX}${userId}:`;
  for (let index = window.sessionStorage.length - 1; index >= 0; index -= 1) {
    const key = window.sessionStorage.key(index);
    if (key?.startsWith(prefix)) {
      window.sessionStorage.removeItem(key);
    }
  }
}

function maskBrokerEmail(email: string) {
  const normalizedEmail = email.trim();
  const atIndex = normalizedEmail.indexOf("@");

  if (atIndex <= 0) {
    return normalizedEmail || "registered email";
  }

  const localPart = normalizedEmail.slice(0, atIndex);
  const domain = normalizedEmail.slice(atIndex + 1);
  const visibleLocal = localPart.length <= 3 ? localPart.slice(0, 1) : localPart.slice(0, 3);

  return `${visibleLocal || "*"}***@${domain}`;
}

function CloseIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className || "h-5 w-5"} aria-hidden="true">
      <path d="m6 6 12 12M18 6 6 18" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
    </svg>
  );
}

function Spinner({ className }: { className?: string }) {
  return <span className={cn("h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent", className)} aria-hidden="true" />;
}

function SuccessShieldIcon() {
  return (
    <div className="relative mx-auto flex h-[94px] w-[94px] items-center justify-center rounded-full bg-[#e8f7ee] shadow-[0_10px_22px_rgba(35,144,78,0.14)]">
      <div className="flex h-[78px] w-[78px] items-center justify-center rounded-full bg-[linear-gradient(135deg,#4dd27e_0%,#1f8a4d_70%,#197341_100%)] shadow-[inset_0_-12px_20px_rgba(0,75,39,0.16),0_14px_28px_rgba(31,138,77,0.28)]">
        <svg viewBox="0 0 64 64" fill="none" className="h-12 w-12 text-white" aria-hidden="true">
          <path
            d="M31.9 8.8 49 15.1v13.2c0 12-7.1 22.9-17.1 27.1-10-4.2-17-15.1-17-27.1V15.1l17-6.3Z"
            fill="currentColor"
          />
          <path
            d="m24 31.7 5.4 5.5L41 25.5"
            stroke="#1f8a4d"
            strokeWidth="5.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    </div>
  );
}

function EnvelopeIcon() {
  return (
    <svg viewBox="0 0 28 28" fill="none" className="h-7 w-7 text-[#23824a]" aria-hidden="true">
      <path d="M4.9 8.2h18.2v13.4H4.9V8.2Z" stroke="currentColor" strokeWidth="1.9" strokeLinejoin="round" />
      <path d="m5.5 8.9 8.5 7 8.5-7M5.8 21l6.4-6M22.2 21l-6.4-6" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function BenefitIcon({ icon }: { icon: BenefitItem["icon"] }) {
  if (icon === "tag") {
    return (
      <svg viewBox="0 0 24 24" fill="none" className="h-[23px] w-[23px]" aria-hidden="true">
        <path
          d="M4.7 11.1 11.1 4.7h6.3v6.3L11 17.5a2.2 2.2 0 0 1-3.1 0l-3.2-3.2a2.2 2.2 0 0 1 0-3.2Z"
          fill="currentColor"
        />
        <circle cx="15.6" cy="8.4" r="1.25" fill="white" />
      </svg>
    );
  }

  if (icon === "users") {
    return (
      <svg viewBox="0 0 24 24" fill="none" className="h-[25px] w-[25px]" aria-hidden="true">
        <path d="M9.6 11.4a3.4 3.4 0 1 0 0-6.8 3.4 3.4 0 0 0 0 6.8ZM4 19.4c.4-3.1 2.3-5 5.6-5s5.2 1.9 5.6 5H4Z" fill="currentColor" />
        <path d="M16.2 11.2a2.8 2.8 0 1 0 0-5.6 2.8 2.8 0 0 0 0 5.6ZM15.8 14.2c2.6.1 4 1.7 4.2 4.2h-3.2c-.3-1.6-.9-3-2.1-4 .3-.1.7-.2 1.1-.2Z" fill="currentColor" opacity="0.72" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-[24px] w-[24px]" aria-hidden="true">
      <path d="m12 3 7.2 2.7v5.6c0 5-3 9.2-7.2 10.8-4.2-1.6-7.2-5.8-7.2-10.8V5.7L12 3Z" fill="currentColor" />
      <path d="m8.7 12 2.2 2.2 4.6-4.8" stroke="white" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="h-[15px] w-[15px]" aria-hidden="true">
      <circle cx="10" cy="10" r="6.8" stroke="currentColor" strokeWidth="1.8" />
      <path d="M10 6.6v3.7l2.5 1.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function GridIcon({ className = "h-[17px] w-[17px]" }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" className={className} aria-hidden="true">
      <rect x="3.4" y="3.4" width="4.7" height="4.7" rx="0.8" stroke="currentColor" strokeWidth="1.7" />
      <rect x="11.9" y="3.4" width="4.7" height="4.7" rx="0.8" stroke="currentColor" strokeWidth="1.7" />
      <rect x="3.4" y="11.9" width="4.7" height="4.7" rx="0.8" stroke="currentColor" strokeWidth="1.7" />
      <rect x="11.9" y="11.9" width="4.7" height="4.7" rx="0.8" stroke="currentColor" strokeWidth="1.7" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="h-[14px] w-[14px]" aria-hidden="true">
      <rect x="5.3" y="8.7" width="9.4" height="7.2" rx="1.4" stroke="currentColor" strokeWidth="1.6" />
      <path d="M7.4 8.7V6.5a2.6 2.6 0 0 1 5.2 0v2.2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function ArrowRightIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="h-[17px] w-[17px]" aria-hidden="true">
      <path d="M4 10h11M11 6l4 4-4 4" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function MailBadgeIcon() {
  return (
    <svg viewBox="0 0 22 22" fill="none" className="h-7 w-7" aria-hidden="true">
      <path d="M3.6 6.8h14.8v10.1H3.6V6.8Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
      <path d="m4.1 7.2 6.9 5.5 6.9-5.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function BrokerVerificationIntroDialog({
  maskedEmail,
  sendingOtp,
  statusMessage,
  onGoToDashboard,
  onStartVerification,
}: {
  maskedEmail: string;
  sendingOtp: boolean;
  statusMessage: string;
  onGoToDashboard: () => void;
  onStartVerification: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center overflow-y-auto bg-[#111827]/30 p-2 backdrop-blur-[2px] sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-labelledby="broker-email-verification-title">
      <div className="relative w-full max-w-[438px] overflow-hidden rounded-[12px] bg-white px-5 pb-7 pt-8 text-center shadow-[0_24px_60px_rgba(15,23,42,0.22)] sm:px-8">
        {/* <button
          type="button"
          className="absolute right-4 top-4 z-10 inline-flex h-8 w-8 items-center justify-center rounded-full text-[#838b9b] transition hover:bg-[#f2f4f7] hover:text-[#1f2a44] disabled:cursor-not-allowed disabled:opacity-60"
          aria-label="Close email verification"
          onClick={onClose}
          disabled={sendingOtp}
        >
          <CloseIcon className="h-[22px] w-[22px]" />
        </button> */}

        <div className="pointer-events-none absolute inset-x-0 top-0 h-32" aria-hidden="true">
          {CONFETTI.map((className, index) => (
            <span key={index} className={cn("absolute rounded-[1px]", className)} />
          ))}
        </div>

        <SuccessShieldIcon />

        <h2 id="broker-email-verification-title" className="mt-4 break-words font-heading text-[28px] font-bold leading-tight tracking-[-0.035em] text-[#111d36] sm:text-[30px]">
          You’re Verified! 🎉
        </h2>
        <p className="mx-auto mt-2 max-w-[23rem] break-words text-[15px] font-bold leading-[1.35] text-[#208446] sm:text-[16px]">
          Your broker details matched the official Dubai Land Department (RERA) records.
        </p>
        <p className="mt-2 break-words text-[14px] font-medium leading-5 text-[#1f2a44] sm:text-[15px]">
          Your account has been automatically approved.
        </p>

        <div className="mt-4 flex items-center gap-4 rounded-[7px] border border-[#d9f0e0] bg-[#effaf3] px-4 py-4 text-left shadow-[inset_0_1px_0_rgba(255,255,255,0.75)] sm:px-6">
          <div className="flex h-[58px] w-[58px] shrink-0 items-center justify-center rounded-full border border-[#bee6cb] bg-white shadow-[0_8px_18px_rgba(31,138,77,0.11)]">
            <EnvelopeIcon />
          </div>
          <div className="min-w-0">
            <p className="break-words text-[14px] font-bold leading-5 text-[#208446] sm:text-[15px]">Next step: Confirm your email</p>
            <p className="mt-1 break-words text-[12.5px] font-semibold leading-5 text-[#334155] sm:text-[13px]">
              We’ll send a verification code to {maskedEmail}
            </p>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-3 text-[#2db263]">
          {BENEFITS.map((benefit, index) => (
            <div key={benefit.label} className={cn("flex min-w-0 flex-col items-center px-2 text-center", index > 0 && "border-l border-[#e6ebf2]")}>
              <BenefitIcon icon={benefit.icon} />
              <p className="mt-2 max-w-[6.4rem] break-words text-[11.5px] font-semibold leading-[1.25] text-[#293348] sm:text-[12.5px]">
                {benefit.label}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-6 flex items-center justify-center gap-2 text-[12.5px] font-semibold text-[#5a6678] sm:text-[13px]">
          <ClockIcon />
          <span>This usually takes less than 60 seconds.</span>
        </div>

        {statusMessage ? <p className="mt-3 break-words text-[12.5px] font-semibold leading-5 text-[#b54708]">{statusMessage}</p> : null}

        <div className="mt-5 grid gap-2">
          <button
            type="button"
            className="inline-flex min-h-[36px] w-full items-center justify-center gap-2 rounded-[7px] bg-[#278747] px-4 py-2.5 text-[14px] font-bold text-white shadow-[0_12px_24px_rgba(39,135,71,0.22)] transition hover:bg-[#217a3f] disabled:cursor-not-allowed disabled:opacity-70"
            onClick={onStartVerification}
            disabled={sendingOtp}
          >
            {sendingOtp ? (
              <>
                <Spinner className="text-white" />
                Sending OTP...
              </>
            ) : (
              <>
                Verify Email & Continue
                <ArrowRightIcon />
              </>
            )}
          </button>

          <button
            type="button"
            className="inline-flex min-h-[36px] w-full items-center justify-center gap-2 rounded-[7px] bg-[#f4f5f8] px-4 py-2.5 text-[14px] font-bold text-[#172033] transition hover:bg-[#ebedf2] disabled:cursor-not-allowed disabled:opacity-60"
            onClick={onGoToDashboard}
            disabled={sendingOtp}
          >
            <GridIcon />
            Go to Dashboard
          </button>
        </div>

        <div className="mt-4 flex items-center justify-center gap-1.5 text-[11px] font-semibold text-[#a0a8b8]">
          <LockIcon />
          <span>Your information is secure and encrypted</span>
        </div>
      </div>
    </div>
  );
}

function BrokerOtpVerificationDialog({
  maskedEmail,
  otp,
  sendingOtp,
  verifyingOtp,
  statusMessage,
  onOtpChange,
  onResendOtp,
  onVerifyOtp,
  onGoToDashboard,
}: {
  maskedEmail: string;
  otp: string;
  sendingOtp: boolean;
  verifyingOtp: boolean;
  statusMessage: string;
  onOtpChange: (value: string) => void;
  onResendOtp: () => void;
  onVerifyOtp: () => void;
  onGoToDashboard: () => void;
}) {
  const busy = sendingOtp || verifyingOtp;

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center overflow-y-auto bg-[#111827]/30 p-2 backdrop-blur-[2px] sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-labelledby="broker-email-otp-title">
      <div className="relative w-full max-w-[420px] rounded-[14px] bg-white p-5 text-left shadow-[0_24px_60px_rgba(15,23,42,0.22)] sm:p-6">
        {/* <button
          type="button"
          className="absolute right-4 top-4 inline-flex h-8 w-8 items-center justify-center rounded-full text-[#838b9b] transition hover:bg-[#f2f4f7] hover:text-[#1f2a44] disabled:cursor-not-allowed disabled:opacity-60"
          aria-label="Close OTP verification"
          onClick={onClose}
          disabled={busy}
        >
          <CloseIcon className="h-5 w-5" />
        </button> */}

        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#eaf7ef] text-[#23824a]">
          <MailBadgeIcon />
        </div>
        <h2 id="broker-email-otp-title" className="mt-4 break-words font-heading text-[23px] font-bold tracking-[-0.035em] text-[#111d36]">
          Confirm your broker email
        </h2>
        <p className="mt-2 break-words text-sm leading-6 text-[#5a6678]">
          Enter the 6-digit OTP sent to <span className="font-semibold text-[#1f2a44]">{maskedEmail}</span>.
        </p>

        {/* <div className="mt-5 rounded-[10px] border border-[#e1e7ef] bg-[#f8fafc] px-4 py-3">
          <p className="text-[12px] font-semibold uppercase tracking-[0.18em] text-[#7d8796]">Registered broker email</p>
          <p className="mt-1 break-words text-sm font-semibold text-[#1f2a44]">{brokerEmail || "Registered email unavailable"}</p>
        </div> */}

        <div className="mt-5">
          <label className="mb-2 block text-[12px] font-semibold uppercase tracking-[0.18em] text-[#687386]" htmlFor="broker-email-verification-otp">
            One-time password
          </label>
          <input
            id="broker-email-verification-otp"
            className="h-12 w-full rounded-[10px] border border-[#d7dee8] bg-white px-4 text-center text-[22px] font-bold tracking-[0.34em] text-[#111d36] outline-none transition placeholder:text-[#b8c0cf] focus:border-[#278747] focus:shadow-[0_0_0_4px_rgba(39,135,71,0.14)] disabled:cursor-not-allowed disabled:bg-[#f4f6f9] disabled:text-[#9aa4b5]"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            value={otp}
            onChange={(event) => onOtpChange(event.target.value)}
            placeholder="000000"
            disabled={busy}
          />
        </div>

        {statusMessage ? <p className="mt-3 break-words text-center text-sm font-semibold leading-5 text-[#5a6678]">{statusMessage}</p> : null}

        <div className="mt-5 grid gap-2">
          <button
            type="button"
            className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-[9px] bg-[#278747] px-4 py-2.5 text-sm font-bold text-white shadow-[0_12px_24px_rgba(39,135,71,0.22)] transition hover:bg-[#217a3f] disabled:cursor-not-allowed disabled:opacity-70"
            onClick={onVerifyOtp}
            disabled={busy}
          >
            {verifyingOtp ? (
              <>
                <Spinner className="text-white" />
                Verifying...
              </>
            ) : (
              "Verify OTP"
            )}
          </button>
          <button
            type="button"
            className="inline-flex min-h-[42px] w-full items-center justify-center gap-2 rounded-[9px] border border-[#dfe5ee] bg-white px-4 py-2.5 text-sm font-bold text-[#1f2a44] transition hover:bg-[#f7f9fc] disabled:cursor-not-allowed disabled:opacity-60"
            onClick={onResendOtp}
            disabled={busy}
          >
            {sendingOtp ? (
              <>
                <Spinner />
                Resending...
              </>
            ) : (
              "Resend OTP"
            )}
          </button>
          <button
            type="button"
            className="inline-flex min-h-[42px] w-full items-center justify-center gap-2 rounded-[9px] bg-[#f4f5f8] px-4 py-2.5 text-sm font-bold text-[#172033] transition hover:bg-[#ebedf2] disabled:cursor-not-allowed disabled:opacity-60"
            onClick={onGoToDashboard}
            disabled={busy}
          >
            <GridIcon className="h-4 w-4" />
            Go to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}

function BrokerEmailVerificationBannerNotice({
  maskedEmail,
  sendingOtp,
  onClose,
  onVerifyEmail,
}: {
  maskedEmail: string;
  sendingOtp: boolean;
  onClose: () => void;
  onVerifyEmail: () => void;
}) {
  return (
   <div className="border-b border-[#d7eadf] bg-[#f0fbf4]">
  <div className="shell px-3 py-2 sm:px-4 lg:px-0">
    <div className="relative rounded-[14px] px-3 py-3 text-[#203047] sm:flex sm:items-center sm:justify-between sm:gap-4 sm:bg-transparent sm:px-10 sm:shadow-none">
      <button
        type="button"
        className="absolute right-2 top-2 inline-flex h-8 w-8 items-center justify-center rounded-full text-[#7d8796] transition hover:bg-[#eef4f8] hover:text-[#1f2a44] sm:static sm:order-3 sm:h-9 sm:w-9"
        aria-label="Hide email verification banner"
        onClick={onClose}
      >
        <CloseIcon className="h-5 w-5 sm:h-7 sm:w-7" />
      </button>

      <div className="flex min-w-0 items-start gap-2.5 sm:flex-1 sm:gap-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#e3f7ea] text-[#23824a] sm:h-9 sm:w-9">
          <MailBadgeIcon />
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-bold leading-5 text-[#152238] sm:text-sm">
            Verify your broker email
          </p>
          <p className="mt-0.5 text-xs font-medium leading-5 text-[#5b6678] sm:text-[13px]">
            Confirm{" "}
            <span className="break-all font-bold text-[#23824a]">
              {maskedEmail}
            </span>{" "}
            to complete your trusted broker profile.
          </p>
        </div>
      </div>

      <button
        type="button"
        className="mt-3 inline-flex min-h-[40px] w-full items-center justify-center gap-2 rounded-[9px] bg-[#278747] px-4 py-2 text-[13px] font-bold text-white shadow-[0_10px_20px_rgba(39,135,71,0.18)] transition hover:bg-[#217a3f] disabled:cursor-not-allowed disabled:opacity-70 sm:mt-0 sm:w-auto sm:shrink-0 sm:text-sm"
        onClick={onVerifyEmail}
        disabled={sendingOtp}
      >
        {sendingOtp ? (
          <>
            <Spinner className="text-white" />
            Sending...
          </>
        ) : (
          "Verify Email"
        )}
      </button>
    </div>
  </div>
</div>
  );
}

type BrokerEmailVerificationExperienceProps = {
  forceOpen?: boolean;
  redirectAfterVerified?: string;
  showDashboardBanner?: boolean;
};

export function BrokerEmailVerificationExperience({
  forceOpen = false,
  redirectAfterVerified,
  showDashboardBanner = true,
}: BrokerEmailVerificationExperienceProps = {}) {
  const router = useRouter();
  const pathname = usePathname();
  const isRealtimeChatPage = pathname?.startsWith("/dashboard/chats/");
  const { enqueueSnackbar } = useSnackbar();
  const { user, setUser } = useAuth();
  const [dialogMode, setDialogMode] = useState<VerificationDialogMode>(null);
  const [introDismissed, setIntroDismissed] = useState(true);
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const [otp, setOtp] = useState("");
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const sendingOtpRef = useRef(false);
  const verifyingOtpRef = useRef(false);

  const brokerEmail = user?.platformUser?.email || user?.email || "";
  const maskedBrokerEmail = useMemo(() => maskBrokerEmail(brokerEmail), [brokerEmail]);
  const emailVerifiedAt = user?.platformUser?.email_verified_at || null;
  const canShowPrompt = Boolean(user && user.role === "broker" && canAccessBrokerWorkspace(user) && !emailVerifiedAt);
  const dismissKey = useMemo(
    () => (user?.uid && brokerEmail ? `${DISMISS_KEY_PREFIX}${user.uid}:${brokerEmail.toLowerCase()}` : null),
    [brokerEmail, user?.uid]
  );

  const dismissIntroForSession = useCallback(() => {
    if (dismissKey && typeof window !== "undefined") {
      window.sessionStorage.setItem(dismissKey, "true");
    }
    setIntroDismissed(true);
  }, [dismissKey]);

  useEffect(() => {
    if (!canShowPrompt || !dismissKey) {
      setDialogMode(null);
      setIntroDismissed(true);
      setBannerDismissed(false);
      setOtp("");
      setStatusMessage("");
      return;
    }

    if (forceOpen) {
      setIntroDismissed(false);
      setDialogMode("intro");
      setBannerDismissed(false);
      setOtp("");
      setStatusMessage("");
      return;
    }

    setIntroDismissed(true);
    setDialogMode((currentMode) => (currentMode === "intro" ? null : currentMode));
    setBannerDismissed(false);
    setOtp("");
    setStatusMessage("");
  }, [canShowPrompt, dismissKey, forceOpen]);

  useEffect(() => {
    setBannerDismissed(false);
  }, [pathname, user?.uid, brokerEmail]);

  const markVerified = useCallback(
    (verifiedAt: string) => {
      if (!user) return;

      setUser({
        ...user,
        emailVerified: true,
        platformUser: user.platformUser ? { ...user.platformUser, email_verified_at: verifiedAt } : user.platformUser,
      });
      if (dismissKey && typeof window !== "undefined") {
        window.sessionStorage.removeItem(dismissKey);
      }
      setIntroDismissed(true);
      setBannerDismissed(true);
      setDialogMode(null);
      setOtp("");
      setStatusMessage("");
      if (redirectAfterVerified) {
        router.replace(redirectAfterVerified);
      }
    },
    [dismissKey, redirectAfterVerified, router, setUser, user]
  );

  const sendOtpAndOpenDialog = useCallback(async () => {
    if (sendingOtpRef.current || verifyingOtpRef.current) {
      return;
    }

    sendingOtpRef.current = true;
    setSendingOtp(true);
    setStatusMessage("");

    try {
      const response = await apiFetch<SendOtpResponse>("/api/brokers/email-verification/send-otp", { method: "POST" });
      if (response.alreadyVerified) {
        markVerified(response.emailVerifiedAt || new Date().toISOString());
        enqueueSnackbar("Email already verified.", { variant: "success" });
        return;
      }

      dismissIntroForSession();
      setOtp("");
      setDialogMode("otp");
      setStatusMessage("OTP sent to your registered email.");
      enqueueSnackbar("OTP sent to your registered email.", { variant: "success" });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to send OTP.";
      if (message.toLowerCase().includes("wait a moment")) {
        dismissIntroForSession();
        setDialogMode("otp");
      }
      setStatusMessage(message);
      enqueueSnackbar(message, { variant: "error" });
    } finally {
      sendingOtpRef.current = false;
      setSendingOtp(false);
    }
  }, [dismissIntroForSession, enqueueSnackbar, markVerified]);

  const handleVerifyOtp = useCallback(async () => {
    if (sendingOtpRef.current || verifyingOtpRef.current) {
      return;
    }

    const normalizedOtp = otp.replace(/\D/g, "").slice(0, 6);
    setOtp(normalizedOtp);

    if (normalizedOtp.length !== 6) {
      setStatusMessage("Enter the 6-digit OTP sent to your email.");
      return;
    }

    verifyingOtpRef.current = true;
    setVerifyingOtp(true);
    setStatusMessage("");

    try {
      const response = await apiFetch<VerifyOtpResponse>("/api/brokers/email-verification/verify-otp", {
        method: "POST",
        body: JSON.stringify({ otp: normalizedOtp }),
      });
      markVerified(response.emailVerifiedAt);
      enqueueSnackbar("Email verified successfully.", { variant: "success" });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to verify OTP.";
      setStatusMessage(message);
      enqueueSnackbar(message, { variant: "error" });
    } finally {
      verifyingOtpRef.current = false;
      setVerifyingOtp(false);
    }
  }, [enqueueSnackbar, markVerified, otp]);

  const goToDashboard = useCallback(() => {
    dismissIntroForSession();
    setDialogMode(null);
    setStatusMessage("");
    router.push("/dashboard");
  }, [dismissIntroForSession, router]);

  if (!canShowPrompt || !user) {
    return null;
  }

  const shouldShowDashboardBanner = showDashboardBanner && !isRealtimeChatPage && !bannerDismissed && !dialogMode;

  return (
    <>
      {shouldShowDashboardBanner ? (
        <BrokerEmailVerificationBannerNotice
          maskedEmail={maskedBrokerEmail}
          sendingOtp={sendingOtp}
          onClose={() => setBannerDismissed(true)}
          onVerifyEmail={sendOtpAndOpenDialog}
        />
      ) : null}

      {dialogMode === "intro" && !introDismissed ? (
        <BrokerVerificationIntroDialog
          maskedEmail={maskedBrokerEmail}
          sendingOtp={sendingOtp}
          statusMessage={statusMessage}
          onGoToDashboard={goToDashboard}
          onStartVerification={sendOtpAndOpenDialog}
        />
      ) : null}

      {dialogMode === "otp" ? (
        <BrokerOtpVerificationDialog
          maskedEmail={maskedBrokerEmail}
          otp={otp}
          sendingOtp={sendingOtp}
          verifyingOtp={verifyingOtp}
          statusMessage={statusMessage}
          onOtpChange={(value) => setOtp(value.replace(/\D/g, "").slice(0, 6))}
          onResendOtp={sendOtpAndOpenDialog}
          onVerifyOtp={handleVerifyOtp}
          onGoToDashboard={goToDashboard}
        />
      ) : null}
    </>
  );
}

export function BrokerEmailVerificationModal(props: BrokerEmailVerificationExperienceProps) {
  return <BrokerEmailVerificationExperience {...props} />;
}

export function BrokerEmailVerificationBanner() {
  return <BrokerEmailVerificationExperience showDashboardBanner />;
}
