// @vitest-environment jsdom
import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

type SearchState = Partial<{
  view: string;
  date: string;
}>;

let mockSearch: SearchState = {};

const mockNavigate = vi.fn();

vi.mock("@tanstack/react-router", () => ({
  useSearch: () => mockSearch,
  useNavigate: () => mockNavigate,
}));

import { useConsultantCalendarQueryParams } from "../use-consultant-calendar-query-params";

/** navigate に渡された search updater を現在の search に適用した結果を返す */
function appliedSearch(callIndex = 0): Record<string, unknown> {
  const options = mockNavigate.mock.calls[callIndex]?.[0] as {
    search: (previous: Record<string, unknown>) => Record<string, unknown>;
    replace?: boolean;
  };
  return options.search({ ...mockSearch });
}

function expectDateYmd(date: Date, year: number, month: number, day: number) {
  expect(date.getFullYear()).toBe(year);
  expect(date.getMonth()).toBe(month - 1);
  expect(date.getDate()).toBe(day);
}

describe("useConsultantCalendarQueryParams", () => {
  beforeEach(() => {
    vi.setSystemTime(new Date("2026-05-23T09:00:00.000Z"));
    mockSearch = {
      view: "week",
      date: "2026-05-23",
    };
    mockNavigate.mockClear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("uses defaults without normalization when query is empty", async () => {
    mockSearch = {};

    const { result } = renderHook(() => useConsultantCalendarQueryParams());

    expect(result.current.view).toBe("week");
    expectDateYmd(result.current.date, 2026, 5, 23);

    await waitFor(() => {
      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });

  it("normalizes invalid query values", async () => {
    mockSearch = {
      view: "invalid",
      date: "abc",
    };

    renderHook(() => useConsultantCalendarQueryParams());

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalled();
    });
    expect(appliedSearch()).toMatchObject({
      view: "week",
      date: "2026-05-23",
    });
    expect(mockNavigate.mock.calls[0]?.[0]).toMatchObject({ replace: true });
  });

  it("keeps valid query values without normalization", async () => {
    mockSearch = {
      view: "month",
      date: "2026-06-01",
    };

    const { result } = renderHook(() => useConsultantCalendarQueryParams());

    expect(result.current.view).toBe("month");
    expectDateYmd(result.current.date, 2026, 6, 1);

    await waitFor(() => {
      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });

  it("updates only view when setView is called", () => {
    const { result } = renderHook(() => useConsultantCalendarQueryParams());

    act(() => {
      result.current.setView("day");
    });

    expect(appliedSearch()).toMatchObject({
      view: "day",
    });
  });

  it("updates only date when setDate is called", () => {
    const { result } = renderHook(() => useConsultantCalendarQueryParams());

    act(() => {
      result.current.setDate(new Date("2026-05-30T13:40:00"));
    });

    expect(appliedSearch()).toMatchObject({
      date: "2026-05-30",
    });
  });

  it("updates both view and date when setViewAndDate is called", () => {
    const { result } = renderHook(() => useConsultantCalendarQueryParams());

    act(() => {
      result.current.setViewAndDate("day", new Date("2026-06-02T09:00:00"));
    });

    expect(appliedSearch()).toMatchObject({
      view: "day",
      date: "2026-06-02",
    });
  });
});
