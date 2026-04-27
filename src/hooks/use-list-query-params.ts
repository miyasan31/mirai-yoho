"use client";

import { useSearchParams } from "next/navigation";
import { parseAsInteger, parseAsNumberLiteral, useQueryStates } from "nuqs";
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

const sortByQueryValues = [1, 2] as const;

export function useListQueryParams() {
  const searchParams = useSearchParams();
  const [query, setQuery] = useQueryStates(
    {
      page: parseAsInteger.withDefault(DEFAULT_PAGE),
      "page-size": parseAsInteger.withDefault(DEFAULT_PAGE_SIZE),
      "sort-by": parseAsNumberLiteral(sortByQueryValues).withDefault(1),
    },
    {
      history: "replace",
    },
  );

  const page = toPositiveInteger(query.page);
  const pageSize = toPageSize(query["page-size"]);
  const sortBy = toSortByFromQueryValue(query["sort-by"]);
  const sortByQueryValue = toSortByQueryValue(sortBy);

  useEffect(() => {
    const rawPage = searchParams.get("page");
    const rawPageSize = searchParams.get("page-size");
    const rawSortBy = searchParams.get("sort-by");

    const needsPageNormalization = rawPage !== null && rawPage !== String(page);
    const needsPageSizeNormalization =
      rawPageSize !== null && rawPageSize !== String(pageSize);
    const needsSortByNormalization =
      rawSortBy !== null && rawSortBy !== String(sortByQueryValue);

    if (
      !needsPageNormalization &&
      !needsPageSizeNormalization &&
      !needsSortByNormalization
    ) {
      return;
    }

    void setQuery({
      page,
      "page-size": pageSize,
      "sort-by": sortByQueryValue,
    });
  }, [page, pageSize, searchParams, setQuery, sortByQueryValue]);

  const setPage = useCallback(
    (nextPage: number) => {
      void setQuery({ page: toPositiveInteger(nextPage) });
    },
    [setQuery],
  );

  const setPageSize = useCallback(
    (nextPageSize: ListQueryPageSize) => {
      void setQuery({
        page: DEFAULT_PAGE,
        "page-size": toPageSize(nextPageSize),
      });
    },
    [setQuery],
  );

  const setSortBy = useCallback(
    (nextSortBy: ListQuerySortBy) => {
      const safeSortBy = nextSortBy === "updatedAt" ? "updatedAt" : "createdAt";
      void setQuery({
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
