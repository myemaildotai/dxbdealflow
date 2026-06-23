"use client";

import Image from "next/image";
import { FormEvent, ReactNode, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/auth/useAuth";
import { IntentPrefetchLink as Link } from "@/components/IntentPrefetchLink";
import { PublicHeader } from "@/components/PublicHeader";
import { useSessionQuery } from "@/hooks/useSessionQuery";
import { apiFetch, getApiCacheKey } from "@/lib/deal-api";
import { propertyTypeOptions } from "@/lib/deal-constants";
import { cn, formatPropertyType } from "@/lib/deal-utils";
import { Area, PropertyType } from "@/lib/deal-types";
import {
  getListingBedroomLabel,
  getListingBedroomOptions,
  mapListingBedroomValueToFilterValue,
  serializeListingBedroomFilterValue,
} from "@/lib/listing-bedrooms";
import { getDefaultRouteForUser, isPendingBroker } from "@/lib/route-access";

const fallbackAreas: Area[] = [];

const bedroomOptions = [{ value: "", label: "Any Beds" }, ...getListingBedroomOptions()];

function SearchIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <circle
        cx="8.75"
        cy="8.75"
        r="5.75"
        stroke="currentColor"
        strokeWidth="1.45"
      />
      <path
        d="M12.8 12.8L16.25 16.25"
        stroke="currentColor"
        strokeWidth="1.45"
        strokeLinecap="round"
      />
    </svg>
  );
}

function ChevronDownIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M4 6.25L8 10.25L12 6.25"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ArrowRightIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M3.5 8H12.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M8.75 4.25L12.5 8L8.75 11.75"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function BuildingIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M3.25 17.25V5.25C3.25 4.7 3.7 4.25 4.25 4.25H8.75C9.3 4.25 9.75 4.7 9.75 5.25V17.25"
        stroke="currentColor"
        strokeWidth="1.45"
      />
      <path
        d="M9.75 17.25V2.75C9.75 2.2 10.2 1.75 10.75 1.75H15.75C16.3 1.75 16.75 2.2 16.75 2.75V17.25"
        stroke="currentColor"
        strokeWidth="1.45"
      />
      <path
        d="M1.75 17.25H18.25"
        stroke="currentColor"
        strokeWidth="1.45"
        strokeLinecap="round"
      />
      <path
        d="M6.25 7.25H6.75M6.25 10.25H6.75M12.25 5.25H12.75M12.25 8.25H12.75M12.25 11.25H12.75"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  );
}

function LocationPinIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M10 18.25C10 18.25 16 12.6 16 7.8C16 4.5 13.3 1.75 10 1.75C6.7 1.75 4 4.5 4 7.8C4 12.6 10 18.25 10 18.25Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <circle
        cx="10"
        cy="7.85"
        r="2.15"
        stroke="currentColor"
        strokeWidth="1.5"
      />
    </svg>
  );
}

function BedIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M3.25 16.25V6.25"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M16.75 16.25V11.25C16.75 10.15 15.85 9.25 14.75 9.25H3.25V16.25"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M6 9.25V6.75C6 6.2 6.45 5.75 7 5.75H9.25C9.8 5.75 10.25 6.2 10.25 6.75V9.25"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path
        d="M2.25 13.25H17.75"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function UserIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <circle cx="10" cy="6.5" r="3" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M4.75 17.25C5.35 14.65 7.3 13.25 10 13.25C12.7 13.25 14.65 14.65 15.25 17.25"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function ShieldCheckIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M10 18.25C10 18.25 16 15.55 16 9.35V4.25L10 1.75L4 4.25V9.35C4 15.55 10 18.25 10 18.25Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path
        d="M7.25 9.75L9.1 11.6L13 7.75"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function UsersIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <circle
        cx="7.25"
        cy="7"
        r="2.5"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <path
        d="M2.75 16.25C3.25 13.9 4.95 12.65 7.25 12.65C9.55 12.65 11.25 13.9 11.75 16.25"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M12 9.25C13.3 9.25 14.25 8.25 14.25 7C14.25 5.75 13.3 4.75 12 4.75"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M13.25 12.9C15.25 13.15 16.6 14.35 17.05 16.25"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function LockIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <rect
        x="4"
        y="8.25"
        width="12"
        height="8.5"
        rx="1.75"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <path
        d="M6.75 8.25V6.25C6.75 4.45 8.2 3 10 3C11.8 3 13.25 4.45 13.25 6.25V8.25"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M10 11.75V13.45"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function normalizeValue(value: string) {
  return value.trim().toLowerCase();
}

