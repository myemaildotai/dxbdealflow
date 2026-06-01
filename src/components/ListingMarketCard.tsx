import Image from "next/image";
import Link from "next/link";
import { Listing } from "@/lib/deal-types";
import {
  cn,
  formatCurrency,
  formatDate,
  formatDealType,
  formatNumber,
  formatPropertyType,
  getFullName,
  initials,
} from "@/lib/deal-utils";

type MarketBadgeTone = "gold" | "navy" | "amber" | "light";

type MarketBadge = {
  label: string;
  tone: MarketBadgeTone;
};

const badgeToneClasses: Record<MarketBadgeTone, string> = {
  gold: "border-[#E5C573] bg-[#D4AF37] text-white shadow-[0_10px_22px_rgba(212,175,55,0.26)]",
  navy: "border-[#27457f] bg-[#0F2A5F] text-white shadow-[0_10px_22px_rgba(15,42,95,0.22)]",
  amber: "border-[#F2D3A0] bg-[#FFF1D2] text-[#8C5F07]",
  light: "border-[#D7DEE8] bg-white/95 text-[#546173]",
};

function ClockIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" className={className} aria-hidden="true">
      <circle cx="10" cy="10" r="7.25" stroke="currentColor" strokeWidth="1.5" />
      <path d="M10 6.4V10.2L12.65 11.85" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function DotSeparator() {
  return <span className="h-1 w-1 rounded-full bg-[#C6CDD8]" aria-hidden="true" />;
}

function formatRelativeAge(value: string | null | undefined) {
  if (!value) {
    return "Recently added";
  }

  const timestamp = new Date(value).getTime();

  if (Number.isNaN(timestamp)) {
    return formatDate(value);
  }

  const diff = Date.now() - timestamp;

  if (diff < 0) {
    return "Recently added";
  }

  const minutes = Math.max(1, Math.round(diff / 60000));

  if (minutes < 60) {
    return `${minutes} min ago`;
  }

  const hours = Math.round(diff / 3600000);

  if (hours < 24) {
    return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  }

  const days = Math.round(diff / 86400000);

  if (days < 7) {
    return `${days} day${days === 1 ? "" : "s"} ago`;
  }

  return formatDate(value);
}

function getMarketBadges(listing: Listing) {
  const badges: MarketBadge[] = [];

  if (listing.deal_type === "secondary") {
    badges.push({ label: "OFF-MARKET", tone: "gold" });
  }

  if (listing.deal_type === "distressed") {
    badges.push({ label: "DISTRESSED", tone: "light" });
  }

  if (listing.deal_type === "urgent_sale") {
    badges.push({ label: "HOT DEAL", tone: "amber" });
  }

  if ((listing.status === "active" || listing.status === "approved") && badges.length < 3) {
    badges.push({ label: "EXCLUSIVE", tone: "navy" });
  }

  if (!badges.length) {
    badges.push({
      label: formatDealType(listing.deal_type).toUpperCase(),
      tone: listing.deal_type === "off_plan" ? "navy" : "gold",
    });
  }

  return badges.slice(0, 3);
}

function getMarketSignal(listing: Listing) {
  if (listing.yield_percent) {
    return `${listing.yield_percent}% estimated yield`;
  }

  if (listing.deal_type === "distressed") {
    return "Discounted distressed opportunity";
  }

  if (listing.deal_type === "urgent_sale") {
    return "Seller motivated to close quickly";
  }

  if (listing.payment_plan) {
    return listing.payment_plan;
  }

  if (listing.notes) {
    return listing.notes;
  }

  return "Verified market opportunity";
}

