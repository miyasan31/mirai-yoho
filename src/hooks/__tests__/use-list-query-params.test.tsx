// @vitest-environment jsdom
import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ListQueryPageSize } from "../use-list-query-params";

type QueryState = {
  page: number;
  "page-size": ListQueryPageSize;
  "sort-by": 1 | 2;
};

let mockSearchParams = new URLSearchParams();
let mockQueryState: QueryState = {
  page: 1,
  "page-size": 20,
  "sort-by": 1,
};

const mockSetQuery = vi.fn(
  async () => new URLSearchParams("page=1&page-size=20&sort-by=1"),
);
const mockUseQueryStates = vi.fn();

vi.mock("next/navigation", () => ({
  useSearchParams: () => mockSearchParams,
}));

type ParserBuilder<T> = {
  withDefault: (defaultValue: T) => ParserWithDefault<T>;
};

type ParserWithDefault<T> = {
  defaultValue: T;
};

vi.mock("nuqs", () => ({
  parseAsInteger: {
    withDefault: (defaultValue: number): ParserWithDefault<number> => ({
      defaultValue,
    }),
  } satisfies ParserBuilder<number>,
  parseAsNumberLiteral: <Literal extends number>(
    _values: readonly Literal[],
  ): ParserBuilder<Literal> => ({
    withDefault: (defaultValue: Literal): ParserWithDefault<Literal> => ({
      defaultValue,
    }),
  }),
  parseAsStringLiteral: <Literal extends string>(
    _values: readonly Literal[],
  ): ParserBuilder<Literal> => ({
    withDefault: (defaultValue: Literal): ParserWithDefault<Literal> => ({
      defaultValue,
    }),
  }),
  useQueryStates: (...args: unknown[]) => mockUseQueryStates(...args),
}));

import { useListQueryParams } from "../use-list-query-params";

describe("useListQueryParams", () => {
  beforeEach(() => {
    mockSearchParams = new URLSearchParams();
    mockQueryState = {
      page: 1,
      "page-size": 20,
      "sort-by": 1,
    };
    mockSetQuery.mockClear();
    mockUseQueryStates.mockReset();
    mockUseQueryStates.mockReturnValue([mockQueryState, mockSetQuery]);
  });

  it("uses defaults without normalization when query is empty", async () => {
    const { result } = renderHook(() => useListQueryParams());

    expect(result.current.page).toBe(1);
    expect(result.current.pageSize).toBe(20);
    expect(result.current.sortBy).toBe("createdAt");

    await waitFor(() => {
      expect(mockSetQuery).not.toHaveBeenCalled();
    });
  });

  it("normalizes invalid query values to defaults", async () => {
    mockSearchParams = new URLSearchParams("page=abc&page-size=999&sort-by=9");

    renderHook(() => useListQueryParams());

    await waitFor(() => {
      expect(mockSetQuery).toHaveBeenCalledWith({
        page: 1,
        "page-size": 20,
        "sort-by": 1,
      });
    });
  });

  it("keeps valid values without normalization", async () => {
    mockSearchParams = new URLSearchParams("page=3&page-size=50&sort-by=2");
    mockQueryState = {
      page: 3,
      "page-size": 50,
      "sort-by": 2,
    };
    mockUseQueryStates.mockReturnValue([mockQueryState, mockSetQuery]);

    const { result } = renderHook(() => useListQueryParams());

    expect(result.current.page).toBe(3);
    expect(result.current.pageSize).toBe(50);
    expect(result.current.sortBy).toBe("updatedAt");

    await waitFor(() => {
      expect(mockSetQuery).not.toHaveBeenCalled();
    });
  });

  it("resets page to 1 when page size changes", () => {
    mockQueryState = {
      page: 4,
      "page-size": 50,
      "sort-by": 2,
    };
    mockUseQueryStates.mockReturnValue([mockQueryState, mockSetQuery]);

    const { result } = renderHook(() => useListQueryParams());

    act(() => {
      result.current.setPageSize(100);
    });

    expect(mockSetQuery).toHaveBeenCalledWith({
      page: 1,
      "page-size": 100,
    });
  });

  it("resets page to 1 when sort changes", () => {
    mockQueryState = {
      page: 4,
      "page-size": 50,
      "sort-by": 1,
    };
    mockUseQueryStates.mockReturnValue([mockQueryState, mockSetQuery]);

    const { result } = renderHook(() => useListQueryParams());

    act(() => {
      result.current.setSortBy("updatedAt");
    });

    expect(mockSetQuery).toHaveBeenCalledWith({
      page: 1,
      "sort-by": 2,
    });
  });
});
