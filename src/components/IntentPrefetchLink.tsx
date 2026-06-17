"use client";

import Link, { type LinkProps } from "next/link";
import { useRouter } from "next/navigation";
import type { AnchorHTMLAttributes } from "react";

const HOVER_INTENT_DELAY_MS = 80;
const prefetchedRoutes = new Set<string>();
let hoverIntentTimer: ReturnType<typeof setTimeout> | null = null;
let scheduledHoverRoute: string | null = null;

type IntentPrefetchLinkProps = LinkProps &
  Omit<AnchorHTMLAttributes<HTMLAnchorElement>, keyof LinkProps> & {
    href: string;
  };

function cancelHoverIntent(href: string) {
  if (scheduledHoverRoute !== href) {
    return;
  }

  if (hoverIntentTimer) {
    clearTimeout(hoverIntentTimer);
  }

  hoverIntentTimer = null;
  scheduledHoverRoute = null;
}

export function IntentPrefetchLink({
  href,
  onFocus,
  onMouseEnter,
  onMouseLeave,
  onPointerDown,
  onTouchStart,
  ...props
}: IntentPrefetchLinkProps) {
  const router = useRouter();

  const prefetchRoute = () => {
    cancelHoverIntent(href);

    if (prefetchedRoutes.has(href) || (typeof window !== "undefined" && window.location.pathname === href)) {
      return;
    }

    prefetchedRoutes.add(href);
    router.prefetch(href);
  };

  const scheduleHoverIntent = () => {
    if (prefetchedRoutes.has(href) || scheduledHoverRoute === href) {
      return;
    }

    if (hoverIntentTimer) {
      clearTimeout(hoverIntentTimer);
    }

    scheduledHoverRoute = href;
    hoverIntentTimer = setTimeout(() => {
      hoverIntentTimer = null;
      scheduledHoverRoute = null;
      prefetchRoute();
    }, HOVER_INTENT_DELAY_MS);
  };

  return (
    <Link
      {...props}
      href={href}
      prefetch={false}
      onFocus={(event) => {
        onFocus?.(event);
        prefetchRoute();
      }}
      onMouseEnter={(event) => {
        onMouseEnter?.(event);
        scheduleHoverIntent();
      }}
      onMouseLeave={(event) => {
        onMouseLeave?.(event);
        cancelHoverIntent(href);
      }}
      onPointerDown={(event) => {
        onPointerDown?.(event);
        prefetchRoute();
      }}
      onTouchStart={(event) => {
        onTouchStart?.(event);
        prefetchRoute();
      }}
    />
  );
}
