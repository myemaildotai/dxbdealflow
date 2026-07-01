"use client";

import type { FormEvent } from "react";
import { useState } from "react";
import { useSnackbar } from "notistack";

type MaintenanceNotifyResponse = {
  success?: boolean;
  duplicate?: boolean;
  message?: string;
  error?: string;
};

const NAME_MAX_LENGTH = 30;
const EMAIL_MAX_LENGTH = 60;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function MaintenanceNotifyForm() {
  const { enqueueSnackbar } = useSnackbar();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isSubmitting) {
      return;
    }

    const trimmedName = fullName.trim();
    const trimmedEmail = email.trim().toLowerCase();

    if (!trimmedName) {
      enqueueSnackbar("Name is required.", { variant: "error" });
      return;
    }

    if (trimmedName.length > NAME_MAX_LENGTH) {
      enqueueSnackbar(`Name must be ${NAME_MAX_LENGTH} characters or fewer.`, { variant: "error" });
      return;
    }

    if (!trimmedEmail) {
      enqueueSnackbar("Email is required.", { variant: "error" });
      return;
    }

    if (trimmedEmail.length > EMAIL_MAX_LENGTH) {
      enqueueSnackbar(`Email must be ${EMAIL_MAX_LENGTH} characters or fewer.`, { variant: "error" });
      return;
    }

    if (!EMAIL_REGEX.test(trimmedEmail)) {
      enqueueSnackbar("Enter a valid email address.", { variant: "error" });
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/maintenance/notify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: trimmedName,
          email: trimmedEmail,
        }),
      });
      const payload = (await response.json().catch(() => ({}))) as MaintenanceNotifyResponse;
      const message = payload.message || payload.error || "Failed to save your notification request.";

      if (!response.ok) {
        enqueueSnackbar(message, { variant: "error" });
        return;
      }

      if (payload.success) {
        enqueueSnackbar(message, { variant: "success" });

        if (!payload.duplicate) {
          setFullName("");
          setEmail("");
        }

        return;
      }

      enqueueSnackbar(message, { variant: "warning" });
    } catch (error) {
      enqueueSnackbar(error instanceof Error ? error.message : "Failed to save your notification request.", {
        variant: "error",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="grid gap-4" onSubmit={handleSubmit}>
      <div className="flex flex-col gap-3 sm:flex-row">
        <input
          type="text"
          name="fullName"
          placeholder="Full Name"
          value={fullName}
          onChange={(event) => setFullName(event.target.value)}
          className="h-12 w-full rounded-xl border border-[#E3E0D8] bg-white px-4 text-sm text-[#0F172A] outline-none transition duration-200 placeholder:text-slate-400 focus:border-[#D4A017] focus:ring-4 focus:ring-[#D4A017]/10"
        />

        <input
          type="email"
          name="email"
          placeholder="Email Address"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="h-12 w-full rounded-xl border border-[#E3E0D8] bg-white px-4 text-sm text-[#0F172A] outline-none transition duration-200 placeholder:text-slate-400 focus:border-[#D4A017] focus:ring-4 focus:ring-[#D4A017]/10"
        />

        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex h-12 shrink-0 items-center justify-center rounded-xl bg-[linear-gradient(135deg,#F0C24A_0%,#D49F17_100%)] px-7 text-base font-semibold text-[#0F172A] shadow-[0_14px_28px_rgba(212,175,55,0.22)] transition duration-300 hover:scale-[1.01] hover:shadow-[0_18px_34px_rgba(212,175,55,0.28)]"
        >
          Notify Me
        </button>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center justify-center gap-2 text-sm text-slate-500 lg:justify-start">
          <PrivacyLockIcon className="h-6 w-6 shrink-0" />
          <span>We respect your privacy. Your details are safe with us.</span>
        </div>
      </div>
    </form>
  );
}

function PrivacyLockIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" className={className} aria-hidden="true">
      <rect
        x="4"
        y="8"
        width="12"
        height="8"
        rx="1.8"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <path
        d="M6.5 8V6.7C6.5 4.93 7.93 3.5 9.7 3.5H10.3C12.07 3.5 13.5 4.93 13.5 6.7V8"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}
