"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CalendarDateRange,
  CalendarQuickFilterId,
  compareCalendarDateKeys,
  formatCalendarAriaLabel,
  formatCalendarMonthLabel,
  getCalendarDateRangeForQuickFilter,
  isCalendarDateWithinRange,
  normalizeCalendarDateRange,
  parseCalendarDateKey,
  toCalendarDateKey,
  addCalendarDays,
} from "@/lib/calendar-date";
import { cn } from "@/lib/deal-utils";

const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const GRID_DAY_COUNT = 42;

type CalendarDatePickerProps = {
  ariaLabel?: string;
  className?: string;
  clearActionLabel?: string;
  minDate?: string;
  maxDate?: string;
  onClearRange?: () => void;
  onSelectDate?: (dateKey: string) => void;
  onSelectQuickFilter?: (filterId: CalendarQuickFilterId) => void;
  onSelectRange?: (range: CalendarDateRange) => void;
  quickFilters?: ReadonlyArray<{ id: CalendarQuickFilterId; label: string }>;
  selectedDate?: string | null;
  selectedQuickFilterId?: CalendarQuickFilterId | null;
  selectedRange?: CalendarDateRange | null;
  selectionMode?: "single" | "range";
};

function getWeekStartOffset(date: Date) {
  return (date.getDay() + 6) % 7;
}

