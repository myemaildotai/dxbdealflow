import { NextRequest } from "next/server";

const DEFAULT_ADMIN_PAGE_SIZE = 10;
const MAX_ADMIN_PAGE_SIZE = 100;

export type AdminPaginationParams = {
  page: number;
  pageSize: number;
  rangeFrom: number;
  rangeTo: number;
};

export function getAdminPaginationParams(request: NextRequest): AdminPaginationParams {
  const pageParam = Number(request.nextUrl.searchParams.get("page") || "1");
  const pageSizeParam = Number(request.nextUrl.searchParams.get("pageSize") || String(DEFAULT_ADMIN_PAGE_SIZE));
  const page = Number.isFinite(pageParam) && pageParam > 0 ? Math.floor(pageParam) : 1;
  const pageSize =
    Number.isFinite(pageSizeParam) && pageSizeParam > 0
      ? Math.min(Math.floor(pageSizeParam), MAX_ADMIN_PAGE_SIZE)
      : DEFAULT_ADMIN_PAGE_SIZE;
  const rangeFrom = (page - 1) * pageSize;
  const rangeTo = rangeFrom + pageSize - 1;

  return {
    page,
    pageSize,
    rangeFrom,
    rangeTo,
  };
}

export function getSearchParam(request: NextRequest, key: string) {
  return String(request.nextUrl.searchParams.get(key) || "").trim();
}

export function getOptionalDateParam(request: NextRequest, key: string) {
  const value = request.nextUrl.searchParams.get(key);
  if (!value) {
    return null;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export function getSafeIlikePattern(value: string) {
  const normalized = value.replace(/[,%()]/g, " ").replace(/\s+/g, " ").trim();
  return normalized ? `%${normalized.replace(/[%_]/g, "\\$&")}%` : null;
}

export function getTotalPages(total: number, pageSize: number) {
  return Math.max(1, Math.ceil(Math.max(0, total) / Math.max(1, pageSize)));
}

export function getPaginationResponseMeta(total: number, page: number, pageSize: number) {
  return {
    total,
    page,
    pageSize,
    totalPages: getTotalPages(total, pageSize),
  };
}

export function uniqueDefinedIds(ids: Array<string | null | undefined>) {
  return Array.from(new Set(ids.filter(Boolean))) as string[];
}

export function toInFilterValue(ids: string[]) {
  return ids.join(",");
}
