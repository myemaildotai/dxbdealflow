"use client";

import { ReactNode, useEffect, useRef, useState } from "react";
import { Area, PropertyType } from "@/lib/deal-types";
import { cn } from "@/lib/deal-utils";
import {
  SelectOption,
  SortOption,
} from "@/components/browse-listings/browse-listings-utils";

export type AppliedFilterChip = {
  id: string;
  label: string;
  onRemove: () => void;
};

type DropdownId =
  | "location"
  | "property-type"
  | "beds"
  | "price"
  | "deal-type"
  | "more-filters"
  | "sort"
  | null;

function ChevronDownIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <path
        d="m5.5 7.8 4.5 4.5 4.5-4.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function SearchIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <circle
        cx="8.8"
        cy="8.8"
        r="5.8"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <path
        d="M12.95 12.95 16.4 16.4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function CloseIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <path
        d="m6 6 8 8M14 6l-8 8"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
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
        d="M10 16.2c2.75-2.98 4.52-5.28 4.52-7.75a4.52 4.52 0 1 0-9.04 0c0 2.47 1.77 4.77 4.52 7.75Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <circle
        cx="10"
        cy="8.55"
        r="1.65"
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
        d="M4.55 9.05 10 4.55l5.45 4.5v6.1a1 1 0 0 1-1 1H5.55a1 1 0 0 1-1-1v-6.1Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path
        d="M8 16.15v-4.4h4v4.4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function BedIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M3.8 10.7h12.4v3.6H3.8v-3.6Zm2.1-3.8h2.5a1.6 1.6 0 0 1 1.6 1.6v2.2H4.3V8.5a1.6 1.6 0 0 1 1.6-1.6Zm7.6 1.1h.4a2.3 2.3 0 0 1 2.3 2.3v.4H10V8.5A1.6 1.6 0 0 1 11.6 6.9h1.9Z"
        stroke="currentColor"
        strokeWidth="1.45"
        strokeLinejoin="round"
      />
      <path
        d="M3.8 14.3v1.9M16.2 14.3v1.9"
        stroke="currentColor"
        strokeWidth="1.45"
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
        d="m10.2 4.25 5.2.02.03 5.18-6.96 6.95a1.5 1.5 0 0 1-2.12 0l-2.77-2.77a1.5 1.5 0 0 1 0-2.12l6.62-6.62Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <circle cx="13.45" cy="6.55" r=".85" fill="currentColor" />
    </svg>
  );
}

function SparkIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M10 3.1 11.45 7l3.95 1.45-3.95 1.45L10 13.8 8.55 9.9 4.6 8.45 8.55 7 10 3.1Z"
        fill="currentColor"
      />
    </svg>
  );
}

function SlidersIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M4 5.6h12M4 10h12M4 14.4h12"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <circle cx="7" cy="5.6" r="1.35" fill="currentColor" />
      <circle cx="12.8" cy="10" r="1.35" fill="currentColor" />
      <circle cx="9.1" cy="14.4" r="1.35" fill="currentColor" />
    </svg>
  );
}

function SortIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M6.1 4.2v11.6M6.1 15.8 3.95 13.65M6.1 15.8l2.15-2.15M13.9 15.8V4.2M13.9 4.2 11.75 6.35M13.9 4.2l2.15 2.15"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CheckIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <path
        d="m5.25 10.1 3.1 3.1 6.4-6.4"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function formatPropertyTypeLabel(value: string) {
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function MenuSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div>
      <p className="px-4 pt-4 text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-slate">
        {title}
      </p>
      <div className="mt-2">{children}</div>
    </div>
  );
}

function OptionButton({
  selected,
  onClick,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center justify-between gap-3 px-4 py-3 text-left text-sm transition duration-150",
        selected
          ? "bg-brand-navy/10 text-brand-navy"
          : "text-[#314057] hover:bg-[#f8fbff]",
      )}
    >
      <span className="min-w-0 truncate font-medium">{children}</span>
      <span
        className={cn(
          "shrink-0 transition duration-150",
          selected ? "opacity-100 text-brand-navy" : "opacity-0",
        )}
      >
        <CheckIcon className="h-4 w-4" />
      </span>
    </button>
  );
}

