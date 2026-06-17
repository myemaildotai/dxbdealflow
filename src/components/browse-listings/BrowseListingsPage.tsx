"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useSnackbar } from "notistack";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import { SkeletonBlock } from "@/components/SkeletonBlock";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { useInfiniteScroll } from "@/hooks/useInfiniteScroll";
import { apiFetch } from "@/lib/deal-api";
import { PropertyType } from "@/lib/deal-types";
import { formatCurrency, formatPropertyType } from "@/lib/deal-utils";
import { buildPaginationMeta, type PaginationMeta } from "@/lib/pagination";
import {
  getListingBedroomFilterOptions,
  normalizeListingBedroomFilterValue,
  serializeListingBedroomFilterValue,
} from "@/lib/listing-bedrooms";
import { DealIntelStrip } from "@/components/browse-listings/DealIntelStrip";
import { ListingCard } from "@/components/browse-listings/ListingCard";
import {
  ListingsFilterBar,
  type AppliedFilterChip,
} from "@/components/browse-listings/ListingsFilterBar";
import { TopDealCard } from "@/components/browse-listings/TopDealCard";
import {
  BrowseTabId,
  BrowseClientFilters,
  BrowseListingRecord,
  BrowseServerFilters,
  DealIntelItem,
  ListingIntel,
  SelectOption,
  SortOption,
  buildListingIntelFromRecord,
} from "@/components/browse-listings/browse-listings-utils";

type ListingsResponse = {
  viewerIsBroker: boolean;
  areas: Array<{
    id: string;
    name: string;
    city: string;
    slug: string;
  }>;
  listings: BrowseListingRecord[];
  pagination: PaginationMeta;
  summary: {
    totalCount: number;
    filteredCount: number;
    tabCounts: Record<BrowseTabId, number>;
    topDeal: BrowseListingRecord | null;
  };
};

type SearchParamsLike = {
  get(name: string): string | null;
  toString(): string;
};

const PROPERTY_TYPES: PropertyType[] = [
  "apartment",
  "villa",
  "townhouse",
  "penthouse",
  "office",
  "retail",
  "warehouse",
  "land",
];

const PRICE_RANGE_PRESETS = [
  { value: "", label: "Any Price", minPrice: "", maxPrice: "" },
  {
    value: "under-1000000",
    label: "Under AED 1M",
    minPrice: "",
    maxPrice: "1000000",
  },
  {
    value: "1000000-2000000",
    label: "AED 1M - 2M",
    minPrice: "1000000",
    maxPrice: "2000000",
  },
  {
    value: "2000000-5000000",
    label: "AED 2M - 5M",
    minPrice: "2000000",
    maxPrice: "5000000",
  },
  {
    value: "5000000-plus",
    label: "AED 5M+",
    minPrice: "5000000",
    maxPrice: "",
  },
] as const;

const ROI_OPTIONS: SelectOption[] = [
  { value: "", label: "Any ROI" },
  { value: "5", label: "5%+" },
  { value: "6.5", label: "6.5%+" },
  { value: "8", label: "8%+" },
  { value: "10", label: "10%+" },
];

const DEAL_TYPE_OPTIONS: SelectOption[] = [
  { value: "", label: "All Deal Types" },
  { value: "urgent", label: "Urgent" },
  { value: "distressed", label: "Distressed" },
  { value: "off-market", label: "Off-market" },
];

const ADDED_TIME_OPTIONS: SelectOption[] = [
  { value: "", label: "Any Time" },
  { value: "today", label: "Today" },
  { value: "7d", label: "Last 7 Days" },
  { value: "30d", label: "Last 30 Days" },
];

const SORT_OPTIONS: SelectOption[] = [
  { value: "newest", label: "Newest" },
  { value: "price_asc", label: "Price: Low to High" },
  { value: "roi_desc", label: "ROI: High to Low" },
];
const LISTINGS_PAGE_SIZE = 12;
const COMMITTED_FILTER_DEBOUNCE_MS = 140;
const TEXT_FILTER_DEBOUNCE_MS = 300;

const fallbackResponse: ListingsResponse = {
  viewerIsBroker: false,
  areas: [],
  listings: [],
  pagination: buildPaginationMeta({ page: 1, pageSize: LISTINGS_PAGE_SIZE, totalCount: 0 }),
  summary: {
    totalCount: 0,
    filteredCount: 0,
    tabCounts: {
      all: 0,
      "new-deals": 0,
      "urgent-sellers": 0,
      "below-market": 0,
      "recent-price-drop": 0,
      "best-deals": 0,
      "off-market": 0,
    },
    topDeal: null,
  },
};

const DEFAULT_SERVER_FILTERS: BrowseServerFilters = {
  areaId: "",
  minPrice: "",
  maxPrice: "",
  propertyType: "",
};

const DEFAULT_CLIENT_FILTERS: BrowseClientFilters = {
  search: "",
  beds: "",
  developer: "",
  roi: "",
  dealType: "",
  addedTime: "",
  sort: "newest",
};

const BROWSE_TAB_IDS: BrowseTabId[] = [
  "all",
  "new-deals",
  "urgent-sellers",
  "below-market",
  "recent-price-drop",
  "best-deals",
  "off-market",
];

