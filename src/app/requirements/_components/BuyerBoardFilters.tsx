"use client";

import { REQUIREMENT_PROPERTY_TYPES, REQUIREMENT_URGENCY_OPTIONS, REQUIREMENT_BEDROOM_OPTIONS } from "@/lib/requirements";
import { formatPropertyType, formatRequirementUrgency } from "@/lib/deal-utils";
import { CloseIcon, FilterIcon, SearchIcon, SortIcon } from "./BuyerBoardIcons";
import { BUYER_BOARD_SORT_OPTIONS, type BuyerBoardFilterState } from "./buyer-board-utils";

type BuyerBoardFiltersProps = {
  filters: BuyerBoardFilterState;
  areaOptions: string[];
  activeFilterCount: number;
  resultsCount: number;
  totalCount: number;
  mode?: "sidebar" | "drawer";
  onChange: (patch: Partial<BuyerBoardFilterState>) => void;
  onReset: () => void;
  onClose?: () => void;
};

const fieldClassName =
  "w-full rounded-md border border-brand-line bg-white px-3 py-2 text-sm font-medium text-brand-slate shadow-[0_12px_28px_rgba(15,42,95,0.04)] outline-none transition duration-200 placeholder:text-brand-slate focus:border-brand-gold focus:shadow-[0_0_0_4px_rgba(212,175,55,0.18)] lg:rounded-[18px] lg:px-4 lg:text-[15px]";

const labelClassName = "mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.10em] text-brand-ink lg:mb-2 lg:text-[12px]";

