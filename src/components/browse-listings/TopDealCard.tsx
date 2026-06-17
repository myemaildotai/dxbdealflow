"use client";

import Image from "next/image";
import Link from "next/link";
import { prefetchApi } from "@/lib/deal-api";
import { createListingDetailHref } from "@/lib/listing-navigation";
import { formatCurrency, formatNumber } from "@/lib/deal-utils";
import {
  ListingIntel,
  formatPercentValue,
  formatRelativeTime,
  getCoverImage,
  getHeroTagLabel,
  getListingAreaLabel,
  getListingDeveloperLabel,
} from "@/components/browse-listings/browse-listings-utils";

function TickIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <path
        d="m5.1 10.2 3.1 3.1 6.7-6.7"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function DealBadgeIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <path
        d="m10.2 4.35 4.95.02.02 4.93-6.62 6.62a1.45 1.45 0 0 1-2.05 0l-2.52-2.52a1.45 1.45 0 0 1 0-2.05l6.22-6.22Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <circle cx="13.15" cy="6.45" r=".8" fill="currentColor" />
    </svg>
  );
}

function AlertBadgeIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M10 3.2 17 16.15H3L10 3.2Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path
        d="M10 7.2v3.85"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <circle cx="10" cy="13.45" r=".8" fill="currentColor" />
    </svg>
  );
}

function ClockIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <circle cx="10" cy="10" r="7" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M10 6.5v3.8l2.4 1.6"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function PinIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M10 16.4c2.8-3 4.6-5.3 4.6-7.8a4.6 4.6 0 1 0-9.2 0c0 2.5 1.8 4.8 4.6 7.8Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <circle
        cx="10"
        cy="8.7"
        r="1.7"
        stroke="currentColor"
        strokeWidth="1.5"
      />
    </svg>
  );
}

function HomeIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M4.5 9.1 10 4.6l5.5 4.5v6a1 1 0 0 1-1 1H5.5a1 1 0 0 1-1-1v-6Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path
        d="M8 16.1v-4.4h4v4.4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function BuildingIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M5 16.3V5.2A1.2 1.2 0 0 1 6.2 4h7.6A1.2 1.2 0 0 1 15 5.2v11.1"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <path
        d="M3.8 16.3h12.4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M8 7.2h.1M12 7.2h.1M8 10.1h.1M12 10.1h.1"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function CoinIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <circle cx="10" cy="10" r="6.2" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M8.25 8.35c0-.85.78-1.5 1.8-1.5.84 0 1.62.36 2 .96M11.75 11.65c0 .85-.78 1.5-1.8 1.5-.84 0-1.62-.36-2-.96M10 6.35v7.3"
        stroke="currentColor"
        strokeWidth="1.35"
        strokeLinecap="round"
      />
    </svg>
  );
}

function TagIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <path
        d="m10.3 4.4 5.15.02.02 5.13-6.88 6.88a1.5 1.5 0 0 1-2.12 0l-2.9-2.9a1.5 1.5 0 0 1 0-2.12l6.73-6.73Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <circle cx="13.4" cy="6.55" r=".85" fill="currentColor" />
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

function getSubtitleSegments(item: ListingIntel) {
  const listing = item.listing;
  const bedsLabel =
    listing.bedrooms !== null
      ? `${listing.bedrooms}BR${/\bmaid\b/i.test([listing.title, listing.description, listing.notes].filter(Boolean).join(" ")) ? " + Maid" : ""}`
      : null;
  const areaLabel = getListingAreaLabel(listing);
  const titleParts = listing.title
    .split("|")
    .map((part) => part.trim())
    .filter(Boolean);
  const tailPart =
    titleParts.length > 1 ? titleParts[titleParts.length - 1] : listing.title;

  return [bedsLabel, areaLabel, tailPart].filter(Boolean) as string[];
}