function getMonthStartDate(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function buildRangePreview(startDate: string, endDate: string) {
  return compareCalendarDateKeys(endDate, startDate) < 0
    ? { startDate: endDate, endDate: startDate }
    : { startDate, endDate };
}

export function CalendarDatePicker({
  ariaLabel,
  className,
  clearActionLabel = "Clear",
  minDate,
  maxDate,
  onClearRange,
  onSelectDate,
  onSelectQuickFilter,
  onSelectRange,
  quickFilters,
  selectedDate,
  selectedQuickFilterId,
  selectedRange,
  selectionMode = "single",
}: CalendarDatePickerProps) {
  const [activeQuickFilterId, setActiveQuickFilterId] = useState<CalendarQuickFilterId | null>(selectedQuickFilterId ?? null);
  const [draftRange, setDraftRange] = useState<CalendarDateRange>(() =>
    normalizeCalendarDateRange(selectedQuickFilterId ? getCalendarDateRangeForQuickFilter(selectedQuickFilterId) : selectedRange)
  );
  const [hoveredDateKey, setHoveredDateKey] = useState<string | null>(null);

  const activeQuickFilterRange = useMemo(
    () => (activeQuickFilterId ? normalizeCalendarDateRange(getCalendarDateRangeForQuickFilter(activeQuickFilterId)) : normalizeCalendarDateRange(null)),
    [activeQuickFilterId]
  );

  const visibleMonthAnchorKey =
    selectionMode === "range"
      ? activeQuickFilterId
        ? activeQuickFilterRange.endDate || activeQuickFilterRange.startDate
        : draftRange.endDate || draftRange.startDate
      : selectedDate;
  const [visibleMonth, setVisibleMonth] = useState(() => {
    const initialDate = parseCalendarDateKey(visibleMonthAnchorKey) || new Date();
    return getMonthStartDate(initialDate);
  });

  useEffect(() => {
    setActiveQuickFilterId(selectedQuickFilterId ?? null);
    setDraftRange(
      normalizeCalendarDateRange(
        selectedQuickFilterId
          ? getCalendarDateRangeForQuickFilter(selectedQuickFilterId)
          : {
              startDate: selectedRange?.startDate ?? null,
              endDate: selectedRange?.endDate ?? null,
            }
      )
    );
    setHoveredDateKey(null);
  }, [selectedQuickFilterId, selectedRange?.endDate, selectedRange?.startDate]);

  useEffect(() => {
    const nextAnchor = parseCalendarDateKey(visibleMonthAnchorKey);
    if (!nextAnchor) return;

    setVisibleMonth(getMonthStartDate(nextAnchor));
  }, [visibleMonthAnchorKey]);

  const previewRange = useMemo(() => {
    if (selectionMode !== "range" || activeQuickFilterId || !draftRange.startDate || draftRange.endDate || !hoveredDateKey) {
      return null;
    }

    return buildRangePreview(draftRange.startDate, hoveredDateKey);
  }, [activeQuickFilterId, draftRange.endDate, draftRange.startDate, hoveredDateKey, selectionMode]);

  const renderedRange = useMemo(() => {
    if (selectionMode !== "range") {
      return normalizeCalendarDateRange(null);
    }

    if (activeQuickFilterId) {
      return activeQuickFilterRange;
    }

    if (draftRange.endDate) {
      return draftRange;
    }

    return normalizeCalendarDateRange(previewRange);
  }, [activeQuickFilterId, activeQuickFilterRange, draftRange, previewRange, selectionMode]);

  const calendarDays = useMemo(() => {
    const gridStart = addCalendarDays(visibleMonth, -getWeekStartOffset(visibleMonth));
    return Array.from({ length: GRID_DAY_COUNT }, (_, index) => addCalendarDays(gridStart, index));
  }, [visibleMonth]);

  const todayKey = toCalendarDateKey(new Date());
  const isQuickFilterLayout = selectionMode === "range" && !!quickFilters?.length;
  const committedStartDate = activeQuickFilterId ? activeQuickFilterRange.startDate : draftRange.startDate;
  const committedEndDate = activeQuickFilterId ? activeQuickFilterRange.endDate : draftRange.endDate;
  const previewEndDate = !activeQuickFilterId && !draftRange.endDate ? previewRange?.endDate ?? null : null;
  const hasPreviewRange = !!previewRange && !activeQuickFilterId && !draftRange.endDate;

  const handleQuickFilterSelect = (filterId: CalendarQuickFilterId) => {
    const nextRange = normalizeCalendarDateRange(getCalendarDateRangeForQuickFilter(filterId));
    const anchorDate = parseCalendarDateKey(nextRange.endDate || nextRange.startDate);

    setActiveQuickFilterId(filterId);
    setDraftRange(nextRange);
    setHoveredDateKey(null);

    if (anchorDate) {
      setVisibleMonth(getMonthStartDate(anchorDate));
    }

    onSelectQuickFilter?.(filterId);
  };

  const handleClearRange = () => {
    setActiveQuickFilterId("allTime");
    setDraftRange(normalizeCalendarDateRange(null));
    setHoveredDateKey(null);
    onClearRange?.();
  };

  const handleDaySelect = (dateKey: string) => {
    if (selectionMode === "range") {
      if (!onSelectRange) return;

      setHoveredDateKey(null);

      if (activeQuickFilterId) {
        setActiveQuickFilterId(null);
        setDraftRange({ startDate: dateKey, endDate: null });
        return;
      }

      if (!draftRange.startDate || draftRange.endDate) {
        setDraftRange({ startDate: dateKey, endDate: null });
        return;
      }

      const nextRange = buildRangePreview(draftRange.startDate, dateKey);
      setDraftRange(nextRange);
      onSelectRange(nextRange);
      return;
    }

    onSelectDate?.(dateKey);
  };

  const calendarMarkup = (
    <>
      <div className="flex items-center justify-between gap-2 sm:gap-3">
        <button
          type="button"
          onClick={() => setVisibleMonth((current) => new Date(current.getFullYear(), current.getMonth() - 1, 1))}
          className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#d9dfe9] bg-white text-[#24314c] shadow-[0_8px_18px_rgba(31,47,82,0.06)] transition hover:border-[#cfd7e4] hover:bg-[#f8fafe]"
          aria-label={`Show ${formatCalendarMonthLabel(new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() - 1, 1))}`}
        >
          <svg viewBox="0 0 16 16" fill="none" className="h-4 w-4" aria-hidden="true">
            <path d="m10 3-5 5 5 5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        <div className="min-w-0 text-center">
          <p className="text-[15px] font-semibold text-[#1f2940]">{formatCalendarMonthLabel(visibleMonth)}</p>
        </div>

        <button
          type="button"
          onClick={() => setVisibleMonth((current) => new Date(current.getFullYear(), current.getMonth() + 1, 1))}
          className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#d9dfe9] bg-white text-[#24314c] shadow-[0_8px_18px_rgba(31,47,82,0.06)] transition hover:border-[#cfd7e4] hover:bg-[#f8fafe]"
          aria-label={`Show ${formatCalendarMonthLabel(new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + 1, 1))}`}
        >
          <svg viewBox="0 0 16 16" fill="none" className="h-4 w-4" aria-hidden="true">
            <path d="m6 3 5 5-5 5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>

      <div className="mt-3 grid grid-cols-7 gap-0.5 sm:mt-4 sm:gap-1">
        {WEEKDAY_LABELS.map((label) => (
          <div
            key={label}
            className="flex h-8 items-center justify-center text-center text-[11px] font-semibold uppercase tracking-[0.16em] text-[#7d879c]"
          >
            {label}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-0.5 sm:gap-1" role="grid" aria-label={ariaLabel} onMouseLeave={() => setHoveredDateKey(null)}>
        {calendarDays.map((date) => {
          const dateKey = toCalendarDateKey(date);
          const isOutsideMonth = date.getMonth() !== visibleMonth.getMonth();
          const isSelectedDay = selectionMode === "range" ? false : selectedDate === dateKey;
          const isToday = todayKey === dateKey;
          const isBeforeMinDate = minDate ? compareCalendarDateKeys(dateKey, minDate) < 0 : false;
          const isAfterMaxDate = maxDate ? compareCalendarDateKeys(dateKey, maxDate) > 0 : false;
          const isDisabled = isBeforeMinDate || isAfterMaxDate;
          const isPreviewEnd = previewEndDate === dateKey && previewEndDate !== committedStartDate;
          const isCommittedEnd = committedEndDate === dateKey && committedEndDate !== committedStartDate;
          const isRangeStart = committedStartDate === dateKey;
          const isActiveSelection = isSelectedDay || isRangeStart || isCommittedEnd || isPreviewEnd;
          const isWithinRenderedRange = selectionMode === "range" && isCalendarDateWithinRange(dateKey, renderedRange);
          const previewRangeFillClass = "bg-[#f4f7fc]";
          const selectedRangeFillClass = "bg-[#eef3fb]";
          const usesPreviewFill = hasPreviewRange;
          const sameDayRange =
            (committedEndDate || previewEndDate || null) !== null && (committedEndDate || previewEndDate) === committedStartDate;

          return (
            <div
              key={dateKey}
              className={cn(
                "rounded-[14px] p-[2px]",
                isWithinRenderedRange && !isActiveSelection && (usesPreviewFill ? previewRangeFillClass : selectedRangeFillClass),
                isRangeStart &&
                  !sameDayRange &&
                  (usesPreviewFill
                    ? "bg-[linear-gradient(90deg,#ffffff_50%,#f4f7fc_50%)]"
                    : "bg-[linear-gradient(90deg,#ffffff_50%,#eef3fb_50%)]"),
                (isCommittedEnd || isPreviewEnd) &&
                  !sameDayRange &&
                  (usesPreviewFill
                    ? "bg-[linear-gradient(90deg,#f4f7fc_50%,#ffffff_50%)]"
                    : "bg-[linear-gradient(90deg,#eef3fb_50%,#ffffff_50%)]")
              )}
            >
              <button
                type="button"
                onClick={() => handleDaySelect(dateKey)}
                onMouseEnter={() => {
                  if (!isDisabled && selectionMode === "range" && !activeQuickFilterId && draftRange.startDate && !draftRange.endDate) {
                    setHoveredDateKey(dateKey);
                  }
                }}
                disabled={isDisabled}
                aria-label={formatCalendarAriaLabel(date)}
                className={cn(
                  "flex h-10 w-full min-w-0 items-center justify-center rounded-[10px] text-sm font-semibold transition sm:h-11 sm:rounded-[12px]",
                  isRangeStart || isCommittedEnd
                    ? "bg-[linear-gradient(135deg,#173972_0%,#0F2A5F_100%)] text-white shadow-[0_10px_20px_rgba(15,42,95,0.18)]"
                    : isPreviewEnd
                      ? "border border-[#173972]/25 bg-white text-[#173972] shadow-[0_8px_16px_rgba(15,42,95,0.08)]"
                      : isDisabled
                        ? "cursor-not-allowed bg-transparent text-[#c4cada]"
                        : "bg-transparent text-[#24314c] hover:bg-[#f3f6fb] hover:text-[#173972]",
                  isOutsideMonth && !isActiveSelection && !isDisabled && "text-[#a5afc3]",
                  isToday && !isActiveSelection && "border border-[#d4af37]/70 bg-[#fff8e5] text-[#946814]"
                )}
              >
                {date.getDate()}
              </button>
            </div>
          );
        })}
      </div>

      
    </>
  );

  return (
    <div className={cn("w-full max-w-full overflow-x-hidden rounded-[14px] border border-[#e4e8f1] bg-[#fcfdff] p-2.5 shadow-[0_12px_24px_rgba(31,47,82,0.08)] sm:rounded-[18px] sm:p-4", className)}>
      {isQuickFilterLayout ? (
        <div className="dashboard-date-filter__content">
          <div className="dashboard-date-filter__preset-panel">
            <p className="dashboard-date-filter__panel-kicker">Quick Filters</p>
            <div className="dashboard-date-filter__preset-list">
              {quickFilters.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  aria-pressed={activeQuickFilterId === option.id}
                  onClick={() => handleQuickFilterSelect(option.id)}
                  className={cn("dashboard-date-filter__option", activeQuickFilterId === option.id && "is-active")}
                >
                  {option.label}
                </button>
              ))}
              <button type="button" onClick={handleClearRange} className="dashboard-date-filter__clear-option">
                {clearActionLabel}
              </button>
            </div>
          </div>

          <div className="dashboard-date-filter__calendar-panel">
            {calendarMarkup}
          </div>
        </div>
      ) : (
        calendarMarkup
      )}
    </div>
  );
}
