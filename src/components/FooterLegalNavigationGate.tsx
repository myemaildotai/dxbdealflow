"use client";

import { usePathname } from "next/navigation";
import { FooterLegalNavigation } from "@/components/FooterLegalNavigation";
import { LEGAL_ROUTES, isLegalRoute, normalizeRoutePathname } from "@/lib/legal-routes";

const PUBLIC_FOOTER_ROUTES = new Set<string>([
  ...LEGAL_ROUTES,
  "/coming-soon",
  "/maintenance",
]);

const EXCLUDED_ROUTES = new Set([
  "/",
  "/apply",
  "/listings",
  "/login",
  "/register",
  "/signin",
  "/signup",
  "/update-password",
  "/pending",
]);

const EXCLUDED_PREFIXES = [
  "/admin",
  "/dashboard",
  "/my-requirements",
  "/post-listing",
  "/post-requirement",
  "/requirements",
];

function shouldShowFooter(pathname: string | null) {
  const normalizedPathname = normalizeRoutePathname(pathname);

  if (normalizedPathname.startsWith("/listings/")) {
    return false;
  }

  if (EXCLUDED_ROUTES.has(normalizedPathname)) {
    return false;
  }

  if (EXCLUDED_PREFIXES.some((prefix) => normalizedPathname === prefix || normalizedPathname.startsWith(`${prefix}/`))) {
    return false;
  }

  return isLegalRoute(normalizedPathname) || PUBLIC_FOOTER_ROUTES.has(normalizedPathname);
}

export function FooterLegalNavigationGate() {
  const pathname = usePathname();

  if (!shouldShowFooter(pathname)) {
    return null;
  }

  return <FooterLegalNavigation />;
}
