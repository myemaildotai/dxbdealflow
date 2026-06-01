import type { Listing } from "@/lib/deal-types";

type BedroomOption = {
  value: string;
  label: string;
  apiValue: string;
  filterValue: string;
};

type BedroomFilterOption = {
  value: string;
  label: string;
};

export const LISTING_BEDROOM_OPTIONS = [
  { value: "studio", label: "Studio", apiValue: "0", filterValue: "0" },
  { value: "br1", label: "BR1", apiValue: "1", filterValue: "1" },
  { value: "br2", label: "BR2", apiValue: "2", filterValue: "2" },
  { value: "br3", label: "BR3", apiValue: "3", filterValue: "3" },
  { value: "br4", label: "BR4", apiValue: "4", filterValue: "4" },
  { value: "br5", label: "BR5", apiValue: "5", filterValue: "5" },
  { value: "br6", label: "BR6", apiValue: "6", filterValue: "6" },
  { value: "br7", label: "BR7", apiValue: "7", filterValue: "7" },
  { value: "br8plus", label: "BR8+", apiValue: "8", filterValue: "8+" },
] as const satisfies readonly BedroomOption[];

export type ListingBedroomValue = (typeof LISTING_BEDROOM_OPTIONS)[number]["value"];
export type ListingBedroomFilterValue =
  (typeof LISTING_BEDROOM_OPTIONS)[number]["filterValue"];

type ListingBedroomQueryValue = ListingBedroomFilterValue | "4+";

const LISTING_BEDROOM_OPTION_BY_VALUE = new Map<string, BedroomOption>(
  LISTING_BEDROOM_OPTIONS.map((option) => [option.value, option] as const),
);

const LISTING_BEDROOM_OPTION_BY_FILTER_VALUE = new Map<string, BedroomOption>(
  LISTING_BEDROOM_OPTIONS.map((option) => [option.filterValue, option] as const),
);

const LEGACY_OPEN_ENDED_FILTER_VALUE = "4+";

export function getListingBedroomOptions() {
  return [...LISTING_BEDROOM_OPTIONS];
}

export function getListingBedroomFilterOptions(value?: string) {
  const options: BedroomFilterOption[] = LISTING_BEDROOM_OPTIONS.map((option) => ({
    value: option.filterValue,
    label: option.label,
  }));

  if (value === LEGACY_OPEN_ENDED_FILTER_VALUE) {
    const insertIndex = options.findIndex((option) => option.value === "4");
    options.splice(insertIndex + 1, 0, {
      value: LEGACY_OPEN_ENDED_FILTER_VALUE,
      label: "4+ Beds",
    });
  }

  return [{ value: "", label: "Any Beds" }, ...options];
}

export function getListingBedroomLabel(value: string) {
  if (!value) {
    return "Any Beds";
  }

  return LISTING_BEDROOM_OPTION_BY_VALUE.get(value)?.label || "Any Beds";
}

export function normalizeListingBedroomValue(
  value: Listing["bedrooms"] | string | null | undefined,
): ListingBedroomValue | "" {
  const trimmedValue = String(value ?? "").trim();

  if (!trimmedValue) {
    return "";
  }

  if (LISTING_BEDROOM_OPTION_BY_VALUE.has(trimmedValue)) {
    return trimmedValue as ListingBedroomValue;
  }

  const normalizedValue = trimmedValue.toLowerCase().replace(/\s+/g, "");

  if (
    normalizedValue === "studio" ||
    normalizedValue === "0" ||
    normalizedValue === "0br" ||
    normalizedValue === "br0"
  ) {
    return "studio";
  }

  if (
    normalizedValue === "8+" ||
    normalizedValue === "8plus" ||
    normalizedValue === "8br+" ||
    normalizedValue === "br8+" ||
    normalizedValue === "br8plus"
  ) {
    return "br8plus";
  }

  const numericMatch = normalizedValue.match(/(\d+)/);

  if (!numericMatch) {
    return "";
  }

  const parsedValue = Number(numericMatch[1]);

  if (!Number.isFinite(parsedValue) || parsedValue < 0) {
    return "";
  }

  if (parsedValue === 0) {
    return "studio";
  }

  if (parsedValue >= 8) {
    return "br8plus";
  }

  return `br${parsedValue}` as ListingBedroomValue;
}

export function mapListingBedroomToApi(value: string) {
  return LISTING_BEDROOM_OPTION_BY_VALUE.get(value)?.apiValue || "";
}

export function mapListingBedroomValueToFilterValue(value: string) {
  return LISTING_BEDROOM_OPTION_BY_VALUE.get(value)?.filterValue || "";
}

export function normalizeListingBedroomFilterValue(
  value: string | null | undefined,
): ListingBedroomQueryValue | "" {
  const trimmedValue = String(value ?? "").trim();

  if (!trimmedValue) {
    return "";
  }

  const normalizedValue = trimmedValue.toLowerCase().replace(/\s+/g, "");

  if (
    normalizedValue === "studio" ||
    normalizedValue === "0" ||
    normalizedValue === "0br" ||
    normalizedValue === "br0"
  ) {
    return "0";
  }

  if (normalizedValue === "4+" || normalizedValue === "4plus") {
    return LEGACY_OPEN_ENDED_FILTER_VALUE;
  }

  const numericMatch = normalizedValue.match(/(\d+)/);

  if (!numericMatch) {
    return "";
  }

  const parsedValue = Number(numericMatch[1]);

  if (!Number.isFinite(parsedValue) || parsedValue < 0) {
    return "";
  }

  if (parsedValue === 0) {
    return "0";
  }

  if (parsedValue >= 8) {
    return "8+";
  }

  return String(parsedValue) as ListingBedroomFilterValue;
}

export function serializeListingBedroomFilterValue(value: string) {
  if (value === LEGACY_OPEN_ENDED_FILTER_VALUE) {
    return "4plus";
  }

  return LISTING_BEDROOM_OPTION_BY_FILTER_VALUE.get(value)?.apiValue || value;
}

export function matchesListingBedroomFilter(
  value: string,
  bedrooms: number | null,
) {
  if (!value) {
    return true;
  }

  if (value === "0") {
    return bedrooms === 0;
  }

  if (value === LEGACY_OPEN_ENDED_FILTER_VALUE) {
    return typeof bedrooms === "number" && bedrooms >= 4;
  }

  if (value === "8+") {
    return typeof bedrooms === "number" && bedrooms >= 8;
  }

  return bedrooms === Number(value);
}
