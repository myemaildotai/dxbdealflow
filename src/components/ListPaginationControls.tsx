"use client";

import { buildPaginationWindow, PAGE_SIZE_OPTIONS, type PaginationMeta } from "@/lib/pagination";
import { cn } from "@/lib/deal-utils";

type ListPaginationControlsProps = {
  pagination: PaginationMeta;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  pageSizeOptions?: readonly number[];
  itemLabel?: string;
  className?: string;
};

export function ListPaginationControls({
  pagination,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = PAGE_SIZE_OPTIONS,
  itemLabel = "items",
  className,
}: ListPaginationControlsProps) {
  const pages = buildPaginationWindow(pagination.page, pagination.totalPages);

  const shouldShowPagination = pagination.totalCount > 10;

  if (!shouldShowPagination) {
    return null;
  }

  return (
    <div
      className={cn(
        "mt-4 flex w-full max-w-full flex-col items-center justify-between gap-3 overflow-x-clip rounded-[16px] border border-[#e5e9f2] bg-[linear-gradient(180deg,#ffffff_0%,#f8faff_100%)] px-3 py-3 text-center shadow-[0_10px_22px_rgba(34,40,66,0.05)] sm:rounded-[18px] sm:px-4 lg:mt-6 lg:flex-row lg:flex-wrap lg:items-center lg:gap-4 lg:rounded-[22px] lg:px-5 lg:py-4 lg:text-left",
        className
      )}
    >
      <div className="flex flex-wrap items-center justify-center gap-2 lg:justify-start lg:gap-3">
        <p className="text-[13px] text-[#657186] sm:text-[14px]">
          Showing {pagination.from}-{pagination.to} of {pagination.totalCount} {itemLabel}
        </p>

        <label className="flex items-center gap-2 text-[13px] font-medium text-[#5f6d86]">
          <span>Per page</span>
          <select
            value={pagination.pageSize}
            onChange={(event) => onPageSizeChange(Number(event.target.value))}
            className="min-h-[34px] rounded-full border border-[#d9dfeb] bg-white px-3 pr-8 text-[13px] font-semibold text-[#24314c] shadow-[0_10px_20px_rgba(35,41,70,0.08)] outline-none transition hover:border-[#cad3e4] focus:border-[#cad3e4] sm:min-h-[38px] sm:text-[14px] lg:min-h-[42px] lg:px-4 lg:pr-9"
            style={{ color: "#24314c", backgroundColor: "#ffffff" }}
            aria-label="Items per page"
          >
            {pageSizeOptions.map((option) => (
              <option key={option} value={option} style={{ color: "#24314c", backgroundColor: "#ffffff" }}>
                {option}
              </option>
            ))}
          </select>
        </label>
      </div>

      {pagination.totalPages > 1 ? (
        <div className="flex max-w-full flex-wrap justify-center gap-1 lg:justify-end lg:gap-2">
          <button
            type="button"
            className="inline-flex min-h-[32px] items-center justify-center rounded-full border border-[#d9dfeb] bg-white px-2.5 text-[12px] font-semibold text-[#33415f] shadow-[0_10px_20px_rgba(35,41,70,0.08)] transition hover:border-[#cad3e4] hover:bg-[#f8faff] disabled:cursor-not-allowed disabled:opacity-55 sm:min-h-[38px] sm:px-3.5 sm:text-[14px] lg:min-h-[42px] lg:px-4"
            onClick={() => onPageChange(Math.max(1, pagination.page - 1))}
            disabled={!pagination.hasPreviousPage}
          >
            <span className="sm:hidden">Prev</span>
            <span className="hidden sm:inline">Previous</span>
          </button>

          {pages.map((page) => (
            <button
              key={page}
              type="button"
              onClick={() => onPageChange(page)}
              className={cn(
                "inline-flex min-h-[32px] min-w-[32px] items-center justify-center rounded-full border px-2 text-[12px] font-semibold transition sm:min-h-[38px] sm:min-w-[38px] sm:px-3 sm:text-[14px] lg:min-h-[42px] lg:min-w-[42px] lg:px-4",
                page === pagination.page
                  ? "border-[#22314d] bg-[linear-gradient(180deg,#30405f_0%,#22314d_100%)] text-white shadow-[0_10px_22px_rgba(34,49,77,0.2)]"
                  : "border-[#d9dfeb] bg-white text-[#33415f] shadow-[0_10px_20px_rgba(35,41,70,0.08)] hover:border-[#cad3e4] hover:bg-[#f8faff]"
              )}
            >
              {page}
            </button>
          ))}

          <button
            type="button"
            className="inline-flex min-h-[32px] items-center justify-center rounded-full border border-[#d9dfeb] bg-white px-2.5 text-[12px] font-semibold text-[#33415f] shadow-[0_10px_20px_rgba(35,41,70,0.08)] transition hover:border-[#cad3e4] hover:bg-[#f8faff] disabled:cursor-not-allowed disabled:opacity-55 sm:min-h-[38px] sm:px-3.5 sm:text-[14px] lg:min-h-[42px] lg:px-4"
            onClick={() => onPageChange(Math.min(pagination.totalPages, pagination.page + 1))}
            disabled={!pagination.hasNextPage}
          >
            Next
          </button>
        </div>
      ) : null}
    </div>
  );
}
