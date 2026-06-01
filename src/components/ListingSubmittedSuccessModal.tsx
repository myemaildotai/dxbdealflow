"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

import { cn } from "@/lib/deal-utils";

type ListingSubmittedSuccessModalProps = {
  open: boolean;
  onClose: () => void;
  onGoToListings: () => void;
  onBackToWorkspace: () => void;
};

function CloseIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="h-[20px] w-[20px]" aria-hidden="true">
      <path d="M5 5L15 15" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M15 5L5 15" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function CheckIcon({ className = "h-9 w-9" }: { className?: string }) {
  return (
    <svg viewBox="0 0 44 44" fill="none" className={className} aria-hidden="true">
      <path d="M13.25 22.8L19.1 28.65L31.55 16.2" stroke="currentColor" strokeWidth="4.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ArrowRightIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="h-[17px] w-[17px]" aria-hidden="true">
      <path d="M4.25 10H15.25" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M11.1 5.85L15.25 10L11.1 14.15" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-[19px] w-[19px]" aria-hidden="true">
      <circle cx="12" cy="12" r="8.15" stroke="currentColor" strokeWidth="2" />
      <path d="M12 7.85V12.35L15.1 14.1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function DocumentIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-[24px] w-[24px]" aria-hidden="true">
      <path d="M7.5 4.75H14.25L17.5 8V19.25H7.5V4.75Z" stroke="currentColor" strokeWidth="1.9" strokeLinejoin="round" />
      <path d="M14 4.9V8.25H17.35" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M9.85 12H15.15" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      <path d="M9.85 15H13.7" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

function UsersIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-[24px] w-[24px]" aria-hidden="true">
      <path d="M9.25 11.4C11.05 11.4 12.5 9.95 12.5 8.15C12.5 6.35 11.05 4.9 9.25 4.9C7.45 4.9 6 6.35 6 8.15C6 9.95 7.45 11.4 9.25 11.4Z" stroke="currentColor" strokeWidth="1.85" />
      <path d="M3.85 18.55C4.7 16.45 6.52 15.25 9.25 15.25C11.98 15.25 13.8 16.45 14.65 18.55" stroke="currentColor" strokeWidth="1.85" strokeLinecap="round" />
      <path d="M15.05 11.1C16.45 10.85 17.45 9.65 17.45 8.2C17.45 6.85 16.57 5.72 15.35 5.35" stroke="currentColor" strokeWidth="1.85" strokeLinecap="round" />
      <path d="M16.1 15.35C18.15 15.7 19.5 16.78 20.15 18.55" stroke="currentColor" strokeWidth="1.85" strokeLinecap="round" />
    </svg>
  );
}

function PaperPlaneIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-[24px] w-[24px]" aria-hidden="true">
      <path d="M19.35 5.15L4.65 11.45L10.3 13.7L12.55 19.35L19.35 5.15Z" stroke="currentColor" strokeWidth="1.9" strokeLinejoin="round" />
      <path d="M10.35 13.65L14.65 9.35" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
    </svg>
  );
}

function Confetti() {
  return (
    <div className="pointer-events-none absolute left-1/2 top-0 h-[132px] w-[286px] -translate-x-1/2" aria-hidden="true">
      <span className="absolute left-[24px] top-[60px] h-[7px] w-[7px] rotate-45 rounded-[2px] border-[2px] border-[#43a9f5]" />
      <span className="absolute left-[63px] top-[46px] h-[10px] w-[3px] rotate-[-55deg] rounded-full bg-[#1ea75a]" />
      <span className="absolute left-[87px] top-[78px] h-[4px] w-[4px] rounded-full bg-[#8acfb3]" />
      <span className="absolute left-[126px] top-[84px] h-[7px] w-[4px] rotate-45 rounded-full bg-[#f3c34d]" />
      <span className="absolute right-[94px] top-[47px] h-[8px] w-[3px] rotate-[42deg] rounded-full bg-[#f2bd35]" />
      <span className="absolute right-[56px] top-[78px] h-[7px] w-[7px] rotate-45 rounded-[2px] border-[2px] border-[#2fae67]" />
      <span className="absolute right-[20px] top-[58px] h-[7px] w-[7px] rotate-45 rounded-[2px] border-[2px] border-[#43a9f5] border-l-transparent border-b-transparent" />
      <span className="absolute right-[54px] top-[95px] h-[4px] w-[4px] rounded-full bg-[#176bb5]" />
    </div>
  );
}

function SuccessMark() {
  return (
    <div className="relative mx-auto h-[80px] w-[80px]" aria-hidden="true">
      <div className="absolute inset-0 rounded-full bg-[#dcefe4]" />
      <div className="absolute inset-[13px] flex items-center justify-center rounded-full bg-[#1f934d] text-white shadow-[0_14px_26px_rgba(31,147,77,0.26)]">
        <CheckIcon />
      </div>
    </div>
  );
}

function InfoBox() {
  return (
    <div className="mt-[16px] flex min-h-[78px] items-center gap-[14px] rounded-[10px] bg-[#f0f9f3] px-[22px] py-[14px] text-left">
      <div className="flex h-[44px] w-[44px] shrink-0 items-center justify-center rounded-full border-[7px] border-[#dcefe4] bg-white text-[#2b9f66]">
        <ClockIcon />
      </div>
      <div className="min-w-0 pt-[1px]">
        <p className="text-[13px] font-bold leading-[16px] text-[#218b57] tracking-[0]">What happens next?</p>
        <p className="mt-[5px] max-w-[234px] text-[12px] font-medium leading-[16px] text-[#263858] tracking-[0]">
          {"You\u2019ll receive an email notification once your listing is reviewed and approved."}
        </p>
      </div>
    </div>
  );
}

