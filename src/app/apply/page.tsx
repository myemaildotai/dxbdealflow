"use client";

import Image from "next/image";
import Link from "next/link";
import PhoneInput, { type Value as PhoneNumberValue } from "react-phone-number-input";
import { FormEvent, useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useSnackbar } from "notistack";
import { authOperations } from "@/auth/authOperations";
import { useAuth } from "@/auth/useAuth";
import { BrokerAvatar } from "@/components/BrokerAvatar";
import { BrokerVerificationLoadingModal, type BrokerVerificationLoadingPhase } from "@/components/BrokerVerificationLoadingModal";
import { BrokerSocialProfilesSection } from "@/components/BrokerSocialProfilesSection";
import { LoadingScreen } from "@/components/LoadingScreen";
import { PublicHeader } from "@/components/PublicHeader";
import { getBrokerSocialFieldError } from "@/lib/broker-social";
import { apiFetch } from "@/lib/deal-api";
import { BROKER_BIO_MAX_LENGTH, getBrokerBioCharacterCount, normalizeBrokerBio } from "@/lib/broker-application";
import { Area, BrokerVerificationResponse, PublicOverview } from "@/lib/deal-types";
import { compressImageForUpload } from "@/lib/image-upload";
import { isValidInternationalPhoneNumber, normalizePhoneNumber } from "@/lib/phone";
import { getProfilePhotoValidationError, PROFILE_PHOTO_ACCEPT } from "@/lib/profile-photo";
import { getDefaultRouteForUser, isPendingBroker } from "@/lib/route-access";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const brokerHighlights = [
  {
    title: "Free & Private",
    description: "Post off-market deal discreetly. Only verified brokers & investors see your listings.",
  },
  {
    title: "Off-Market First",
    description: "New deals shared with our network before hitting the market.",
  },
  {
    title: "Direct Broker Enquiries",
    description: "Serious, no-nonsense buyers directly to your phone.",
  },
];

const platformRequirements = [
  "You must be a licensed broker (BRN/ORN)",
  "You are fully responsible for compliance (RERA, Trakheesi, etc.)",
  "This is a private B2B platform (not a portal)",
  "No sensitive documents allowed",
  "Auto verification of RERA/BRN details"
];

type ApplyField =
  | "firstName"
  | "lastName"
  | "email"
  | "phone"
  | "password"
  | "confirmPassword"
  | "agencyName"
  | "reraBrn"
  | "instagramProfile"
  | "linkedinProfile";

type ApplyFieldErrors = Partial<Record<ApplyField, string>>;

function BenefitIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" className={className} aria-hidden="true">
      <circle cx="10" cy="10" r="9" fill="#D4AF37" fillOpacity="0.3" />
      <circle cx="10" cy="10" r="7" fill="#D4AF37" />
      <path d="M6.75 10.1L8.85 12.2L13.35 7.7" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function RequirementsShieldIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" className={className} aria-hidden="true">
      <path
        d="M10 1.85 15.95 4.3a1.4 1.4 0 0 1 .86 1.29v4.1c0 4.16-2.54 7.92-6.43 9.52a1.15 1.15 0 0 1-.88 0C5.61 17.61 3.07 13.85 3.07 9.69v-4.1c0-.57.34-1.09.86-1.3L10 1.86Z"
        fill="#D4AF37"
        fillOpacity="0.18"
        stroke="#D4AF37"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      <path d="M7.35 10.15 9 11.8l3.75-3.75" stroke="#F5D86D" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function WhatsAppIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <Image src="/assets/WhatsApp-Logo.svg" alt="WhatsApp" width={24} height={24} className={className} />
  );
}

function InstagramIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
   <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <defs>
        <radialGradient
          id="instagramGradient"
          cx="0"
          cy="0"
          r="1"
          gradientUnits="userSpaceOnUse"
          gradientTransform="translate(4 22) rotate(-55) scale(28)"
        >
          <stop stopColor="#FFD600" />
          <stop offset="0.18" stopColor="#FF7A00" />
          <stop offset="0.42" stopColor="#FF0069" />
          <stop offset="0.68" stopColor="#D300C5" />
          <stop offset="1" stopColor="#7638FA" />
        </radialGradient>

        <radialGradient
          id="instagramOverlay"
          cx="0"
          cy="0"
          r="1"
          gradientUnits="userSpaceOnUse"
          gradientTransform="translate(20 3) rotate(135) scale(18)"
        >
          <stop stopColor="#7B61FF" />
          <stop offset="1" stopColor="#7B61FF" stopOpacity="0" />
        </radialGradient>
      </defs>

      <rect
        x="1"
        y="1"
        width="22"
        height="22"
        rx="6"
        fill="url(#instagramGradient)"
      />

      <rect
        x="1"
        y="1"
        width="22"
        height="22"
        rx="6"
        fill="url(#instagramOverlay)"
      />

      <rect
        x="5.2"
        y="5.2"
        width="13.6"
        height="13.6"
        rx="4"
        stroke="white"
        strokeWidth="1.8"
      />

      <circle
        cx="12"
        cy="12"
        r="3.6"
        stroke="white"
        strokeWidth="1.8"
      />

      <circle
        cx="16.2"
        cy="8.1"
        r="0.8"
        fill="white"
      />
    </svg>
  );
}

function ConsentCheckIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" className={className} aria-hidden="true">
      <path d="M5.4 10.35 8.15 13.1 14.5 6.75" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function RequiredAsterisk() {
  return <span className="ml-1 text-rose-400">*</span>;
}

function FieldError({ message }: { message?: string }) {
  if (!message) {
    return null;
  }

  return <p className="mt-1.5 break-words text-xs text-rose-400 sm:mt-2">{message}</p>;
}

function CameraUploadIcon({ className = "h-7 w-7" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path
        d="M4.75 8.5A2.75 2.75 0 0 1 7.5 5.75h1.74c.54 0 1.05-.25 1.38-.68l.64-.82c.33-.43.84-.68 1.38-.68h1.86A2.75 2.75 0 0 1 17.25 4.5l.49 1.25h1.75a2.75 2.75 0 0 1 2.75 2.75v7.75A2.75 2.75 0 0 1 19.5 19H4.5a2.75 2.75 0 0 1-2.75-2.75V8.5A2.75 2.75 0 0 1 4.75 8.5Z"
        fill="none"
        stroke="white"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="11.85" r="3.55" stroke="white" strokeWidth="1.7" />
      <path
        d="M8.35 5.75h2.45"
        stroke="white"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  );
}

