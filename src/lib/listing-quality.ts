import type { Listing, ListingFormValues } from "@/lib/deal-types";

export const LISTING_QUALITY_MIN_IMAGE_COUNT = 1;
export const LISTING_QUALITY_MAX_IMAGE_COUNT = 10;
export const LISTING_QUALITY_RECOMMENDED_IMAGE_COUNT = 6;
export const LISTING_QUALITY_RECOMMENDED_DOCUMENT_COUNT = 1;
export const LISTING_QUALITY_CHECKLIST_LIMIT = 3;

export type ListingQualityFieldKey = keyof ListingFormValues | "images" | "documents";

export type ListingQualityErrors = Partial<Record<ListingQualityFieldKey, string | undefined>>;

export type ListingQualitySource = {
  title?: string | null;
  propertyType?: string | null;
  dealType?: string | null;
  bedrooms?: string | number | null;
  sizeSqft?: string | number | null;
  areaId?: string | null;
  developer?: string | null;
  price?: string | number | null;
  paymentPlan?: string | null;
  handoverDate?: string | null;
  yieldPercent?: string | number | null;
  coBrokePercent?: string | number | null;
  notes?: string | null;
  description?: string | null;
  paymentTerms?: string | null;
  imageCount?: number | null;
  documentCount?: number | null;
  errors?: ListingQualityErrors;
  minImageCount?: number;
  maxImageCount?: number;
};

export type ListingQualityItem = {
  key: ListingQualityFieldKey;
  label: string;
  complete: boolean;
  required: boolean;
  contribution: number;
};

export type ListingQualityState = {
  items: ListingQualityItem[];
  percentage: number;
  completedCount: number;
  totalCount: number;
  remainingCount: number;
  completedRequiredCount: number;
  requiredCount: number;
  score: number;
  maxScore: number;
};

type ListingQualityFieldDefinition = {
  key: ListingQualityFieldKey;
  label: string;
  required: boolean;
  getContribution: (source: ListingQualitySource) => number;
};

function hasText(value: string | null | undefined) {
  return Boolean(value?.trim());
}

function normalizeNumericInput(value: string | number | null | undefined) {
  return String(value ?? "").replace(/,/g, "").replace(/\s+/g, "").trim();
}

function parseOptionalNumericInput(value: string | number | null | undefined) {
  const normalizedValue = normalizeNumericInput(value);
  if (!normalizedValue) {
    return null;
  }

  const parsedValue = Number(normalizedValue);
  return Number.isFinite(parsedValue) ? parsedValue : null;
}

function isPositiveNumericInput(value: string | number | null | undefined) {
  const parsedValue = parseOptionalNumericInput(value);
  return parsedValue !== null && parsedValue > 0;
}

function isPercentInputComplete(value: string | number | null | undefined) {
  const parsedValue = parseOptionalNumericInput(value);
  return parsedValue !== null && parsedValue >= 0 && parsedValue <= 100;
}

function hasBedroomValue(value: string | number | null | undefined) {
  if (typeof value === "number") {
    return Number.isFinite(value) && value >= 0;
  }

  return hasText(value);
}

function hasFieldError(source: ListingQualitySource, key: ListingQualityFieldKey) {
  return Boolean(source.errors?.[key]);
}

function getNormalizedCount(value: number | null | undefined) {
  const count = Number(value || 0);
  return Number.isFinite(count) ? Math.max(0, count) : 0;
}

function getNormalizedContribution(currentCount: number, targetCount: number) {
  if (currentCount <= 0 || targetCount <= 0) {
    return 0;
  }

  return Math.min(currentCount / targetCount, 1);
}

function getTextContribution(source: ListingQualitySource, key: ListingQualityFieldKey, value: string | null | undefined) {
  return !hasFieldError(source, key) && hasText(value) ? 1 : 0;
}

function getSelectContribution(source: ListingQualitySource, key: ListingQualityFieldKey, value: string | null | undefined) {
  return !hasFieldError(source, key) && Boolean(value) ? 1 : 0;
}

function getPositiveNumberContribution(source: ListingQualitySource, key: ListingQualityFieldKey, value: string | number | null | undefined) {
  return !hasFieldError(source, key) && isPositiveNumericInput(value) ? 1 : 0;
}

