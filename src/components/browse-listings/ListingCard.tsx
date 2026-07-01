"use client";

import Image from "next/image";
import Link from "next/link";
import { prefetchApi } from "@/lib/deal-api";
import { createListingDetailHref } from "@/lib/listing-navigation";
import {
  formatCurrency,
  formatNumber,
  formatPropertyType,
} from "@/lib/deal-utils";
import {
  ListingIntel,
  formatPercentValue,
  formatRelativeTime,
  getCoverImage,
  getPrimaryBadgeLabel,
} from "@/components/browse-listings/browse-listings-utils";

function MeasureIcon({ className = "h-3.5 w-3.5" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M4.2 13.9 13.9 4.2l1.9 1.9-9.7 9.7H4.2v-1.9Z"
        stroke="currentColor"
        strokeWidth="1.45"
        strokeLinejoin="round"
      />
      <path
        d="M10.15 7.95 12.05 9.85M7.95 10.15l1.9 1.9"
        stroke="currentColor"
        strokeWidth="1.45"
        strokeLinecap="round"
      />
    </svg>
  );
}

function BedIcon({ className = "h-3.5 w-3.5" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M3.8 10.7h12.4v3.4H3.8v-3.4Zm2.05-3.6h2.55A1.6 1.6 0 0 1 10 8.7v2H4.25V8.7a1.6 1.6 0 0 1 1.6-1.6Zm7.65.95h.35a2.35 2.35 0 0 1 2.35 2.35v.3H10V8.65a1.55 1.55 0 0 1 1.55-1.55h1.95Z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      <path
        d="M3.8 14.1v1.7M16.2 14.1v1.7"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  );
}