function AppliedFilterTag({
  label,
  onRemove,
}: AppliedFilterChip) {
  return (
    <span className="inline-flex min-w-0 max-w-full items-center gap-1.5 rounded-full border border-[#cfdceb] bg-[linear-gradient(180deg,#f6f9fe_0%,#edf4fb_100%)] px-3 py-1.5 text-[13px] font-semibold text-[#24314c] shadow-[0_8px_18px_rgba(15,42,95,0.05)]">
      <span className="truncate">{label}</span>
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remove ${label}`}
        className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-[#d4dfed] bg-white/90 text-[#5f6f88] transition duration-150 hover:border-[#bccde0] hover:bg-white hover:text-brand-navy"
      >
        <CloseIcon className="h-3 w-3" />
      </button>
    </span>
  );
}

function PillDropdown({
  dropdownId,
  openMenu,
  onToggle,
  icon,
  label,
  active,
  children,
  align = "left",
  menuPlacement = "absolute",
  menuWidthClass = "w-[min(18rem,calc(100vw-2rem))]",
  className,
}: {
  dropdownId: Exclude<DropdownId, null>;
  openMenu: DropdownId;
  onToggle: (dropdownId: Exclude<DropdownId, null>) => void;
  icon: ReactNode;
  label: string;
  active?: boolean;
  children: ReactNode;
  align?: "left" | "right";
  menuPlacement?: "absolute" | "static";
  menuWidthClass?: string;
  className?: string;
}) {
  const isOpen = openMenu === dropdownId;
  const isStaticMenu = menuPlacement === "static";

  return (
    <div className={cn("relative min-w-0 flex-1 overflow-visible sm:flex-none", isStaticMenu && "w-full flex-none", className)}>
      <button
        type="button"
        onClick={() => onToggle(dropdownId)}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        className={cn(
          "inline-flex min-h-[40px] w-full min-w-0 items-center justify-between gap-2 rounded-full border px-3 py-1.5 text-sm font-semibold shadow-[0_8px_22px_rgba(15,42,95,0.05)] transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_14px_26px_rgba(15,42,95,0.08)] sm:px-4",
          !isStaticMenu && "sm:w-auto",
          active
            ? "border-brand-navy/40 bg-brand-navy/10 text-brand-navy"
            : "border-[#e2e8f0] bg-white text-[#2a3850]",
        )}
      >
        <span
          className={cn(
            "inline-flex h-8 w-8 items-center justify-center rounded-full",
            active
              ? "bg-brand-navy/10 text-brand-navy"
              : "bg-[#f5f7fb] text-[#607089]",
          )}
        >
          {icon}
        </span>
        <span className="min-w-0 truncate whitespace-nowrap">{label}</span>
        <ChevronDownIcon
          className={cn(
            "h-4 w-4 shrink-0 transition duration-200",
            isOpen ? "rotate-180 text-brand-navy" : "text-[#7c889c]",
          )}
        />
      </button>

      {isOpen ? (
        <div
          role="dialog"
          className={cn(
            isStaticMenu
              ? "relative mt-2 max-h-[min(320px,calc(100dvh-12rem))] w-full max-w-full overflow-y-auto rounded-[16px] border border-[#e3e8f0] bg-white shadow-[0_16px_34px_rgba(15,42,95,0.1)]"
              : "absolute top-[calc(100%+0.75rem)] z-[160] max-h-[min(320px,calc(100dvh-8rem))] max-w-[calc(100vw-1rem)] overflow-y-auto rounded-[16px] border border-[#e3e8f0] bg-white shadow-[0_20px_44px_rgba(15,42,95,0.14)] sm:rounded-[20px]",
            menuWidthClass,
            !isStaticMenu && (align === "right" ? "right-0" : "left-0"),
          )}
        >
          {children}
        </div>
      ) : null}
    </div>
  );
}

export function ListingsFilterBar({
  areas,
  propertyTypes,
  bedOptions,
  priceOptions,
  roiOptions,
  dealTypeOptions,
  addedTimeOptions,
  sortOptions,
  activeFilterCount,
  appliedFilters,
  filters,
  onSearchChange,
  onAreaChange,
  onPropertyTypeChange,
  onBedsChange,
  onPriceRangeChange,
  onRoiChange,
  onDealTypeChange,
  onAddedTimeChange,
  onSortChange,
  onMinPriceChange,
  onMaxPriceChange,
  onClearAll,
}: {
  areas: Area[];
  propertyTypes: PropertyType[];
  bedOptions: SelectOption[];
  priceOptions: SelectOption[];
  roiOptions: SelectOption[];
  dealTypeOptions: SelectOption[];
  addedTimeOptions: SelectOption[];
  sortOptions: SelectOption[];
  activeFilterCount: number;
  appliedFilters: AppliedFilterChip[];
  filters: {
    search: string;
    areaId: string;
    propertyType: string;
    beds: string;
    priceRange: string;
    roi: string;
    dealType: string;
    addedTime: string;
    sort: SortOption;
    minPrice: string;
    maxPrice: string;
  };
  onSearchChange: (value: string) => void;
  onAreaChange: (value: string) => void;
  onPropertyTypeChange: (value: string) => void;
  onBedsChange: (value: string) => void;
  onPriceRangeChange: (value: string) => void;
  onRoiChange: (value: string) => void;
  onDealTypeChange: (value: string) => void;
  onAddedTimeChange: (value: string) => void;
  onSortChange: (value: SortOption) => void;
  onMinPriceChange: (value: string) => void;
  onMaxPriceChange: (value: string) => void;
  onClearAll: () => void;
}) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [openMenu, setOpenMenu] = useState<DropdownId>(null);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpenMenu(null);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpenMenu(null);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  useEffect(() => {
    if (!isMobileDrawerOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsMobileDrawerOpen(false);
        setOpenMenu(null);
      }
    }

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isMobileDrawerOpen]);

  const toggleMenu = (dropdownId: Exclude<DropdownId, null>) => {
    setOpenMenu((current) => (current === dropdownId ? null : dropdownId));
  };

  const selectablePriceOptions = priceOptions.filter(
    (option) => option.value !== "custom",
  );

  const renderSearchControl = (placeholder = "Search by location, building, developer, or keyword") => (
    <div className="relative min-w-0 flex-1">
      <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#7b889d]">
        <SearchIcon className="h-4 w-4" />
      </span>

      <input
        type="text"
        value={filters.search}
        onChange={(event) => onSearchChange(event.target.value)}
        placeholder={placeholder}
        className="h-[46px] w-full rounded-full border border-[#e2e8f0] bg-white pl-11 pr-12 text-sm font-medium text-brand-ink shadow-[0_8px_22px_rgba(15,42,95,0.04)] outline-none transition duration-200 placeholder:text-[#90a0b5] focus:border-brand-blue/25 focus:shadow-[0_0_0_4px_rgba(212,175,55,0.12)] sm:h-[54px]"
      />

      {filters.search ? (
        <button
          type="button"
          onClick={() => onSearchChange("")}
          aria-label="Clear search"
          className="absolute right-3 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-[#f4f7fb] text-[#63748c] transition duration-150 hover:bg-[#eaf0f7] hover:text-brand-navy"
        >
          <CloseIcon className="h-4 w-4" />
        </button>
      ) : null}
    </div>
  );

  const renderAppliedFilters = () =>
    appliedFilters.length ? (
      <div className="flex flex-wrap items-center gap-2 overflow-visible sm:gap-2.5">
        {appliedFilters.map((filter) => (
          <AppliedFilterTag
            key={filter.id}
            id={filter.id}
            label={filter.label}
            onRemove={filter.onRemove}
          />
        ))}
      </div>
    ) : null;

  const renderClearAllButton = (className?: string) => (
    <button
      type="button"
      onClick={onClearAll}
      disabled={activeFilterCount === 0}
      className={cn(
        "inline-flex min-h-[40px] items-center justify-center rounded-full border border-[#e2e8f0] bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-brand-navy shadow-[0_8px_18px_rgba(15,42,95,0.04)] transition duration-200 hover:-translate-y-0.5 hover:border-brand-blue/20 disabled:cursor-not-allowed disabled:opacity-55",
        className,
      )}
    >
      Clear All
    </button>
  );

  const renderFilterControls = (menuPlacement: "absolute" | "static" = "absolute") => (
    <div className="relative overflow-visible">
      <div
        className={cn(
          menuPlacement === "static"
            ? "grid grid-cols-1 gap-2 overflow-visible sm:grid-cols-2 sm:gap-3"
            : "flex flex-wrap items-center gap-2 overflow-visible sm:gap-3",
        )}
      >
            <PillDropdown
              dropdownId="location"
              openMenu={openMenu}
              onToggle={toggleMenu}
              icon={<PinIcon className="h-4 w-4" />}
              label="Location"
              active={Boolean(filters.areaId)}
              menuPlacement={menuPlacement}
              menuWidthClass="w-[min(18rem,calc(100vw-2rem))]"
            >
              <div className="py-2">
                <OptionButton
                  selected={!filters.areaId}
                  onClick={() => {
                    onAreaChange("");
                    setOpenMenu(null);
                  }}
                >
                  All Locations
                </OptionButton>

                {areas.map((area) => (
                  <OptionButton
                    key={area.id}
                    selected={filters.areaId === area.id}
                    onClick={() => {
                      onAreaChange(area.id);
                      setOpenMenu(null);
                    }}
                  >
                    {area.name}
                  </OptionButton>
                ))}
              </div>
            </PillDropdown>

            <PillDropdown
              dropdownId="property-type"
              openMenu={openMenu}
              onToggle={toggleMenu}
              icon={<HomeIcon className="h-4 w-4" />}
              label="Property Type"
              active={Boolean(filters.propertyType)}
              menuPlacement={menuPlacement}
              menuWidthClass="w-[min(16rem,calc(100vw-2rem))]"
            >
              <div className="py-2">
                <OptionButton
                  selected={!filters.propertyType}
                  onClick={() => {
                    onPropertyTypeChange("");
                    setOpenMenu(null);
                  }}
                >
                  All Property Types
                </OptionButton>

                {propertyTypes.map((type) => (
                  <OptionButton
                    key={type}
                    selected={filters.propertyType === type}
                    onClick={() => {
                      onPropertyTypeChange(type);
                      setOpenMenu(null);
                    }}
                  >
                    {formatPropertyTypeLabel(type)}
                  </OptionButton>
                ))}
              </div>
            </PillDropdown>

            <PillDropdown
              dropdownId="beds"
              openMenu={openMenu}
              onToggle={toggleMenu}
              icon={<BedIcon className="h-4 w-4" />}
              label="Beds"
              active={Boolean(filters.beds)}
              menuPlacement={menuPlacement}
              menuWidthClass="w-[min(14rem,calc(100vw-2rem))]"
            >
              <div className="py-2">
                {bedOptions.map((option) => (
                  <OptionButton
                    key={option.value || "all-beds"}
                    selected={filters.beds === option.value}
                    onClick={() => {
                      onBedsChange(option.value);
                      setOpenMenu(null);
                    }}
                  >
                    {option.label}
                  </OptionButton>
                ))}
              </div>
            </PillDropdown>

            <PillDropdown
              dropdownId="price"
              openMenu={openMenu}
              onToggle={toggleMenu}
              icon={<TagIcon className="h-4 w-4" />}
              label="Price"
              active={Boolean(filters.minPrice || filters.maxPrice)}
              menuPlacement={menuPlacement}
              menuWidthClass="w-[min(22rem,calc(100vw-2rem))]"
            >
              <MenuSection title="Price Bands">
                <div className="pb-2">
                  {selectablePriceOptions.map((option) => (
                    <OptionButton
                      key={option.value || "any-price"}
                      selected={
                        filters.priceRange === option.value ||
                        (!option.value &&
                          !filters.minPrice &&
                          !filters.maxPrice)
                      }
                      onClick={() => {
                        onPriceRangeChange(option.value);
                        setOpenMenu(null);
                      }}
                    >
                      {option.label}
                    </OptionButton>
                  ))}
                </div>
              </MenuSection>

              <div className="border-t border-[#eef2f6] px-4 py-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-slate">
                    Exact Price
                  </p>
                  {filters.minPrice || filters.maxPrice ? (
                    <button
                      type="button"
                      onClick={() => {
                        onMinPriceChange("");
                        onMaxPriceChange("");
                      }}
                      className="text-[11px] font-semibold uppercase tracking-[0.16em] text-brand-navy"
                    >
                      Reset
                    </button>
                  ) : null}
                </div>

                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  <div>
                    <label className="label">Min Price</label>
                    <input
                      className="input"
                      value={filters.minPrice}
                      onChange={(event) => onMinPriceChange(event.target.value)}
                      placeholder="500000"
                      inputMode="numeric"
                    />
                  </div>

                  <div>
                    <label className="label">Max Price</label>
                    <input
                      className="input"
                      value={filters.maxPrice}
                      onChange={(event) => onMaxPriceChange(event.target.value)}
                      placeholder="10000000"
                      inputMode="numeric"
                    />
                  </div>
                </div>
              </div>
            </PillDropdown>

            <PillDropdown
              dropdownId="deal-type"
              openMenu={openMenu}
              onToggle={toggleMenu}
              icon={<SparkIcon className="h-4 w-4" />}
              label="Deal Type"
              active={Boolean(filters.dealType)}
              menuPlacement={menuPlacement}
              menuWidthClass="w-[min(16rem,calc(100vw-2rem))]"
            >
              <div className="py-2">
                {dealTypeOptions.map((option) => (
                  <OptionButton
                    key={option.value || "all-deal-types"}
                    selected={filters.dealType === option.value}
                    onClick={() => {
                      onDealTypeChange(option.value);
                      setOpenMenu(null);
                    }}
                  >
                    {option.label}
                  </OptionButton>
                ))}
              </div>
            </PillDropdown>

            <PillDropdown
              dropdownId="more-filters"
              openMenu={openMenu}
              onToggle={toggleMenu}
              icon={<SlidersIcon className="h-4 w-4" />}
              label="More Filters"
              active={Boolean(filters.roi || filters.addedTime)}
              menuPlacement={menuPlacement}
              menuWidthClass="w-[min(22rem,calc(100vw-2rem))]"
            >
              <MenuSection title="ROI">
                <div className="px-4 pb-4">
                  <div className="flex flex-wrap gap-2">
                    {roiOptions.map((option) => (
                      <button
                        key={option.value || "any-roi"}
                        type="button"
                        onClick={() => onRoiChange(option.value)}
                        className={cn(
                          "inline-flex items-center rounded-full border px-3 py-2 text-xs font-semibold transition duration-150",
                          filters.roi === option.value
                            ? "border-brand-navy/40 bg-brand-navy/10 text-brand-navy"
                            : "border-[#e2e8f0] bg-white text-[#425168] hover:border-[#d5dce8] hover:bg-[#f9fbff]",
                        )}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>
              </MenuSection>

              <div className="border-t border-[#eef2f6]">
                <MenuSection title="Added Time">
                  <div className="px-4 pb-4">
                    <div className="flex flex-wrap gap-2">
                      {addedTimeOptions.map((option) => (
                        <button
                          key={option.value || "any-time"}
                          type="button"
                          onClick={() => onAddedTimeChange(option.value)}
                          className={cn(
                            "inline-flex items-center rounded-full border px-3 py-2 text-xs font-semibold transition duration-150",
                            filters.addedTime === option.value
                              ? "border-brand-navy/40 bg-brand-navy/10 text-brand-navy"
                              : "border-[#e2e8f0] bg-white text-[#425168] hover:border-[#d5dce8] hover:bg-[#f9fbff]",
                          )}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </MenuSection>
              </div>
            </PillDropdown>

            <PillDropdown
              dropdownId="sort"
              openMenu={openMenu}
              onToggle={toggleMenu}
              icon={<SortIcon className="h-4 w-4" />}
              label="Sort"
              active={filters.sort !== "newest"}
              menuPlacement={menuPlacement}
              menuWidthClass="w-[min(15rem,calc(100vw-2rem))]"
              align="right"
            >
              <div className="py-2">
                {sortOptions.map((option) => (
                  <OptionButton
                    key={option.value}
                    selected={filters.sort === option.value}
                    onClick={() => {
                      onSortChange(option.value as SortOption);
                      setOpenMenu(null);
                    }}
                  >
                    {option.label}
                  </OptionButton>
                ))}
              </div>
            </PillDropdown>
      </div>
    </div>
  );

  return (
    <div ref={rootRef} className="relative z-20 overflow-visible">
      <div className="overflow-visible rounded-[18px] border border-[#e6ebf2] bg-white/92 p-3 shadow-[0_14px_34px_rgba(15,42,95,0.08)] backdrop-blur-[14px] lg:hidden">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          {renderSearchControl("Search listings")}
          <button
            type="button"
            onClick={() => {
              setIsMobileDrawerOpen(true);
              setOpenMenu(null);
            }}
            className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-full border border-brand-navy/20 bg-brand-navy px-4 text-sm font-semibold text-white shadow-[0_12px_26px_rgba(15,42,95,0.16)] sm:w-auto"
            aria-expanded={isMobileDrawerOpen}
            aria-haspopup="dialog"
          >
            <SlidersIcon className="h-4 w-4" />
            Filters {activeFilterCount ? `(${activeFilterCount})` : ""}
          </button>
        </div>
        <div className="mt-3">{renderAppliedFilters()}</div>
      </div>

      <div className="hidden overflow-visible rounded-[18px] border border-[#e6ebf2] bg-white/92 p-3 shadow-[0_14px_34px_rgba(15,42,95,0.08)] backdrop-blur-[14px] sm:rounded-[24px] sm:p-4 lg:block">
        <div className="flex flex-col gap-3 overflow-visible sm:gap-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            {renderSearchControl()}

            <div className="flex flex-wrap items-center gap-2 sm:gap-3 lg:ml-4 lg:shrink-0 lg:justify-end">
              {renderClearAllButton()}
            </div>
          </div>

          {renderAppliedFilters()}

          {renderFilterControls()}
        </div>
      </div>

      {isMobileDrawerOpen ? (
        <div
          className="fixed inset-0 z-[180] overflow-hidden bg-[rgba(15,23,42,0.52)] backdrop-blur-[5px] lg:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="Browse listing filters"
          onClick={() => {
            setIsMobileDrawerOpen(false);
            setOpenMenu(null);
          }}
        >
          <div
            className="absolute inset-y-0 right-0 flex w-[min(26rem,calc(100vw-1rem))] max-w-full flex-col overflow-hidden rounded-l-[22px] bg-white shadow-[0_24px_70px_rgba(15,42,95,0.26)]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="shrink-0 border-b border-[#e6ebf2] bg-[#f7f9fc] px-4 py-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-brand-slate">Filters</p>
                  <h2 className="mt-1 text-xl font-semibold tracking-[-0.03em] text-brand-ink">Refine Listings</h2>
                  <p className="mt-1 text-sm leading-6 text-brand-slate">{activeFilterCount ? `${activeFilterCount} active filter${activeFilterCount === 1 ? "" : "s"}` : "No filters selected"}</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setIsMobileDrawerOpen(false);
                    setOpenMenu(null);
                  }}
                  className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#dbe3ef] bg-white text-brand-navy shadow-[0_10px_22px_rgba(15,42,95,0.08)]"
                  aria-label="Close filters"
                >
                  <CloseIcon className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-4 py-4">
              <div className="space-y-4">
                {renderAppliedFilters()}
                {renderFilterControls("static")}
              </div>
            </div>

            <div className="shrink-0 border-t border-[#e6ebf2] bg-white px-4 py-3">
              <div className="grid grid-cols-2 gap-2">
                {renderClearAllButton("w-full")}
                <button
                  type="button"
                  onClick={() => {
                    setIsMobileDrawerOpen(false);
                    setOpenMenu(null);
                  }}
                  className="inline-flex min-h-[42px] w-full items-center justify-center rounded-full bg-brand-navy px-4 text-sm font-semibold text-white shadow-[0_12px_26px_rgba(15,42,95,0.18)]"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
