export const PAGE_SIZE_OPTIONS = [10, 25, 50, 100] as const;
export const DEFAULT_PAGE_SIZE = PAGE_SIZE_OPTIONS[0];
export const MAX_PAGE_SIZE = 1000;
const DEFAULT_PAGE_WINDOW_SIZE = 5;

export type PaginationMeta = {
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  offset: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  from: number;
  to: number;
};

export function normalizePageSize(value: number | string | null | undefined) {
  const numericValue = Number(value);

  if (!Number.isFinite(numericValue)) {
    return DEFAULT_PAGE_SIZE;
  }

  return Math.max(1, Math.min(MAX_PAGE_SIZE, Math.trunc(numericValue)));
}

export function normalizePageNumber(value: number | string | null | undefined) {
  const numericValue = Number(value);

  if (!Number.isFinite(numericValue)) {
    return 1;
  }

  return Math.max(1, Math.trunc(numericValue));
}

export function buildPaginationMeta({
  page,
  pageSize,
  totalCount,
}: {
  page: number | string | null | undefined;
  pageSize: number | string | null | undefined;
  totalCount: number;
}): PaginationMeta {
  const resolvedPageSize = normalizePageSize(pageSize);
  const resolvedTotalCount = Math.max(0, Number.isFinite(totalCount) ? totalCount : 0);
  const totalPages = Math.max(1, Math.ceil(resolvedTotalCount / resolvedPageSize));
  const resolvedPage = Math.min(normalizePageNumber(page), totalPages);
  const offset = (resolvedPage - 1) * resolvedPageSize;
  const from = resolvedTotalCount ? offset + 1 : 0;
  const to = resolvedTotalCount ? Math.min(resolvedTotalCount, offset + resolvedPageSize) : 0;

  return {
    page: resolvedPage,
    pageSize: resolvedPageSize,
    totalCount: resolvedTotalCount,
    totalPages,
    offset,
    hasNextPage: resolvedPage < totalPages,
    hasPreviousPage: resolvedPage > 1,
    from,
    to,
  };
}

export function buildPaginationWindow(currentPage: number, totalPages: number, windowSize = DEFAULT_PAGE_WINDOW_SIZE) {
  const safeWindowSize = Math.max(1, Math.trunc(windowSize));
  const safeTotalPages = Math.max(1, Math.trunc(totalPages));
  const safeCurrentPage = Math.max(1, Math.min(Math.trunc(currentPage), safeTotalPages));
  const halfWindow = Math.floor(safeWindowSize / 2);
  const startPage = Math.max(1, safeCurrentPage - halfWindow);
  const endPage = Math.min(safeTotalPages, startPage + safeWindowSize - 1);
  const adjustedStartPage = Math.max(1, endPage - safeWindowSize + 1);
  const pages: number[] = [];

  for (let page = adjustedStartPage; page <= endPage; page += 1) {
    pages.push(page);
  }

  return pages;
}