function BuildingIcon({ className = "h-3.5 w-3.5" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M5.1 16V5.1A1.1 1.1 0 0 1 6.2 4h7.6A1.1 1.1 0 0 1 14.9 5.1V16"
        stroke="currentColor"
        strokeWidth="1.45"
      />
      <path
        d="M3.9 16h12.2"
        stroke="currentColor"
        strokeWidth="1.45"
        strokeLinecap="round"
      />
      <path
        d="M8.05 7.05h.1M12.05 7.05h.1M8.05 10.05h.1M12.05 10.05h.1"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function ChevronRightIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <path
        d="m8 5.8 4.2 4.2L8 14.2"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function getPrimaryBadgeClasses() {
  return "border-white/60 bg-white/85 text-[#13233f]";
}

function getPrimaryBadgeAccentClasses(label: string) {
  switch (label) {
    case "Best Deal":
      return "bg-[#d7b153]";
    case "Urgent":
      return "bg-[#dc9746]";
    case "Off Market":
      return "bg-brand-navy";
    case "Distressed":
      return "bg-[#a34d3d]";
    default:
      return "bg-brand-navy";
  }
}

function getInlineBadge(item: ListingIntel) {
  if (item.belowMarketPercent > 0) {
    return {
      label: "Below Market",
      className: "border-[#ead18b] bg-[#f7ebbf] text-[#8d6508]",
    };
  }

  if (item.isPriceDropSignal) {
    return {
      label: "Price Drop",
      className: "border-[#d9e4fb] bg-[#eef4ff] text-brand-navy",
    };
  }

  if (item.isUrgentSeller) {
    return {
      label: "Urgent",
      className: "border-[#f3cf9f] bg-[#fff1dc] text-[#a86516]",
    };
  }

  return null;
}

function getListingTitle(value: string | null | undefined) {
  return value?.trim() || "Untitled Listing";
}

function getListingArea(value: ListingIntel["listing"]) {
  return (
    value.area?.name?.trim() ||
    value.area?.city?.trim() ||
    "Location unavailable"
  );
}

function getListingPrice(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value) && value > 0
    ? formatCurrency(value)
    : "Price on request";
}

export function ListingCard({
  item,
  isBestDeal,
  listingReturnHref,
}: {
  item: ListingIntel;
  isBestDeal: boolean;
  listingReturnHref?: string;
}) {
  const listing = item.listing;
  const detailHref = createListingDetailHref(listing.id, listingReturnHref);
  const detailApiPath = `/api/listings/${listing.id}`;
  const prefetchDetail = () => {
    prefetchApi(detailApiPath, {}, { ttlMs: 60_000 });
  };
  const coverImage = getCoverImage(listing);
  const primaryBadge = getPrimaryBadgeLabel(item, isBestDeal);
  const inlineBadge = getInlineBadge(item);
  const title = getListingTitle(listing.title);
  const area = getListingArea(listing);
  const price = getListingPrice(listing.price);
  const propertyType = formatPropertyType(listing.property_type);
  const bedrooms =
    listing.bedrooms !== null
      ? `${listing.bedrooms} ${listing.bedrooms === 1 ? "Bed" : "Beds"}`
      : "Beds not specified";
  const size = listing.size_sqft
    ? `${formatNumber(listing.size_sqft)} sqft`
    : "Size not specified";
  const developer =
    typeof listing.developer === "string" && listing.developer.trim()
      ? listing.developer.trim()
      : null;
  const belowMarketLabel =
    item.belowMarketPercent > 0
      ? `${formatPercentValue(item.belowMarketPercent)} Below Market`
      : null;
  const roiLabel =
    item.roiPercent > 0 ? formatPercentValue(item.roiPercent) : null;
  const timeLabel = formatRelativeTime(
    listing.updated_at || listing.created_at,
  );
  const marketValue =
    item.marketAveragePrice && item.marketAveragePrice > 0
      ? formatCurrency(item.marketAveragePrice)
      : null;
  const marketSavingText =
    item.belowMarketAmount > 0
      ? `${formatCurrency(item.belowMarketAmount)} cheaper than market`
      : marketValue
        ? "Priced in line with market"
        : "Market comparison unavailable";
  const footerMeta = [
    {
      icon: MeasureIcon,
      label: size,
    },
    {
      icon: BedIcon,
      label: bedrooms,
    },
    developer
      ? {
          icon: BuildingIcon,
          label: developer,
        }
      : null,
  ].filter(
    (
      entry,
    ): entry is {
      icon: typeof MeasureIcon;
      label: string;
    } => entry !== null && Boolean(entry.label),
  );

  return (
    <article
      style={{ contentVisibility: "auto", containIntrinsicSize: "240px" } as React.CSSProperties}
      className="group flex h-full min-w-0 flex-col overflow-hidden rounded-[16px] border border-[#e6ebf2] bg-white shadow-[0_14px_34px_rgba(15,42,95,0.07)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_22px_46px_rgba(15,42,95,0.11)] md:rounded-[20px]"
    >
      <div className="relative h-[172px] overflow-hidden rounded-t-[16px] bg-[#e7edf5] sm:h-[196px] md:h-[208px] md:rounded-t-[20px]">
        {coverImage ? (
          <Image
            src={coverImage}
            alt={title}
            fill
            className="object-cover transition duration-500 group-hover:scale-[1.03]"
            sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
          />
        ) : (
          <div className="flex h-full items-center justify-center bg-[linear-gradient(135deg,#eef2f8_0%,#dbe5f0_100%)] text-sm font-semibold text-brand-slate">
            Image pending
          </div>
        )}

        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(11,23,48,0.08)_0%,rgba(11,23,48,0.02)_48%,rgba(11,23,48,0.18)_100%)]" />

        <div className="absolute inset-x-0 top-0 flex items-start justify-between gap-3 p-3">
          <span
            className={`inline-flex min-h-[28px] items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold tracking-[-0.01em] shadow-[0_8px_20px_rgba(15,23,42,0.18)] backdrop-blur-md sm:px-3 sm:py-1.5 sm:text-[11px] ${getPrimaryBadgeClasses()}`}
          >
            <span
              className={`h-1.5 w-1.5 shrink-0 rounded-full ${getPrimaryBadgeAccentClasses(primaryBadge)}`}
            />
            {primaryBadge}
          </span>
        </div>
      </div>

      <div className="flex flex-1 flex-col p-3 md:p-4">
        <div className="flex flex-col gap-2 md:flex-row md:flex-wrap md:items-start md:justify-between md:gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <h3 className="line-clamp-2 min-w-0 font-heading text-[1rem] font-semibold leading-[1.18] tracking-[-0.03em] text-brand-ink md:truncate md:text-[1.1rem]">
                {title}
              </h3>
              {inlineBadge ? (
                <span
                  className={`inline-flex min-h-[24px] items-center rounded-[8px] border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] ${inlineBadge.className}`}
                >
                  {inlineBadge.label}
                </span>
              ) : null}
            </div>

            <div className="mt-1 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-[12px] text-[#6f7b90]">
              <span className="min-w-0 truncate font-medium text-[#314057]">
                {area}
              </span>
              <span className="h-1 w-1 rounded-full bg-[#c7cfda]" />
              <span className="font-medium">{propertyType}</span>
            </div>
          </div>

          <div className="min-w-0 shrink-0 text-left md:text-right">
            <p className="break-words font-heading text-[1.18rem] font-semibold leading-tight tracking-[-0.04em] text-brand-ink md:text-[1.45rem] md:leading-none">
              {price}
            </p>
          </div>
        </div>

        <div className="mt-2 flex flex-col gap-1.5 md:mt-3 md:flex-row md:items-center md:justify-between md:gap-3">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            {belowMarketLabel ? (
              <span className="text-[12px] font-semibold tracking-[-0.01em] text-[#8b650c]">
                {belowMarketLabel}
              </span>
            ) : null}
            {roiLabel ? (
              <span className="text-[12px] font-semibold tracking-[-0.01em] text-brand-navy">
                Yield percent: {roiLabel}
              </span>
            ) : null}
            {!belowMarketLabel && !roiLabel ? (
              <p className="min-w-0 truncate text-[0.97rem] font-semibold tracking-[-0.02em] text-[#1f2b43]">
                {item.highlight}
              </p>
            ) : null}
          </div>
          <p className="shrink-0 pt-0.5 text-[12px] font-medium text-[#7c889d]">
            {timeLabel}
          </p>
        </div>

        <p className="mt-2 min-h-[20px] line-clamp-1 text-[13px] leading-5 text-[#6c7890]">
          {marketSavingText}
        </p>

        <div className="mt-auto flex flex-col gap-3 pt-3 md:flex-row md:items-start md:justify-between md:pt-4">
          <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-2 text-[12px] text-[#7a869b]">
            {footerMeta.map((meta) => {
              const Icon = meta.icon;

              return (
                <div
                  key={`${listing.id}-${meta.label}`}
                  className="flex min-w-0 items-center gap-1.5"
                >
                  <Icon className="h-3.5 w-3.5 shrink-0 text-[#8d9ab0]" />
                  <span className="truncate font-medium">{meta.label}</span>
                </div>
              );
            })}
          </div>

          <Link
            href={detailHref}
            onFocus={prefetchDetail}
            onMouseEnter={prefetchDetail}
            onPointerDown={prefetchDetail}
            className="inline-flex min-h-[40px] w-full shrink-0 items-center justify-center gap-1.5 rounded-[10px] bg-brand-navy px-4 py-2 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(15,42,95,0.18)] transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_14px_28px_rgba(15,42,95,0.24)] md:w-auto"
          >
            View Deal
            <ChevronRightIcon className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </article>
  );
}