function getMetaTokens(item: ListingIntel) {
  const listing = item.listing;
  const hasMaid = /\bmaid\b/i.test(
    [listing.title, listing.description, listing.notes]
      .filter(Boolean)
      .join(" "),
  );

  return [
    listing.size_sqft ? `${formatNumber(listing.size_sqft)} sft` : null,
    listing.bedrooms !== null
      ? `${listing.bedrooms} ${listing.bedrooms === 1 ? "Bed" : "Beds"}`
      : null,
    hasMaid ? "Maid" : null,
    getListingDeveloperLabel(listing),
  ].filter(Boolean) as string[];
}

export function TopDealCard({
  item,
  listingReturnHref,
}: {
  item: ListingIntel;
  listingReturnHref?: string;
}) {
  const listing = item.listing;
  const detailHref = createListingDetailHref(listing.id, listingReturnHref);
  const detailApiPath = `/api/listings/${listing.id}`;
  const prefetchDetail = () => {
    prefetchApi(detailApiPath, {}, { ttlMs: 60_000 });
  };
  const listingTitle = listing.title.trim() || "Untitled Listing";
  const coverImage = getCoverImage(listing);
  const heroTag = getHeroTagLabel(item);
  const subtitle = getSubtitleSegments(item).join(" | ");
  const showSubtitle =
    Boolean(subtitle) &&
    subtitle.trim().toLowerCase() !== listingTitle.trim().toLowerCase();
  const metaTokens = getMetaTokens(item);
  const firstBullet =
    item.belowMarketAmount > 0
      ? `${formatCurrency(item.belowMarketAmount)} below market average in ${getListingAreaLabel(listing)}`
      : `Comparable pricing benchmarked across ${Math.max(item.comparableCount, 1)} local listing${item.comparableCount === 1 ? "" : "s"}`;
  const secondBullet =
    item.reason && item.reason !== firstBullet
      ? item.reason
      : listing.payment_plan ||
        `Listed by ${getListingDeveloperLabel(listing)}`;
  const footerBelowMarket =
    item.belowMarketPercent > 0
      ? `${formatPercentValue(item.belowMarketPercent)} Below Market`
      : "Market Aligned";
  const footerRoi =
    item.roiPercent > 0
      ? `${formatPercentValue(item.roiPercent)} Net ROI`
      : "ROI Pending";
  const bottomBadgeLabel = item.isDistressed
    ? "DISTRESSED"
    : heroTag.toUpperCase();
  const signalBadges = [
    item.belowMarketPercent > 0
      ? {
          label: "Best Deals",
          icon: DealBadgeIcon,
          className:
            "border-[#e7ebf4] bg-white text-[#22314c] shadow-[0_8px_18px_rgba(15,42,95,0.05)]",
          iconWrapClass: "bg-[#fff4d7] text-[#b0841b]",
        }
      : null,
    item.isUrgentSeller
      ? {
          label: "Urgent Sellers",
          icon: AlertBadgeIcon,
          className:
            "border-[#e7ebf4] bg-white text-[#22314c] shadow-[0_8px_18px_rgba(15,42,95,0.05)]",
          iconWrapClass: "bg-[#fff0e7] text-[#ba6243]",
        }
      : null,
  ].filter(Boolean) as Array<{
    label: string;
    icon: typeof DealBadgeIcon;
    className: string;
    iconWrapClass: string;
  }>;
  const metaItems = [
    {
      icon: ClockIcon,
      label: `Updated ${formatRelativeTime(listing.updated_at)}`,
    },
    { icon: PinIcon, label: metaTokens[0] || "Size on request" },
    { icon: HomeIcon, label: metaTokens[1] || "Beds on request" },
    {
      icon: BuildingIcon,
      label:
        metaTokens.slice(2).join(" / ") || getListingDeveloperLabel(listing),
    },
  ];
  const [updatedMetaItem, ...secondaryMetaItems] = metaItems;
  const UpdatedMetaIcon = updatedMetaItem.icon;
  const marketSummary =
    item.belowMarketAmount > 0
      ? `${formatCurrency(item.belowMarketAmount)} cheaper than market`
      : "Priced in line with current market";

  return (
    <article className="overflow-hidden rounded-[14px] border border-[#e6ebf2] bg-[linear-gradient(180deg,#ffffff_0%,#fbfcff_100%)] shadow-[0_12px_34px_rgba(15,42,95,0.07)] lg:rounded-[16px]">
      <div className="grid gap-3 p-2.5 sm:p-3 lg:grid-cols-[minmax(280px,0.78fr)_minmax(0,1.62fr)] lg:gap-[18px] lg:p-4">
        <div className="flex min-w-0 flex-col rounded-[14px] bg-[linear-gradient(180deg,#ffffff_0%,#fafbfe_100%)] p-1.5 lg:rounded-[18px] lg:p-2">
          <p className="font-heading text-[1.35rem] font-bold tracking-[-0.05em] text-brand-navy sm:text-[1.6rem] lg:text-[2.2rem]">
            Top Deal of the Day
          </p>
          <h2 className="mt-1.5 line-clamp-2 font-heading text-[1.15rem] font-semibold leading-[1.18] tracking-[-0.04em] text-[#1d2b45] sm:text-[1.3rem] lg:mt-2 lg:text-[1.65rem]">
            {listingTitle}
          </h2>
          {showSubtitle ? (
            <p className="mt-1.5 line-clamp-2 text-[13px] font-medium leading-5 tracking-[-0.02em] text-[#5f6d84] lg:mt-2 lg:text-[15px] lg:leading-6">
              {subtitle}
            </p>
          ) : null}

          <div className="mt-2 flex flex-wrap items-center gap-2 lg:gap-2.5">
            <p className="break-words font-heading text-[1.45rem] font-semibold tracking-[-0.05em] text-brand-navy sm:text-[1.7rem] lg:text-[2.2rem]">
              {formatCurrency(listing.price)}
            </p>
            <span className="inline-flex min-h-[26px] items-center rounded-full bg-[#f3e2a9] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#7c5b0d] lg:min-h-[30px] lg:px-3 lg:text-[11px] lg:tracking-[0.14em]">
              {heroTag.toUpperCase()}
            </span>
          </div>

          <ul className="mt-2 space-y-2 text-[13px] leading-5 text-[#425168] lg:mt-3 lg:space-y-2.5 lg:text-[16px] lg:leading-6">
            {[firstBullet, secondBullet].map((line) => (
              <li key={line} className="flex items-start gap-2 lg:gap-3">
                <span className="mt-[2px] inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-brand-navy lg:h-5 lg:w-5">
                  <TickIcon className="h-3 w-3 lg:h-3.5 lg:w-3.5" />
                </span>
                <span>{line}</span>
              </li>
            ))}
          </ul>

          <div className="mt-2.5 h-px w-full bg-[#e8edf4] lg:mt-3" />

          <div className="mt-2.5 space-y-2 text-[#64748b] lg:mt-3 lg:space-y-2.5">
            <div className="flex items-center gap-2 text-[13px] lg:gap-2.5 lg:text-[14px]">
              <UpdatedMetaIcon className="h-4 w-4 shrink-0 text-[#7e8ba0]" />
              <span className="min-w-0 truncate font-medium">
                {updatedMetaItem.label}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[13px] lg:gap-x-4 lg:gap-y-2 lg:text-[14px]">
              {secondaryMetaItems.map((itemMeta, index) => {
                const Icon = itemMeta.icon;

                return (
                  <div
                    key={`${itemMeta.label}-${index}`}
                    className="flex min-w-0 items-center gap-2.5"
                  >
                    <Icon className="h-4 w-4 shrink-0 text-[#7e8ba0]" />
                    <span className="min-w-0 truncate font-medium">
                      {itemMeta.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {signalBadges.length ? (
            <div className="mt-3 flex flex-wrap gap-2 lg:mt-5">
              {signalBadges.map((badge) => {
                const Icon = badge.icon;

                return (
                  <div
                    key={badge.label}
                    className={`inline-flex min-h-[36px] items-center gap-2 rounded-[10px] border px-2.5 py-2 text-[13px] font-semibold tracking-[-0.02em] lg:min-h-[46px] lg:gap-2.5 lg:rounded-[14px] lg:px-3.5 lg:py-2.5 lg:text-[15px] ${badge.className}`}
                  >
                    <span
                      className={`inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full lg:h-7 lg:w-7 ${badge.iconWrapClass}`}
                    >
                      <Icon className="h-[18px] w-[18px]" />
                    </span>
                    <span className="whitespace-nowrap">{badge.label}</span>
                  </div>
                );
              })}
            </div>
          ) : null}
        </div>

        <div className="flex min-w-0 flex-col rounded-[14px] bg-white lg:rounded-[18px]">
          <div className="relative overflow-hidden rounded-[14px] border border-[#e6ebf2] bg-[#e8eef7] lg:rounded-[18px]">
            <div className="relative h-[168px] w-full sm:h-[190px] lg:h-[275px]">
              {coverImage ? (
                <Image
                  src={coverImage}
                  alt={listingTitle}
                  fill
                  className="object-cover"
                  sizes="(max-width: 1024px) 100vw, 68vw"
                  priority
                />
              ) : (
                <div className="flex h-full items-center justify-center bg-[linear-gradient(135deg,#eef2f8_0%,#dbe5f0_100%)] text-sm font-semibold text-brand-slate">
                  Image pending
                </div>
              )}

              <div className="absolute left-3 top-3">
                <span className="inline-flex items-center rounded-[8px] bg-[#f5ebc9] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#775d1a] shadow-[0_8px_16px_rgba(15,42,95,0.08)]">
                  TOP DEAL
                </span>
              </div>

              <div className="absolute bottom-3 left-3">
                <span className="inline-flex items-center rounded-[10px] bg-brand-navy px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-white shadow-[0_8px_18px_rgba(15,42,95,0.18)]">
                  {bottomBadgeLabel}
                </span>
              </div>
            </div>
          </div>

          <div className="grid gap-2 border-b border-[#e8edf4] px-1.5 pb-2 pt-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-center lg:gap-3 lg:px-2">
            <div className="flex min-w-0 items-center gap-2 text-[15px] font-semibold tracking-[-0.03em] text-[#22314c] lg:text-[24px]">
              <TagIcon className="h-5 w-5 shrink-0 text-[#1f2b43] lg:h-8 lg:w-8" />
              <span className="min-w-0 break-words">{footerBelowMarket}</span>
            </div>

            <div className="flex min-w-0 items-center gap-2 text-[15px] font-semibold tracking-[-0.03em] text-[#22314c] lg:text-[24px]">
              <CoinIcon className="h-5 w-5 shrink-0 text-[#d3a11f] lg:h-8 lg:w-8" />
              <span className="min-w-0 break-words">{footerRoi}</span>
            </div>

            <div className="text-left sm:text-right">
              <p className="break-words font-heading text-[1.35rem] font-semibold tracking-[-0.05em] text-brand-navy lg:text-[2rem]">
                {formatCurrency(listing.price)}
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-3 px-1.5 pt-3 sm:flex-row sm:items-start sm:justify-between lg:gap-4 lg:px-2 lg:pt-4">
            <div className="min-w-0">
              <p className="text-[14px] font-medium text-[#3f4d65] lg:text-[18px]">
                {marketSummary}
              </p>
            </div>

            <div className="flex w-full sm:w-auto sm:justify-end">
              <Link
                href={detailHref}
                onFocus={prefetchDetail}
                onMouseEnter={prefetchDetail}
                onPointerDown={prefetchDetail}
                className="inline-flex min-h-[40px] w-full items-center justify-center gap-2 rounded-[10px] bg-[linear-gradient(135deg,#e4c25a_0%,#cfa437_55%,#b88915_100%)] px-4 py-2 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(201,160,47,0.28)] transition duration-200 hover:brightness-105 sm:w-auto lg:min-h-[44px] lg:rounded-[12px] lg:px-8 lg:py-3 lg:text-[20px]"
              >
                View Deal
                <ChevronRightIcon className="h-6 w-6" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}
