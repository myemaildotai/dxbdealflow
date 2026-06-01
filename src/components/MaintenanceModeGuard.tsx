"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/auth/useAuth";
import { getBrokerStatusRedirectPath, isBlockedBroker } from "@/lib/route-access";

const PENDING_RESTRICTED_PREFIXES = ["/admin", "/dashboard"];
const PENDING_RESTRICTED_PATHS = new Set(["/my-requirements", "/post-listing", "/post-requirement", "/requirements"]);

function isPendingRestrictedPath(pathname: string) {
  if (PENDING_RESTRICTED_PATHS.has(pathname)) {
    return true;
  }

  return PENDING_RESTRICTED_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

export function MaintenanceModeGuard() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  useEffect(() => {
    if (!pathname || authLoading) {
      return;
    }

    const blockedBroker = isBlockedBroker(user);

    if (blockedBroker) {
      if (pathname !== "/pending" && isPendingRestrictedPath(pathname)) {
        router.replace(getBrokerStatusRedirectPath(user?.status));
      }
      return;
    }
  }, [authLoading, pathname, router, user]);

  return null;
}
