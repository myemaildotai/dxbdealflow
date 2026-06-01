"use client";

import { useEffect, type ReactNode } from "react";
import { cn } from "@/lib/deal-utils";

export function BuyerBoardModalShell({
  children,
  onClose,
  disableClose = false,
  surfaceClassName,
}: {
  children: ReactNode;
  onClose: () => void;
  disableClose?: boolean;
  surfaceClassName?: string;
}) {
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !disableClose) {
        onClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [disableClose, onClose]);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center overflow-x-hidden bg-[rgba(15,18,26,0.58)] p-2 backdrop-blur-[6px] sm:items-center sm:p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !disableClose) {
          onClose();
        }
      }}
      role="dialog"
      aria-modal="true"
    >
      <div
        className={cn(
          "flex max-h-[calc(100dvh-1rem)] w-full flex-col overflow-hidden rounded-[18px] border border-[#dbe4ef] bg-white shadow-[0_28px_70px_rgba(15,42,95,0.18)] sm:max-h-[96vh] sm:rounded-[30px]",
          surfaceClassName
        )}
      >
        {children}
      </div>
    </div>
  );
}
