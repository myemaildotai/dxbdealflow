export const LISTING_PERCENT_MAX_VALUE = 100;
export const REQUIREMENT_BUDGET_MAX_DIGITS = 9;

type NumericInputValue = unknown;

export function normalizeNumericInput(value: NumericInputValue) {
  return String(value ?? "").replace(/,/g, "").replace(/\s+/g, "").trim();
}

export function hasNumericInput(value: NumericInputValue) {
  return normalizeNumericInput(value).length > 0;
}

export function parseOptionalNumericInput(value: NumericInputValue) {
  const normalizedValue = normalizeNumericInput(value);
  if (!normalizedValue) {
    return null;
  }

  const parsedValue = Number(normalizedValue);
  return Number.isFinite(parsedValue) ? parsedValue : null;
}

export function isNonNegativeNumericInput(value: NumericInputValue) {
  const parsedValue = parseOptionalNumericInput(value);
  return parsedValue !== null && parsedValue >= 0;
}

export function getListingPercentageValidationError(
  value: NumericInputValue,
  options: {
    invalidMessage: string;
    maxMessage: string;
  }
) {
  if (!hasNumericInput(value)) {
    return null;
  }

  const parsedValue = parseOptionalNumericInput(value);
  if (parsedValue === null || parsedValue < 0) {
    return options.invalidMessage;
  }

  if (parsedValue > LISTING_PERCENT_MAX_VALUE) {
    return options.maxMessage;
  }

  return null;
}

export function getRequirementBudgetDigitLimitError(value: NumericInputValue, message: string) {
  if (!hasNumericInput(value)) {
    return null;
  }

  const digitCount = String(value ?? "").replace(/\D/g, "").length;
  return digitCount > REQUIREMENT_BUDGET_MAX_DIGITS ? message : null;
}