function VerificationSuccessIcon({ className = "h-16 w-16" }: { className?: string }) {
  return (
    <span
      className={`inline-flex items-center justify-center rounded-full bg-[#edf8ef] text-[#2f9a45] ${className}`}
      aria-hidden="true"
    >
      <svg
        viewBox="0 0 64 64"
        fill="none"
        className="h-[72%] w-[72%] scale-x-110"
      >
        <path d="M32 8.5 48.7 15.6v14.2c0 12.3-7.2 21-16.7 25.7-9.5-4.7-16.7-13.4-16.7-25.7V15.6L32 8.5Z" stroke="currentColor" strokeWidth="4" strokeLinejoin="round" />
        <path d="m24.4 31.5 5 5.1 10.6-11" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  );
}

function VerificationWarningIcon({ className = "h-16 w-16" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center justify-center rounded-full bg-[#fff0ea] text-[#ea6b1f] ${className}`} aria-hidden="true">
      <svg viewBox="0 0 64 64" fill="none" className="h-[72%] w-[72%]">
        <path d="M31.9 10.8 55 51.2H9L31.9 10.8Z" stroke="currentColor" strokeWidth="4" strokeLinejoin="round" />
        <path d="M32 25.2v13" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
        <path d="M32 46.2h.1" stroke="currentColor" strokeWidth="5" strokeLinecap="round" />
      </svg>
    </span>
  );
}

function ModalCloseIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" className={className} aria-hidden="true">
      <path d="M5 5 15 15M15 5 5 15" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function ModalCheckIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" fill="none" className={className} aria-hidden="true">
      <circle cx="8" cy="8" r="6.5" fill="currentColor" />
      <path d="m5.25 8.1 1.65 1.65 3.85-3.9" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ModalSearchIcon({ className = "h-10 w-10" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center justify-center rounded-full bg-white text-[#ef7426] shadow-[0_10px_24px_rgba(239,116,38,0.16)] ${className}`} aria-hidden="true">
      <svg viewBox="0 0 24 24" fill="none" className="h-[55%] w-[55%]">
        <circle cx="10.5" cy="10.5" r="5.9" stroke="currentColor" strokeWidth="1.8" />
        <path d="m15.1 15.1 4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    </span>
  );
}

function ModalClockIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" className={className} aria-hidden="true">
      <circle cx="10" cy="10" r="7" stroke="currentColor" strokeWidth="1.6" />
      <path d="M10 6.4v4l2.6 1.6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ModalMailIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" className={className} aria-hidden="true">
      <rect x="3.25" y="5" width="13.5" height="10" rx="1.8" stroke="currentColor" strokeWidth="1.5" />
      <path d="m4.5 6.6 5.5 4 5.5-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ModalUserCheckIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" className={className} aria-hidden="true">
      <circle cx="8" cy="7.2" r="3" stroke="currentColor" strokeWidth="1.5" />
      <path d="M3.5 16.2c.8-3.1 2.7-4.6 4.5-4.6 1.2 0 2.4.6 3.3 1.8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="m12.6 14.7 1.4 1.4 3-3.2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ModalQuestionIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" className={className} aria-hidden="true">
      <circle cx="10" cy="10" r="7" stroke="currentColor" strokeWidth="1.5" />
      <path d="M8.1 8.1a2 2 0 1 1 3.25 1.55c-.7.5-1.35.93-1.35 1.85" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M10 14.2h.1" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
    </svg>
  );
}

function ModalLockIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" className={className} aria-hidden="true">
      <rect x="4.6" y="8.2" width="10.8" height="8" rx="1.8" fill="currentColor" />
      <path d="M7 8.2V6.4a3 3 0 0 1 6 0v1.8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function ModalBoltIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" className={className} aria-hidden="true">
      <path d="M11.3 2.7 4.8 10.9h4.5l-.7 6.4 6.7-8.7h-4.6l.6-5.9Z" fill="currentColor" />
    </svg>
  );
}

function SuccessVerificationModal({
  onClose,
}: {
  onClose: () => void;
}) {
  return (
    <div className="relative max-h-[90vh] w-[calc(100vw-32px)] max-w-[420px] overflow-hidden rounded-[14px] bg-white text-center shadow-[0_24px_70px_rgba(15,23,42,0.24)] sm:w-[calc(100vw-48px)]">
      <button
        type="button"
        onClick={onClose}
        className="absolute right-3 top-3 z-20 inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-[#7b8493] shadow-[0_4px_12px_rgba(15,23,42,0.08)] transition hover:bg-slate-100 hover:text-[#17213a] sm:right-5 sm:top-5 sm:h-8 sm:w-8 sm:shadow-none"
        aria-label="Close verification result"
      >
        <ModalCloseIcon className="h-5 w-5 sm:h-[22px] sm:w-[22px] md:h-[26px] md:w-[26px]" />
      </button>

      <div className="max-h-[90vh] overflow-y-auto overscroll-contain px-4 pb-4 pt-7 sm:px-7 sm:pb-6 sm:pt-8 md:px-8">
        <VerificationSuccessIcon className="mx-auto h-16 w-16 sm:h-[72px] sm:w-[72px] md:h-[78px] md:w-[78px]" />
        <h2 className="mt-4 break-words font-heading text-[18px] font-bold leading-tight text-[#17213a] sm:mt-5 sm:text-[20px] md:text-[22px]">
          Automatic Broker Verification
        </h2>
        <p className="mx-auto mt-2 max-w-[310px] break-words text-[12px] font-medium leading-5 text-[#596274] sm:mt-3 sm:text-[13px]">
          We verify your details with Dubai Land Department (RERA) to ensure a trusted broker community.
        </p>

        <div className="mt-4 rounded-[8px] border border-[#dce9f7] bg-[#f3f8ff] px-3 py-3 text-left sm:mt-5 sm:px-4 sm:py-4">
          <p className="break-words text-center text-[11px] font-semibold leading-5 text-[#4777b4] sm:text-[12px]">
            To get instant verified access, make sure these details match your RERA record:
          </p>
          <ul className="mt-3 space-y-2 text-[12px] font-medium text-[#344054] sm:space-y-2.5 sm:text-[13px]">
            {["Phone Number", "Broker Number", "Email Address"].map((item) => (
              <li key={item} className="flex min-w-0 items-center gap-2.5">
                <ModalCheckIcon className="h-4 w-4 shrink-0 text-[#42b853]" />
                <span className="min-w-0 break-words">{item}</span>
              </li>
            ))}
          </ul>
        </div>

        <p className="mx-auto mt-3 flex pl-2 items-start justify-center gap-2 text-[10.5px] font-medium leading-5 text-[#697386] sm:mt-4 sm:text-[11px]">
          <ModalLockIcon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#697386]" />
          <span className="min-w-0 break-words text-left">Your information is secure and only used for verification purposes.</span>
        </p>

        <div className="mt-3 flex min-w-0 items-start gap-2.5 rounded-[7px] bg-[#e8f7e8] px-3 py-3 text-left text-[11px] font-bold leading-5 text-[#31984b] sm:mt-4 sm:gap-3 sm:px-4 sm:text-[12px]">
          <ModalBoltIcon className="mt-0.5 h-4 w-4 shrink-0 text-[#1fb64a] sm:h-5 sm:w-5" />
          <span className="min-w-0 break-words">Match found! You&rsquo;ll be verified automatically and get instant access.</span>
        </div>
      </div>
    </div>
  );
}

