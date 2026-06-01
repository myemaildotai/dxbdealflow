"use client";

import { useEffect, useMemo, useState } from "react";
import { buildPaginationMeta, DEFAULT_PAGE_SIZE, PAGE_SIZE_OPTIONS, type PaginationMeta } from "@/lib/pagination";

export function useClientPagination<TItem>(
  items: TItem[],
  options: {
    initialPageSize?: number;
    resetKey?: string | number | null;
    pageSizeOptions?: readonly number[];
  } = {}
) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(options.initialPageSize ?? DEFAULT_PAGE_SIZE);
  const resolvedPageSizeOptions = options.pageSizeOptions ?? PAGE_SIZE_OPTIONS;
  const pagination = useMemo<PaginationMeta>(
    () =>
      buildPaginationMeta({
        page,
        pageSize,
        totalCount: items.length,
      }),
    [items.length, page, pageSize]
  );

  useEffect(() => {
    setPage((currentPage) => Math.min(currentPage, pagination.totalPages));
  }, [pagination.totalPages]);

  useEffect(() => {
    setPage(1);
  }, [options.resetKey]);

  const paginatedItems = useMemo(
    () => items.slice(pagination.offset, pagination.offset + pagination.pageSize),
    [items, pagination.offset, pagination.pageSize]
  );

  return {
    page: pagination.page,
    pageSize: pagination.pageSize,
    pageSizeOptions: resolvedPageSizeOptions,
    paginatedItems,
    pagination,
    setPage,
    setPageSize: (nextPageSize: number) => {
      setPageSize(nextPageSize);
      setPage(1);
    },
  };
}
