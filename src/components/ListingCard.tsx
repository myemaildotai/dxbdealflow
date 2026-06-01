import Image from "next/image";
import Link from "next/link";
import { Listing } from "@/lib/deal-types";
import {
  formatCurrency,
  formatDate,
  formatDealType,
  formatListingStatus,
  formatNumber,
  formatPropertyType,
  statusClasses,
} from "@/lib/deal-utils";

type ListingCardAction = {
  label: string;
  href?: string;
  onClick?: () => void;
  tone?: "primary" | "secondary" | "danger";
  disabled?: boolean;
};

export function ListingCard({
  listing,
  interactive = true,
  actionLabel = "View Details",
  href,
  variant = "public",
  footerActions = [],
}: {
  listing: Listing;
  interactive?: boolean;
  actionLabel?: string;
  href?: string;
  variant?: "public" | "broker";
  footerActions?: ListingCardAction[];
}) {
  const coverImage = listing.listing_images?.find((image) => image.is_cover)?.public_url || listing.listing_images?.[0]?.public_url;
  const actionHref = href || `/listings/${listing.id}`;
  const resolvedFooterActions: ListingCardAction[] = interactive
    ? [{ label: actionLabel, href: actionHref, tone: "primary" }, ...footerActions]
    : footerActions;

  const getActionClassName = (tone: ListingCardAction["tone"] = "secondary", disabled = false) => {
    if (disabled) {
      return "btn-secondary cursor-not-allowed opacity-60";
    }

    if (tone === "primary") {
      return "btn-primary";
    }

    if (tone === "danger") {
      return "btn-danger";
    }

    return "btn-secondary";
  };

  return (
    <article className="panel flex h-full flex-col overflow-hidden">
      <div className="relative h-40 w-full bg-brand-panel-muted sm:h-48 lg:h-56">
        {coverImage ? (
          <Image
            src={coverImage}
            alt={listing.title}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
          />
        ) : (
          <div className="flex h-full items-center justify-center bg-[linear-gradient(135deg,#EEF2F6_0%,#DCE4EE_100%)] text-sm font-medium text-brand-slate">
            No image uploaded
          </div>
        )}

        <div className="absolute inset-x-0 top-0 flex items-start justify-between gap-2 p-3 sm:gap-3 sm:p-4">
          <div className="flex flex-wrap items-center gap-2">
            {variant === "broker" ? <span className={statusClasses(listing.status)}>{formatListingStatus(listing.status)}</span> : null}
            {variant !== "broker" ? (
              listing.is_visible ? (
                <span className="badge border-[#d5deed] bg-white/92 text-brand-navy">Visible</span>
              ) : (
                <span className="badge border-[#d8dee8] bg-white/88 text-brand-slate">Hidden</span>
              )
            ) : null}
          </div>
          <span className="rounded-full bg-white/92 px-3 py-2 text-[11px] font-medium uppercase tracking-[0.16em] text-brand-slate shadow-[0_10px_20px_rgba(15,42,95,0.08)]">
            {formatDealType(listing.deal_type)}
          </span>
        </div>
      </div>

      <div className="flex flex-1 flex-col p-3 sm:p-4 lg:p-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-3 lg:gap-4">
          <div className="min-w-0">
            <h3 className="line-clamp-2 font-heading text-xl font-semibold text-brand-ink">{listing.title}</h3>
            <p className="mt-2 text-sm text-brand-slate">
              {listing.area?.name || "Area pending"} | {formatPropertyType(listing.property_type)}
            </p>
          </div>
          <p className="min-w-0 break-words font-heading text-xl font-semibold text-brand-navy sm:shrink-0 sm:text-2xl">{formatCurrency(listing.price)}</p>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2 text-sm sm:grid-cols-4 lg:mt-5 lg:gap-3">
          <div className="subtle-panel min-w-0 p-2.5 lg:p-3">
            <p className="micro-copy">Beds</p>
            <p className="mt-2 break-words font-semibold text-brand-ink">{listing.bedrooms ?? "N/A"}</p>
          </div>
          <div className="subtle-panel min-w-0 p-2.5 lg:p-3">
            <p className="micro-copy">Size</p>
            <p className="mt-2 break-words font-semibold text-brand-ink">{formatNumber(listing.size_sqft)} sqft</p>
          </div>
          <div className="subtle-panel min-w-0 p-2.5 lg:p-3">
            <p className="micro-copy">Price</p>
            <p className="mt-2 break-words font-semibold text-brand-ink">{formatCurrency(listing.price)}</p>
          </div>
          <div className="subtle-panel min-w-0 p-2.5 lg:p-3">
            <p className="micro-copy">Created</p>
            <p className="mt-2 break-words font-semibold text-brand-ink">{formatDate(listing.created_at)}</p>
          </div>
        </div>

        <p className="mt-4 line-clamp-2 text-sm leading-6 text-brand-slate lg:mt-5 lg:line-clamp-3">{listing.description || "No description provided."}</p>

        <div className="mt-4 flex flex-wrap items-center gap-2 lg:mt-6 lg:gap-3">
          {resolvedFooterActions.length ? (
            resolvedFooterActions.map((action) => {
              if (action.href && !action.disabled) {
                return (
                  <Link key={`${action.label}-${action.href}`} href={action.href} className={getActionClassName(action.tone)}>
                    {action.label}
                  </Link>
                );
              }

              return (
                <button
                  key={`${action.label}-${action.href || "button"}`}
                  type="button"
                  onClick={action.onClick}
                  disabled={action.disabled}
                  className={getActionClassName(action.tone, action.disabled)}
                >
                  {action.label}
                </button>
              );
            })
          ) : (
            <span className="inline-flex min-h-[46px] items-center rounded-[14px] border border-brand-line bg-brand-panel-soft px-5 py-3 text-sm font-medium text-brand-slate">
              Preview
            </span>
          )}
        </div>
      </div>
    </article>
  );
}
