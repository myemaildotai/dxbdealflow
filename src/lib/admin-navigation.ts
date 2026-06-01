export function getSafeAdminReturnHref(value: string | null | undefined, fallback = "/admin") {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.includes("\\")) {
    return fallback;
  }

  try {
    const url = new URL(value, "https://deal-exchange.local");

    if (url.origin !== "https://deal-exchange.local" || !url.pathname.startsWith("/admin") || url.pathname.startsWith("/admin/listings/")) {
      return fallback;
    }

    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return fallback;
  }
}

export function createAdminListingDetailHref(listingId: string, returnTo?: string | null) {
  const safeReturnTo = returnTo ? getSafeAdminReturnHref(returnTo, "") : "";
  const params = new URLSearchParams();

  if (safeReturnTo) {
    params.set("returnTo", safeReturnTo);
  }

  const query = params.toString();
  return `/admin/listings/${listingId}${query ? `?${query}` : ""}`;
}