function ProgressStep({
  label,
  status,
  state,
  children,
}: {
  label: string;
  status: string;
  state: "completed" | "active" | "pending";
  children: ReactNode;
}) {
  const iconClassName =
    state === "pending"
      ? "bg-[#eef0f6] text-[#7d8493]"
      : state === "active"
        ? "bg-[#e7f6ed] text-[#238e57]"
        : "bg-[#dff3e7] text-[#218f57]";

  return (
    <div className="relative z-10 flex w-[78px] flex-col items-center">
      <div className={cn("relative flex h-[40px] w-[40px] items-center justify-center rounded-full", iconClassName)}>
        {children}
        {state === "completed" ? (
          <span className="absolute -bottom-[2px] -right-[1px] flex h-[15px] w-[15px] items-center justify-center rounded-full border-2 border-white bg-[#25a45f] text-white">
            <svg viewBox="0 0 12 12" fill="none" className="h-[11px] w-[11px]" aria-hidden="true">
              <path d="M3.1 6.15L5 8.05L8.9 3.95" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
        ) : null}
      </div>
      <p className="mt-[12px] text-center text-[12px] font-bold leading-[15px] text-[#102756] tracking-[0]">{label}</p>
      <p className="mt-[6px] text-center text-[12px] font-medium leading-[15px] text-[#738096] tracking-[0]">{status}</p>
    </div>
  );
}

function ProgressTimeline() {
  return (
    <div className="relative mx-auto mt-[22px] flex w-full max-w-[286px] items-start justify-between">
      <div className="absolute left-[48px] right-[48px] top-[20px] z-0 flex items-center">
        <span className="h-0 flex-1 border-t-[2px] border-dashed border-[#bfe8cf]" />
        <span className="h-0 flex-1 border-t-[2px] border-dashed border-[#d9deea]" />
      </div>
      <ProgressStep label="Submitted" status="Completed" state="completed">
        <DocumentIcon />
      </ProgressStep>
      <ProgressStep label="Under Review" status="In Progress" state="active">
        <UsersIcon />
      </ProgressStep>
      <ProgressStep label="Approved" status="Pending" state="pending">
        <PaperPlaneIcon />
      </ProgressStep>
    </div>
  );
}

export function ListingSubmittedSuccessModal({
  open,
  onClose,
  onGoToListings,
  onBackToWorkspace,
}: ListingSubmittedSuccessModalProps) {
  const [mounted, setMounted] = useState(false);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;

    const previousBodyOverflow = document.body.style.overflow;
    const previousHtmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";

    window.requestAnimationFrame(() => closeButtonRef.current?.focus());

    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousHtmlOverflow;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose, open]);

  if (!mounted || !open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[500] flex items-center justify-center overflow-y-auto bg-[rgba(52,64,93,0.38)] px-3 py-5 text-[#102756] backdrop-blur-[3.5px] sm:px-4" role="presentation">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="listing-submitted-success-title"
        className="relative max-h-[calc(100dvh-24px)] w-full max-w-[430px] overflow-x-hidden overflow-y-auto rounded-[20px] bg-white px-[31px] pb-[29px] pt-[27px] shadow-[0_28px_72px_rgba(15,32,68,0.22)]"
      >
        <button
          ref={closeButtonRef}
          type="button"
          aria-label="Close success modal"
          onClick={onClose}
          className="absolute right-[21px] top-[20px] z-20 flex h-8 w-8 items-center justify-center rounded-full text-[#1b2743] transition hover:bg-[#f4f7fb] focus-visible:shadow-[0_0_0_4px_rgba(31,147,77,0.18)]"
        >
          <CloseIcon />
        </button>

        <Confetti />
        <SuccessMark />

        <div className="mt-[13px] text-center">
          <h2 id="listing-submitted-success-title" className="font-heading text-[25px] font-bold leading-[27px] text-[#09245c] tracking-[0]">
            Your listing has been
            <br />
            submitted!
          </h2>
          <p className="mx-auto mt-[13px] max-w-[315px] text-center text-[12px] font-semibold leading-[18px] text-[#344464] tracking-[0]">
            Thank you! Your listing is now under review.
            <br />
            Our admin team will verify the details and approve it before it goes live on the platform.
          </p>
        </div>

        <InfoBox />
        <ProgressTimeline />

        <div className="mt-[22px] space-y-[14px]">
          <button
            type="button"
            onClick={onGoToListings}
            className="flex h-[34px] w-full items-center justify-center gap-[14px] rounded-[7px] bg-[#08255f] px-4 text-[12px] font-bold leading-none text-white shadow-[0_8px_16px_rgba(8,37,95,0.18)] transition hover:bg-[#0d2f73] focus-visible:shadow-[0_0_0_4px_rgba(8,37,95,0.18)] tracking-[0]"
          >
            <span>Go to My Listings</span>
            <ArrowRightIcon />
          </button>
          <button
            type="button"
            onClick={onBackToWorkspace}
            className="flex h-[34px] w-full items-center justify-center rounded-[7px] border border-[#dde4ee] bg-white px-4 text-[12px] font-bold leading-none text-[#102756] shadow-[0_7px_13px_rgba(15,42,95,0.03)] transition hover:border-[#cfd8e7] hover:bg-[#fbfcfe] focus-visible:shadow-[0_0_0_4px_rgba(8,37,95,0.12)] tracking-[0]"
          >
            Back to Workspace
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