function getPercentContribution(source: ListingQualitySource, key: ListingQualityFieldKey, value: string | number | null | undefined) {
  return !hasFieldError(source, key) && isPercentInputComplete(value) ? 1 : 0;
}

function getImageContribution(source: ListingQualitySource) {
  const imageCount = getNormalizedCount(source.imageCount);
  const minImageCount = source.minImageCount ?? LISTING_QUALITY_MIN_IMAGE_COUNT;
  const maxImageCount = source.maxImageCount ?? LISTING_QUALITY_MAX_IMAGE_COUNT;

  if (hasFieldError(source, "images") || imageCount < minImageCount || imageCount > maxImageCount) {
    return 0;
  }

  return getNormalizedContribution(imageCount, LISTING_QUALITY_RECOMMENDED_IMAGE_COUNT);
}

function getDocumentContribution(source: ListingQualitySource) {
  return getNormalizedContribution(
    getNormalizedCount(source.documentCount),
    LISTING_QUALITY_RECOMMENDED_DOCUMENT_COUNT,
  );
}

export const LISTING_QUALITY_FIELDS: readonly ListingQualityFieldDefinition[] = [
  {
    key: "title",
    label: "Listing title",
    required: true,
    getContribution: (source) => getTextContribution(source, "title", source.title),
  },
  {
    key: "propertyType",
    label: "Property type",
    required: true,
    getContribution: (source) => getSelectContribution(source, "propertyType", source.propertyType),
  },
  {
    key: "areaId",
    label: "Area",
    required: true,
    getContribution: (source) => getTextContribution(source, "areaId", source.areaId),
  },
  {
    key: "dealType",
    label: "Deal type",
    required: true,
    getContribution: (source) => getSelectContribution(source, "dealType", source.dealType),
  },
  {
    key: "price",
    label: "Price",
    required: true,
    getContribution: (source) => getPositiveNumberContribution(source, "price", source.price),
  },
  {
    key: "sizeSqft",
    label: "Size",
    required: true,
    getContribution: (source) => getPositiveNumberContribution(source, "sizeSqft", source.sizeSqft),
  },
  {
    key: "bedrooms",
    label: "Bedrooms",
    required: true,
    getContribution: (source) => !hasFieldError(source, "bedrooms") && hasBedroomValue(source.bedrooms) ? 1 : 0,
  },
  {
    key: "developer",
    label: "Developer",
    required: true,
    getContribution: (source) => getTextContribution(source, "developer", source.developer),
  },
  {
    key: "description",
    label: "Description",
    required: true,
    getContribution: (source) => getTextContribution(source, "description", source.description),
  },
  {
    key: "images",
    label: "Images",
    required: true,
    getContribution: getImageContribution,
  },
  {
    key: "paymentPlan",
    label: "Payment plan",
    required: false,
    getContribution: (source) => getTextContribution(source, "paymentPlan", source.paymentPlan),
  },
  {
    key: "handoverDate",
    label: "Handover date",
    required: false,
    getContribution: (source) => getTextContribution(source, "handoverDate", source.handoverDate),
  },
  {
    key: "yieldPercent",
    label: "Yield percent",
    required: false,
    getContribution: (source) => getPercentContribution(source, "yieldPercent", source.yieldPercent),
  },
  {
    key: "coBrokePercent",
    label: "Co-broke percent",
    required: false,
    getContribution: (source) => getPercentContribution(source, "coBrokePercent", source.coBrokePercent),
  },
  {
    key: "paymentTerms",
    label: "Payment terms",
    required: false,
    getContribution: (source) => getTextContribution(source, "paymentTerms", source.paymentTerms),
  },
  {
    key: "notes",
    label: "Notes",
    required: false,
    getContribution: (source) => getTextContribution(source, "notes", source.notes),
  },
  {
    key: "documents",
    label: "Supporting files",
    required: false,
    getContribution: getDocumentContribution,
  },
] as const;

export const LISTING_QUALITY_CHECKLIST_PRIORITY: readonly ListingQualityFieldKey[] = [
  "images",
  "price",
  "areaId",
  "propertyType",
  "description",
  "documents",
  "paymentPlan",
  "yieldPercent",
  "coBrokePercent",
  "paymentTerms",
  "sizeSqft",
  "bedrooms",
  "developer",
  "dealType",
  "handoverDate",
  "title",
  "notes",
] as const;