function resolveAreaMatch(value: string, areas: Area[]) {
  const normalizedValue = normalizeValue(value);

  if (!normalizedValue) {
    return null;
  }

  return (
    areas.find((area) => {
      const normalizedSlug = area.slug.toLowerCase();
      const normalizedName = area.name.toLowerCase();
      const normalizedCity = area.city.toLowerCase();
      return (
        normalizedName === normalizedValue ||
        normalizedCity === normalizedValue ||
        normalizedSlug === normalizedValue ||
        normalizedSlug === normalizedValue.replace(/\s+/g, "-")
      );
    }) ||
    areas.find((area) => {
      const normalizedSlug = area.slug.toLowerCase();
      const normalizedName = area.name.toLowerCase();
      const normalizedCity = area.city.toLowerCase();
      return (
        normalizedName.includes(normalizedValue) ||
        normalizedValue.includes(normalizedName) ||
        normalizedCity.includes(normalizedValue) ||
        normalizedSlug.includes(normalizedValue.replace(/\s+/g, "-"))
      );
    }) ||
    null
  );
}

function HeroStat({
  label,
  value,
  helper,
}: {
  label: string;
  value: string | number;
  helper: string;
}) {
  return (
    <div className="rounded-[24px] border border-white/14 bg-white/10 px-5 py-4 text-left shadow-[0_20px_50px_rgba(6,17,41,0.16)] backdrop-blur-xl">
      <p className="text-[11px] font-medium uppercase tracking-[0.24em] text-white/62">
        {label}
      </p>
      <p className="mt-3 font-heading text-3xl font-semibold tracking-[-0.04em] text-white sm:text-[2rem]">
        {value}
      </p>
      <p className="mt-2 text-sm leading-6 text-white/72">{helper}</p>
    </div>
  );
}

function HeroSelect({
  label,
  value,
  onChange,
  children,
  icon,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: ReactNode;
  icon: ReactNode;
}) {
  return (
    <label className="block text-left">
      <span className="mb-2 block text-sm font-semibold text-white/90">
        {label}
      </span>
      <div className="relative">
        <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-brand-navy/70">
          {icon}
        </span>
        <select
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="h-[46px] w-full appearance-none rounded-lg border border-white/70 bg-white pl-11 pr-11 text-sm font-semibold text-brand-ink shadow-[inset_0_1px_0_rgba(255,255,255,0.75)] outline-none transition duration-200 focus:border-[#e7c96f] focus:shadow-[0_0_0_4px_rgba(212,175,55,0.18)] sm:h-[58px] sm:rounded-xl sm:pl-12 sm:pr-12 sm:text-[15px]"
        >
          {children}
        </select>
        <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-brand-navy">
          <ChevronDownIcon />
        </span>
      </div>
    </label>
  );
}

