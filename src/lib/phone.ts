import { isValidPhoneNumber, parsePhoneNumberFromString } from "libphonenumber-js/max";

export function normalizePhoneNumber(value: string) {
  const input = value.trim();

  if (!input) {
    return "";
  }

  try {
    const parsed = parsePhoneNumberFromString(input);
    return parsed?.number || input;
  } catch {
    return input;
  }
}

export function isValidInternationalPhoneNumber(value: string) {
  const normalized = normalizePhoneNumber(value);

  if (!normalized) {
    return false;
  }

  try {
    return isValidPhoneNumber(normalized);
  } catch {
    return false;
  }
}

export function formatPhoneNumberForDisplay(value: string) {
  const normalized = normalizePhoneNumber(value);

  if (!normalized) {
    return "";
  }

  try {
    return parsePhoneNumberFromString(normalized)?.formatInternational() || normalized;
  } catch {
    return normalized;
  }
}
