const LOCAL_APP_ORIGIN = "https://deal-exchange.local";

export const LISTINGS_RETURN_TO_PARAM = "returnTo";

export function getSafeListingsReturnHref(value: string | null | undefined, fallback = "/listings") {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.includes("\\")) {
    return fallback;
  }

  try {
    const url = new URL(value, LOCAL_APP_ORIGIN);

    if (url.origin !== LOCAL_APP_ORIGIN || url.pathname !== "/listings") {
      return fallback;
    }

    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return fallback;
  }
}

export function createListingDetailHref(listingId: string, returnTo?: string | null) {
  const safeReturnTo = returnTo ? getSafeListingsReturnHref(returnTo, "") : "";
  const params = new URLSearchParams();

  if (safeReturnTo) {
    params.set(LISTINGS_RETURN_TO_PARAM, safeReturnTo);
  }

  const query = params.toString();
  return `/listings/${listingId}${query ? `?${query}` : ""}`;
}
