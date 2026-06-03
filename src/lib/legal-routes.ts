export const LEGAL_ROUTES = [
  "/terms-of-use",
  "/privacy-policy",
  "/cookie-policy",
  "/refund-policy",
  "/disclaimer",
  "/verification-policy",
  "/listing-standards",
  "/co-broke-policy",
  "/community-guidelines",
  "/complaints-compliance",
  "/maintenance-policy",
  "/acceptable-use-policy",
  "/content-intellectual-property-policy",
  "/founding-member-terms",
] as const;

const LEGAL_ROUTE_SET = new Set<string>(LEGAL_ROUTES);

export function normalizeRoutePathname(pathname: string | null | undefined) {
  if (!pathname || pathname === "/") {
    return "/";
  }

  return pathname.replace(/\/+$/, "");
}

export function isLegalRoute(pathname: string | null | undefined) {
  return LEGAL_ROUTE_SET.has(normalizeRoutePathname(pathname));
}