function PendingVerificationModal({
  email,
  onBackHome,
  onClose,
}: {
  email: string;
  onBackHome: () => void;
  onClose: () => void;
}) {
  const maskedEmail = email
    ? email.replace(/^(.{2})(.*)(@.*)$/, (_, start: string, middle: string, domain: string) => `${start}${"*".repeat(Math.min(Math.max(middle.length, 3), 4))}${domain}`)
    : "your registered email";

  return (
    <div className="relative max-h-[90vh] w-[calc(100vw-32px)] max-w-[480px] overflow-hidden rounded-[14px] bg-white text-center shadow-[0_24px_70px_rgba(15,23,42,0.24)] sm:w-[calc(100vw-48px)] sm:max-w-md md:max-w-[480px]">
      <button
        type="button"
        onClick={onClose}
        className="absolute right-3 top-3 z-20 inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-[#8a93a3] shadow-[0_4px_12px_rgba(15,23,42,0.08)] transition hover:bg-slate-100 hover:text-[#17213a] sm:right-5 sm:top-4 sm:h-8 sm:w-8 sm:shadow-none"
        aria-label="Close verification result"
      >
        <ModalCloseIcon className="h-5 w-5 sm:h-6 sm:w-6 md:h-7 md:w-7" />
      </button>

      <div className="max-h-[90vh] overflow-y-auto overscroll-contain px-4 pb-5 pt-7 sm:px-6 sm:pb-6 sm:pt-8 md:px-8">
        <VerificationWarningIcon className="mx-auto h-16 w-16 sm:h-[72px] sm:w-[72px] md:h-[78px] md:w-[78px]" />
        <h2 className="mt-3 break-words font-heading text-[19px] font-bold leading-tight text-[#132447] sm:text-[22px] md:text-[24px]">
          We&rsquo;re Unable to Verify Your Details
        </h2>
        <p className="mx-auto mt-2 max-w-[340px] break-words text-[12px] font-medium leading-5 text-[#536078] sm:mt-3 sm:text-[13px] sm:leading-6">
          Your information couldn&rsquo;t be automatically verified with the Dubai Land Department (RERA) at this time.
        </p>

        <div className="mt-3 flex min-w-0 items-start gap-3 rounded-[8px] border border-[#fde7d7] bg-[#fff8f2] px-3 py-3 text-left sm:items-center sm:gap-4 sm:px-4 sm:py-4">
          <ModalSearchIcon className="h-11 w-11 shrink-0 sm:h-14 sm:w-14" />
          <div className="min-w-0">
            <p className="break-words text-[13px] font-bold text-[#e86c25] sm:text-[14px]">What happens next?</p>
            <p className="mt-1 break-words text-[11.5px] font-medium leading-5 text-[#344054] sm:text-[12px]">
              Our team will manually review your application and verify your details. We&rsquo;ll email you once the review is complete.
            </p>
          </div>
        </div>

        <div className="mt-2 flex min-w-0 items-start justify-start gap-2.5 rounded-[7px] border border-[#dbe8f8] bg-[#f4f8ff] px-3 py-2.5 text-left text-[12px] font-semibold leading-5 text-[#315c9e] sm:gap-3 sm:px-4 sm:py-3 sm:text-[13px]">
          <ModalClockIcon className="mt-0.5 h-4 w-4 shrink-0 sm:h-5 sm:w-5" />
          <span className="min-w-0 break-words">Manual review usually takes 1&ndash;2 business days.</span>
        </div>

        <div className="mt-2 rounded-[8px] border border-[#e4e8f0] bg-white px-4 py-3 text-left sm:px-5 sm:py-4">
          <p className="text-[12px] font-bold text-[#344054] sm:text-[13px]">What you can do:</p>
          <ul className="mt-2 space-y-2 text-[11.5px] font-medium leading-5 text-[#48566d] sm:text-[12px]">
            <li className="flex min-w-0 items-start gap-2.5 sm:gap-3">
              <ModalMailIcon className="mt-0.5 h-4 w-4 shrink-0 text-[#667085] sm:h-5 sm:w-5" />
              <span className="min-w-0 break-words">You&rsquo;ll receive an update at <span className="break-all font-bold">{maskedEmail}</span></span>
            </li>
            <li className="flex min-w-0 items-start gap-2.5 sm:gap-3">
              <ModalUserCheckIcon className="mt-0.5 h-4 w-4 shrink-0 text-[#667085] sm:h-5 sm:w-5" />
              <span className="min-w-0 break-words">Make sure your details match your RERA record</span>
            </li>
            <li className="flex min-w-0 items-start gap-2.5 sm:gap-3">
              <ModalQuestionIcon className="mt-0.5 h-4 w-4 shrink-0 text-[#667085] sm:h-5 sm:w-5" />
              <span className="min-w-0 break-words">Contact support if you need help</span>
            </li>
          </ul>
        </div>

        <button type="button" onClick={onBackHome} className="mt-3 min-h-[44px] w-full rounded-[7px] bg-[#143f79] px-5 text-[14px] font-bold text-white shadow-[0_10px_22px_rgba(20,63,121,0.18)] transition hover:bg-[#0f3467]">
          Back to Home
        </button>

        <p className="mt-3 break-words text-[12px] font-medium text-[#7a8495]">
          Need help?{" "}
          <a href="mailto:support@dxbdealflow.com?subject=Broker%20Verification%20Support" className="font-bold text-[#2f67b1] transition hover:text-[#143f79]">
            Contact Support
          </a>
        </p>
      </div>
    </div>
  );
}