export default function HomePage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { data } = useSessionQuery<{ areas: Area[] }>(
    getApiCacheKey("/api/public/areas"),
    () => apiFetch<{ areas: Area[] }>("/api/public/areas"),
    { ttlMs: 300_000 },
  );
  const [searchValue, setSearchValue] = useState("");
  const [propertyType, setPropertyType] = useState<PropertyType | "">("");
  const [bedrooms, setBedrooms] = useState("");

  const areas = data?.areas ?? fallbackAreas;
  const matchedArea = useMemo(
    () => resolveAreaMatch(searchValue, areas),
    [areas, searchValue],
  );
  const secondaryCta = useMemo(() => {
    if (authLoading) {
      return { href: "/register", label: "Broker Access" };
    }

    if (user?.platformUser) {
      if (isPendingBroker(user)) {
        return { href: "/pending", label: "View Application" };
      }

      return {
        href: getDefaultRouteForUser(user),
        label: "Open Dashboard",
      };
    }

    return { href: "/register", label: "Apply as Broker" };
  }, [authLoading, user]);
  const searchSummary = useMemo(
    () => [
      matchedArea ? matchedArea.name : searchValue.trim() || "Any Location",
      propertyType ? formatPropertyType(propertyType) : "Any Property Type",
      getListingBedroomLabel(bedrooms),
    ],
    [bedrooms, matchedArea, propertyType, searchValue],
  );

  const handleSearchSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const params = new URLSearchParams();
    const trimmedSearch = searchValue.trim();

    if (matchedArea?.id) {
      params.set("areaId", matchedArea.id);
      params.set("location", matchedArea.name);
    }

    if (propertyType) {
      params.set("propertyType", propertyType);
    }

    if (trimmedSearch) {
      params.set("keyword", trimmedSearch);
    }

    const bedroomFilterValue = mapListingBedroomValueToFilterValue(bedrooms);

    if (bedroomFilterValue) {
      params.set("beds", serializeListingBedroomFilterValue(bedroomFilterValue));
    }

    const query = params.toString();
    router.push(query ? `/listings?${query}` : "/listings");
  };

  return (
    <div className={cn("flex min-h-screen flex-col bg-brand-bg text-white")}>
      <PublicHeader />
      <div className="relative isolate flex flex-1 overflow-hidden bg-brand-navy">
        <Image
          src="/assets/homepage.png"
          alt="Dubai skyline and luxury real estate backdrop"
          fill
          priority
          sizes="100vw"
          className="object-cover object-center"
        />

        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(3,10,26,0)_0%,rgba(4,13,31,0.36)_48%,rgba(2,8,20,0.88)_100%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(4,13,31,0.86)_0%,rgba(7,24,57,0.58)_42%,rgba(7,24,57,0.12)_76%,rgba(4,13,31,0.22)_100%)]" />

        <div className="relative z-10 flex flex-1 flex-col">
          <main className="flex flex-1 items-center px-4 py-8 sm:px-6 sm:py-10 md:px-8 md:py-12 lg:px-12 lg:py-14">
            <section
              className="mx-auto w-full min-w-0 max-w-[calc(100vw-2rem)] sm:max-w-[calc(100vw-3rem)] lg:max-w-[1200px] lg:-translate-y-5"
              data-stat-card-component={HeroStat.name}
            >
              <div className="flex w-full min-w-0 max-w-[760px] flex-col items-start text-left">
                <div className="inline-flex items-center gap-2.5 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-[9px] font-bold uppercase tracking-[0.18em] text-white/86 shadow-[0_14px_34px_rgba(2,8,20,0.22)] backdrop-blur-md sm:text-[10px] lg:text-[11px] lg:tracking-[0.22em]">
                  <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-[#E7C96F]/16 text-[#E7C96F]">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#E7C96F]" />
                  </span>
                  Private B2B Property Exchange
                </div>

                <h1 className="mt-6 max-w-full font-heading text-2xl font-bold leading-[1.02] tracking-[-0.055em] text-white sm:text-3xl md:text-4xl lg:max-w-[760px] lg:text-6xl">
                  Your next real estate opportunity{" "}
                  <span className="block text-[#E7C96F] sm:inline">
                    starts here
                  </span>
                </h1>
                <p className="mt-5 max-w-[520px] text-sm leading-6 text-white/78 sm:text-base sm:leading-7 lg:text-lg lg:leading-8">
                  Discover verified listings, connect with trusted brokers, and
                  move faster in a private B2B property network.
                </p>

                <div className="mt-7 flex w-full max-w-full flex-col gap-3 sm:w-auto sm:flex-row sm:gap-4">
                  <Link
                    href="/listings"
                    className="inline-flex h-[52px] w-full items-center justify-center gap-3 rounded-full bg-[linear-gradient(135deg,#E7C96F_0%,#D4AF37_100%)] px-6 text-[15px] font-bold text-[#07142F] shadow-[0_18px_38px_rgba(212,175,55,0.24)] transition duration-200 hover:scale-[1.03] hover:shadow-[0_24px_52px_rgba(212,175,55,0.32)] sm:w-auto sm:min-w-[244px]"
                  >
                    <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/28 text-[#07142F]">
                      <BuildingIcon className="h-5 w-5" />
                    </span>
                    <span className="min-w-0 flex-1 text-center sm:flex-none">
                      Explore Listings
                    </span>
                    <ArrowRightIcon className="h-5 w-5 shrink-0" />
                  </Link>
                  <Link
                    href={secondaryCta.href}
                    className="inline-flex h-[52px] w-full items-center justify-center gap-3 rounded-full border border-white/25 bg-white/10 px-6 text-[15px] font-bold text-white shadow-[0_18px_38px_rgba(2,8,20,0.18)] backdrop-blur-xl transition duration-200 hover:scale-[1.02] hover:border-white/45 hover:bg-white/20 sm:w-auto sm:min-w-[244px]"
                  >
                    <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/28 bg-white/8 text-white">
                      <UserIcon className="h-5 w-5" />
                    </span>
                    <span className="min-w-0 flex-1 text-center sm:flex-none">
                      {secondaryCta.label}
                    </span>
                    <ArrowRightIcon className="h-5 w-5 shrink-0 text-white/86" />
                  </Link>
                </div>
              </div>

              <div className="mt-7 w-full max-w-full rounded-[18px] border border-white/20 bg-white/10 p-4 shadow-[0_32px_100px_rgba(2,8,20,0.38)] backdrop-blur-2xl sm:rounded-[24px] sm:p-6 lg:mt-9">
                <div className="mb-4 flex items-center gap-3">
                  <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/10 text-white/82">
                    <SearchIcon className="h-4 w-4" />
                  </span>
                  <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-white/72">
                    Find the right property
                  </p>
                  <span className="hidden h-px flex-1 bg-white/16 sm:block" />
                </div>

                <form
                  onSubmit={handleSearchSubmit}
                  aria-label={`Search listings: ${searchSummary.join(", ")}`}
                  className="grid gap-4 lg:grid-cols-[minmax(0,1.55fr)_minmax(190px,1fr)_minmax(155px,0.72fr)_minmax(160px,0.72fr)] lg:items-end"
                >
                  <label className="block text-left">
                    <span className="mb-2 block text-sm font-semibold text-white/90">
                      Search
                    </span>
                    <div className="relative">
                      <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-brand-navy/70">
                        <LocationPinIcon />
                      </span>
                      <input
                        type="text"
                        value={searchValue}
                        onChange={(event) => setSearchValue(event.target.value)}
                        placeholder="Community, tower, or area"
                        list="homepage-area-suggestions"
                        className="h-[46px] w-full rounded-lg border border-white/70 bg-white pl-11 pr-3 text-sm font-semibold text-brand-ink shadow-[inset_0_1px_0_rgba(255,255,255,0.75)] outline-none transition duration-200 placeholder:text-brand-slate/72 focus:border-[#e7c96f] focus:shadow-[0_0_0_4px_rgba(212,175,55,0.18)] sm:h-[58px] sm:rounded-xl sm:pl-12 sm:pr-4 sm:text-[15px]"
                      />
                    </div>
                  </label>

                  <HeroSelect
                    label="Property Type"
                    value={propertyType}
                    onChange={(value) =>
                      setPropertyType(value as PropertyType | "")
                    }
                    icon={<BuildingIcon className="h-5 w-5" />}
                  >
                    <option value="" className="text-brand-ink">
                      Any Property
                    </option>
                    {propertyTypeOptions.map((type) => (
                      <option
                        key={type}
                        value={type}
                        className="text-brand-ink"
                      >
                        {formatPropertyType(type)}
                      </option>
                    ))}
                  </HeroSelect>

                  <HeroSelect
                    label="Beds"
                    value={bedrooms}
                    onChange={setBedrooms}
                    icon={<BedIcon className="h-5 w-5" />}
                  >
                    {bedroomOptions.map((option) => (
                      <option
                        key={option.value || "any"}
                        value={option.value}
                        className="text-brand-ink"
                      >
                        {option.label}
                      </option>
                    ))}
                  </HeroSelect>

                  <button
                    type="submit"
                    className="inline-flex h-[46px] w-full items-center justify-center gap-2 rounded-lg border border-white/35 bg-[linear-gradient(135deg,#E7C96F_0%,#D4AF37_100%)] px-4 text-sm font-bold text-[#07142F] shadow-[0_18px_38px_rgba(15,42,95,0.34)] transition duration-200 hover:scale-[1.02] hover:bg-[#0B214C] hover:shadow-[0_24px_48px_rgba(15,42,95,0.42)] sm:h-[58px] sm:gap-3 sm:rounded-xl sm:px-7 sm:text-[15px]"
                  >
                    Search
                    <ArrowRightIcon className="h-5 w-5" />
                  </button>
                </form>

                <div className="mt-5 grid gap-4 border-t border-white/10 pt-5 md:grid-cols-3 md:gap-0 md:divide-x md:divide-white/10">
                  <div className="flex items-center gap-4 md:px-6 md:first:pl-0 md:last:pr-0">
                    <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white/10 text-[#E7C96F] shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]">
                      <ShieldCheckIcon className="h-6 w-6" />
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-white">
                        Verified Listings
                      </p>
                      <p className="mt-1 text-xs text-white/60">
                        Quality you can trust
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 md:px-6 md:first:pl-0 md:last:pr-0">
                    <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white/10 text-[#E7C96F] shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]">
                      <UsersIcon className="h-6 w-6" />
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-white">
                        Trusted Brokers
                      </p>
                      <p className="mt-1 text-xs text-white/60">
                        Connect with experts
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 md:px-6 md:first:pl-0 md:last:pr-0">
                    <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white/10 text-[#E7C96F] shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]">
                      <LockIcon className="h-6 w-6" />
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-white">
                        Private Network
                      </p>
                      <p className="mt-1 text-xs text-white/60">
                        Secure and confidential
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          </main>
        </div>
      </div>
    </div>
  );
}
