"use client";

import { type ReactNode, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, animate, motion, useMotionValue, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/deal-utils";

export type BrokerVerificationLoadingPhase = "details_submitted" | "verifying_rera" | "granting_access";

type BrokerVerificationLoadingModalProps = {
  open: boolean;
  phase: BrokerVerificationLoadingPhase;
};

const focusableSelector = [
  "a[href]",
  "area[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "iframe",
  "object",
  "embed",
  "[contenteditable]",
  '[tabindex]:not([tabindex="-1"])',
].join(",");

function CloseIcon({ className = "h-[18px] w-[18px]" }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" className={className} aria-hidden="true">
      <path d="M5.25 5.25 14.75 14.75M14.75 5.25 5.25 14.75" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" />
    </svg>
  );
}

function ShieldCheckIcon() {
  return (
    <motion.div
      className="relative mx-auto flex h-[70px] w-[70px] items-center justify-center rounded-full bg-[#edf5ff]"
      aria-hidden="true"
      initial={{ scale: 0.94, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
    >
      <motion.span
        className="absolute h-[50px] w-[50px] rounded-full bg-[#dfeeff]"
        animate={{ scale: [0.96, 1.08, 0.96], opacity: [0.78, 0.45, 0.78] }}
        transition={{ duration: 2.4, ease: "easeInOut", repeat: Infinity }}
      />
      <div className="relative flex h-[43px] w-[43px] items-center justify-center rounded-full bg-[#e5f1ff] text-[#3b82f6]">
        <svg viewBox="0 0 44 44" fill="none" className="h-[34px] w-[34px]">
          <path
            d="M22 5.5 34.5 10.7v10.4c0 9.1-5.35 15.55-12.5 19.1C14.85 36.65 9.5 30.2 9.5 21.1V10.7L22 5.5Z"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinejoin="round"
          />
          <path d="m16.6 22 3.55 3.55 7.75-8.05" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
    </motion.div>
  );
}

function LockIcon({ className = "h-[18px] w-[18px]" }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" className={className} aria-hidden="true">
      <rect x="4.75" y="8.5" width="10.5" height="7.35" rx="1.65" stroke="currentColor" strokeWidth="1.65" />
      <path d="M7.25 8.5V6.6a2.75 2.75 0 0 1 5.5 0v1.9" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" />
      <path d="M10 11.45v1.55" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" />
    </svg>
  );
}

function StepCheckIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" className="h-[11px] w-[11px]" aria-hidden="true">
      <path d="m4 8.2 2.35 2.35L12 5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function VerificationStep({
  label,
  index,
  state,
}: {
  label: string;
  index: number;
  state: "completed" | "active" | "pending";
}) {
  const isCompleted = state === "completed";
  const isActive = state === "active";

  return (
    <div className="relative z-10 flex min-w-0 flex-col items-center text-center">
      <motion.span
        className={cn(
          "flex h-[22px] w-[22px] items-center justify-center rounded-full text-[11px] font-bold leading-none shadow-[0_5px_10px_rgba(59,130,246,0.18)]",
          isCompleted || isActive ? "bg-[#3b82f6] text-white" : "bg-[#d6d9df] text-white shadow-none"
        )}
        animate={{
          scale: isActive ? [1, 1.08, 1] : 1,
          boxShadow: isActive ? "0 9px 18px rgba(59,130,246,0.22)" : "0 0 0 rgba(59,130,246,0)",
        }}
        transition={{ duration: 1.8, repeat: isActive ? Infinity : 0, ease: "easeInOut" }}
      >
        {isCompleted ? <StepCheckIcon /> : index}
      </motion.span>
      <span
        className={cn(
          "mt-[9px] block w-full break-words text-[11px] font-medium leading-[13px] tracking-[0] sm:text-[12px]",
          isCompleted || isActive ? "text-[#5c6576]" : "text-[#9aa1ad]"
        )}
      >
        {label}
      </span>
    </div>
  );
}

