"use client";

import { createPortal } from "react-dom";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { CalendarDatePicker } from "@/components/CalendarDatePicker";
import {
  addCalendarDays,
  CALENDAR_QUICK_FILTER_OPTIONS,
  formatCalendarDateRangeLabel,
  getCalendarDateRangeForQuickFilter,
  parseCalendarDateKey,
  type CalendarDateRange,
  type CalendarQuickFilterId,
} from "@/lib/calendar-date";
import { cn } from "@/lib/deal-utils";

export type AdminDashboardDateFilterValue = {
  id: CalendarQuickFilterId | "custom";
  range: CalendarDateRange | null;
};

export const ADMIN_DASHBOARD_DATE_FILTER_OPTIONS = CALENDAR_QUICK_FILTER_OPTIONS;

export function createAdminDashboardDateFilterValue(): AdminDashboardDateFilterValue {
  return { id: "allTime", range: null };
}

export function matchesAdminDashboardDateRange(value: string | null | undefined, filter: AdminDashboardDateFilterValue) {
  if (!value) {
    return false;
  }

  const timestamp = new Date(value);
  if (Number.isNaN(timestamp.getTime())) {
    return false;
  }

  if (filter.id === "allTime") {
    return true;
  }

  const activeRange = filter.id === "custom" ? filter.range : getCalendarDateRangeForQuickFilter(filter.id);
  const startDate = parseCalendarDateKey(activeRange?.startDate);
  const endDate = parseCalendarDateKey(activeRange?.endDate);

  if (!startDate || !endDate) {
    return true;
  }

  const endOfRangeExclusive = addCalendarDays(endDate, 1);
  return timestamp >= startDate && timestamp < endOfRangeExclusive;
}

export function getAdminDashboardDateFilterBounds(filter: AdminDashboardDateFilterValue) {
  if (filter.id === "allTime") {
    return { startDate: null, endDate: null };
  }

  const activeRange = filter.id === "custom" ? filter.range : getCalendarDateRangeForQuickFilter(filter.id);
  if (!activeRange?.startDate || !activeRange?.endDate) {
    return { startDate: null, endDate: null };
  }

  return {
    startDate: new Date(`${activeRange.startDate}T00:00:00`).toISOString(),
    endDate: new Date(`${activeRange.endDate}T23:59:59.999`).toISOString(),
  };
}

type AdminDateFilterMenuPosition = {
  top: number;
  left: number;
  width: number;
  maxHeight: number;
};

const DEFAULT_MENU_POSITION: AdminDateFilterMenuPosition = {
  top: 0,
  left: 0,
  width: 320,
  maxHeight: 420,
};

function resolveMenuPosition(
  triggerElement: HTMLDivElement | null,
  menuElement: HTMLDivElement | null
): AdminDateFilterMenuPosition {
  if (!triggerElement || typeof window === "undefined") {
    return DEFAULT_MENU_POSITION;
  }

  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const isMobileViewport = viewportWidth < 640;
  const viewportPadding = isMobileViewport ? 8 : 16;
  const triggerBounds = triggerElement.getBoundingClientRect();
  const desiredMenuWidth = isMobileViewport
    ? Math.min(384, viewportWidth - viewportPadding * 2)
    : Math.min(560, viewportWidth - viewportPadding * 2);
  const measuredMenuHeight = menuElement?.offsetHeight ?? (isMobileViewport ? 520 : 560);
  const menuOffset = 8;
  const availableBelow = viewportHeight - triggerBounds.bottom - menuOffset - viewportPadding;
  const availableAbove = triggerBounds.top - menuOffset - viewportPadding;
  const openAbove = availableBelow < Math.min(measuredMenuHeight, 360) && availableAbove > availableBelow;
  const preferredAvailableHeight = openAbove ? availableAbove : availableBelow;
  const maxHeight = Math.max(180, Math.min(viewportHeight - viewportPadding * 2, preferredAvailableHeight));
  const resolvedHeight = Math.min(measuredMenuHeight, maxHeight);
  const unclampedLeft = isMobileViewport
    ? triggerBounds.left + triggerBounds.width / 2 - desiredMenuWidth / 2
    : triggerBounds.right - desiredMenuWidth;
  const left = Math.max(viewportPadding, Math.min(unclampedLeft, viewportWidth - desiredMenuWidth - viewportPadding));
  const top = openAbove
    ? Math.max(viewportPadding, triggerBounds.top - menuOffset - resolvedHeight)
    : Math.min(triggerBounds.bottom + menuOffset, viewportHeight - resolvedHeight - viewportPadding);

  return {
    top,
    left,
    width: desiredMenuWidth,
    maxHeight,
  };
}

