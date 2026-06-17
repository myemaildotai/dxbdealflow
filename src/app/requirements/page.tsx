"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useSnackbar } from "notistack";
import { AppShell } from "@/components/AppShell";
import { LoadingScreen } from "@/components/LoadingScreen";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { useAuth } from "@/auth/useAuth";
import { useInfiniteScroll } from "@/hooks/useInfiniteScroll";
import { apiFetch } from "@/lib/deal-api";
import { invalidateRequirementCaches } from "@/lib/client-cache";
import { buildPaginationMeta, type PaginationMeta } from "@/lib/pagination";
import { getRequirementMatchSummary, type RequirementListingMatchSummary } from "@/lib/requirement-matching";
import { canAccessBrokerWorkspace, getDefaultRouteForUser, isAdmin } from "@/lib/route-access";
import type { Requirement } from "@/lib/deal-types";
import { BuyerBoardFilters } from "./_components/BuyerBoardFilters";
import { FilterIcon } from "./_components/BuyerBoardIcons";
import { BuyerRequirementBoardCard } from "./_components/BuyerRequirementBoardCard";
import { BuyerRequirementMatchModal } from "./_components/BuyerRequirementMatchModal";
import { BuyerRequirementViewModal } from "./_components/BuyerRequirementViewModal";
import {
  BUYER_BOARD_INITIAL_FILTERS,
  isRequirementLiveForBoard,
  type BuyerBoardFilterState,
  type MatchListingOption,
} from "./_components/buyer-board-utils";

type RequirementsResponse = {
  viewerRole: "broker" | "admin";
  brokerProfileId: string | null;
  areas: string[];
  requirements: Requirement[];
  myListings: MatchListingOption[];
  pagination: PaginationMeta;
};
const REQUIREMENTS_PAGE_SIZE = 10;

const fallbackResponse: RequirementsResponse = {
  viewerRole: "broker",
  brokerProfileId: null,
  areas: [],
  requirements: [],
  myListings: [],
  pagination: buildPaginationMeta({ page: 1, pageSize: REQUIREMENTS_PAGE_SIZE, totalCount: 0 }),
};

const EMPTY_REQUIREMENT_MATCH_SUMMARY: RequirementListingMatchSummary = {
  bestMatchPercentage: 0,
  matchedListingsCount: 0,
  totalListingsConsidered: 0,
};

function mergeUniqueRequirements(currentRequirements: Requirement[], nextRequirements: Requirement[]) {
  const requirementMap = new Map(currentRequirements.map((requirement) => [requirement.id, requirement]));

  nextRequirements.forEach((requirement) => {
    requirementMap.set(requirement.id, requirement);
  });

  return Array.from(requirementMap.values());
}

function isAbortError(error: unknown) {
  return error instanceof Error && error.name === "AbortError";
}

function RequirementsSkeleton() {
  return (
    <AppShell
      title="Buyer Requirements Board"
      subtitle=""
    >
      <div className="grid gap-6 lg:grid-cols-[320px,minmax(0,1fr)] xl:gap-8">
        <div className="hidden lg:block">
          <div className="overflow-hidden rounded-[30px] border border-[#dbe4ef] bg-white shadow-[0_24px_54px_rgba(15,42,95,0.08)]">
            <div className="space-y-4 px-6 py-6">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="animate-pulse rounded-[22px] border border-[#dee6ef] bg-[#f5f7fa] p-4">
                  <div className="h-3 w-24 rounded-full bg-[#dde6ef]" />
                  <div className="mt-4 h-12 rounded-[16px] bg-[#dde6ef]" />
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="animate-pulse overflow-hidden rounded-[30px] border border-[#dbe4ef] bg-white p-4 shadow-[0_24px_54px_rgba(15,42,95,0.08)] sm:p-6">
            <div className="h-4 w-40 rounded-full bg-[#dde6ef]" />
            <div className="mt-4 h-10 w-full max-w-[16rem] rounded-full bg-[#dde6ef]" />
            <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="h-24 rounded-[22px] bg-[#dde6ef]" />
              ))}
            </div>
          </div>

          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="animate-pulse overflow-hidden rounded-[30px] border border-[#dbe4ef] bg-white p-4 shadow-[0_24px_54px_rgba(15,42,95,0.08)] sm:p-6">
              <div className="h-4 w-32 rounded-full bg-[#dde6ef]" />
              <div className="mt-4 h-10 w-3/4 rounded-full bg-[#dde6ef]" />
              <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                {Array.from({ length: 5 }).map((_, tileIndex) => (
                  <div key={tileIndex} className="h-24 rounded-[22px] bg-[#dde6ef]" />
                ))}
              </div>
              <div className="mt-6 flex flex-wrap gap-3">
                <div className="h-12 w-28 rounded-full bg-[#dde6ef]" />
                <div className="h-12 w-36 rounded-full bg-[#dde6ef]" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </AppShell>
  );
}