function BrokerVerificationModalShell({
  open,
  children,
}: {
  open: boolean;
  children: ReactNode;
}) {
  const [mounted, setMounted] = useState(false);
  const dialogRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) {
      return;
    }

    const previousBodyOverflow = document.body.style.overflow;
    const previousBodyPaddingRight = document.body.style.paddingRight;
    const previousHtmlOverflow = document.documentElement.style.overflow;
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;

    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";

    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }

    window.requestAnimationFrame(() => dialogRef.current?.focus());

    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.body.style.paddingRight = previousBodyPaddingRight;
      document.documentElement.style.overflow = previousHtmlOverflow;
    };
  }, [open]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [open]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        return;
      }

      if (event.key !== "Tab" || !dialogRef.current) {
        return;
      }

      const focusableElements = Array.from(dialogRef.current.querySelectorAll<HTMLElement>(focusableSelector)).filter(
        (element) => element.offsetParent !== null || element === document.activeElement
      );

      if (!focusableElements.length) {
        event.preventDefault();
        dialogRef.current.focus();
        return;
      }

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];
      const activeElement = document.activeElement;

      if (event.shiftKey && activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      } else if (!event.shiftKey && activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown, true);
    return () => document.removeEventListener("keydown", handleKeyDown, true);
  }, [open]);

  if (!mounted) {
    return null;
  }

  return createPortal(
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-[1200] flex h-dvh items-center justify-center overflow-y-auto bg-[rgba(228,232,239,0.72)] p-3 text-[#1c2940] backdrop-blur-[4.5px] sm:p-6"
          role="presentation"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.22, ease: "easeOut" }}
        >
          <motion.div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="broker-verification-loading-title"
            aria-describedby="broker-verification-loading-description"
            aria-live="polite"
            aria-busy="true"
            tabIndex={-1}
            className="relative max-h-[90vh] min-h-[min(500px,calc(100dvh-32px))] w-[calc(100vw-32px)] max-w-[440px] overflow-x-hidden overflow-y-auto overscroll-contain rounded-[14px] bg-white px-4 pb-5 pt-8 text-center shadow-[0_24px_70px_rgba(15,23,42,0.24)] outline-none sm:w-[calc(100vw-48px)] sm:max-w-[440px] sm:px-7 sm:pb-7 sm:pt-9 md:max-w-[460px] md:px-8 md:pb-8 md:pt-10"
            initial={{ opacity: 0, y: 18, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 14, scale: 0.98 }}
            transition={{ duration: 0.34, ease: [0.22, 1, 0.36, 1] }}
          >
            {children}
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body
  );
}

const phaseTargets: Record<BrokerVerificationLoadingPhase, number> = {
  details_submitted: 42,
  verifying_rera: 68,
  granting_access: 96,
};

