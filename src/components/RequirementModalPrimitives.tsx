"use client";

import { type ReactNode, useEffect } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/deal-utils";

function useModalBodyScrollLock(active: boolean) {
  useEffect(() => {
    if (!active) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    const previousPaddingRight = document.body.style.paddingRight;
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;

    document.body.style.overflow = "hidden";

    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }

    return () => {
      document.body.style.overflow = previousOverflow;
      document.body.style.paddingRight = previousPaddingRight;
    };
  }, [active]);
}

export function RequirementModalShell({
  children,
  onClose,
  maxWidthClassName = "max-w-[55rem]",
}: {
  children: ReactNode;
  onClose: () => void;
  maxWidthClassName?: string;
}) {
  useModalBodyScrollLock(true);

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [onClose]);

  if (typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center overflow-x-hidden bg-[rgba(15,18,26,0.58)] p-2 backdrop-blur-[6px] sm:items-center sm:p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        className={cn(
          "w-full max-w-full overflow-hidden rounded-[18px] border border-[#e9e0d4] bg-[linear-gradient(180deg,#fffdfa_0%,#f7f3ed_100%)] shadow-[0_28px_70px_rgba(20,22,34,0.22)] sm:rounded-[30px]",
          maxWidthClassName
        )}
      >
        <div className="max-h-[calc(100dvh-1rem)] overflow-x-hidden overflow-y-auto sm:max-h-[calc(100vh-2rem)]">{children}</div>
      </div>
    </div>,
    document.body
  );
}

export function RequirementModalPanel({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={cn("rounded-[14px] border border-[#eadfce] bg-white px-3 py-3 shadow-[0_14px_30px_rgba(30,35,49,0.06)] sm:rounded-[24px] sm:px-5 sm:py-5", className)}>{children}</div>;
}

export function RequirementModalSoftPanel({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-[14px] border border-[#ebe4d8] bg-[linear-gradient(180deg,#fffdfb_0%,#f8f4ef_100%)] px-3 py-3 shadow-[0_10px_24px_rgba(37,41,57,0.05)] sm:rounded-[18px] sm:px-4",
        className
      )}
    >
      {children}
    </div>
  );
}

export function RequirementModalLabel({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <p className={cn("text-[11px] font-semibold uppercase tracking-[0.28em] text-[#a58f71]", className)}>{children}</p>;
}

export function RequirementModalField({
  label,
  value,
  className,
  valueClassName,
}: {
  label: ReactNode;
  value: ReactNode;
  className?: string;
  valueClassName?: string;
}) {
  return (
    <RequirementModalSoftPanel className={cn("min-w-0", className)}>
      <p className="truncate text-[11px] font-semibold uppercase tracking-[0.24em] text-[#a08c6e]">{label}</p>
      <div className={cn("mt-2 break-words text-sm font-medium text-[#2d3343] sm:text-[15px]", valueClassName)}>{value}</div>
    </RequirementModalSoftPanel>
  );
}
