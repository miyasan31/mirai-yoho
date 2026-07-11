export type SortBy = "createdAt" | "updatedAt";

export interface PaginationParams {
  page: number;
  pageSize: 20 | 50 | 100;
}

export interface PaginationMeta extends PaginationParams {
  total: number;
  totalPages: number;
}

export interface ListQueryParams extends PaginationParams {
  sortBy: SortBy;
  sortOrder: "desc";
}

export const INVALID_LIST_QUERY_MESSAGE =
  "page must be >= 1, pageSize must be one of 20/50/100, and sortBy must be createdAt or updatedAt";

function parsePaginationParams(
  searchParams: URLSearchParams,
): PaginationParams | null {
  const pageRaw = searchParams.get("page");
  const page = pageRaw ? Number(pageRaw) : 1;
  if (!Number.isInteger(page) || page < 1) {
    return null;
  }

  const pageSizeRaw = searchParams.get("pageSize");
  const pageSize = pageSizeRaw ? Number(pageSizeRaw) : 20;
  if (pageSize !== 20 && pageSize !== 50 && pageSize !== 100) {
    return null;
  }

  return {
    page,
    pageSize,
  };
}

function parseSortParams(searchParams: URLSearchParams): SortBy | null {
  const sortByRaw = searchParams.get("sortBy");
  if (!sortByRaw) return "createdAt";
  if (sortByRaw !== "createdAt" && sortByRaw !== "updatedAt") {
    return null;
  }
  return sortByRaw;
}

export function parseListQueryParams(
  searchParams: URLSearchParams,
): ListQueryParams | null {
  const pagination = parsePaginationParams(searchParams);
  const sortBy = parseSortParams(searchParams);
  const sortOrderRaw = searchParams.get("sortOrder");
  if (!pagination || !sortBy) return null;
  if (sortOrderRaw && sortOrderRaw !== "desc") return null;
  return {
    ...pagination,
    sortBy,
    sortOrder: "desc",
  };
}

export function paginateArray<T>(
  items: T[],
  params: PaginationParams,
): { items: T[]; pagination: PaginationMeta } {
  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / params.pageSize));
  const currentPage = Math.min(params.page, totalPages);
  const start = (currentPage - 1) * params.pageSize;
  const end = start + params.pageSize;

  return {
    items: items.slice(start, end),
    pagination: {
      page: currentPage,
      pageSize: params.pageSize,
      total,
      totalPages,
    },
  };
}

function resolveTimestampForSort(value: Date | string | undefined): number {
  if (!value) return 0;
  const date = value instanceof Date ? value : new Date(value);
  const time = date.getTime();
  return Number.isNaN(time) ? 0 : time;
}

export function sortByTimestampDesc<
  T extends { createdAt?: Date | string; updatedAt?: Date | string },
>(items: T[], sortBy: SortBy): T[] {
  const sorted = [...items];
  sorted.sort((left, right) => {
    const leftValue = resolveTimestampForSort(left[sortBy]);
    const rightValue = resolveTimestampForSort(right[sortBy]);
    return rightValue - leftValue;
  });
  return sorted;
}