export function AdminDashboardDateFilter({
  value,
  onSelectFilter,
  ariaLabel,
  className,
}: {
  value: AdminDashboardDateFilterValue;
  onSelectFilter: (filter: AdminDashboardDateFilterValue) => void;
  ariaLabel: string;
  className?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownElementRef = useRef<HTMLDivElement | null>(null);
  const menuElementRef = useRef<HTMLDivElement | null>(null);
  const [menuPosition, setMenuPosition] = useState<AdminDateFilterMenuPosition>(DEFAULT_MENU_POSITION);
  const selectedOption = ADMIN_DASHBOARD_DATE_FILTER_OPTIONS.find((option) => option.id === value.id) || ADMIN_DASHBOARD_DATE_FILTER_OPTIONS[0];
  const selectedLabel = value.id === "custom" ? formatCalendarDateRangeLabel(value.range) : selectedOption.label;

  const updateMenuPosition = useCallback(() => {
    setMenuPosition(resolveMenuPosition(dropdownElementRef.current, menuElementRef.current));
  }, []);

  useLayoutEffect(() => {
    if (!isOpen) {
      return;
    }

    updateMenuPosition();
    window.addEventListener("resize", updateMenuPosition);
    window.addEventListener("scroll", updateMenuPosition, true);

    return () => {
      window.removeEventListener("resize", updateMenuPosition);
      window.removeEventListener("scroll", updateMenuPosition, true);
    };
  }, [isOpen, updateMenuPosition]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node;

      if (dropdownElementRef.current?.contains(target) || menuElementRef.current?.contains(target)) {
        return;
      }

      setIsOpen(false);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const handleQuickFilterSelect = (filterId: CalendarQuickFilterId) => {
    onSelectFilter({ id: filterId, range: null });
    setIsOpen(false);
  };

  const handleCustomRangeChange = (nextRange: CalendarDateRange) => {
    if (!nextRange.startDate || !nextRange.endDate) {
      return;
    }

    onSelectFilter({
      id: "custom",
      range: {
        startDate: nextRange.startDate,
        endDate: nextRange.endDate,
      },
    });
    setIsOpen(false);
  };

  const handleClearFilters = () => {
    onSelectFilter(createAdminDashboardDateFilterValue());
    setIsOpen(false);
  };

  const handleToggleOpen = () => {
    if (!isOpen) {
      setMenuPosition(resolveMenuPosition(dropdownElementRef.current, menuElementRef.current));
    }

    setIsOpen((current) => !current);
  };

  return (
    <div ref={dropdownElementRef} className={cn("dashboard-date-filter", className)} role="group" aria-label={ariaLabel}>
      <button
        type="button"
        onClick={handleToggleOpen}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        className={cn("dashboard-date-filter__trigger", isOpen && "is-open")}
      >
        <span className="dashboard-date-filter__icon" aria-hidden="true">
          <svg viewBox="0 0 20 20" fill="none" className="h-5 w-5">
            <path
              d="M6.667 1.667v2.5M13.333 1.667v2.5M2.917 7.083h14.166M5.833 10h1.25M9.375 10h1.25M12.917 10h1.25M5.833 13.333h1.25M9.375 13.333h1.25"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <rect x="2.917" y="4.167" width="14.166" height="12.916" rx="2.5" stroke="currentColor" strokeWidth="1.7" />
          </svg>
        </span>
        <span className="dashboard-date-filter__label">{selectedLabel}</span>
        <span className="dashboard-date-filter__chevron" aria-hidden="true">
          <svg viewBox="0 0 16 16" fill="none" className="h-4 w-4">
            <path d="m4 6 4 4 4-4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      </button>

      {isOpen && typeof document !== "undefined"
        ? createPortal(
            <div
              ref={menuElementRef}
              className="dashboard-date-filter__menu dashboard-date-filter__menu--anchored"
              role="dialog"
              aria-label={ariaLabel}
              style={{
                top: menuPosition.top,
                left: menuPosition.left,
                width: menuPosition.width,
                maxHeight: menuPosition.maxHeight,
              }}
            >
              <CalendarDatePicker
                selectionMode="range"
                selectedQuickFilterId={value.id === "custom" ? null : value.id}
                selectedRange={value.id === "custom" ? value.range : null}
                quickFilters={ADMIN_DASHBOARD_DATE_FILTER_OPTIONS}
                onSelectQuickFilter={handleQuickFilterSelect}
                onSelectRange={handleCustomRangeChange}
                onClearRange={handleClearFilters}
                clearActionLabel="Clear"
                ariaLabel={`${ariaLabel} custom range calendar`}
                className="border-0 bg-transparent p-0 shadow-none sm:p-0"
              />
            </div>,
            document.body
          )
        : null}
    </div>
  );
}
