"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

type RequirementSuccessModalProps = {
  open: boolean;
  title: string;
  message: string;
  onClose: () => void;
  onViewMyRequirements: () => void;
  onBackToDashboard: () => void;
};

function CloseIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="h-[24px] w-[24px]" aria-hidden="true">
      <path d="M5 5L15 15" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M15 5L5 15" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 44 44" fill="none" className="h-9 w-9" aria-hidden="true">
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

function Confetti() {
  return (
    <div className="pointer-events-none absolute left-1/2 top-0 h-[132px] w-[286px] -translate-x-1/2" aria-hidden="true">
      <span className="absolute left-[24px] top-[60px] h-[7px] w-[7px] rotate-45 rounded-[2px] border-[2px] border-[#43a9f5]" />
      <span className="absolute left-[63px] top-[46px] h-[10px] w-[3px] rotate-[-55deg] rounded-full bg-[#1ea75a]" />
      <span className="absolute left-[87px] top-[78px] h-[4px] w-[4px] rounded-full bg-[#8acfb3]" />
      <span className="absolute left-[126px] top-[84px] h-[7px] w-[4px] rotate-45 rounded-full bg-[#f3c34d]" />
      <span className="absolute right-[94px] top-[47px] h-[8px] w-[3px] rotate-[42deg] rounded-full bg-[#f2bd35]" />
      <span className="absolute right-[56px] top-[78px] h-[7px] w-[7px] rotate-45 rounded-[2px] border-[2px] border-[#2fae67]" />
      <span className="absolute right-[20px] top-[58px] h-[7px] w-[7px] rotate-45 rounded-[2px] border-[2px] border-[#43a9f5] border-b-transparent border-l-transparent" />
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

export function RequirementSuccessModal({
  open,
  title,
  message,
  onClose,
  onViewMyRequirements,
  onBackToDashboard,
}: RequirementSuccessModalProps) {
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
        aria-labelledby="requirement-success-title"
        className="relative max-h-[calc(100dvh-24px)] w-full max-w-[410px] overflow-x-hidden overflow-y-auto rounded-[20px] bg-white px-[31px] pb-[29px] pt-[27px] shadow-[0_28px_72px_rgba(15,32,68,0.22)]"
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

        <div className="mt-[18px] text-center">
          <h2 id="requirement-success-title" className="font-heading text-[24px] font-bold leading-[29px] text-[#09245c] tracking-[0]">
            {title}
          </h2>
          <p className="mx-auto mt-[13px] max-w-[315px] text-center text-[13px] font-semibold leading-[19px] text-[#344464] tracking-[0]">
            {message}
          </p>
        </div>

        <div className="mt-[25px] space-y-[14px]">
          <button
            type="button"
            onClick={onViewMyRequirements}
            className="flex h-[38px] w-full items-center justify-center gap-[14px] rounded-[7px] bg-[#08255f] px-4 text-[12px] font-bold leading-none text-white shadow-[0_8px_16px_rgba(8,37,95,0.18)] transition hover:bg-[#0d2f73] focus-visible:shadow-[0_0_0_4px_rgba(8,37,95,0.18)] tracking-[0]"
          >
            <span>View My Requirements</span>
            <ArrowRightIcon />
          </button>
          <button
            type="button"
            onClick={onBackToDashboard}
            className="flex h-[38px] w-full items-center justify-center rounded-[7px] border border-[#dde4ee] bg-white px-4 text-[12px] font-bold leading-none text-[#102756] shadow-[0_7px_13px_rgba(15,42,95,0.03)] transition hover:border-[#cfd8e7] hover:bg-[#fbfcfe] focus-visible:shadow-[0_0_0_4px_rgba(8,37,95,0.12)] tracking-[0]"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
