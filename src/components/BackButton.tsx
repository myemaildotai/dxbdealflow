"use client";

import { type MouseEvent, type ReactNode, useCallback } from "react";
import { useRouter } from "next/navigation";

function canNavigateBackSafely() {
  if (typeof window === "undefined") {
    return false;
  }

  const historyState = window.history.state as { idx?: number } | null;
  if (typeof historyState?.idx === "number" && historyState.idx > 0) {
    return true;
  }

  if (!document.referrer) {
    return false;
  }

  try {
    return new URL(document.referrer).origin === window.location.origin;
  } catch {
    return false;
  }
}

export function BackButton({
  fallbackHref,
  className,
  children,
  ariaLabel,
  disabled = false,
  scroll = true,
}: {
  fallbackHref: string;
  className?: string;
  children: ReactNode;
  ariaLabel?: string;
  disabled?: boolean;
  scroll?: boolean;
}) {
  const router = useRouter();

  const handleClick = useCallback(
    (event: MouseEvent<HTMLButtonElement>) => {
      event.preventDefault();

      if (disabled) {
        return;
      }

      if (canNavigateBackSafely()) {
        router.back();
        return;
      }

      router.replace(fallbackHref, { scroll });
    },
    [disabled, fallbackHref, router, scroll]
  );

  return (
    <button type="button" className={className} aria-label={ariaLabel} onClick={handleClick} disabled={disabled}>
      {children}
    </button>
  );
}