export function BrokerVerificationLoadingModal({ open, phase }: BrokerVerificationLoadingModalProps) {
  const shouldReduceMotion = useReducedMotion();
  const progressValue = useMotionValue(0);
  const [progress, setProgress] = useState(0);
  const [ambientTarget, setAmbientTarget] = useState(phaseTargets.details_submitted);

  const activeStep = phase === "granting_access" ? 3 : 2;

  useEffect(() => {
    const unsubscribe = progressValue.on("change", (latest) => {
      setProgress(Math.min(99, Math.max(0, Math.round(latest))));
    });

    return unsubscribe;
  }, [progressValue]);

  useEffect(() => {
    if (!open) {
      progressValue.set(0);
      setProgress(0);
      setAmbientTarget(phaseTargets.details_submitted);
      return;
    }

    progressValue.set(0);
    setProgress(0);
    setAmbientTarget(phaseTargets.details_submitted);

    const timers = [
      window.setTimeout(() => setAmbientTarget((current) => Math.max(current, 24)), 120),
      window.setTimeout(() => setAmbientTarget((current) => Math.max(current, 42)), 700),
      window.setTimeout(() => setAmbientTarget((current) => Math.max(current, 68)), 1600),
      window.setTimeout(() => setAmbientTarget((current) => Math.max(current, 78)), 5200),
      window.setTimeout(() => setAmbientTarget((current) => Math.max(current, 88)), 12000),
      window.setTimeout(() => setAmbientTarget((current) => Math.max(current, 96)), 26000),
    ];

    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, [open, progressValue]);

  useEffect(() => {
    if (!open) {
      return;
    }

    setAmbientTarget((current) => Math.max(current, phaseTargets[phase]));
  }, [open, phase]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const currentProgress = progressValue.get();
    const controls = animate(progressValue, ambientTarget, {
      duration: shouldReduceMotion ? 0 : Math.max(0.45, Math.abs(ambientTarget - currentProgress) / 28),
      ease: [0.22, 1, 0.36, 1],
    });

    return () => controls.stop();
  }, [ambientTarget, open, progressValue, shouldReduceMotion]);

  return (
    <BrokerVerificationModalShell open={open}>
      <button
        type="button"
        disabled
        aria-label="Verification in progress. Closing is disabled."
        className="absolute right-3 top-3 z-20 flex h-9 w-9 cursor-not-allowed items-center justify-center rounded-full bg-white/90 text-[#26344c]/75 shadow-[0_4px_12px_rgba(15,23,42,0.08)] sm:right-5 sm:top-5 sm:h-8 sm:w-8 sm:shadow-none"
      >
        <CloseIcon />
      </button>

      <ShieldCheckIcon />

      <h2 id="broker-verification-loading-title" className="mt-5 font-heading text-[22px] font-bold leading-[20px] tracking-[0] text-[#1f2a44] sm:mt-6">
        Verifying Your Broker Details
      </h2>
      <p
        id="broker-verification-loading-description"
        className="mx-auto mt-3 max-w-[320px] text-[12px] font-semibold leading-[17px] tracking-[0] text-[#667085]"
      >
        Please wait while we verify your information with Dubai Land Department (RERA).
      </p>

      <div className="relative mt-8 grid grid-cols-3 gap-0 sm:mt-9">
        <div className="absolute left-[16%] right-[16%] top-[8px] h-[2px] rounded-full bg-[#e3e9f2]" aria-hidden="true" />
        <motion.div
          className="absolute left-[16%] top-[8px] h-[2px] rounded-full bg-[#3b82f6]"
          style={{ width: activeStep === 3 ? "68%" : "34%" }}
          aria-hidden="true"
          transition={{ duration: 0.4 }}
        />
        <VerificationStep label="Details Submitted" index={1} state="completed" />
        <VerificationStep label="Verifying with RERA" index={2} state={activeStep >= 3 ? "completed" : "active"} />
        <VerificationStep label="Granting Access" index={3} state={activeStep >= 3 ? "active" : "pending"} />
      </div>

      <div className="mt-6">
        <div className="flex justify-end">
          <motion.span
            className="text-[16px] font-bold leading-[19px] tracking-[0] text-[#3b82f6]"
            key={progress}
            initial={{ opacity: 0.7, y: 2 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.16 }}
          >
            {progress}%
          </motion.span>
        </div>
        <div
          className="relative mt-[5px] h-[5px] overflow-hidden rounded-full bg-[#edf2fa]"
          role="progressbar"
          aria-label="Broker verification progress"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={progress}
        >
          <motion.div
            className="relative h-full overflow-hidden rounded-full bg-[#3b82f6]"
            style={{ width: `${progress}%` }}
            transition={{ duration: 0.28, ease: "easeOut" }}
          >
            <motion.span
              className="absolute inset-y-0 right-0 w-10 bg-gradient-to-r from-white/0 via-white/40 to-white/0"
              animate={shouldReduceMotion ? undefined : { x: ["-130%", "180%"] }}
              transition={{ duration: 1.35, repeat: Infinity, ease: "easeInOut" }}
            />
          </motion.div>
        </div>
      </div>

      <div className="mt-5 text-center">
        <p className="text-[12px] font-semibold leading-[16px] tracking-[0] text-[#7b8495]">This usually takes 30-40 seconds.</p>
        <p className="mt-[3px] text-[12px] font-bold leading-[16px] tracking-[0] text-[#3b82f6]">Shouldn&apos;t be long now!</p>
      </div>

      <div className="mt-6 flex min-h-[56px] items-center gap-[13px] rounded-[7px] border border-[#dde6f4] bg-[#fbfcff] px-3 py-3 text-left sm:mt-7 sm:min-h-[60px] sm:px-4 sm:py-4">
        <LockIcon className="h-[22px] w-[22px] shrink-0 text-[#5f6c82]" />
        <p className="min-w-0 text-[12px] font-semibold leading-[17px] tracking-[0] text-[#667085]">
          Your information is secure and only used for verification purposes.
        </p>
      </div>
    </BrokerVerificationModalShell>
  );
}
