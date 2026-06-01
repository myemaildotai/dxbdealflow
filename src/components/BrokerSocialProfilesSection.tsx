"use client";

import type { ReactNode } from "react";

type BrokerSocialProfilesSectionProps = {
  instagramValue: string;
  linkedinValue: string;
  instagramError?: string;
  linkedinError?: string;
  onInstagramChange: (value: string) => void;
  onLinkedInChange: (value: string) => void;
  onInstagramBlur?: () => void;
  onLinkedInBlur?: () => void;
  disabled?: boolean;
  helperText?: string;
  optionalLabel?: string;
};

function FieldError({ message }: { message?: string }) {
  if (!message) {
    return null;
  }

  return <p className="mt-1.5 break-words text-xs text-rose-400 sm:mt-2">{message}</p>;
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

function LinkedInIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <rect width="24" height="24" rx="2.6" fill="#0A66C2" />

      <path
        fill="#FFFFFF"
        d="M5.35 9.02h3.12v9.98H5.35V9.02Zm1.56-4.95c1 0 1.81.81 1.81 1.81S7.91 7.69 6.91 7.69 5.1 6.88 5.1 5.88s.81-1.81 1.81-1.81ZM10.42 9.02h2.99v1.36h.04c.42-.79 1.43-1.62 2.95-1.62 3.15 0 3.73 2.07 3.73 4.76V19h-3.12v-4.86c0-1.16-.02-2.65-1.62-2.65-1.62 0-1.87 1.26-1.87 2.57V19h-3.1V9.02Z"
      />
    </svg>
  );
}

function SocialInput({
  id,
  label,
  placeholder,
  value,
  error,
  icon,
  prefix,
  onChange,
  onBlur,
  disabled,
}: {
  id: string;
  label: string;
  placeholder: string;
  value: string;
  error?: string;
  icon: ReactNode;
  prefix?: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  disabled?: boolean;
}) {
  return (
    <div className="min-w-0">
      <label className="label" htmlFor={id}>
        {label}
      </label>
      <div className="relative">
        {/* Icon */}
        <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center">
          {icon}
        </span>

        {/* Static Prefix */}
        {prefix ? (
          <span className="pointer-events-none absolute inset-y-0 left-12 flex items-center text-sm font-medium text-brand-slate">
            {prefix}
          </span>
        ) : null}

        <input
          id={id}
          className="input pl-[155px] md:pl-[155px]"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onBlur={onBlur}
          placeholder={placeholder}
          autoComplete="off"
          disabled={disabled}
        />
      </div>
      <FieldError message={error} />
    </div>
  );
}

export function BrokerSocialProfilesSection({
  instagramValue,
  linkedinValue,
  instagramError,
  linkedinError,
  onInstagramChange,
  onLinkedInChange,
  onInstagramBlur,
  onLinkedInBlur,
  disabled,

 
}: BrokerSocialProfilesSectionProps) {
  return (
    <div className="rounded-[12px] border border-brand-line bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] p-4 shadow-[0_14px_30px_rgba(15,42,95,0.05)] sm:p-6">
      <div>
        <p className="break-words text-sm font-semibold uppercase tracking-[0.11em] text-brand-navy">
          Social Profiles <span className="normal-case tracking-normal text-brand-slate"> (Highly Recommended)</span>
        </p>
      </div>

      <div className="mt-3 grid gap-3 sm:mt-4 sm:gap-4 lg:grid-cols-2 lg:gap-5">
        <SocialInput
  id="broker-social-instagram"
  label="Instagram Handle"
  placeholder="yourhandle"
  prefix="instagram.com/"
  value={instagramValue}
  error={instagramError}
  icon={<InstagramIcon className="h-7 w-7" />}
  onChange={onInstagramChange}
  onBlur={onInstagramBlur}
  disabled={disabled}
/>

<SocialInput
  id="broker-social-linkedin"
  label="LinkedIn Handle"
  placeholder="yourprofile"
  prefix="linkedin.com/in/"
  value={linkedinValue}
  error={linkedinError}
  icon={<LinkedInIcon className="h-7 w-7" />}
  onChange={onLinkedInChange}
  onBlur={onLinkedInBlur}
  disabled={disabled}
/>
      </div>
    </div>
  );
}