export default function RequirementsPage() {
  const router = useRouter();
  const { enqueueSnackbar } = useSnackbar();
  const { user, loading } = useAuth();
  const [viewRequirement, setViewRequirement] = useState<Requirement | null>(null);
  const [matchRequirement, setMatchRequirement] = useState<Requirement | null>(null);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [filters, setFilters] = useState<BuyerBoardFilterState>(BUYER_BOARD_INITIAL_FILTERS);
  const [queryFilters, setQueryFilters] = useState<BuyerBoardFilterState>(BUYER_BOARD_INITIAL_FILTERS);
  const [response, setResponse] = useState<RequirementsResponse | null>(null);
  const [pageLoading, setPageLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const latestRequestIdRef = useRef(0);
  const replaceAbortControllerRef = useRef<AbortController | null>(null);
  const appendAbortControllerRef = useRef<AbortController | null>(null);
  const debouncedSearch = useDebouncedValue(filters.search, 300);
  const debouncedMinBudget = useDebouncedValue(filters.minBudget, 300);
  const debouncedMaxBudget = useDebouncedValue(filters.maxBudget, 300);

  const canViewRequirements = !!user && (canAccessBrokerWorkspace(user) || isAdmin(user));
  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    const searchTerm = queryFilters.search.trim();
    if (searchTerm) params.set("search", searchTerm);
    if (queryFilters.area) params.set("area", queryFilters.area);
    if (queryFilters.minBudget) params.set("minBudget", queryFilters.minBudget);
    if (queryFilters.maxBudget) params.set("maxBudget", queryFilters.maxBudget);
    if (queryFilters.urgency) params.set("urgency", queryFilters.urgency);
    if (queryFilters.propertyType) params.set("propertyType", queryFilters.propertyType);
    if (queryFilters.bedrooms) params.set("bedrooms", queryFilters.bedrooms);
    if (queryFilters.sortBy !== BUYER_BOARD_INITIAL_FILTERS.sortBy) params.set("sort", queryFilters.sortBy);
    return params.toString();
  }, [queryFilters]);
  const requestPath = queryString ? `/api/requirements?${queryString}` : "/api/requirements";
  const buildPagedRequestPath = useCallback(
    (page: number, pageSize = REQUIREMENTS_PAGE_SIZE) => {
      const params = new URLSearchParams(queryString);
      params.set("page", String(page));
      params.set("pageSize", String(pageSize));
      if (page > 1) params.set("includeStatic", "0");
      return `/api/requirements?${params.toString()}`;
    },
    [queryString]
  );

  const loadRequirementsPage = useCallback(
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
        setPageLoading(true);
        setLoadingMore(false);
      } else {
        setLoadingMore(true);
      }

      try {
        const payload = await apiFetch<RequirementsResponse>(buildPagedRequestPath(page), {
          signal: abortController.signal,
        });

        if (latestRequestIdRef.current !== requestId) {
          return;
        }

        setResponse((currentResponse) => {
          if (mode === "append" && currentResponse) {
            return {
              ...payload,
              areas: payload.areas.length ? payload.areas : currentResponse.areas,
              myListings: payload.myListings.length ? payload.myListings : currentResponse.myListings,
              requirements: mergeUniqueRequirements(currentResponse.requirements, payload.requirements),
            };
          }

          return payload;
        });
      } catch (error) {
        if (isAbortError(error)) {
          return;
        }

        if (latestRequestIdRef.current === requestId) {
          enqueueSnackbar(error instanceof Error ? error.message : "Failed to load requirements.", { variant: "error" });
        }
      } finally {
        if (mode === "replace" && replaceAbortControllerRef.current === abortController) {
          replaceAbortControllerRef.current = null;
        }

        if (mode === "append" && appendAbortControllerRef.current === abortController) {
          appendAbortControllerRef.current = null;
        }

        if (latestRequestIdRef.current === requestId) {
          setPageLoading(false);
          setLoadingMore(false);
        }
      }
    },
    [buildPagedRequestPath, enqueueSnackbar]
  );

  useEffect(() => {
    setQueryFilters((current) =>
      current.search === debouncedSearch
        ? current
        : { ...current, search: debouncedSearch }
    );
  }, [debouncedSearch]);

  useEffect(() => {
    setQueryFilters((current) =>
      current.minBudget === debouncedMinBudget && current.maxBudget === debouncedMaxBudget
        ? current
        : {
            ...current,
            minBudget: debouncedMinBudget,
            maxBudget: debouncedMaxBudget,
          }
    );
  }, [debouncedMaxBudget, debouncedMinBudget]);

  useEffect(() => {
    if (loading || !canViewRequirements) {
      return;
    }

    void loadRequirementsPage(1, "replace");
  }, [canViewRequirements, loadRequirementsPage, loading, requestPath]);

  useEffect(
    () => () => {
      replaceAbortControllerRef.current?.abort();
      appendAbortControllerRef.current?.abort();
    },
    []
  );

  useEffect(() => {
    document.body.classList.add("post-listing-page");
    return () => document.body.classList.remove("post-listing-page");
  }, []);

  useEffect(() => {
    if (!loading && !canViewRequirements) {
      router.replace(getDefaultRouteForUser(user));
    }
  }, [canViewRequirements, loading, router, user]);

  const resolvedResponse = response ?? fallbackResponse;
  const loadMoreRequirements = useCallback(async () => {
    if (!resolvedResponse.pagination.hasNextPage || pageLoading || loadingMore) {
      return;
    }

    await loadRequirementsPage(resolvedResponse.pagination.page + 1, "append");
  }, [loadRequirementsPage, loadingMore, pageLoading, resolvedResponse.pagination.hasNextPage, resolvedResponse.pagination.page]);
  const infiniteScrollRef = useInfiniteScroll({
    enabled: !pageLoading,
    hasMore: resolvedResponse.pagination.hasNextPage,
    loading: pageLoading || loadingMore,
    onLoadMore: loadMoreRequirements,
  });
  const brokerListingPool = useMemo(() => resolvedResponse.myListings ?? [], [resolvedResponse.myListings]);
  const liveRequirements = useMemo(
    () => resolvedResponse.requirements.filter(isRequirementLiveForBoard),
    [resolvedResponse.requirements]
  );
  const displayedRequirements = liveRequirements;

  const requirementMatchSummaries = useMemo(() => {
    const summaries = new Map<string, RequirementListingMatchSummary>();

    displayedRequirements.forEach((requirement) => {
      summaries.set(requirement.id, getRequirementMatchSummary(requirement, brokerListingPool));
    });

    return summaries;
  }, [brokerListingPool, displayedRequirements]);

  const activeFilterCount = useMemo(
    () =>
      [filters.search, filters.area, filters.minBudget, filters.maxBudget, filters.urgency, filters.propertyType, filters.bedrooms].filter(Boolean).length,
    [filters.area, filters.bedrooms, filters.maxBudget, filters.minBudget, filters.propertyType, filters.search, filters.urgency]
  );

  const resolvedViewRequirement = viewRequirement
    ? liveRequirements.find((requirement) => requirement.id === viewRequirement.id) || viewRequirement
    : null;
  const resolvedMatchRequirement = matchRequirement
    ? liveRequirements.find((requirement) => requirement.id === matchRequirement.id) || matchRequirement
    : null;
  const handleFiltersChange = useCallback(
    (patch: Partial<BuyerBoardFilterState>) => {
      const nextFilters = { ...filters, ...patch };
      const patchKeys = Object.keys(patch) as Array<keyof BuyerBoardFilterState>;
      const typedOnlyPatch =
        patchKeys.length > 0 &&
        patchKeys.every((key) => key === "search" || key === "minBudget" || key === "maxBudget");

      setFilters(nextFilters);

      if (!typedOnlyPatch) {
        setQueryFilters(nextFilters);
      }
    },
    [filters]
  );
  const resetFilters = useCallback(() => {
    setFilters(BUYER_BOARD_INITIAL_FILTERS);
    setQueryFilters(BUYER_BOARD_INITIAL_FILTERS);
  }, []);
  const filteredRequirementsCount = resolvedResponse.pagination.totalCount;
  const showInlineRefreshState = pageLoading && response !== null;

  if (loading) {
    return <LoadingScreen label="Loading buyer requirements..." />;
  }

  if (!user) {
    return <LoadingScreen label="Loading buyer requirements..." />;
  }

  if (pageLoading && !response) {
    return <RequirementsSkeleton />;
  }

  return (
    <AppShell
      title="Buyer Requirements Board"
      subtitle=""
      mainClassName="!max-w-[1540px] !overflow-x-clip md:!px-8 xl:!px-10"
      pageHeaderActions={
        <button
          type="button"
          onClick={() => setMobileFiltersOpen(true)}
          className="inline-flex min-h-[44px] items-center gap-2 rounded-full border border-brand-line bg-white px-4 text-sm font-semibold text-brand-navy shadow-[0_10px_24px_rgba(15,42,95,0.06)] transition hover:-translate-y-0.5 hover:border-brand-blue/30 hover:bg-brand-panel-soft lg:hidden"
        >
          <FilterIcon className="h-4 w-4" />
          Filters {activeFilterCount ? `(${activeFilterCount})` : ""}
        </button>
      }
    >
      <div className="grid gap-4 sm:gap-6 lg:grid-cols-[320px,minmax(0,1fr)] xl:gap-8">
        <aside className="hidden lg:block">
          <div className="lg:sticky lg:top-28">
            <BuyerBoardFilters
              filters={filters}
              areaOptions={resolvedResponse.areas}
              activeFilterCount={activeFilterCount}
              resultsCount={displayedRequirements.length}
              totalCount={resolvedResponse.pagination.totalCount}
              onReset={resetFilters}
              onChange={handleFiltersChange}
            />
          </div>
        </aside>

        <section className="min-w-0 space-y-4 sm:space-y-6">
          <div className="panel overflow-hidden rounded-[12px] border border-[#dbe4ef] shadow-[0_24px_54px_rgba(15,42,95,0.08)]">
            <div className="border-b border-[#e8edf4] bg-[#f5f7fa] px-4 py-4 sm:px-6 sm:py-6">
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-brand-slate">Board Overview</p>
              <div className="mt-2 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
                <div>
                  <h2 className="text-xl font-semibold tracking-[-0.05em] text-brand-ink sm:text-2xl md:text-3xl lg:text-[36px]">
                    {filteredRequirementsCount} live requirement{filteredRequirementsCount === 1 ? "" : "s"}
                  </h2>
                  <p className="max-w-2xl text-sm leading-6 text-brand-slate sm:text-[15px] sm:leading-7">
                    Review live buyer briefs from other brokers and submit a qualified match.
                  </p>
                </div>

                {showInlineRefreshState ? (
                  <span
                    aria-live="polite"
                    className="inline-flex w-full items-center justify-center rounded-full border border-[#dbe4ef] bg-white/90 px-3 py-2 text-center text-sm font-medium text-brand-slate shadow-[0_12px_24px_rgba(15,42,95,0.05)] sm:w-auto sm:px-4"
                  >
                    Updating buyer board...
                  </span>
                ) : null}
              </div>
            </div>
          </div>

          {displayedRequirements.length ? (
            <div className="mt-4 space-y-3 sm:mt-6 sm:space-y-4">
              {displayedRequirements.map((requirement) => {
                const canMatch =
                  resolvedResponse.viewerRole === "broker" &&
                  resolvedResponse.brokerProfileId &&
                  resolvedResponse.brokerProfileId !== requirement.broker_id &&
                  requirement.is_active;

                return (
                  <BuyerRequirementBoardCard
                    key={requirement.id}
                    requirement={requirement}
                    matchSummary={requirementMatchSummaries.get(requirement.id) ?? EMPTY_REQUIREMENT_MATCH_SUMMARY}
                    canMatch={!!canMatch}
                    showMatchSummary={resolvedResponse.viewerRole !== "admin"}
                    onView={() => setViewRequirement(requirement)}
                    onMatch={() => setMatchRequirement(requirement)}
                  />
                );
              })}

              <div className="pt-1 sm:pt-2">
                <div ref={infiniteScrollRef} className="h-px w-full" aria-hidden="true" />

                {loadingMore ? (
                  <div className="rounded-[18px] border border-[#dbe4ef] bg-white px-3 py-3 text-center text-[13px] font-medium text-brand-slate shadow-[0_16px_30px_rgba(15,42,95,0.05)] sm:rounded-[24px] sm:px-5 sm:py-4 sm:text-sm">
                    Loading more buyer briefs...
                  </div>
                ) : !resolvedResponse.pagination.hasNextPage ? (
                  <div className="rounded-[18px] border border-[#dbe4ef] bg-white px-3 py-3 text-center text-[13px] font-medium text-brand-slate shadow-[0_16px_30px_rgba(15,42,95,0.04)] sm:rounded-[24px] sm:px-5 sm:py-4 sm:text-sm">
                    You&apos;ve reached the end of the buyer board.
                  </div>
                ) : null}
              </div>
            </div>
          ) : loadingMore && resolvedResponse.requirements.length ? (
            <div className="overflow-hidden rounded-[30px] border border-[#dbe4ef] bg-white p-8 text-center shadow-[0_24px_54px_rgba(15,42,95,0.08)]">
              <p className="text-sm font-medium text-brand-slate">Loading more buyer briefs...</p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-[30px] border border-[#dbe4ef] bg-white p-8 text-center shadow-[0_24px_54px_rgba(15,42,95,0.08)]">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-[#d7e0eb] bg-[#f5f7fa] text-brand-navy">
                <FilterIcon className="h-7 w-7" />
              </div>
              <h3 className="mt-5 text-[28px] font-semibold tracking-[-0.04em] text-brand-ink">No requirements found</h3>
              <p className="mx-auto mt-3 max-w-xl text-[15px] leading-7 text-brand-slate">
                Try widening the current filters or search terms. The board is already limited to active requirements from other brokers.
              </p>
            </div>
          )}
        </section>
      </div>

      {mobileFiltersOpen ? (
        <div className="fixed inset-0 z-[100] overflow-x-hidden bg-[rgba(15,18,26,0.58)] p-2 backdrop-blur-[6px] lg:hidden" onClick={() => setMobileFiltersOpen(false)}>
          <div
            className="absolute inset-x-2 bottom-2 max-h-[calc(100dvh-1rem)] overflow-x-hidden overflow-y-auto rounded-t-[22px] px-2 pb-2 pt-2 sm:inset-x-4 sm:bottom-4 sm:rounded-t-[32px] sm:px-4 sm:pb-4 sm:pt-4"
            onClick={(event) => event.stopPropagation()}
          >
            <BuyerBoardFilters
              filters={filters}
              areaOptions={resolvedResponse.areas}
              activeFilterCount={activeFilterCount}
              resultsCount={displayedRequirements.length}
              totalCount={resolvedResponse.pagination.totalCount}
              mode="drawer"
              onReset={resetFilters}
              onClose={() => setMobileFiltersOpen(false)}
              onChange={handleFiltersChange}
            />
          </div>
        </div>
      ) : null}

      {resolvedViewRequirement ? (
        <BuyerRequirementViewModal
          requirement={resolvedViewRequirement}
          showOwnerMeta={resolvedResponse.viewerRole === "admin"}
          onClose={() => setViewRequirement(null)}
        />
      ) : null}

      {resolvedMatchRequirement ? (
        <BuyerRequirementMatchModal
          requirement={resolvedMatchRequirement}
          listings={resolvedResponse.myListings}
          onClose={() => setMatchRequirement(null)}
          onSubmitted={() => {
            invalidateRequirementCaches(resolvedMatchRequirement.id);
            void loadRequirementsPage(1, "replace");
          }}
        />
      ) : null}
    </AppShell>
  );
}