function VerificationResultModal({
  email,
  status,
  onBackHome,
  onClose,
}: {
  email: string;
  status: BrokerVerificationResponse["status"];
  onBackHome: () => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[1000] flex h-dvh items-center justify-center overflow-y-auto bg-slate-950/30 p-3 backdrop-blur-[3px] sm:p-6" role="dialog" aria-modal="true" aria-live="polite">
      {status === "auto_approved" ? (
        <SuccessVerificationModal onClose={onClose} />
      ) : (
        <PendingVerificationModal email={email} onBackHome={onBackHome} onClose={onClose} />
      )}
    </div>
  );
}

export default function ApplyPage() {
  const router = useRouter();
  const { enqueueSnackbar } = useSnackbar();
  const { user, loading: authLoading } = useAuth();
  const profilePhotoInputId = useId();
  const shareDealsCheckboxId = useId();
  const termsCheckboxId = useId();
  const [areas, setAreas] = useState<Area[]>([]);
  const [loadingAreas, setLoadingAreas] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submissionStatus, setSubmissionStatus] = useState<BrokerVerificationResponse["status"] | null>(null);
  const [verificationLoadingPhase, setVerificationLoadingPhase] = useState<BrokerVerificationLoadingPhase>("details_submitted");
  const [resultModalDismissed, setResultModalDismissed] = useState(false);
  const [pendingAuthUserId, setPendingAuthUserId] = useState<string | null>(null);
  const [isAreasCoveredOpen, setIsAreasCoveredOpen] = useState(false);
  const [profilePhotoFile, setProfilePhotoFile] = useState<File | null>(null);
  const [profilePhotoPreview, setProfilePhotoPreview] = useState<string | null>(null);
  const [profilePhotoProcessing, setProfilePhotoProcessing] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<ApplyFieldErrors>({});
  const areasCoveredRef = useRef<HTMLDivElement | null>(null);
  const submitInFlightRef = useRef(false);
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    shareLatestDeals: false,
    termsAccepted: false,
    password: "",
    confirmPassword: "",
    agencyName: "",
    reraBrn: "",
    coveredAreaIds: [] as string[],
    speciality: "",
    experienceYears: "",
    instagramProfile: "",
    linkedinProfile: "",
    bio: "",
  });

  const validateField = (field: ApplyField, nextForm = form) => {
    switch (field) {
      case "firstName":
        return nextForm.firstName.trim() ? "" : "First name is required.";
      case "lastName":
        return nextForm.lastName.trim() ? "" : "Last name is required.";
      case "email":
        if (!nextForm.email.trim()) {
          return "Email is required.";
        }

        return EMAIL_REGEX.test(nextForm.email.trim()) ? "" : "Enter a valid email address.";
      case "phone":
        if (!nextForm.phone.trim()) {
          return "Phone number is required.";
        }

        return isValidInternationalPhoneNumber(normalizePhoneNumber(nextForm.phone))
          ? ""
          : "Enter a valid phone number including country code.";
      case "password":
        if (!nextForm.password) {
          return "Password is required.";
        }

        return nextForm.password.length >= 6 ? "" : "Password must be at least 6 characters.";
      case "confirmPassword":
        if (!nextForm.confirmPassword) {
          return "Please confirm your password.";
        }

        return nextForm.password === nextForm.confirmPassword ? "" : "Passwords do not match.";
      case "agencyName":
        return nextForm.agencyName.trim() ? "" : "Agency name is required.";
      case "reraBrn":
        return nextForm.reraBrn.trim() ? "" : "RERA / BRN is required.";
      case "instagramProfile":
        if (!nextForm.instagramProfile.trim()) {
          return "Instagram is required.";
        }

        return getBrokerSocialFieldError("instagramProfile", nextForm.instagramProfile);
      case "linkedinProfile":
        return getBrokerSocialFieldError("linkedinProfile", nextForm.linkedinProfile);
      default:
        return "";
    }
  };

  const validateForm = (nextForm = form) => {
    const fields: ApplyField[] = [
      "firstName",
      "lastName",
      "email",
      "phone",
      "password",
      "confirmPassword",
      "agencyName",
      "reraBrn",
      "instagramProfile",
      "linkedinProfile",
    ];
    const nextErrors: ApplyFieldErrors = {};

    fields.forEach((field) => {
      const error = validateField(field, nextForm);
      if (error) {
        nextErrors[field] = error;
      }
    });

    return nextErrors;
  };

  const updateFieldError = (field: ApplyField, nextForm: typeof form) => {
    setFieldErrors((current) => {
      const nextErrors = { ...current };
      const error = validateField(field, nextForm);

      if (error) {
        nextErrors[field] = error;
      } else {
        delete nextErrors[field];
      }

      if (field === "password" || field === "confirmPassword") {
        const passwordError = validateField("password", nextForm);
        const confirmPasswordError = validateField("confirmPassword", nextForm);

        if (passwordError) {
          nextErrors.password = passwordError;
        } else {
          delete nextErrors.password;
        }

        if (confirmPasswordError) {
          nextErrors.confirmPassword = confirmPasswordError;
        } else {
          delete nextErrors.confirmPassword;
        }
      }

      return nextErrors;
    });
  };

  const handleRequiredFieldChange = (field: ApplyField, value: string) => {
    const nextForm = { ...form, [field]: value };
    setForm(nextForm);
    updateFieldError(field, nextForm);
  };

  const handleSocialFieldChange = (field: "instagramProfile" | "linkedinProfile", value: string) => {
    const nextForm = { ...form, [field]: value };
    setForm(nextForm);
    updateFieldError(field, nextForm);
  };

  useEffect(() => {
    apiFetch<PublicOverview>("/api/public/overview")
      .then((payload) => setAreas(payload.areas))
      .finally(() => setLoadingAreas(false));
  }, []);

  useEffect(() => {
    if (authLoading || !user?.platformUser || submitting || !!pendingAuthUserId || submitted) {
      return;
    }

    if (isPendingBroker(user)) {
      return;
    }

    router.replace(getDefaultRouteForUser(user));
  }, [authLoading, pendingAuthUserId, router, submitted, submitting, user]);

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (areasCoveredRef.current && !areasCoveredRef.current.contains(event.target as Node)) {
        setIsAreasCoveredOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, []);

  useEffect(() => {
    if (!profilePhotoFile) {
      setProfilePhotoPreview(null);
      return;
    }

    const objectUrl = URL.createObjectURL(profilePhotoFile);
    setProfilePhotoPreview(objectUrl);

    return () => URL.revokeObjectURL(objectUrl);
  }, [profilePhotoFile]);

  const handleProfilePhotoChange = async (fileList: FileList | null) => {
    const nextFile = fileList?.[0] || null;

    if (!nextFile) {
      setProfilePhotoFile(null);
      return;
    }

    const validationError = getProfilePhotoValidationError(nextFile, { validateSize: false });
    if (validationError) {
      setProfilePhotoFile(null);
      enqueueSnackbar(validationError, { variant: "error" });
      return;
    }

    setProfilePhotoProcessing(true);
    setProfilePhotoFile(null);

    try {
      const compressedFile = await compressImageForUpload(nextFile, "Profile photo");
      setProfilePhotoFile(compressedFile);
    } catch (error) {
      setProfilePhotoFile(null);
      enqueueSnackbar(error instanceof Error ? error.message : "Profile photo could not be compressed.", { variant: "error" });
    } finally {
      setProfilePhotoProcessing(false);
    }
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();

    const nextFieldErrors = validateForm();
    if (Object.keys(nextFieldErrors).length) {
      setFieldErrors(nextFieldErrors);
      return;
    }

    const normalizedPhone = normalizePhoneNumber(form.phone);
    const normalizedBio = normalizeBrokerBio(form.bio);

    if (getBrokerBioCharacterCount(form.bio) > BROKER_BIO_MAX_LENGTH) {
      enqueueSnackbar(`Bio must be ${BROKER_BIO_MAX_LENGTH} characters or fewer.`, { variant: "error" });
      return;
    }

    if (!form.termsAccepted) {
      enqueueSnackbar("You must accept the Terms & Conditions and Privacy Policy.", { variant: "error" });
      return;
    }

    const profilePhotoError = getProfilePhotoValidationError(profilePhotoFile);
    if (profilePhotoError) {
      enqueueSnackbar(profilePhotoError, { variant: "error" });
      return;
    }

    if (profilePhotoProcessing) {
      enqueueSnackbar("Please wait for the profile photo to finish preparing.", { variant: "warning" });
      return;
    }

    if (submitInFlightRef.current) {
      return;
    }

    submitInFlightRef.current = true;
    setVerificationLoadingPhase("details_submitted");
    setSubmitting(true);
    try {
      let authUserId = pendingAuthUserId;

      if (!authUserId) {
        const displayName = `${form.firstName} ${form.lastName}`.trim();
        const signUpResult = await authOperations.signUp(form.email, form.password, displayName);

        if (!signUpResult.user) {
          throw new Error("Sign-up failed.");
        }

        authUserId = signUpResult.user.id;
        setPendingAuthUserId(authUserId);
      }

      const payload = new FormData();
      payload.append("authUserId", authUserId);
      payload.append("firstName", form.firstName);
      payload.append("lastName", form.lastName);
      payload.append("email", form.email);
      payload.append("phone", normalizedPhone);
      payload.append("shareLatestDeals", String(form.shareLatestDeals));
      payload.append("termsAccepted", String(form.termsAccepted));
      payload.append("agencyName", form.agencyName);
      payload.append("reraBrn", form.reraBrn);
      payload.append("coveredAreaIds", JSON.stringify(form.coveredAreaIds));
      payload.append("speciality", form.speciality);
      payload.append("experienceYears", form.experienceYears);
      payload.append("instagramProfile", form.instagramProfile);
      payload.append("linkedinProfile", form.linkedinProfile);
      payload.append("bio", normalizedBio);

      if (profilePhotoFile) {
        payload.append("profilePhoto", profilePhotoFile);
      }

      setVerificationLoadingPhase("verifying_rera");
      const response = await apiFetch<BrokerVerificationResponse & { message?: string }>("/api/apply", {
        method: "POST",
        body: payload,
      });

      setVerificationLoadingPhase("granting_access");
      setPendingAuthUserId(null);
      setProfilePhotoFile(null);
      setProfilePhotoPreview(null);
      setSubmissionStatus(response.status);
      setResultModalDismissed(false);
      setSubmitted(true);
      enqueueSnackbar(
        response.status === "auto_approved"
          ? "Application auto-approved."
          : "Application submitted. then wait for admin approval.",
        { variant: "success" }
      );
      void authOperations.signOut().catch(() => undefined);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Application failed.";
      const normalizedError = errorMessage.toLowerCase();

      if (normalizedError.includes("already registered")) {
        enqueueSnackbar("This email already has an account.", {
          variant: "error",
        });
      } else if (normalizedError.includes("rate limit")) {
        enqueueSnackbar("Too many verification/signup requests were sent for this email. Wait a few minutes before retrying.", {
          variant: "error",
        });
      } else {
        enqueueSnackbar(errorMessage, { variant: "error" });
      }
    } finally {
      submitInFlightRef.current = false;
      setSubmitting(false);
    }
  };

  const selectedAreasLabel = form.coveredAreaIds.length
    ? `${form.coveredAreaIds.length} area${form.coveredAreaIds.length === 1 ? "" : "s"} selected`
    : "Select areas";
  const bioCharacterCount = getBrokerBioCharacterCount(form.bio);
  const shouldForceGuestHeader = submitting || submitted || !!pendingAuthUserId;
  const shouldRedirectAuthenticatedUser = !!user?.platformUser && !isPendingBroker(user) && !submitting && !pendingAuthUserId && !submitted;
  const shouldBlockForAuthBootstrap = authLoading && !shouldForceGuestHeader && !shouldRedirectAuthenticatedUser;

  if (loadingAreas || shouldBlockForAuthBootstrap || shouldRedirectAuthenticatedUser) {
    return <LoadingScreen label={shouldRedirectAuthenticatedUser ? "Redirecting..." : "Loading broker application..."} />;
  }

  return (
    <div className="apply-page min-h-screen bg-brand-bg text-brand-ink">
      <div className="relative min-h-screen overflow-x-clip bg-[url('/assets/Login-Register-page-background.png')] bg-cover bg-center">
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(251,252,253,0.96)_0%,rgba(245,246,248,0.92)_42%,rgba(245,246,248,0.72)_100%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(212,175,55,0.16)_0%,transparent_34%),radial-gradient(circle_at_right_center,rgba(46,79,140,0.18)_0%,transparent_38%)]" />

        <div className="relative z-10 flex min-h-screen flex-col">
          <PublicHeader forceGuestState={shouldForceGuestHeader} />

          <div className="flex flex-1 items-center px-4 py-5 sm:px-6 sm:py-8 md:px-8 lg:px-12">
            <div className="shell-boundary grid gap-6 sm:gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(460px,680px)] lg:items-start lg:gap-14 xl:gap-20">
              <section className="flex justify-center lg:justify-start">
                <div className="max-w-[640px]">
                  <div>
                    <p className="page-kicker text-brand-gold">Sign Up As A Verified Broker</p>
                    <h1 className="mt-4 max-w-[700px] font-heading text-4xl font-bold leading-[1.03] tracking-[-0.05em] text-brand-navy sm:text-5xl xl:text-[3.7rem]">
                      Access Off-Market & Distressed Deals Before Anyone Else
                    </h1>
                    <p className="mt-4 max-w-[560px] text-sm leading-7 text-[#3b4352] sm:mt-5 sm:text-base lg:text-lg lg:leading-8">
                      Get exclusive access to lucrative deals not available on public portals. Limited broker access.
                    </p>
                  </div>

                  <div className="mt-6 space-y-4 sm:mt-10 sm:space-y-6">
                    {brokerHighlights.map((item) => (
                      <div key={item.title} className="flex items-start gap-4 rounded-[20px] border border-white/70 bg-white/75 p-4 shadow-[0_14px_34px_rgba(15,42,95,0.08)] backdrop-blur-sm">
                        <span className="mt-0.5 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[linear-gradient(135deg,#F7D86A_0%,#D4AF37_100%)] shadow-[0_10px_18px_rgba(212,175,55,0.22)]">
                          <BenefitIcon className="h-5 w-5" />
                        </span>
                        <div>
                          <p className="text-base font-semibold leading-tight text-brand-ink sm:text-lg sm:leading-none">{item.title}</p>
                          <p className="mt-2 max-w-[560px] text-sm leading-7 text-brand-slate">{item.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-8 max-w-[360px] border-t border-brand-line/80 pt-6">
                    <div className="subtle-panel flex items-start gap-4 p-4">
                      <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white shadow-[0_10px_18px_rgba(37,211,102,0.18)]">
                        <WhatsAppIcon className="h-7 w-7" />
                      </span>
                      <div className="text-sm leading-7 text-brand-slate">
                        <p className="font-semibold text-brand-ink">Prefer WhatsApp?</p>
                        <p className="mt-1">Send your details instead.</p>
                      </div>
                    </div>
                    <div className="mt-6 space-y-6 text-sm text-brand-ink">
                      <div className="flex items-center gap-3">
                        <WhatsAppIcon className="h-7 w-7 shrink-0" />
                        <span>X</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <InstagramIcon className="h-6 w-6 shrink-0" />
                        <span>X</span>
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              <section className="flex justify-center lg:justify-end">
                <div className="panel w-full max-w-[700px] p-4 sm:p-8 lg:p-10">
                <form onSubmit={handleSubmit} noValidate className="grid gap-3 sm:gap-4 lg:gap-5">
                  <div className="text-center">
                    <div className="relative mx-auto h-14 w-[210px]">
                      <Image src="/assets/Logo-Blue.png" alt="DXB Deal Flow" fill className="object-contain" sizes="210px" priority />
                    </div>
                  </div>

                  <div>
                    <h2 className="font-heading text-2xl font-bold text-brand-navy sm:text-3xl">Create Your Broker Account</h2>
                    <p className="mt-2 max-w-2xl text-sm leading-6 text-brand-slate sm:mt-3 sm:leading-7">
                      Sign up below for exclusive access to off-market & distressed deals as a verified broker. Limited access only.
                    </p>
                  </div>

                  <div className="grid gap-3 sm:gap-4 lg:grid-cols-2 lg:gap-5">
                    <div>
                      <label className="label">
                        First Name
                        <RequiredAsterisk />
                      </label>
                      <input
                        className="input"
                        value={form.firstName}
                        onChange={(event) => handleRequiredFieldChange("firstName", event.target.value)}
                        onBlur={() => updateFieldError("firstName", form)}
                        required
                      />
                      <FieldError message={fieldErrors.firstName} />
                    </div>
                    <div>
                      <label className="label">
                        Last Name
                        <RequiredAsterisk />
                      </label>
                      <input
                        className="input"
                        value={form.lastName}
                        onChange={(event) => handleRequiredFieldChange("lastName", event.target.value)}
                        onBlur={() => updateFieldError("lastName", form)}
                        required
                      />
                      <FieldError message={fieldErrors.lastName} />
                    </div>
                  </div>

                  <div className="grid gap-3 sm:gap-4 lg:grid-cols-2 lg:gap-5">
                    <div>
                      <label className="label">
                        Email
                        <RequiredAsterisk />
                      </label>
                      <input
                        className="input"
                        type="email"
                        value={form.email}
                        onChange={(event) => handleRequiredFieldChange("email", event.target.value)}
                        onBlur={() => updateFieldError("email", form)}
                        required
                      />
                      <FieldError message={fieldErrors.email} />
                    </div>
                    <div>
                      <label className="label">
                        Phone
                        <RequiredAsterisk />
                      </label>
                      <PhoneInput
                        international
                        countryCallingCodeEditable={false}
                        defaultCountry="AE"
                        value={(form.phone || undefined) as PhoneNumberValue | undefined}
                        onChange={(value) => handleRequiredFieldChange("phone", value || "")}
                        onBlur={() => updateFieldError("phone", form)}
                        placeholder="Enter phone number"
                        autoComplete="tel"
                        className="phone-input"
                        required
                      />
                      <FieldError message={fieldErrors.phone} />
                    </div>
                  </div>

                  <div className="grid gap-3 sm:gap-4 lg:grid-cols-2 lg:gap-5">
                    <div>
                      <label className="label">
                        Password
                        <RequiredAsterisk />
                      </label>
                      <input
                        className="input"
                        type="password"
                        value={form.password}
                        onChange={(event) => handleRequiredFieldChange("password", event.target.value)}
                        onBlur={() => updateFieldError("password", form)}
                        required
                      />
                      <FieldError message={fieldErrors.password} />
                    </div>
                    <div>
                      <label className="label">
                        Confirm Password
                        <RequiredAsterisk />
                      </label>
                      <input
                        className="input"
                        type="password"
                        value={form.confirmPassword}
                        onChange={(event) => handleRequiredFieldChange("confirmPassword", event.target.value)}
                        onBlur={() => updateFieldError("confirmPassword", form)}
                        required
                      />
                      <FieldError message={fieldErrors.confirmPassword} />
                    </div>
                  </div>

                  <div className="grid gap-3 sm:gap-4 lg:grid-cols-2 lg:gap-5">
                    <div className="min-w-0 lg:flex-1">
                      <label className="label">Profile Photo</label>

                      <label
                        htmlFor={profilePhotoInputId}
                        className="input flex min-h-[44px] h-auto cursor-pointer items-center justify-between gap-3 px-3 py-2 md:h-[52px] md:px-4 md:py-3"
                      >
                        <input
                          id={profilePhotoInputId}
                          className="hidden"
                          type="file"
                          accept={PROFILE_PHOTO_ACCEPT}
                          onChange={(event) => {
                            void handleProfilePhotoChange(event.target.files);
                            event.target.value = "";
                          }}
                          disabled={submitting || profilePhotoProcessing}
                        />

                        {/* Left side preview + text */}
                        <div className="flex min-w-0 items-center gap-3">
                          {profilePhotoPreview ? (
                            <BrokerAvatar
                              src={profilePhotoPreview}
                              alt="Profile photo"
                              className="h-8 w-8 shrink-0 border border-brand-line bg-white"
                            />
                          ) : (
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-navy text-white">
                              <CameraUploadIcon className="h-4 w-4" />
                            </div>
                          )}

                          <span className="min-w-0 truncate text-sm text-brand-slate">
                            {profilePhotoProcessing ? "Preparing photo..." : profilePhotoFile ? profilePhotoFile.name : "Upload photo"}
                          </span>
                        </div>

                        {/* Right side action */}
                        <span className="shrink-0 text-xs text-brand-gold">
                          {profilePhotoProcessing ? "Working" : profilePhotoFile ? "Change" : "Browse"}
                        </span>
                      </label>
                    </div>
                    <div className="relative">
                      <div ref={areasCoveredRef} className="relative">
                    <label className="label">Areas Covered</label>
                    <button
                      type="button"
                      aria-expanded={isAreasCoveredOpen}
                      aria-haspopup="listbox"
                      onClick={() => setIsAreasCoveredOpen((open) => !open)}
                      className="input flex min-h-[44px] h-auto items-center justify-between gap-3 px-3 py-2 text-left md:h-[52px] md:px-4 md:py-3"
                    >
                      <span className={form.coveredAreaIds.length ? "truncate text-left text-sm text-brand-ink" : "truncate text-left text-sm text-brand-slate"}>
                        {selectedAreasLabel}
                      </span>
                      <svg
                        aria-hidden="true"
                        viewBox="0 0 20 20"
                        fill="none"
                        className={`h-4 w-4 shrink-0 text-brand-slate transition-transform duration-200 ${isAreasCoveredOpen ? "rotate-180" : ""}`}
                      >
                        <path d="M5 7.5L10 12.5L15 7.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </button>
                    {isAreasCoveredOpen ? (
                      <div
                        role="listbox"
                        aria-multiselectable="true"
                        className="absolute left-0 right-0 z-[220] mt-2 max-h-[min(18rem,calc(100dvh-8rem))] overflow-auto rounded-[14px] border border-brand-line bg-white py-1 shadow-medium sm:rounded-[18px]"
                      >
                        {areas.map((area) => {
                          const checked = form.coveredAreaIds.includes(area.id);
                          return (
                            <button
                              key={area.id}
                              type="button"
                              role="option"
                              aria-selected={checked}
                              onClick={() =>
                                setForm({
                                  ...form,
                                  coveredAreaIds: checked
                                    ? form.coveredAreaIds.filter((id) => id !== area.id)
                                    : [...form.coveredAreaIds, area.id],
                                })
                              }
                              className={`flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left text-sm transition sm:px-4 sm:py-3 ${
                                checked
                                  ? "bg-[#fff7df] text-brand-navy"
                                  : "text-brand-ink hover:bg-brand-panel-soft"
                              }`}
                            >
                              <span className="min-w-0">
                                <span className="block truncate">{area.name}</span>
                              </span>
                              <span className={`shrink-0 text-xs ${checked ? "text-brand-gold" : "text-transparent"}`}>Selected</span>
                            </button>
                          );
                        })}
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
                  <div className="grid gap-3 sm:gap-4 lg:grid-cols-2 lg:gap-5">
                    <div>
                      <label className="label">
                        Agency Name
                        <RequiredAsterisk />
                      </label>
                      <input
                        className="input"
                        value={form.agencyName}
                        onChange={(event) => handleRequiredFieldChange("agencyName", event.target.value)}
                        onBlur={() => updateFieldError("agencyName", form)}
                        required
                      />
                      <FieldError message={fieldErrors.agencyName} />
                    </div>

                    <div>
                      <label className="label">
                        RERA / BRN
                        <RequiredAsterisk />
                      </label>
                      <input
                        className="input"
                        value={form.reraBrn}
                        onChange={(event) => handleRequiredFieldChange("reraBrn", event.target.value)}
                        onBlur={() => updateFieldError("reraBrn", form)}
                        required
                      />
                      <FieldError message={fieldErrors.reraBrn} />
                    </div>
                  </div>

                  <div className="grid gap-3 sm:gap-4 lg:grid-cols-2 lg:gap-5">
                    <div>
                      <label className="label">Speciality</label>
                      <input className="input" value={form.speciality} onChange={(event) => setForm({ ...form, speciality: event.target.value })} />
                    </div>
                    <div>
                      <label className="label">Experience (Years)</label>
                      <input className="input" type="number" min="0" value={form.experienceYears} onChange={(event) => setForm({ ...form, experienceYears: event.target.value })} />
                    </div>
                  </div>

                  <BrokerSocialProfilesSection
                    instagramValue={form.instagramProfile}
                    linkedinValue={form.linkedinProfile}
                    instagramError={fieldErrors.instagramProfile}
                    linkedinError={fieldErrors.linkedinProfile}
                    instagramRequired
                    onInstagramChange={(value) => handleSocialFieldChange("instagramProfile", value)}
                    onLinkedInChange={(value) => handleSocialFieldChange("linkedinProfile", value)}
                    onInstagramBlur={() => updateFieldError("instagramProfile", form)}
                    onLinkedInBlur={() => updateFieldError("linkedinProfile", form)}
                    disabled={submitting}
                  />

                  <div>
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <label className="label mb-0">Bio</label>
                      <span className={`text-xs ${bioCharacterCount >= BROKER_BIO_MAX_LENGTH ? "text-brand-gold" : "text-brand-slate"}`}>
                        {bioCharacterCount}/{BROKER_BIO_MAX_LENGTH}
                      </span>
                    </div>
                    <textarea
                      className="input min-h-[92px] resize-none sm:min-h-[100px]"
                      rows={2}
                      placeholder="Tell us a bit about yourself..."
                      value={form.bio}
                      maxLength={BROKER_BIO_MAX_LENGTH}
                      onChange={(event) => setForm({ ...form, bio: event.target.value })}
                    />
                  </div>

                  <div className="space-y-4 border-t border-brand-line/80 pt-4 sm:space-y-5 sm:pt-5">
                    <div className="overflow-hidden rounded-[18px] border border-brand-line bg-brand-panel-soft sm:rounded-[30px]">
                      <div className="border-b border-brand-line px-4 py-3 sm:px-6 sm:py-4">
                        <div className="flex items-center gap-3">
                          <RequirementsShieldIcon className="h-5 w-5 shrink-0" />
                          <p className="break-words text-xs font-semibold uppercase tracking-[0.18em] text-brand-gold sm:text-sm sm:tracking-[0.28em]">Platform Requirements</p>
                        </div>
                      </div>

                      <div className="px-4 py-3 sm:px-6">
                        <ul className="space-y-1 text-sm leading-6 text-brand-slate sm:text-[1.05rem] sm:leading-7">
                          {platformRequirements.map((requirement) => (
                            <li key={requirement} className="flex items-start gap-3">
                              <span className="mt-[0.7rem] h-1.5 w-1.5 shrink-0 rounded-full bg-brand-gold/70" />
                              <span>{requirement}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      <label
                        htmlFor={termsCheckboxId}
                        className="flex cursor-pointer items-start gap-3 border-t border-brand-line px-4 py-4 transition hover:bg-white/60 sm:gap-4 sm:px-6 sm:py-5"
                      >
                        <input
                          id={termsCheckboxId}
                          type="checkbox"
                          checked={form.termsAccepted}
                          onChange={(event) => setForm({ ...form, termsAccepted: event.target.checked })}
                          className="peer sr-only"
                          required
                        />
                        <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 border-brand-line bg-transparent text-transparent transition peer-checked:border-brand-gold peer-checked:bg-brand-gold peer-checked:text-brand-navy sm:h-7 sm:w-7">
                          <ConsentCheckIcon className="h-4 w-4" />
                        </span>
                        <span className="min-w-0 break-words text-sm leading-6 text-brand-slate sm:text-[1.05rem] sm:leading-8">
                          I confirm that I meet the above requirements and agree to the{" "}
                          <Link
                            href="/terms-of-use"
                            onClick={(event) => event.stopPropagation()}
                            className="font-semibold text-brand-navy transition hover:text-brand-gold"
                          >
                            Terms &amp; Conditions
                          </Link>{" "}
                          and{" "}
                          <Link
                            href="/privacy-policy"
                            onClick={(event) => event.stopPropagation()}
                            className="font-semibold text-brand-navy transition hover:text-brand-gold"
                          >
                            Privacy Policy
                          </Link>
                        </span>
                      </label>
                    </div>

                    <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                      <label htmlFor={shareDealsCheckboxId} className="flex min-w-0 cursor-pointer items-start gap-3 text-sm text-brand-slate transition hover:border-brand-blue/20 hover:bg-white">
                      <input
                        id={shareDealsCheckboxId}
                        type="checkbox"
                        checked={form.shareLatestDeals}
                        onChange={(event) => setForm({ ...form, shareLatestDeals: event.target.checked })}
                        className="peer sr-only"
                      />
                      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border border-brand-line bg-white text-transparent transition peer-checked:border-brand-gold peer-checked:bg-brand-gold peer-checked:text-brand-navy">
                        <ConsentCheckIcon className="h-3.5 w-3.5" />
                      </span>
                      <span className="min-w-0 break-words">Share latest deals with me</span>
                    </label>
                      <button type="submit" className="btn-accent min-h-[44px] w-full sm:w-auto" disabled={submitting || submitted || profilePhotoProcessing || !form.termsAccepted}>
                        {profilePhotoProcessing ? "Preparing Photo..." : submitting ? "Submitting..." : "Request Access"}
                      </button>
                    </div>
                    <p className="text-center text-sm text-brand-slate">
                      Already have an account?{" "}
                      <Link href="/login" className="font-semibold text-brand-navy transition hover:text-brand-gold">
                        Log In
                      </Link>
                    </p>
                  </div>
                </form>
                </div>
              </section>
            </div>
          </div>
        </div>

        <BrokerVerificationLoadingModal open={submitting && !submitted} phase={verificationLoadingPhase} />

        {submitted && submissionStatus && !resultModalDismissed ? (
          <VerificationResultModal
            email={form.email}
            status={submissionStatus}
            onBackHome={() => router.push("/")}
            onClose={() => router.push("/login")}
          />
        ) : null}
      </div>
    </div>
  );
}
