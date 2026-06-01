import type { ListingStatus, Requirement } from "@/lib/deal-types";
import { formatCurrency, formatDate, formatDateTime, formatDealType, formatPropertyType, formatRequirementUrgency } from "@/lib/deal-utils";
import { formatRequirementBedrooms } from "@/lib/requirements";

export type MatchListingOption = {
  id: string;
  title: string;
  property_type: string;
  price: number;
  bedrooms: number | null;
  status: ListingStatus;
  area_id: string | null;
  area?: { name: string; city: string } | null;
};

export type BuyerBoardSortId = "newest" | "oldest" | "budget_high" | "matches_high";

export type BuyerBoardFilterState = {
  search: string;
  area: string;
  minBudget: string;
  maxBudget: string;
  urgency: string;
  propertyType: string;
  bedrooms: string;
  sortBy: BuyerBoardSortId;
};

export const BUYER_BOARD_INITIAL_FILTERS: BuyerBoardFilterState = {
  search: "",
  area: "",
  minBudget: "",
  maxBudget: "",
  urgency: "",
  propertyType: "",
  bedrooms: "",
  sortBy: "newest",
};

export const BUYER_BOARD_SORT_OPTIONS: Array<{ value: BuyerBoardSortId; label: string }> = [
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
  { value: "budget_high", label: "Highest budget" },
  { value: "matches_high", label: "Most matches" },
];

export function getBuyerBoardRequirementTitle(requirement: Pick<Requirement, "title" | "area">) {
  if (requirement.title?.trim()) {
    return requirement.title.trim();
  }

  if (requirement.area?.trim()) {
    return `Requirement in ${requirement.area.trim()}`;
  }

  return "Buyer requirement";
}

export function getRequirementBudgetLine(requirement: Pick<Requirement, "budget_min" | "budget_max">) {
  if (requirement.budget_min !== null && requirement.budget_min !== undefined && requirement.budget_max !== null && requirement.budget_max !== undefined) {
    return `${formatCurrency(requirement.budget_min)} - ${formatCurrency(requirement.budget_max)}`;
  }

  if (requirement.budget_max !== null && requirement.budget_max !== undefined) {
    return `Up to ${formatCurrency(requirement.budget_max)}`;
  }

  if (requirement.budget_min !== null && requirement.budget_min !== undefined) {
    return `From ${formatCurrency(requirement.budget_min)}`;
  }

  return "Budget on request";
}

export function getRequirementMatchCount(requirement: Pick<Requirement, "submitted_match_count">) {
  return requirement.submitted_match_count || 0;
}

export function isRequirementLiveForBoard(
  requirement: Requirement | null | undefined,
) {
  return !!(
    requirement?.id &&
    requirement.broker_id &&
    requirement.created_at &&
    requirement.is_active &&
    !requirement.deleted_at
  );
}

export function getRequirementMatchLabel(count: number) {
  return `${count} match${count === 1 ? " submitted" : "es submitted"}`;
}

export function getRequirementMatchedListingsLabel(count: number) {
  return count === 1 ? "1 listing matches this buyer" : `${count} listings match this buyer`;
}

export function formatRelativeTime(value: string | null | undefined) {
  if (!value) {
    return "Just now";
  }

  const diffMs = Date.now() - new Date(value).getTime();
  const diffMinutes = Math.max(1, Math.round(diffMs / 60000));

  if (diffMinutes < 60) {
    return `${diffMinutes}m ago`;
  }

  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) {
    return `${diffHours}h ago`;
  }

  const diffDays = Math.round(diffHours / 24);
  if (diffDays < 7) {
    return `${diffDays}d ago`;
  }

  return formatDate(value);
}

export function getRequirementSearchText(requirement: Requirement) {
  const bedroomsLabel = formatRequirementBedrooms(requirement.bedrooms);

  return [
    requirement.title,
    requirement.description,
    requirement.area,
    formatPropertyType(requirement.property_type),
    formatDealType(requirement.deal_type),
    bedroomsLabel,
    formatRequirementUrgency(requirement.urgency),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

export function getRequirementBudgetSortValue(requirement: Pick<Requirement, "budget_min" | "budget_max">) {
  return requirement.budget_max ?? requirement.budget_min ?? -1;
}

export function getRequirementPostedMeta(requirement: Pick<Requirement, "created_at" | "updated_at">) {
  return {
    relative: formatRelativeTime(requirement.created_at),
    created: formatDateTime(requirement.created_at),
    updated: formatDateTime(requirement.updated_at),
  };
}
