export type CalendarDateRange = {
  startDate: string | null;
  endDate: string | null;
};

export type CalendarQuickFilterId = "allTime" | "today" | "yesterday" | "last7" | "last30" | "thisMonth" | "lastMonth";

export const CALENDAR_QUICK_FILTER_OPTIONS = [
  { id: "allTime" as const, label: "All Time" },
  { id: "today" as const, label: "Today" },
  { id: "yesterday" as const, label: "Yesterday" },
  { id: "last7" as const, label: "Last 7 Days" },
  { id: "last30" as const, label: "Last 30 Days" },
  { id: "thisMonth" as const, label: "This Month" },
  { id: "lastMonth" as const, label: "Last Month" },
] satisfies ReadonlyArray<{ id: CalendarQuickFilterId; label: string }>;

const FULL_DATE_FORMATTER = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

const SHORT_DATE_FORMATTER = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
});

const MONTH_LABEL_FORMATTER = new Intl.DateTimeFormat("en-GB", {
  month: "long",
  year: "numeric",
});

const ARIA_DATE_FORMATTER = new Intl.DateTimeFormat("en-GB", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
});

export const EMPTY_CALENDAR_DATE_RANGE: CalendarDateRange = {
  startDate: null,
  endDate: null,
};

export function startOfCalendarDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function addCalendarDays(date: Date, amount: number) {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + amount);
  return startOfCalendarDay(nextDate);
}

export function getCalendarDateRangeForQuickFilter(filterId: CalendarQuickFilterId, referenceDate = new Date()): CalendarDateRange | null {
  const today = startOfCalendarDay(referenceDate);

  if (filterId === "allTime") {
    return null;
  }

  if (filterId === "today") {
    const todayKey = toCalendarDateKey(today);
    return { startDate: todayKey, endDate: todayKey };
  }

  if (filterId === "yesterday") {
    const yesterday = addCalendarDays(today, -1);
    const yesterdayKey = toCalendarDateKey(yesterday);
    return { startDate: yesterdayKey, endDate: yesterdayKey };
  }

  if (filterId === "last7" || filterId === "last30") {
    const windowSize = filterId === "last7" ? 7 : 30;
    return {
      startDate: toCalendarDateKey(addCalendarDays(today, -(windowSize - 1))),
      endDate: toCalendarDateKey(today),
    };
  }

  if (filterId === "thisMonth") {
    return {
      startDate: toCalendarDateKey(new Date(today.getFullYear(), today.getMonth(), 1)),
      endDate: toCalendarDateKey(new Date(today.getFullYear(), today.getMonth() + 1, 0)),
    };
  }

  return {
    startDate: toCalendarDateKey(new Date(today.getFullYear(), today.getMonth() - 1, 1)),
    endDate: toCalendarDateKey(new Date(today.getFullYear(), today.getMonth(), 0)),
  };
}

export function parseCalendarDateKey(value: string | null | undefined) {
  if (!value) return null;

  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day);

  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    return null;
  }

  return startOfCalendarDay(date);
}

export function toCalendarDateKey(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function compareCalendarDateKeys(firstValue: string, secondValue: string) {
  const firstDate = parseCalendarDateKey(firstValue);
  const secondDate = parseCalendarDateKey(secondValue);

  if (!firstDate || !secondDate) {
    return 0;
  }

  return firstDate.getTime() - secondDate.getTime();
}

export function formatCalendarDate(value: string | null | undefined) {
  const date = parseCalendarDateKey(value);
  if (!date) return "Select date";
  return FULL_DATE_FORMATTER.format(date);
}

export function formatCalendarDateShort(value: string | null | undefined) {
  const date = parseCalendarDateKey(value);
  if (!date) return "Select date";
  return SHORT_DATE_FORMATTER.format(date);
}

export function formatCalendarDateRangeLabel(range: CalendarDateRange | null | undefined) {
  if (!range?.startDate || !range?.endDate) {
    return "Custom Range";
  }

  const startDate = parseCalendarDateKey(range.startDate);
  const endDate = parseCalendarDateKey(range.endDate);

  if (!startDate || !endDate) {
    return "Custom Range";
  }

  if (range.startDate === range.endDate) {
    return formatCalendarDate(range.startDate);
  }

  if (startDate.getFullYear() === endDate.getFullYear()) {
    if (startDate.getMonth() === endDate.getMonth()) {
      return `${`${startDate.getDate()}`.padStart(2, "0")} - ${SHORT_DATE_FORMATTER.format(endDate)}`;
    }

    return `${SHORT_DATE_FORMATTER.format(startDate)} - ${SHORT_DATE_FORMATTER.format(endDate)}`;
  }

  return `${FULL_DATE_FORMATTER.format(startDate)} - ${FULL_DATE_FORMATTER.format(endDate)}`;
}

export function formatCalendarMonthLabel(date: Date) {
  return MONTH_LABEL_FORMATTER.format(date);
}

export function formatCalendarAriaLabel(date: Date) {
  return ARIA_DATE_FORMATTER.format(date);
}

export function isCalendarDateWithinRange(dateKey: string, range: CalendarDateRange | null | undefined) {
  if (!range?.startDate || !range?.endDate) {
    return false;
  }

  return compareCalendarDateKeys(dateKey, range.startDate) >= 0 && compareCalendarDateKeys(dateKey, range.endDate) <= 0;
}

export function normalizeCalendarDateRange(range: CalendarDateRange | null | undefined): CalendarDateRange {
  return {
    startDate: range?.startDate ?? null,
    endDate: range?.endDate ?? null,
  };
}
