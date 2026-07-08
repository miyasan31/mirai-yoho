// @vitest-environment jsdom
import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ListQueryPageSize } from "../use-list-query-params";

type SearchState = Partial<{
  page: number | string;
  "page-size": ListQueryPageSize | number | string;
  "sort-by": 1 | 2 | number | string;
}>;

let mockSearch: SearchState = {};

const mockNavigate = vi.fn();

vi.mock("@tanstack/react-router", () => ({
  useSearch: () => mockSearch,
  useNavigate: () => mockNavigate,
}));

import { useListQueryParams } from "../use-list-query-params";

/** navigate に渡された search updater を現在の search に適用した結果を返す */
function appliedSearch(callIndex = 0): Record<string, unknown> {
  const options = mockNavigate.mock.calls[callIndex]?.[0] as {
    search: (previous: Record<string, unknown>) => Record<string, unknown>;
    replace?: boolean;
  };
  return options.search({ ...mockSearch });
}

describe("useListQueryParams", () => {
  beforeEach(() => {
    mockSearch = {};
    mockNavigate.mockClear();
  });

  it("uses defaults without normalization when query is empty", async () => {
    const { result } = renderHook(() => useListQueryParams());

    expect(result.current.page).toBe(1);
    expect(result.current.pageSize).toBe(20);
    expect(result.current.sortBy).toBe("createdAt");

    await waitFor(() => {
      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });

  it("normalizes invalid query values to defaults", async () => {
    mockSearch = { page: "abc", "page-size": 999, "sort-by": 9 };

    renderHook(() => useListQueryParams());

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalled();
    });
    expect(appliedSearch()).toMatchObject({
      page: 1,
      "page-size": 20,
      "sort-by": 1,
    });
    expect(mockNavigate.mock.calls[0]?.[0]).toMatchObject({ replace: true });
  });

  it("keeps valid values without normalization", async () => {
    mockSearch = { page: 3, "page-size": 50, "sort-by": 2 };

    const { result } = renderHook(() => useListQueryParams());

    expect(result.current.page).toBe(3);
    expect(result.current.pageSize).toBe(50);
    expect(result.current.sortBy).toBe("updatedAt");

    await waitFor(() => {
      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });

  it("resets page to 1 when page size changes", () => {
    mockSearch = { page: 4, "page-size": 50, "sort-by": 2 };

    const { result } = renderHook(() => useListQueryParams());

    act(() => {
      result.current.setPageSize(100);
    });

    expect(appliedSearch()).toMatchObject({
      page: 1,
      "page-size": 100,
    });
  });

  it("resets page to 1 when sort changes", () => {
    mockSearch = { page: 4, "page-size": 50, "sort-by": 1 };

    const { result } = renderHook(() => useListQueryParams());

    act(() => {
      result.current.setSortBy("updatedAt");
    });

    expect(appliedSearch()).toMatchObject({
      page: 1,
      "sort-by": 2,
    });
  });
});