export function ListingMarketCard({ listing }: { listing: Listing }) {
  const coverImage = listing.listing_images?.find((image) => image.is_cover)?.public_url || listing.listing_images?.[0]?.public_url;
  const ownerName = listing.owner
    ? getFullName(listing.owner.first_name, listing.owner.last_name)
    : listing.agency?.name || "Verified Broker";
  const ownerInitials = initials(ownerName);
  const sourceLabel = listing.agency?.name || ownerName;
  const metaItems = [
    listing.area?.name || "Dubai",
    listing.developer || formatPropertyType(listing.property_type),
    listing.bedrooms !== null ? `${listing.bedrooms} ${listing.bedrooms === 1 ? "Bed" : "Beds"}` : null,
    listing.size_sqft ? `${formatNumber(listing.size_sqft)} sqft` : null,
  ].filter(Boolean) as string[];

  return (
    <article className="flex h-full flex-col overflow-hidden rounded-[20px] border border-brand-line bg-white shadow-[0_18px_38px_rgba(15,42,95,0.08)]">
      <div className="relative aspect-[1.72] overflow-hidden bg-[#E8EDF3]">
        {coverImage ? (
          <Image
            src={coverImage}
            alt={listing.title}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
          />
        ) : (
          <div className="flex h-full items-center justify-center bg-[linear-gradient(135deg,#EEF2F6_0%,#DCE3EB_100%)] text-sm font-medium text-[#5B6474]">
            Image pending
          </div>
        )}

        <div className="absolute inset-x-0 top-0 flex items-start justify-between gap-3 p-3">
          <div className="flex flex-wrap items-center gap-2">
            {getMarketBadges(listing).map((badge) => (
              <span
                key={`${listing.id}-${badge.label}`}
                className={cn(
                  "inline-flex items-center rounded-[8px] border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em]",
                  badgeToneClasses[badge.tone]
                )}
              >
                {badge.label}
              </span>
            ))}
          </div>

          {listing.owner_active_listings_count ? (
            <span className="inline-flex items-center rounded-[8px] border border-white/40 bg-white/90 px-3 py-1 text-[11px] font-medium text-[#334155] shadow-[0_10px_20px_rgba(15,23,42,0.12)]">
              +{listing.owner_active_listings_count} live listing{listing.owner_active_listings_count === 1 ? "" : "s"}
            </span>
          ) : null}
        </div>

          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#0f2a5f]/90 via-[#0f2a5f]/35 to-transparent px-4 pb-3 pt-10">
            <p className="text-[11px] font-medium text-white/90">{sourceLabel}</p>
          </div>
      </div>

      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h3 className="line-clamp-2 font-heading text-[17px] font-semibold leading-[1.24] tracking-[-0.02em] text-brand-ink">
              {listing.title}
            </h3>
            <p className="mt-2 line-clamp-1 text-[14px] font-semibold text-brand-gold">{getMarketSignal(listing)}</p>
          </div>

          <div className="shrink-0 text-right">
            <p className="font-heading text-[17px] font-semibold tracking-[-0.03em] text-brand-navy">{formatCurrency(listing.price)}</p>
            <p className="mt-1 text-[12px] font-medium text-brand-slate">{formatPropertyType(listing.property_type)}</p>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-2 text-[13px] text-brand-slate">
          {metaItems.map((item, index) => (
            <div key={`${listing.id}-${item}`} className="flex items-center gap-2">
              {index > 0 ? <DotSeparator /> : null}
              <span>{item}</span>
            </div>
          ))}
        </div>

        <div className="mt-4 flex items-center justify-between gap-3 border-t border-brand-line/80 pt-4">
          <div className="flex min-w-0 items-center gap-3">
            <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-panel-soft text-[12px] font-bold uppercase tracking-[0.12em] text-brand-slate">
              {ownerInitials}
            </span>
            <div className="min-w-0">
              <p className="truncate text-[13px] font-semibold text-brand-ink">{ownerName}</p>
              <div className="mt-1 flex items-center gap-1.5 text-[12px] text-brand-slate">
                <ClockIcon className="h-3.5 w-3.5" />
                <span>{formatRelativeAge(listing.created_at)}</span>
              </div>
            </div>
          </div>

          <Link href={`/listings/${listing.id}`} className="btn-primary min-h-[40px] shrink-0 rounded-[10px] px-5 py-2 text-[13px]">
            View Details
          </Link>
        </div>
      </div>
    </article>
  );
}
