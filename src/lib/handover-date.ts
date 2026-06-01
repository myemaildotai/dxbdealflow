import { parseCalendarDateKey, toCalendarDateKey } from "@/lib/calendar-date";

export function getMinimumHandoverDateKey(referenceDate = new Date()) {
  return toCalendarDateKey(referenceDate);
}

export function isValidPresentOrFutureHandoverDate(value: string | null | undefined, referenceDate = new Date()) {
  if (!value) {
    return true;
  }

  const handoverDate = parseCalendarDateKey(value);
  const minimumHandoverDate = parseCalendarDateKey(getMinimumHandoverDateKey(referenceDate));

  return !!handoverDate && !!minimumHandoverDate && handoverDate.getTime() >= minimumHandoverDate.getTime();
}

export function getHandoverDateValidationMessage(value: string | null | undefined, referenceDate = new Date()) {
  if (!value) {
    return null;
  }

  return isValidPresentOrFutureHandoverDate(value, referenceDate) ? null : "Handover date must be today or in the future.";
}