export function BuyerBoardFilters({
  filters,
  areaOptions,
  activeFilterCount,
  resultsCount,
  totalCount,
  mode = "sidebar",
  onChange,
  onReset,
  onClose,
}: BuyerBoardFiltersProps) {
  const isDrawer = mode === "drawer";

  return (
    <div className="panel max-w-full overflow-hidden rounded-[12px] border border-[#dbe4ef] shadow-[0_24px_54px_rgba(15,42,95,0.08)]">
      <div className="border-b border-[#e8edf4] bg-[#f5f7fa] px-4 py-4 sm:px-6 lg:px-5 lg:py-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="inline-flex max-w-full items-center gap-2 rounded-full border border-[#d7e0eb] bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-slate lg:tracking-[0.24em]">
              <FilterIcon className="h-3.5 w-3.5" />
              Filters
            </div>
            <h2 className="mt-3 text-xl font-semibold tracking-[-0.04em] text-brand-ink lg:mt-4 lg:text-[24px]">{isDrawer ? "Refine Buyer Board" : "Board Filters"}</h2>

            <p className="mt-2 break-words text-[13px] font-medium text-brand-slate lg:mt-3">
              Showing {resultsCount} of {totalCount} live requirements
            </p>
          </div>

          {isDrawer && onClose ? (
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-brand-line bg-white text-brand-navy shadow-[0_10px_24px_rgba(15,42,95,0.08)] transition hover:border-brand-blue/30 hover:bg-brand-panel-soft"
              aria-label="Close filters"
            >
              <CloseIcon className="h-5 w-5" />
            </button>
          ) : null}
        </div>
      </div>

      
        <div className="bg-white p-3 shadow-[0_18px_34px_rgba(15,42,95,0.06)] sm:p-4">
          <div className="space-y-2">
            <div className="flex justify-end">
              <button
                type="button"
                onClick={onReset}
                disabled={!activeFilterCount}
                className="inline-flex min-h-[36px] items-center justify-center rounded-full border border-brand-line bg-white px-3 text-[13px] font-semibold text-brand-navy shadow-[0_10px_22px_rgba(15,42,95,0.05)] hover:border-brand-blue/30 hover:bg-brand-panel-soft disabled:cursor-not-allowed disabled:opacity-50"
              >
                Reset Filters
              </button>
            </div>
            <label className="block">
              <span className={labelClassName}>Search</span>
              <div className="relative">
                <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-brand-slate">
                  <SearchIcon className="h-4 w-4" />
                </span>
                <input
                  type="search"
                  value={filters.search}
                  onChange={(event) => onChange({ search: event.target.value })}
                  placeholder="Search title, location, buyer"
                  className={`${fieldClassName} pl-11`}
                />
              </div>
            </label>

            <label className="block">
              <span className={labelClassName}>Area</span>
              <div className="relative">
                <select className={`${fieldClassName} appearance-none pr-12`} value={filters.area} onChange={(event) => onChange({ area: event.target.value })}>
                  <option value="" className="bg-white text-brand-ink">
                    All areas
                  </option>
                  {areaOptions.map((area) => (
                    <option key={area} value={area} className="bg-white text-brand-ink">
                      {area}
                    </option>
                  ))}
                </select>
                <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-brand-slate">
                  <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <path d="m5 7 5 6 5-6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
              </div>
            </label>

            <label className="block">
              <span className={labelClassName}>Property Type</span>
              <div className="relative">
                <select
                  className={`${fieldClassName} appearance-none pr-12`}
                  value={filters.propertyType}
                  onChange={(event) => onChange({ propertyType: event.target.value })}
                >
                  <option value="" className="bg-white text-brand-ink">
                    All property types
                  </option>
                  {REQUIREMENT_PROPERTY_TYPES.map((type) => (
                    <option key={type} value={type} className="bg-white text-brand-ink">
                      {formatPropertyType(type)}
                    </option>
                  ))}
                </select>
                <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-brand-slate">
                  <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <path d="m5 7 5 6 5-6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
              </div>
            </label>

            <label className="block">
              <span className={labelClassName}>Bedrooms</span>
              <div className="relative">
                <select className={`${fieldClassName} appearance-none pr-12`} value={filters.bedrooms} onChange={(event) => onChange({ bedrooms: event.target.value })}>
                  <option value="" className="bg-white text-brand-ink">
                    Any bedroom count
                  </option>
                  {REQUIREMENT_BEDROOM_OPTIONS.map((option) => (
                    <option key={option} value={option} className="bg-white text-brand-ink">
                      {option}
                    </option>
                  ))}
                </select>
                <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-brand-slate">
                  <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <path d="m5 7 5 6 5-6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
              </div>
            </label>

            <label className="block">
              <span className={labelClassName}>Urgency</span>
              <div className="relative">
                <select className={`${fieldClassName} appearance-none pr-12`} value={filters.urgency} onChange={(event) => onChange({ urgency: event.target.value })}>
                  <option value="" className="bg-white text-brand-ink">
                    All urgency levels
                  </option>
                  {REQUIREMENT_URGENCY_OPTIONS.map((option) => (
                    <option key={option} value={option} className="bg-white text-brand-ink">
                      {formatRequirementUrgency(option)}
                    </option>
                  ))}
                </select>
                <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-brand-slate">
                  <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <path d="m5 7 5 6 5-6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
              </div>
            </label>

            <label className="block">
              <span className={labelClassName}>Min Budget</span>
              <input
                type="number"
                inputMode="numeric"
                value={filters.minBudget}
                onChange={(event) => onChange({ minBudget: event.target.value })}
                placeholder="500000"
                className={fieldClassName}
              />
            </label>

            <label className="block">
              <span className={labelClassName}>Max Budget</span>
              <input
                type="number"
                inputMode="numeric"
                value={filters.maxBudget}
                onChange={(event) => onChange({ maxBudget: event.target.value })}
                placeholder="5000000"
                className={fieldClassName}
              />
            </label>

            <label className="block">
              <span className={labelClassName}>Sort Order</span>
              <div className="relative">
                <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-brand-slate">
                  <SortIcon className="h-4 w-4" />
                </span>
                <select
                  className={`${fieldClassName} appearance-none pl-11 pr-12`}
                  value={filters.sortBy}
                  onChange={(event) => onChange({ sortBy: event.target.value as BuyerBoardFilterState["sortBy"] })}
                >
                  {BUYER_BOARD_SORT_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value} className="bg-white text-brand-ink">
                      {option.label}
                    </option>
                  ))}
                </select>
                <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-brand-slate">
                  <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <path d="m5 7 5 6 5-6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
              </div>
            </label>

            
          </div>
        </div>
     
    </div>
  );
}
