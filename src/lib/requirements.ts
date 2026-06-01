import type {
  PropertyType,
  Requirement,
  RequirementDealType,
  RequirementMatchStatus,
  RequirementStatus,
  RequirementUrgency,
} from "@/lib/deal-types";

export const REQUIREMENT_PROPERTY_TYPES: PropertyType[] = [
  "apartment",
  "villa",
  "townhouse",
  "penthouse",
  "office",
  "retail",
  "warehouse",
  "land",
];

export const REQUIREMENT_DEAL_TYPES: RequirementDealType[] = [
  "secondary",
  "offplan",
  "urgent",
  "distressed",
];

export const REQUIREMENT_URGENCY_OPTIONS: RequirementUrgency[] = ["low", "medium", "high"];
export const REQUIREMENT_STATUS_OPTIONS: RequirementStatus[] = ["active", "inactive", "closed"];
export const REQUIREMENT_MATCH_STATUS_OPTIONS: RequirementMatchStatus[] = ["new", "read", "contacted", "archived"];

export const REQUIREMENT_BEDROOM_OPTIONS = [
  "Studio",
  "1BR",
  "2BR",
  "3BR",
  "4BR",
  "5BR",
  "6BR",
  "7BR",
  "8BR+",
] as const;

export type RequirementBedroomOption = (typeof REQUIREMENT_BEDROOM_OPTIONS)[number];

const REQUIREMENT_BEDROOM_OPTION_SET = new Set<string>(REQUIREMENT_BEDROOM_OPTIONS);

export function parseRequirementBedroomOption(value: string | null | undefined): RequirementBedroomOption | null {
  const trimmedValue = String(value ?? "").trim();
  if (!trimmedValue) {
    return null;
  }

  if (REQUIREMENT_BEDROOM_OPTION_SET.has(trimmedValue)) {
    return trimmedValue as RequirementBedroomOption;
  }

  const normalizedValue = trimmedValue.toLowerCase().replace(/\s+/g, "");
  if (normalizedValue === "studio") {
    return "Studio";
  }

  const numericMatch = normalizedValue.match(/(\d+)/);
  if (!numericMatch) {
    return null;
  }

  const bedroomCount = Number(numericMatch[1]);
  if (!Number.isFinite(bedroomCount) || bedroomCount < 0) {
    return null;
  }

  if (bedroomCount === 0) {
    return "Studio";
  }

  return (bedroomCount >= 8 ? "8BR+" : `${bedroomCount}BR`) as RequirementBedroomOption;
}

export function formatRequirementBedrooms(value: string | null | undefined): string | null {
  const parsedValue = parseRequirementBedroomOption(value);
  if (parsedValue) {
    return parsedValue;
  }

  const trimmedValue = String(value ?? "").trim();
  return trimmedValue || null;
}

export function getRequirementStatus(requirement: Pick<Requirement, "is_active" | "deleted_at">): RequirementStatus {
  if (requirement.deleted_at) {
    return "closed";
  }

  return requirement.is_active ? "active" : "inactive";
}
