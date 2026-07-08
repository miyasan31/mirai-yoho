import { useNavigate, useSearch } from "@tanstack/react-router";
import { useCallback, useEffect } from "react";

export type ListQueryPageSize = 20 | 50 | 100;
export type ListQuerySortBy = "createdAt" | "updatedAt";

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE: ListQueryPageSize = 20;

const PAGE_SIZE_VALUES: readonly ListQueryPageSize[] = [20, 50, 100];

function toPositiveInteger(value: number): number {
  if (!Number.isInteger(value) || value < 1) {
    return DEFAULT_PAGE;
  }
  return value;
}

function toPageSize(value: number): ListQueryPageSize {
  if (PAGE_SIZE_VALUES.includes(value as ListQueryPageSize)) {
    return value as ListQueryPageSize;
  }
  return DEFAULT_PAGE_SIZE;
}

function toSortByFromQueryValue(value: 1 | 2): ListQuerySortBy {
  if (value === 2) return "updatedAt";
  return "createdAt";
}

function toSortByQueryValue(value: ListQuerySortBy): 1 | 2 {
  return value === "updatedAt" ? 2 : 1;
}

function toNumberQueryValue(value: unknown): number | null {
  if (typeof value === "number") {
    return value;
  }
  if (typeof value === "string" && value !== "") {
    const parsed = Number(value);
    return Number.isNaN(parsed) ? null : parsed;
  }
  return null;
}

function toSortByQueryValueOrDefault(value: unknown): 1 | 2 {
  const parsed = toNumberQueryValue(value);
  return parsed === 2 ? 2 : 1;
}

export function useListQueryParams() {
  const search = useSearch({ strict: false }) as Record<string, unknown>;
  const navigate = useNavigate();

  const rawPage = search.page;
  const rawPageSize = search["page-size"];
  const rawSortBy = search["sort-by"];

  const page = toPositiveInteger(toNumberQueryValue(rawPage) ?? DEFAULT_PAGE);
  const pageSize = toPageSize(
    toNumberQueryValue(rawPageSize) ?? DEFAULT_PAGE_SIZE,
  );
  const sortBy = toSortByFromQueryValue(toSortByQueryValueOrDefault(rawSortBy));
  const sortByQueryValue = toSortByQueryValue(sortBy);

  const setQuery = useCallback(
    (patch: Record<string, unknown>) => {
      void navigate({
        to: ".",
        search: (previous: Record<string, unknown>) => ({
          ...previous,
          ...patch,
        }),
        replace: true,
      });
    },
    [navigate],
  );

  useEffect(() => {
    const needsPageNormalization = rawPage !== undefined && rawPage !== page;
    const needsPageSizeNormalization =
      rawPageSize !== undefined && rawPageSize !== pageSize;
    const needsSortByNormalization =
      rawSortBy !== undefined && rawSortBy !== sortByQueryValue;

    if (
      !needsPageNormalization &&
      !needsPageSizeNormalization &&
      !needsSortByNormalization
    ) {
      return;
    }

    setQuery({
      page,
      "page-size": pageSize,
      "sort-by": sortByQueryValue,
    });
  }, [
    page,
    pageSize,
    rawPage,
    rawPageSize,
    rawSortBy,
    setQuery,
    sortByQueryValue,
  ]);

  const setPage = useCallback(
    (nextPage: number) => {
      setQuery({ page: toPositiveInteger(nextPage) });
    },
    [setQuery],
  );

  const setPageSize = useCallback(
    (nextPageSize: ListQueryPageSize) => {
      setQuery({
        page: DEFAULT_PAGE,
        "page-size": toPageSize(nextPageSize),
      });
    },
    [setQuery],
  );

  const setSortBy = useCallback(
    (nextSortBy: ListQuerySortBy) => {
      const safeSortBy = nextSortBy === "updatedAt" ? "updatedAt" : "createdAt";
      setQuery({
        page: DEFAULT_PAGE,
        "sort-by": toSortByQueryValue(safeSortBy),
      });
    },
    [setQuery],
  );

  return {
    page,
    pageSize,
    sortBy,
    setPage,
    setPageSize,
    setSortBy,
  };
}