function getQueryValue(params: SearchParamsLike, keys: string[]) {
  for (const key of keys) {
    const value = params.get(key);

    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return "";
}

function normalizeLookupValue(value: string) {
  return value.trim().toLowerCase();
}

function normalizeNumericParam(value: string) {
  return value.replace(/[^\d]/g, "");
}

function normalizePropertyTypeParam(value: string) {
  if (!value.trim()) {
    return "";
  }

  const normalizedValue = value.trim().toLowerCase().replace(/\s+/g, "_");
  return PROPERTY_TYPES.includes(normalizedValue as PropertyType)
    ? normalizedValue
    : "";
}

function normalizeOptionParam(value: string, options: string[]) {
  if (!value.trim()) {
    return "";
  }

  const normalizedValue = value.trim().toLowerCase();
  const matchedOption = options.find(
    (option) => option.toLowerCase() === normalizedValue,
  );

  return matchedOption || "";
}

function resolveAreaFromValue(value: string, areas: ListingsResponse["areas"]) {
  const normalizedValue = normalizeLookupValue(value);

  if (!normalizedValue) {
    return null;
  }

  return (
    areas.find((area) => {
      const normalizedName = normalizeLookupValue(area.name);
      const normalizedCity = normalizeLookupValue(area.city);
      const normalizedSlug = normalizeLookupValue(area.slug);

      return (
        area.id === value ||
        normalizedName === normalizedValue ||
        normalizedCity === normalizedValue ||
        normalizedSlug === normalizedValue ||
        normalizedSlug === normalizedValue.replace(/\s+/g, "-")
      );
    }) ||
    areas.find((area) => {
      const normalizedName = normalizeLookupValue(area.name);
      const normalizedCity = normalizeLookupValue(area.city);
      const normalizedSlug = normalizeLookupValue(area.slug);
      const normalizedValueSlug = normalizedValue.replace(/\s+/g, "-");

      return (
        normalizedName.includes(normalizedValue) ||
        normalizedValue.includes(normalizedName) ||
        normalizedCity.includes(normalizedValue) ||
        normalizedSlug.includes(normalizedValueSlug)
      );
    }) ||
    null
  );
}

function resolveServerFiltersFromParams(
  params: SearchParamsLike,
  areas: ListingsResponse["areas"],
): BrowseServerFilters {
  const rawAreaId = getQueryValue(params, ["areaId"]);
  const rawLocation = getQueryValue(params, ["location"]);
  const directAreaMatch = rawAreaId
    ? areas.find((area) => area.id === rawAreaId) || null
    : null;
  const locationAreaMatch = rawLocation
    ? resolveAreaFromValue(rawLocation, areas)
    : null;
  const resolvedAreaId =
    directAreaMatch?.id ||
    locationAreaMatch?.id ||
    (!areas.length ? rawAreaId : "");

  return {
    areaId: resolvedAreaId,
    minPrice: normalizeNumericParam(getQueryValue(params, ["minPrice"])),
    maxPrice: normalizeNumericParam(getQueryValue(params, ["maxPrice"])),
    propertyType: normalizePropertyTypeParam(
      getQueryValue(params, ["propertyType"]),
    ),
  };
}

function resolveClientFiltersFromParams(
  params: SearchParamsLike,
  areas: ListingsResponse["areas"],
): BrowseClientFilters {
  const keyword = getQueryValue(params, ["keyword", "search"]);
  const rawLocation = getQueryValue(params, ["location"]);
  const rawAreaId = getQueryValue(params, ["areaId"]);
  const locationMatch = rawLocation
    ? resolveAreaFromValue(rawLocation, areas)
    : null;
  const fallbackSearch =
    !keyword && rawLocation && !rawAreaId && !locationMatch ? rawLocation : "";

  return {
    search: keyword || fallbackSearch,
    beds: normalizeListingBedroomFilterValue(getQueryValue(params, ["beds"])),
    developer: getQueryValue(params, ["developer"]),
    roi: normalizeOptionParam(
      getQueryValue(params, ["roi"]),
      ROI_OPTIONS.map((option) => option.value).filter(Boolean),
    ),
    dealType: normalizeOptionParam(
      getQueryValue(params, ["dealType"]),
      DEAL_TYPE_OPTIONS.map((option) => option.value).filter(Boolean),
    ),
    addedTime: normalizeOptionParam(
      getQueryValue(params, ["addedTime"]),
      ADDED_TIME_OPTIONS.map((option) => option.value).filter(Boolean),
    ),
    sort:
      (normalizeOptionParam(
        getQueryValue(params, ["sort"]),
        SORT_OPTIONS.map((option) => option.value),
      ) as SortOption) || "newest",
  };
}

function resolveActiveTabFromParams(params: SearchParamsLike) {
  const rawTab = normalizeLookupValue(getQueryValue(params, ["tab"]));
  return BROWSE_TAB_IDS.includes(rawTab as BrowseTabId)
    ? (rawTab as BrowseTabId)
    : "all";
}

function buildBrowseQueryParams({
  serverFilters,
  clientFilters,
  activeTab,
  areas,
}: {
  serverFilters: BrowseServerFilters;
  clientFilters: BrowseClientFilters;
  activeTab: BrowseTabId;
  areas: ListingsResponse["areas"];
}) {
  const params = new URLSearchParams();

  if (serverFilters.areaId) {
    params.set("areaId", serverFilters.areaId);

    const matchedArea = areas.find((area) => area.id === serverFilters.areaId);

    if (matchedArea) {
      params.set("location", matchedArea.name);
    }
  }

  if (serverFilters.propertyType) {
    params.set("propertyType", serverFilters.propertyType);
  }

  if (clientFilters.beds) {
    params.set("beds", serializeListingBedroomFilterValue(clientFilters.beds));
  }

  if (serverFilters.minPrice) {
    params.set("minPrice", serverFilters.minPrice);
  }

  if (serverFilters.maxPrice) {
    params.set("maxPrice", serverFilters.maxPrice);
  }

  if (clientFilters.search.trim()) {
    params.set("keyword", clientFilters.search.trim());
  }

  if (clientFilters.developer.trim()) {
    params.set("developer", clientFilters.developer.trim());
  }

  if (clientFilters.roi) {
    params.set("roi", clientFilters.roi);
  }

  if (clientFilters.dealType) {
    params.set("dealType", clientFilters.dealType);
  }

  if (clientFilters.addedTime) {
    params.set("addedTime", clientFilters.addedTime);
  }

  if (clientFilters.sort !== "newest") {
    params.set("sort", clientFilters.sort);
  }

  if (activeTab !== "all") {
    params.set("tab", activeTab);
  }

  return params;
}

function buildBrowseApiQueryParams({
  serverFilters,
  clientFilters,
  activeTab,
}: {
  serverFilters: BrowseServerFilters;
  clientFilters: BrowseClientFilters;
  activeTab: BrowseTabId;
}) {
  const params = new URLSearchParams();

  if (serverFilters.areaId) {
    params.set("areaId", serverFilters.areaId);
  }

  if (serverFilters.propertyType) {
    params.set("propertyType", serverFilters.propertyType);
  }

  if (clientFilters.beds) {
    params.set("beds", serializeListingBedroomFilterValue(clientFilters.beds));
  }

  if (serverFilters.minPrice) {
    params.set("minPrice", serverFilters.minPrice);
  }

  if (serverFilters.maxPrice) {
    params.set("maxPrice", serverFilters.maxPrice);
  }

  if (clientFilters.search.trim()) {
    params.set("keyword", clientFilters.search.trim());
  }

  if (clientFilters.developer.trim()) {
    params.set("developer", clientFilters.developer.trim());
  }

  if (clientFilters.roi) {
    params.set("roi", clientFilters.roi);
  }

  if (clientFilters.dealType) {
    params.set("dealType", clientFilters.dealType);
  }

  if (clientFilters.addedTime) {
    params.set("addedTime", clientFilters.addedTime);
  }

  if (clientFilters.sort !== "newest") {
    params.set("sort", clientFilters.sort);
  }

  if (activeTab !== "all") {
    params.set("tab", activeTab);
  }

  return params;
}

function areServerFiltersEqual(
  left: BrowseServerFilters,
  right: BrowseServerFilters,
) {
  return (
    left.areaId === right.areaId &&
    left.minPrice === right.minPrice &&
    left.maxPrice === right.maxPrice &&
    left.propertyType === right.propertyType
  );
}

function areClientFiltersEqual(
  left: BrowseClientFilters,
  right: BrowseClientFilters,
) {
  return (
    left.search === right.search &&
    left.beds === right.beds &&
    left.developer === right.developer &&
    left.roi === right.roi &&
    left.dealType === right.dealType &&
    left.addedTime === right.addedTime &&
    left.sort === right.sort
  );
}

function getPriceRangeValue(minPrice: string, maxPrice: string) {
  const matchingPreset = PRICE_RANGE_PRESETS.find(
    (preset) => preset.minPrice === minPrice && preset.maxPrice === maxPrice,
  );
  return matchingPreset
    ? matchingPreset.value
    : minPrice || maxPrice
      ? "custom"
      : "";
}

function getPriceRangeOptions(currentValue: string) {
  const baseOptions = PRICE_RANGE_PRESETS.map((preset) => ({
    value: preset.value,
    label: preset.label,
  }));

  return currentValue === "custom"
    ? [...baseOptions, { value: "custom", label: "Custom Range" }]
    : baseOptions;
}

function getSelectOptionLabel(options: SelectOption[], value: string) {
  return options.find((option) => option.value === value)?.label || value;
}

function formatPriceFilterLabel(
  minPrice: string,
  maxPrice: string,
  priceRangeValue: string,
  priceOptions: SelectOption[],
) {
  if (!minPrice && !maxPrice) {
    return "";
  }

  if (priceRangeValue && priceRangeValue !== "custom") {
    return `Price: ${getSelectOptionLabel(priceOptions, priceRangeValue)}`;
  }

  const parsedMinPrice = minPrice ? Number(minPrice) : null;
  const parsedMaxPrice = maxPrice ? Number(maxPrice) : null;

  if (parsedMinPrice !== null && parsedMaxPrice !== null) {
    return `Price: ${formatCurrency(parsedMinPrice)} - ${formatCurrency(parsedMaxPrice)}`;
  }

  if (parsedMinPrice !== null) {
    return `Price: ${formatCurrency(parsedMinPrice)}+`;
  }

  if (parsedMaxPrice !== null) {
    return `Price: Up to ${formatCurrency(parsedMaxPrice)}`;
  }

  return "Price";
}

function mergeUniqueListings(currentListings: ListingIntel["listing"][], nextListings: ListingIntel["listing"][]) {
  const listingMap = new Map(currentListings.map((listing) => [listing.id, listing]));

  nextListings.forEach((listing) => {
    listingMap.set(listing.id, listing);
  });

  return Array.from(listingMap.values());
}

function isAbortError(error: unknown) {
  return error instanceof Error && error.name === "AbortError";
}

function hasLocationOnlyParam(params: SearchParamsLike) {
  return Boolean(getQueryValue(params, ["location"])) && !getQueryValue(params, ["areaId"]);
}

function PageSkeleton() {
  return (
    <div className="space-y-5">
      <div className="rounded-[28px] border border-brand-line/80 bg-white/80 p-2 shadow-[0_18px_38px_rgba(15,42,95,0.06)]">
        <div className="grid grid-cols-2 gap-2 overflow-hidden sm:grid-cols-3 lg:flex lg:flex-wrap">
          {Array.from({ length: 5 }).map((_, index) => (
            <SkeletonBlock
              key={index}
              className="h-[52px] w-full rounded-full lg:w-[168px] lg:shrink-0"
            />
          ))}
        </div>
      </div>

      <div className="grid gap-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className="rounded-[20px] border border-brand-line/80 bg-white/80 p-4"
          >
            <SkeletonBlock className="h-12 w-full rounded-[18px]" />
          </div>
        ))}
      </div>

      <div className="overflow-hidden rounded-[32px] border border-brand-line/80 bg-white p-6 shadow-[0_22px_56px_rgba(15,42,95,0.1)]">
        <div className="grid gap-6 lg:grid-cols-[0.92fr_1.08fr]">
          <div className="space-y-4">
            <SkeletonBlock className="h-4 w-36 rounded-full" />
            <SkeletonBlock className="h-12 w-11/12 rounded-[18px]" />
            <SkeletonBlock className="h-12 w-8/12 rounded-[18px]" />
            <SkeletonBlock className="h-10 w-40 rounded-full" />
            <SkeletonBlock className="h-20 w-full rounded-[20px]" />
            <div className="grid gap-3 sm:grid-cols-2">
              {Array.from({ length: 4 }).map((_, index) => (
                <SkeletonBlock
                  key={index}
                  className="h-14 w-full rounded-[18px]"
                />
              ))}
            </div>
          </div>
          <SkeletonBlock className="aspect-[1.35] h-full min-h-[280px] w-full rounded-[28px]" />
        </div>
      </div>

      <div className="rounded-[30px] border border-brand-line/80 bg-white/86 p-5 shadow-[0_20px_48px_rgba(15,42,95,0.08)]">
        <div className="grid gap-3 xl:grid-cols-[auto_1fr_auto]">
          <SkeletonBlock className="h-[58px] w-full max-w-[250px] rounded-full xl:w-[250px]" />
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, index) => (
              <SkeletonBlock
                key={index}
                className="h-[58px] w-full rounded-full"
              />
            ))}
          </div>
          <SkeletonBlock className="h-[58px] w-full max-w-[190px] rounded-full xl:w-[190px]" />
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <div
            key={index}
            className="overflow-hidden rounded-[24px] border border-brand-line/80 bg-white p-5 shadow-[0_18px_42px_rgba(15,42,95,0.08)]"
          >
            <SkeletonBlock className="aspect-[1.38] w-full rounded-[18px]" />
            <div className="space-y-3 pt-5">
              <SkeletonBlock className="h-8 w-1/2 rounded-full" />
              <SkeletonBlock className="h-5 w-1/3 rounded-full" />
              <SkeletonBlock className="h-16 w-full rounded-[18px]" />
              <SkeletonBlock className="h-10 w-full rounded-full" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function BrowseListingsPage() {
  const router = useRouter();
  const pathname = usePathname() || "/listings";
  const searchParams = useSearchParams();
  const { enqueueSnackbar } = useSnackbar();
  const resolvedSearchParams = useMemo<SearchParamsLike>(
    () => searchParams ?? new URLSearchParams(),
    [searchParams],
  );
  const searchParamsKey = resolvedSearchParams.toString();
  const [, startTransition] = useTransition();
  const [serverFilters, setServerFilters] = useState<BrowseServerFilters>(() =>
    resolveServerFiltersFromParams(resolvedSearchParams, []),
  );
  const [clientFilters, setClientFilters] = useState<BrowseClientFilters>(() =>
    resolveClientFiltersFromParams(resolvedSearchParams, []),
  );
  const [queryServerFilters, setQueryServerFilters] = useState<BrowseServerFilters>(() =>
    resolveServerFiltersFromParams(resolvedSearchParams, []),
  );
  const [queryClientFilters, setQueryClientFilters] = useState<BrowseClientFilters>(() =>
    resolveClientFiltersFromParams(resolvedSearchParams, []),
  );
  const [activeTab, setActiveTab] = useState<BrowseTabId>(() =>
    resolveActiveTabFromParams(resolvedSearchParams),
  );
  const [response, setResponse] = useState<ListingsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const latestRequestIdRef = useRef(0);
  const replaceAbortControllerRef = useRef<AbortController | null>(null);
  const appendAbortControllerRef = useRef<AbortController | null>(null);
  const pendingRouteQueryRef = useRef<string | null>(null);
  const lastAppliedUrlQueryRef = useRef(searchParamsKey);
  const resolvedLocationQueryRef = useRef<string | null>(null);
  const applyingUrlSyncRef = useRef(false);

  const debouncedSearch = useDebouncedValue(clientFilters.search, TEXT_FILTER_DEBOUNCE_MS);
  const debouncedMinPrice = useDebouncedValue(serverFilters.minPrice, TEXT_FILTER_DEBOUNCE_MS);
  const debouncedMaxPrice = useDebouncedValue(serverFilters.maxPrice, TEXT_FILTER_DEBOUNCE_MS);
  const debouncedQueryServerFilters = useDebouncedValue(queryServerFilters, COMMITTED_FILTER_DEBOUNCE_MS);
  const debouncedQueryClientFilters = useDebouncedValue(queryClientFilters, COMMITTED_FILTER_DEBOUNCE_MS);
  const debouncedActiveTab = useDebouncedValue(activeTab, COMMITTED_FILTER_DEBOUNCE_MS);

  const queryString = useMemo(() => {
    return buildBrowseApiQueryParams({
      serverFilters: debouncedQueryServerFilters,
      clientFilters: debouncedQueryClientFilters,
      activeTab: debouncedActiveTab,
    }).toString();
  }, [debouncedActiveTab, debouncedQueryClientFilters, debouncedQueryServerFilters]);

  const requestPath = queryString
    ? `/api/listings?${queryString}`
    : "/api/listings";
  const buildPagedRequestPath = useCallback(
    (page: number, pageSize = LISTINGS_PAGE_SIZE) => {
      const params = new URLSearchParams(queryString);
      params.set("page", String(page));
      params.set("pageSize", String(pageSize));
      return `/api/listings?${params.toString()}`;
    },
    [queryString],
  );

  const loadListingsPage = useCallback(
    async (page: number, mode: "replace" | "append") => {
      const requestId = latestRequestIdRef.current + 1;
      latestRequestIdRef.current = requestId;
      const abortController = new AbortController();

      if (mode === "replace") {
        replaceAbortControllerRef.current?.abort();
        appendAbortControllerRef.current?.abort();
        replaceAbortControllerRef.current = abortController;
        appendAbortControllerRef.current = null;
      } else {
        appendAbortControllerRef.current?.abort();
        appendAbortControllerRef.current = abortController;
      }

      if (mode === "replace") {
        setLoading(true);
        setLoadingMore(false);
      } else {
        setLoadingMore(true);
      }

      try {
        const payload = await apiFetch<ListingsResponse>(buildPagedRequestPath(page), {
          signal: abortController.signal,
        });

        if (latestRequestIdRef.current !== requestId) {
          return;
        }

        setResponse((currentResponse) => {
          if (mode === "append" && currentResponse) {
            return {
              ...payload,
              listings: mergeUniqueListings(currentResponse.listings, payload.listings),
            };
          }

          return payload;
        });
      } catch (error) {
        if (isAbortError(error)) {
          return;
        }

        if (latestRequestIdRef.current === requestId) {
          enqueueSnackbar(error instanceof Error ? error.message : "Failed to load listings.", { variant: "error" });
        }
      } finally {
        if (mode === "replace" && replaceAbortControllerRef.current === abortController) {
          replaceAbortControllerRef.current = null;
        }

        if (mode === "append" && appendAbortControllerRef.current === abortController) {
          appendAbortControllerRef.current = null;
        }

        if (latestRequestIdRef.current === requestId) {
          setLoading(false);
          setLoadingMore(false);
        }
      }
    },
    [buildPagedRequestPath, enqueueSnackbar],
  );

  useEffect(() => {
    void loadListingsPage(1, "replace");
  }, [loadListingsPage, requestPath]);

  useEffect(
    () => () => {
      replaceAbortControllerRef.current?.abort();
      appendAbortControllerRef.current?.abort();
    },
    [],
  );

  const loadMoreListings = useCallback(async () => {
    if (!response || loading || loadingMore) {
      return;
    }

    if (
      response.listings.length >= response.summary.totalCount ||
      !response.pagination.hasNextPage
    ) {
      return;
    }

    await loadListingsPage(response.pagination.page + 1, "append");
  }, [loadListingsPage, loading, loadingMore, response]);

  const infiniteScrollRef = useInfiniteScroll({
    enabled: !loading,
    hasMore:
      (response?.pagination.hasNextPage ?? false) &&
      (response?.listings.length ?? 0) < (response?.summary.totalCount ?? 0),
    loading: loading || loadingMore,
    onLoadMore: loadMoreListings,
  });

  const resolvedResponse = response ?? fallbackResponse;
  const areas = resolvedResponse.areas;

  const syncQueryFilters = useCallback(
    (
      nextServerFilters: BrowseServerFilters,
      nextClientFilters: BrowseClientFilters,
    ) => {
      setQueryServerFilters((current) =>
        areServerFiltersEqual(current, nextServerFilters)
          ? current
          : nextServerFilters,
      );
      setQueryClientFilters((current) =>
        areClientFiltersEqual(current, nextClientFilters)
          ? current
          : nextClientFilters,
      );
    },
    [],
  );

  useEffect(() => {
    setQueryClientFilters((current) =>
      current.search === debouncedSearch
        ? current
        : { ...current, search: debouncedSearch },
    );
  }, [debouncedSearch]);

  useEffect(() => {
    setQueryServerFilters((current) =>
      current.minPrice === debouncedMinPrice &&
      current.maxPrice === debouncedMaxPrice
        ? current
        : {
            ...current,
            minPrice: debouncedMinPrice,
            maxPrice: debouncedMaxPrice,
          },
    );
  }, [debouncedMaxPrice, debouncedMinPrice]);

  useEffect(() => {
    const shouldResolveLocationParam =
      areas.length > 0 &&
      hasLocationOnlyParam(resolvedSearchParams) &&
      resolvedLocationQueryRef.current !== searchParamsKey;
    const isSelfSyncedRoute = pendingRouteQueryRef.current === searchParamsKey;

    if (isSelfSyncedRoute && !shouldResolveLocationParam) {
      pendingRouteQueryRef.current = null;
      lastAppliedUrlQueryRef.current = searchParamsKey;
      return;
    }

    if (lastAppliedUrlQueryRef.current === searchParamsKey && !shouldResolveLocationParam) {
      return;
    }

    const nextServerFilters = resolveServerFiltersFromParams(
      resolvedSearchParams,
      areas,
    );
    const nextClientFilters = resolveClientFiltersFromParams(
      resolvedSearchParams,
      areas,
    );
    const nextActiveTab = resolveActiveTabFromParams(resolvedSearchParams);

    setServerFilters((current) =>
      areServerFiltersEqual(current, nextServerFilters)
        ? current
        : nextServerFilters,
    );
    setClientFilters((current) =>
      areClientFiltersEqual(current, nextClientFilters)
        ? current
        : nextClientFilters,
    );
    setQueryServerFilters((current) =>
      areServerFiltersEqual(current, nextServerFilters)
        ? current
        : nextServerFilters,
    );
    setQueryClientFilters((current) =>
      areClientFiltersEqual(current, nextClientFilters)
        ? current
        : nextClientFilters,
    );
    setActiveTab((current) =>
      current === nextActiveTab ? current : nextActiveTab,
    );
    applyingUrlSyncRef.current = true;

    if (shouldResolveLocationParam) {
      resolvedLocationQueryRef.current = searchParamsKey;
    }

    if (isSelfSyncedRoute) {
      pendingRouteQueryRef.current = null;
    }

    lastAppliedUrlQueryRef.current = searchParamsKey;
  }, [areas, resolvedSearchParams, searchParamsKey]);

  const bedOptions = useMemo<SelectOption[]>(
    () => getListingBedroomFilterOptions(clientFilters.beds),
    [clientFilters.beds],
  );
  const visibleListings = useMemo<ListingIntel[]>(
    () => resolvedResponse.listings.map((listing) => buildListingIntelFromRecord(listing)),
    [resolvedResponse.listings],
  );
  const intelItems = useMemo<DealIntelItem[]>(
    () => [
      {
        id: "new-deals",
        label: "New Deals Today",
        value: resolvedResponse.summary.tabCounts["new-deals"] || 0,
        tone: "gold",
      },
      {
        id: "urgent-sellers",
        label: "Urgent Sellers",
        value: resolvedResponse.summary.tabCounts["urgent-sellers"] || 0,
        tone: "amber",
      },
      {
        id: "below-market",
        label: "Below Market",
        value: resolvedResponse.summary.tabCounts["below-market"] || 0,
        tone: "navy",
      },
      {
        id: "recent-price-drop",
        label: "Recent Price Drop",
        value: resolvedResponse.summary.tabCounts["recent-price-drop"] || 0,
        tone: "slate",
      },
    ],
    [resolvedResponse.summary.tabCounts],
  );
  const bestDealIds = useMemo(
    () =>
      new Set(
        resolvedResponse.listings
          .filter((listing) => listing.is_best_deal)
          .map((listing) => listing.id),
      ),
    [resolvedResponse.listings],
  );
  const topDeal = useMemo(
    () =>
      resolvedResponse.summary.topDeal
        ? buildListingIntelFromRecord(resolvedResponse.summary.topDeal)
        : visibleListings[0] || null,
    [resolvedResponse.summary.topDeal, visibleListings],
  );

  const priceRangeValue = getPriceRangeValue(
    serverFilters.minPrice,
    serverFilters.maxPrice,
  );
  const priceOptions = useMemo(
    () => getPriceRangeOptions(priceRangeValue),
    [priceRangeValue],
  );
  const activeFilterCount = [
    activeTab !== "all" ? "tab-filter" : "",
    clientFilters.search,
    serverFilters.areaId,
    serverFilters.propertyType,
    serverFilters.minPrice || serverFilters.maxPrice ? "price-range" : "",
    clientFilters.beds,
    clientFilters.developer,
    clientFilters.roi,
    clientFilters.dealType,
    clientFilters.addedTime,
  ].filter(Boolean).length;
  const showSkeletonState = loading && response === null;
  const showInlineRefreshState = loading && response !== null;
  const opportunitiesInViewCount = resolvedResponse.summary.totalCount;
  const currentListingsHref = useMemo(
    () => (searchParamsKey ? `${pathname}?${searchParamsKey}` : pathname),
    [pathname, searchParamsKey],
  );

  const syncBrowseRoute = useCallback(
    (
      nextServerFilters: BrowseServerFilters,
      nextClientFilters: BrowseClientFilters,
      nextActiveTab: BrowseTabId,
    ) => {
      const nextParams = buildBrowseQueryParams({
        serverFilters: nextServerFilters,
        clientFilters: nextClientFilters,
        activeTab: nextActiveTab,
        areas,
      });
      const nextQuery = nextParams.toString();
      const currentQuery = resolvedSearchParams.toString();

      if (nextQuery === currentQuery) {
        return;
      }

      pendingRouteQueryRef.current = nextQuery;
      startTransition(() => {
        router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname, {
          scroll: false,
        });
      });
    },
    [areas, pathname, resolvedSearchParams, router, startTransition],
  );

  useEffect(() => {
    if (applyingUrlSyncRef.current) {
      applyingUrlSyncRef.current = false;
      return;
    }

    syncBrowseRoute(debouncedQueryServerFilters, debouncedQueryClientFilters, debouncedActiveTab);
  }, [debouncedActiveTab, debouncedQueryClientFilters, debouncedQueryServerFilters, syncBrowseRoute]);

  const setClientFilter = useCallback(
    (
      partial: Partial<BrowseClientFilters>,
      options: {
        debounce?: boolean;
      } = {},
    ) => {
      const nextClientFilters = { ...clientFilters, ...partial };

      if (areClientFiltersEqual(clientFilters, nextClientFilters)) {
        return;
      }

      startTransition(() => {
        setClientFilters(nextClientFilters);

        if (!options.debounce) {
          syncQueryFilters(serverFilters, nextClientFilters);
        }
      });
    },
    [clientFilters, serverFilters, startTransition, syncQueryFilters],
  );

  const setServerFilter = useCallback(
    (
      partial: Partial<BrowseServerFilters>,
      options: {
        debounce?: boolean;
      } = {},
    ) => {
      const nextServerFilters = { ...serverFilters, ...partial };

      if (areServerFiltersEqual(serverFilters, nextServerFilters)) {
        return;
      }

      startTransition(() => {
        setServerFilters(nextServerFilters);

        if (!options.debounce) {
          syncQueryFilters(nextServerFilters, clientFilters);
        }
      });
    },
    [clientFilters, serverFilters, startTransition, syncQueryFilters],
  );

  const handleTabChange = useCallback(
    (tabId: BrowseTabId) => {
      if (activeTab === tabId) {
        return;
      }

      startTransition(() => {
        setActiveTab(tabId);
        syncQueryFilters(serverFilters, clientFilters);
      });
    },
    [activeTab, clientFilters, serverFilters, startTransition, syncQueryFilters],
  );

  const handlePriceRangeChange = (value: string) => {
    const selectedPreset = PRICE_RANGE_PRESETS.find(
      (preset) => preset.value === value,
    );
    if (!selectedPreset) {
      return;
    }

    setServerFilter({
      minPrice: selectedPreset.minPrice,
      maxPrice: selectedPreset.maxPrice,
    });
  };

  const handleClearAll = () => {
    startTransition(() => {
      setActiveTab("all");
      setServerFilters(DEFAULT_SERVER_FILTERS);
      setClientFilters(DEFAULT_CLIENT_FILTERS);
      syncQueryFilters(DEFAULT_SERVER_FILTERS, DEFAULT_CLIENT_FILTERS);
    });
  };

  const appliedFilters = useMemo<AppliedFilterChip[]>(() => {
    const chips: AppliedFilterChip[] = [];

    if (clientFilters.search.trim()) {
      chips.push({
        id: "search",
        label: `Search: ${clientFilters.search.trim()}`,
        onRemove: () => setClientFilter({ search: "" }),
      });
    }

    if (serverFilters.areaId) {
      const areaLabel =
        areas.find((area) => area.id === serverFilters.areaId)?.name ||
        serverFilters.areaId;

      chips.push({
        id: "location",
        label: `Location: ${areaLabel}`,
        onRemove: () => setServerFilter({ areaId: "" }),
      });
    }

    if (serverFilters.propertyType) {
      chips.push({
        id: "property-type",
        label: `Property Type: ${formatPropertyType(serverFilters.propertyType)}`,
        onRemove: () => setServerFilter({ propertyType: "" }),
      });
    }

    if (clientFilters.beds) {
      chips.push({
        id: "beds",
        label: `Beds: ${getSelectOptionLabel(bedOptions, clientFilters.beds)}`,
        onRemove: () => setClientFilter({ beds: "" }),
      });
    }

    if (serverFilters.minPrice || serverFilters.maxPrice) {
      chips.push({
        id: "price",
        label: formatPriceFilterLabel(
          serverFilters.minPrice,
          serverFilters.maxPrice,
          priceRangeValue,
          priceOptions,
        ),
        onRemove: () =>
          setServerFilter({
            minPrice: "",
            maxPrice: "",
          }),
      });
    }

    if (clientFilters.developer.trim()) {
      chips.push({
        id: "developer",
        label: `Developer: ${clientFilters.developer.trim()}`,
        onRemove: () => setClientFilter({ developer: "" }),
      });
    }

    if (clientFilters.roi) {
      chips.push({
        id: "roi",
        label: `ROI: ${getSelectOptionLabel(ROI_OPTIONS, clientFilters.roi)}`,
        onRemove: () => setClientFilter({ roi: "" }),
      });
    }

    if (clientFilters.dealType) {
      chips.push({
        id: "deal-type",
        label: `Deal Type: ${getSelectOptionLabel(DEAL_TYPE_OPTIONS, clientFilters.dealType)}`,
        onRemove: () => setClientFilter({ dealType: "" }),
      });
    }

    if (clientFilters.addedTime) {
      chips.push({
        id: "added-time",
        label: `Added: ${getSelectOptionLabel(ADDED_TIME_OPTIONS, clientFilters.addedTime)}`,
        onRemove: () => setClientFilter({ addedTime: "" }),
      });
    }

    return chips;
  }, [
    areas,
    bedOptions,
    clientFilters.addedTime,
    clientFilters.beds,
    clientFilters.dealType,
    clientFilters.developer,
    clientFilters.roi,
    clientFilters.search,
    priceOptions,
    priceRangeValue,
    serverFilters.areaId,
    serverFilters.maxPrice,
    serverFilters.minPrice,
    serverFilters.propertyType,
    setClientFilter,
    setServerFilter,
  ]);

  return (
    <section className="shell relative overflow-x-clip pb-6 pt-5 sm:pb-8 sm:pt-8 lg:pb-12 lg:pt-10">
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[420px] radial-gradient(circle_at_top_right,rgba(15,42,95,0.12),transparent_30%)]" />

      {showSkeletonState ? (
        <PageSkeleton />
      ) : (
        <div className="space-y-4 overflow-x-clip">
          <DealIntelStrip
            items={intelItems}
            activeTab={activeTab}
            onTabChange={handleTabChange}
          />

          {topDeal ? <TopDealCard item={topDeal} listingReturnHref={currentListingsHref} /> : null}

          <ListingsFilterBar
            areas={areas}
            propertyTypes={PROPERTY_TYPES}
            bedOptions={bedOptions}
            priceOptions={priceOptions}
            roiOptions={ROI_OPTIONS}
            dealTypeOptions={DEAL_TYPE_OPTIONS}
            addedTimeOptions={ADDED_TIME_OPTIONS}
            sortOptions={SORT_OPTIONS}
            activeFilterCount={activeFilterCount}
            appliedFilters={appliedFilters}
            filters={{
              search: clientFilters.search,
              areaId: serverFilters.areaId,
              propertyType: serverFilters.propertyType,
              beds: clientFilters.beds,
              priceRange: priceRangeValue,
              roi: clientFilters.roi,
              dealType: clientFilters.dealType,
              addedTime: clientFilters.addedTime,
              sort: clientFilters.sort,
              minPrice: serverFilters.minPrice,
              maxPrice: serverFilters.maxPrice,
            }}
            onSearchChange={(value) =>
              setClientFilter(
                { search: value },
                { debounce: value.trim().length > 0 },
              )
            }
            onAreaChange={(value) => setServerFilter({ areaId: value })}
            onPropertyTypeChange={(value) =>
              setServerFilter({ propertyType: value })
            }
            onBedsChange={(value) => setClientFilter({ beds: value })}
            onPriceRangeChange={handlePriceRangeChange}
            onRoiChange={(value) => setClientFilter({ roi: value })}
            onDealTypeChange={(value) => setClientFilter({ dealType: value })}
            onAddedTimeChange={(value) => setClientFilter({ addedTime: value })}
            onSortChange={(value) => setClientFilter({ sort: value })}
            onMinPriceChange={(value) =>
              setServerFilter(
                { minPrice: value },
                { debounce: value.trim().length > 0 },
              )
            }
            onMaxPriceChange={(value) =>
              setServerFilter(
                { maxPrice: value },
                { debounce: value.trim().length > 0 },
              )
            }
            onClearAll={handleClearAll}
          />

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <h2 className="mt-2 font-heading text-xl font-semibold tracking-[-0.04em] text-brand-ink sm:text-2xl md:text-[2rem]">
                {opportunitiesInViewCount.toLocaleString("en-US")}{" "}
                {opportunitiesInViewCount === 1 ? "opportunity" : "opportunities"} in view
              </h2>
            </div>

            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center sm:justify-end sm:gap-3">
              {showInlineRefreshState ? (
                <span
                  aria-live="polite"
                  className="inline-flex min-h-[38px] w-full items-center justify-center rounded-full border border-[#dbe4ef] bg-white/90 px-3 py-2 text-center text-sm font-medium text-brand-slate shadow-[0_12px_24px_rgba(15,42,95,0.05)] sm:w-auto sm:px-4"
                >
                  Updating listings...
                </span>
              ) : null}

              {topDeal ? (
                <div className="inline-flex min-h-[38px] w-full items-center justify-center rounded-full border border-[#d5deed] bg-[#eef3ff] px-3 py-2 text-center text-sm font-semibold text-brand-navy sm:w-auto sm:px-4">
                  Top deal price: {formatCurrency(topDeal.listing.price)}
                </div>
              ) : null}
            </div>
          </div>

          {visibleListings.length ? (
            <>
              <div className="grid gap-3 sm:gap-4 md:grid-cols-2 xl:grid-cols-3 xl:gap-6">
                {visibleListings.map((item) => (
                  <ListingCard
                    key={item.listing.id}
                    item={item}
                    isBestDeal={bestDealIds.has(item.listing.id)}
                    listingReturnHref={currentListingsHref}
                  />
                ))}
              </div>

              <div className="pt-1 sm:pt-2">
                <div ref={infiniteScrollRef} className="h-px w-full" aria-hidden="true" />

                {loadingMore ? (
                  <div className="mt-2 rounded-[18px] border border-brand-line/80 bg-white/88 px-3 py-3 text-center text-[13px] font-medium text-brand-slate shadow-[0_14px_30px_rgba(15,42,95,0.05)] sm:mt-4 sm:rounded-[24px] sm:px-5 sm:py-4 sm:text-sm">
                    Loading more opportunities...
                  </div>
                ) : resolvedResponse.listings.length >= opportunitiesInViewCount ||
                  !resolvedResponse.pagination.hasNextPage ? (
                  <div className="mt-2 rounded-[18px] border border-brand-line/80 bg-white/80 px-3 py-3 text-center text-[13px] font-medium text-brand-slate shadow-[0_14px_30px_rgba(15,42,95,0.04)] sm:mt-4 sm:rounded-[24px] sm:px-5 sm:py-4 sm:text-sm">
                    You&apos;ve reached the end of the marketplace feed.
                  </div>
                ) : null}
              </div>
            </>
          ) : loadingMore && resolvedResponse.listings.length ? (
            <div className="rounded-[24px] border border-brand-line/80 bg-white/88 px-4 py-8 text-center shadow-[0_18px_42px_rgba(15,42,95,0.07)] sm:rounded-[32px] sm:px-6 sm:py-10">
              <p className="text-sm font-medium text-brand-slate">Loading more opportunities...</p>
            </div>
          ) : (
            <div className="rounded-[24px] border border-brand-line/80 bg-white/88 px-4 py-10 text-center shadow-[0_18px_42px_rgba(15,42,95,0.07)] sm:rounded-[32px] sm:px-6 sm:py-14">
              <p className="text-xs font-semibold uppercase tracking-[0.26em] text-brand-slate">
                No Matches
              </p>
              <h3 className="mt-3 font-heading text-lg font-semibold tracking-[-0.04em] text-brand-ink sm:text-xl md:text-2xl">
                No listings match the current deal screen.
              </h3>
              <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-brand-slate">
                Broaden the price band, switch the active deal tab, or clear the
                opportunity filters to reopen the marketplace feed.
              </p>
              <div className="mt-7 flex justify-center">
                <button
                  type="button"
                  onClick={handleClearAll}
                  className="btn-secondary rounded-full px-6"
                >
                  Reset Filters
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
