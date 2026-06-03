// @vitest-environment jsdom
import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

type QueryState = {
  view: "month" | "week" | "day" | "agenda";
  date: string;
};

let mockQueryState: QueryState = {
  view: "week",
  date: "2026-05-23",
};

const mockSetQuery = vi.fn(
  async () => new URLSearchParams("view=week&date=2026-05-23"),
);
const mockUseQueryStates = vi.fn();

type ParserBuilder<T> = {
  withDefault: (defaultValue: T) => ParserWithDefault<T>;
};

type ParserWithDefault<T> = {
  defaultValue: T;
};

vi.mock("nuqs", () => ({
  parseAsString: {
    withDefault: (defaultValue: string): ParserWithDefault<string> => ({
      defaultValue,
    }),
  } satisfies ParserBuilder<string>,
  parseAsStringLiteral: <Literal extends string>(
    _values: readonly Literal[],
  ): ParserBuilder<Literal> => ({
    withDefault: (defaultValue: Literal): ParserWithDefault<Literal> => ({
      defaultValue,
    }),
  }),
  useQueryStates: (...args: unknown[]) => mockUseQueryStates(...args),
}));

import { useConsultantCalendarQueryParams } from "../use-consultant-calendar-query-params";

function expectDateYmd(date: Date, year: number, month: number, day: number) {
  expect(date.getFullYear()).toBe(year);
  expect(date.getMonth()).toBe(month - 1);
  expect(date.getDate()).toBe(day);
}

describe("useConsultantCalendarQueryParams", () => {
  beforeEach(() => {
    vi.setSystemTime(new Date("2026-05-23T09:00:00.000Z"));
    mockQueryState = {
      view: "week",
      date: "2026-05-23",
    };
    mockSetQuery.mockClear();
    mockUseQueryStates.mockReset();
    mockUseQueryStates.mockReturnValue([mockQueryState, mockSetQuery]);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("uses defaults without normalization when query is empty", async () => {
    const { result } = renderHook(() => useConsultantCalendarQueryParams());

    expect(result.current.view).toBe("week");
    expectDateYmd(result.current.date, 2026, 5, 23);

    await waitFor(() => {
      expect(mockSetQuery).not.toHaveBeenCalled();
    });
  });

  it("normalizes invalid query values", async () => {
    mockQueryState = {
      view: "invalid",
      date: "abc",
    } as unknown as QueryState;
    mockUseQueryStates.mockReturnValue([mockQueryState, mockSetQuery]);

    renderHook(() => useConsultantCalendarQueryParams());

    await waitFor(() => {
      expect(mockSetQuery).toHaveBeenCalledWith({
        view: "week",
        date: "2026-05-23",
      });
    });
  });

  it("keeps valid query values without normalization", async () => {
    mockQueryState = {
      view: "month",
      date: "2026-06-01",
    };
    mockUseQueryStates.mockReturnValue([mockQueryState, mockSetQuery]);

    const { result } = renderHook(() => useConsultantCalendarQueryParams());

    expect(result.current.view).toBe("month");
    expectDateYmd(result.current.date, 2026, 6, 1);

    await waitFor(() => {
      expect(mockSetQuery).not.toHaveBeenCalled();
    });
  });

  it("updates only view when setView is called", () => {
    const { result } = renderHook(() => useConsultantCalendarQueryParams());

    act(() => {
      result.current.setView("day");
    });

    expect(mockSetQuery).toHaveBeenCalledWith({
      view: "day",
    });
  });

  it("updates only date when setDate is called", () => {
    const { result } = renderHook(() => useConsultantCalendarQueryParams());

    act(() => {
      result.current.setDate(new Date("2026-05-30T13:40:00"));
    });

    expect(mockSetQuery).toHaveBeenCalledWith({
      date: "2026-05-30",
    });
  });

  it("updates both view and date when setViewAndDate is called", () => {
    const { result } = renderHook(() => useConsultantCalendarQueryParams());

    act(() => {
      result.current.setViewAndDate("day", new Date("2026-06-02T09:00:00"));
    });

    expect(mockSetQuery).toHaveBeenCalledWith({
      view: "day",
      date: "2026-06-02",
    });
  });
});
