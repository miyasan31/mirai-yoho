"use client";

import { parseAsString, parseAsStringLiteral, useQueryStates } from "nuqs";
import { useCallback, useEffect, useMemo } from "react";
import type { View } from "react-big-calendar";

export type ConsultantCalendarView = "month" | "week" | "day" | "agenda";

const VIEW_VALUES = ["month", "week", "day", "agenda"] as const;
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
  const defaultDate = formatDateQueryValue(new Date());
  const [query, setQuery] = useQueryStates(
    {
      view: parseAsStringLiteral(VIEW_VALUES).withDefault(DEFAULT_VIEW),
      date: parseAsString.withDefault(defaultDate),
    },
    {
      history: "replace",
    },
  );

  const view = toSafeView(query.view);
  const dateQueryValue = formatDateQueryValue(toSafeDate(query.date));
  const date = useMemo(() => toSafeDate(dateQueryValue), [dateQueryValue]);

  useEffect(() => {
    const needsViewNormalization = query.view !== view;
    const needsDateNormalization = query.date !== dateQueryValue;
    if (!needsViewNormalization && !needsDateNormalization) {
      return;
    }

    void setQuery({
      view,
      date: dateQueryValue,
    });
  }, [dateQueryValue, query.date, query.view, setQuery, view]);

  const setView = useCallback(
    (nextView: View | ConsultantCalendarView) => {
      const safeView = toSafeView(String(nextView));
      if (safeView === view) return;
      void setQuery({
        view: safeView,
      });
    },
    [setQuery, view],
  );

  const setDate = useCallback(
    (nextDate: Date) => {
      const nextDateQueryValue = formatDateQueryValue(startOfDate(nextDate));
      if (nextDateQueryValue === dateQueryValue) return;
      void setQuery({
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
      void setQuery({
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
