import { useNavigate, useSearch } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo } from "react";
import type { View } from "react-big-calendar";

export type ConsultantCalendarView = "month" | "week" | "day" | "agenda";

const DEFAULT_VIEW: ConsultantCalendarView = "week";

function startOfDate(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

function formatDateQueryValue(date: Date): string {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

function parseDateQueryValue(value: string): Date | null {
  const matched = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!matched) return null;

  const year = Number(matched[1]);
  const month = Number(matched[2]);
  const day = Number(matched[3]);
  if (
    !Number.isInteger(year) ||
    !Number.isInteger(month) ||
    !Number.isInteger(day)
  ) {
    return null;
  }

  const date = new Date(year, month - 1, day);
  const isValidDate =
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day;
  if (!isValidDate) return null;

  return startOfDate(date);
}

function toSafeView(value: string): ConsultantCalendarView {
  if (
    value === "month" ||
    value === "week" ||
    value === "day" ||
    value === "agenda"
  ) {
    return value;
  }
  return DEFAULT_VIEW;
}

function toSafeDate(value: string): Date {
  return parseDateQueryValue(value) ?? startOfDate(new Date());
}

export function useConsultantCalendarQueryParams() {
  const search = useSearch({ strict: false }) as Record<string, unknown>;
  const navigate = useNavigate();

  const rawView = typeof search.view === "string" ? search.view : "";
  const rawDate = typeof search.date === "string" ? search.date : "";
  const hasViewQuery = search.view !== undefined;
  const hasDateQuery = search.date !== undefined;

  const view = toSafeView(rawView);
  const dateQueryValue = formatDateQueryValue(toSafeDate(rawDate));
  const date = useMemo(() => toSafeDate(dateQueryValue), [dateQueryValue]);

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
    const needsViewNormalization = hasViewQuery && rawView !== view;
    const needsDateNormalization = hasDateQuery && rawDate !== dateQueryValue;
    if (!needsViewNormalization && !needsDateNormalization) {
      return;
    }

    setQuery({
      view,
      date: dateQueryValue,
    });
  }, [
    dateQueryValue,
    hasDateQuery,
    hasViewQuery,
    rawDate,
    rawView,
    setQuery,
    view,
  ]);

  const setView = useCallback(
    (nextView: View | ConsultantCalendarView) => {
      const safeView = toSafeView(String(nextView));
      if (safeView === view) return;
      setQuery({
        view: safeView,
      });
    },
    [setQuery, view],
  );

  const setDate = useCallback(
    (nextDate: Date) => {
      const nextDateQueryValue = formatDateQueryValue(startOfDate(nextDate));
      if (nextDateQueryValue === dateQueryValue) return;
      setQuery({
        date: nextDateQueryValue,
      });
    },
    [dateQueryValue, setQuery],
  );

  const setViewAndDate = useCallback(
    (nextView: View | ConsultantCalendarView, nextDate: Date) => {
      const safeView = toSafeView(String(nextView));
      const nextDateQueryValue = formatDateQueryValue(startOfDate(nextDate));
      if (safeView === view && nextDateQueryValue === dateQueryValue) return;
      setQuery({
        view: safeView,
        date: nextDateQueryValue,
      });
    },
    [dateQueryValue, setQuery, view],
  );

  return {
    view,
    date,
    setView,
    setDate,
    setViewAndDate,
  };
}