export function isListingQualityItemComplete(item: Pick<ListingQualityItem, "contribution">) {
  return item.contribution >= 1;
}

export function getListingQualityState(source: ListingQualitySource): ListingQualityState {
  const items = LISTING_QUALITY_FIELDS.map((field) => {
    const contribution = field.getContribution(source);

    return {
      key: field.key,
      label: field.label,
      required: field.required,
      contribution,
      complete: isListingQualityItemComplete({ contribution }),
    };
  });

  const completedCount = items.filter((item) => item.complete).length;
  const requiredItems = items.filter((item) => item.required);
  const completedRequiredCount = requiredItems.filter((item) => item.complete).length;
  const score = items.reduce((total, item) => total + item.contribution, 0);
  const maxScore = Math.max(items.length, 1);
  const rawPercentage = (score / maxScore) * 100;
  const percentage = score >= maxScore ? 100 : Math.max(0, Math.min(99, Math.round(rawPercentage)));

  return {
    items,
    percentage,
    completedCount,
    totalCount: items.length,
    remainingCount: items.length - completedCount,
    completedRequiredCount,
    requiredCount: requiredItems.length,
    score,
    maxScore,
  };
}

export function getListingQualityLabel(percentage: number) {
  if (percentage >= 100) {
    return "Excellent";
  }

  if (percentage >= 80) {
    return "Good";
  }

  if (percentage >= 50) {
    return "Average";
  }

  return "Needs work";
}

export function getListingQualitySourceFromListing(
  listing: Pick<
    Listing,
    | "title"
    | "property_type"
    | "deal_type"
    | "bedrooms"
    | "size_sqft"
    | "area_id"
    | "developer"
    | "price"
    | "payment_plan"
    | "handover_date"
    | "yield_percent"
    | "notes"
    | "description"
    | "commission_terms"
    | "listing_images"
    | "listing_documents"
  >,
  options: {
    documentCount?: number | null;
    imageCount?: number | null;
    maxImageCount?: number;
    minImageCount?: number;
  } = {},
): ListingQualitySource {
  return {
    title: listing.title,
    propertyType: listing.property_type,
    dealType: listing.deal_type,
    bedrooms: listing.bedrooms,
    sizeSqft: listing.size_sqft,
    areaId: listing.area_id,
    developer: listing.developer,
    price: listing.price,
    paymentPlan: listing.payment_plan,
    handoverDate: listing.handover_date,
    yieldPercent: listing.yield_percent,
    coBrokePercent: listing.commission_terms?.co_broke_percent ?? null,
    notes: listing.notes,
    description: listing.description,
    paymentTerms: listing.commission_terms?.payment_terms ?? null,
    imageCount: options.imageCount ?? listing.listing_images?.length ?? 0,
    documentCount: options.documentCount ?? listing.listing_documents?.length ?? 0,
    maxImageCount: options.maxImageCount,
    minImageCount: options.minImageCount,
  };
}

export function selectListingQualityChecklistItems(
  items: readonly ListingQualityItem[],
  options: {
    limit?: number;
    percentage?: number;
  } = {},
) {
  const limit = Math.max(0, options.limit ?? LISTING_QUALITY_CHECKLIST_LIMIT);
  if (limit === 0) {
    return [];
  }

  const priorityIndex = new Map(
    LISTING_QUALITY_CHECKLIST_PRIORITY.map((key, index) => [key, index] as const),
  );
  const orderedItems = [...items].sort((left, right) => {
    const leftPriority = priorityIndex.get(left.key) ?? Number.MAX_SAFE_INTEGER;
    const rightPriority = priorityIndex.get(right.key) ?? Number.MAX_SAFE_INTEGER;

    return leftPriority - rightPriority || left.label.localeCompare(right.label);
  });

  if ((options.percentage ?? 0) >= 100) {
    return orderedItems.filter((item) => item.complete).slice(0, limit);
  }

  const pendingItems = orderedItems.filter((item) => !item.complete);
  const completedItems = orderedItems.filter((item) => item.complete);

  return [
    ...pendingItems.slice(0, limit),
    ...completedItems.slice(0, Math.max(0, limit - pendingItems.length)),
  ].slice(0, limit);
}
