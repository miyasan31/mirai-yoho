// @vitest-environment jsdom
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { addDays } from "date-fns";
import type { ReactNode } from "react";

const mockCreateSlotMutateAsync = vi.fn();
const mockDeleteSlotMutateAsync = vi.fn();
const mockRefetch = vi.fn();
const mockToasterCreate = vi.fn();
const mockUsePublicBookingSettings = vi.fn();

let futureSlotStart = new Date();
let futureSlotEnd = new Date();
let pastSlotStart = new Date();
let pastSlotEnd = new Date();
let allDaySingleStart = new Date();
let allDaySingleEnd = new Date();
let allDayMultiStart = new Date();
let allDayMultiEnd = new Date();

vi.mock("react-big-calendar", () => ({
  Calendar: ({
    view,
    date,
    onSelectSlot,
    onNavigate,
    onView,
  }: {
    view: string;
    date: Date;
    onSelectSlot?: (slot: { start: Date; end: Date }) => void;
    onNavigate?: (nextDate: Date) => void;
    onView?: (nextView: "month" | "week" | "day") => void;
  }) => (
    <div>
      <div data-testid="calendar-view">{view}</div>
      <div data-testid="calendar-date">{date.toDateString()}</div>
      <button type="button" onClick={() => onView?.("month")}>
        change-to-month
      </button>
      <button type="button" onClick={() => onView?.("week")}>
        change-to-week
      </button>
      <button type="button" onClick={() => onNavigate?.(addDays(date, 1))}>
        navigate-next-day
      </button>
      <button
        type="button"
        onClick={() =>
          onSelectSlot?.({ start: futureSlotStart, end: futureSlotEnd })
        }
      >
        select-future-slot
      </button>
      <button
        type="button"
        onClick={() =>
          onSelectSlot?.({ start: pastSlotStart, end: pastSlotEnd })
        }
      >
        select-past-slot
      </button>
      <button
        type="button"
        onClick={() =>
          onSelectSlot?.({
            start: allDaySingleStart,
            end: allDaySingleEnd,
          })
        }
      >
        select-all-day-single
      </button>
      <button
        type="button"
        onClick={() =>
          onSelectSlot?.({
            start: allDayMultiStart,
            end: allDayMultiEnd,
          })
        }
      >
        select-all-day-multi
      </button>
    </div>
  ),
  dateFnsLocalizer: () => ({}),
}));

vi.mock("styled-system/jsx", () => {
  const styledProxy = new Proxy(
    (Tag: string) =>
      ({ children, ...props }: Record<string, unknown>) => {
        const Element = Tag as unknown as React.ElementType;
        return <Element {...props}>{children as React.ReactNode}</Element>;
      },
    {
      get:
        (_target, tag: string) =>
        ({ children, ...props }: Record<string, unknown>) => {
          const Element = tag as unknown as React.ElementType;
          return <Element {...props}>{children as React.ReactNode}</Element>;
        },
    },
  );

  return { styled: styledProxy };
});

vi.mock("@mirai-yoho/ui/components/ui/button", () => ({
  Button: ({
    children,
    ...props
  }: { children: ReactNode } & Record<string, unknown>) => (
    <button type="button" {...props}>
      {children}
    </button>
  ),
}));

vi.mock("@mirai-yoho/ui/components/ui/dialog", () => ({
  Root: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  Backdrop: () => null,
  Positioner: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  Content: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  Header: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  Title: ({ children }: { children: ReactNode }) => <h2>{children}</h2>,
  Description: ({ children }: { children: ReactNode }) => <p>{children}</p>,
  Footer: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  CloseTrigger: ({ children }: { children: ReactNode }) => (
    <div>{children}</div>
  ),
}));

vi.mock("@mirai-yoho/ui/components/ui/skeleton", () => ({
  Skeleton: (props: React.ComponentProps<"div">) => (
    <div data-testid="skeleton" {...props} />
  ),
}));

vi.mock("@mirai-yoho/ui/components/ui/text", () => ({
  Text: ({
    as: Tag = "span",
    children,
    ...props
  }: { as?: string; children: ReactNode } & Record<string, unknown>) => {
    const Element = Tag as unknown as React.ElementType;
    return <Element {...props}>{children}</Element>;
  },
}));

vi.mock("@mirai-yoho/ui/components/ui/toast", () => ({
  toaster: {
    create: (...args: unknown[]) => mockToasterCreate(...args),
  },
}));

vi.mock("@mirai-yoho/shared/slot-availability", () => ({
  getSlotUnitMinutes: () => 30,
  getSlotUnitMs: () => 30 * 60 * 1000,
  isAlignedToSlotBoundary: () => true,
  splitIntoSlotRanges: (start: Date, end: Date) => {
    const slotUnitMs = 30 * 60 * 1000;
    const ranges: Array<{ start: Date; end: Date }> = [];
    for (
      let current = start.getTime();
      current < end.getTime();
      current += slotUnitMs
    ) {
      ranges.push({
        start: new Date(current),
        end: new Date(current + slotUnitMs),
      });
    }
    return ranges;
  },
}));

vi.mock("@/hooks/use-auth", () => ({
  useAuth: () => ({ user: { uid: "consultant-1" } }),
}));

vi.mock("@mirai-yoho/console-core/hooks/use-organization-routing", () => ({
  useOrganizationRouting: () => ({ organizationId: "org-1" }),
}));

vi.mock("@mirai-yoho/console-core/hooks/use-booking-settings", () => ({
  usePublicBookingSettings: () => mockUsePublicBookingSettings(),
}));

vi.mock("@/hooks/use-console-slots", () => ({
  useGetConsoleSlots: () => ({
    data: { data: { slots: [] } },
    isLoading: false,
    refetch: mockRefetch,
  }),
}));

vi.mock("@/hooks/use-slots", () => ({
  useCreateSlot: () => ({ mutateAsync: mockCreateSlotMutateAsync }),
  useDeleteSlot: () => ({
    mutateAsync: mockDeleteSlotMutateAsync,
    isPending: false,
  }),
}));

vi.mock("@/hooks/use-consultant-calendar-query-params", async () => {
  const React = await import("react");
  return {
    useConsultantCalendarQueryParams: () => {
      const [view, setViewState] = React.useState<
        "month" | "week" | "day" | "agenda"
      >("week");
      const [date, setDateState] = React.useState(new Date("2026-05-23"));
      return {
        view,
        date,
        setView: (nextView: "month" | "week" | "day" | "agenda") =>
          setViewState(nextView),
        setDate: (nextDate: Date) => setDateState(nextDate),
        setViewAndDate: (
          nextView: "month" | "week" | "day" | "agenda",
          nextDate: Date,
        ) => {
          setViewState(nextView);
          setDateState(nextDate);
        },
      };
    },
  };
});

import ConsultantSlotsPage from "../page";

describe("ConsultantSlotsPage", () => {
  beforeEach(() => {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(now.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);

    futureSlotStart = new Date(tomorrow);
    futureSlotStart.setHours(11, 0, 0, 0);
    futureSlotEnd = new Date(tomorrow);
    futureSlotEnd.setHours(11, 30, 0, 0);
    pastSlotStart = new Date(now.getTime() - 60 * 60 * 1000);
    pastSlotEnd = new Date(now.getTime() - 30 * 60 * 1000);
    allDaySingleStart = new Date(tomorrow);
    allDaySingleStart.setHours(0, 0, 0, 0);
    allDaySingleEnd = new Date(allDaySingleStart);
    allDaySingleEnd.setDate(allDaySingleEnd.getDate() + 1);
    allDayMultiStart = new Date(allDaySingleStart);
    allDayMultiEnd = new Date(allDaySingleStart);
    allDayMultiEnd.setDate(allDayMultiEnd.getDate() + 2);

    mockUsePublicBookingSettings.mockReturnValue({
      data: {
        data: {
          businessHours: {
            weekly: Array.from({ length: 7 }, (_, dayOfWeek) => ({
              dayOfWeek,
              isClosed: false,
              timeWindows: [{ startTime: "10:00", endTime: "17:00" }],
            })),
            includePublicHolidays: true,
            exceptions: [],
          },
        },
      },
    });
    mockCreateSlotMutateAsync.mockResolvedValue(undefined);
    mockDeleteSlotMutateAsync.mockResolvedValue(undefined);
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("does not register and switches to day view when selecting in month view", async () => {
    render(<ConsultantSlotsPage />);

    fireEvent.click(screen.getByText("change-to-month"));
    expect(screen.getByTestId("calendar-view")).toHaveTextContent("month");

    fireEvent.click(screen.getByText("select-future-slot"));

    await waitFor(() => {
      expect(screen.getByTestId("calendar-view")).toHaveTextContent("day");
    });
    expect(mockCreateSlotMutateAsync).not.toHaveBeenCalled();
  });

  it("shows error and skips API call when selected slot includes past time", async () => {
    render(<ConsultantSlotsPage />);
    fireEvent.click(screen.getByText("change-to-week"));
    fireEvent.click(screen.getByText("select-past-slot"));

    expect(mockCreateSlotMutateAsync).not.toHaveBeenCalled();
    expect(mockToasterCreate).toHaveBeenCalledWith({
      type: "error",
      title: "過去の時間は選択できません",
    });
  });

  it("keeps slot registration behavior in non-month views for future time", async () => {
    render(<ConsultantSlotsPage />);

    expect(screen.getByTestId("calendar-view")).toHaveTextContent("week");
    fireEvent.click(screen.getByText("select-future-slot"));

    await waitFor(() => {
      expect(mockCreateSlotMutateAsync).toHaveBeenCalled();
    });
  });

  it("updates calendar date when navigating", async () => {
    render(<ConsultantSlotsPage />);
    const before = screen.getByTestId("calendar-date").textContent;

    fireEvent.click(screen.getByText("navigate-next-day"));

    await waitFor(() => {
      expect(screen.getByTestId("calendar-date").textContent).not.toBe(before);
    });
  });

  it("registers only 10:00-17:00 slots for all-day single-day selection", async () => {
    render(<ConsultantSlotsPage />);
    fireEvent.click(screen.getByText("select-all-day-single"));

    await waitFor(() => {
      expect(mockCreateSlotMutateAsync).toHaveBeenCalledTimes(14);
    });

    const calls = mockCreateSlotMutateAsync.mock.calls;
    expect(
      calls.every(([arg]) => {
        const start = new Date(
          (arg as { data: { startsAt: string } }).data.startsAt,
        );
        const end = new Date((arg as { data: { endsAt: string } }).data.endsAt);
        const startHour = start.getHours();
        const endHour = end.getHours();
        return startHour >= 10 && endHour <= 17 && startHour !== 0;
      }),
    ).toBe(true);
  });

  it("registers 10:00-17:00 slots for each day in all-day multi-day selection", async () => {
    render(<ConsultantSlotsPage />);
    fireEvent.click(screen.getByText("select-all-day-multi"));

    await waitFor(() => {
      expect(mockCreateSlotMutateAsync).toHaveBeenCalledTimes(28);
    });

    const days = new Set(
      mockCreateSlotMutateAsync.mock.calls.map(([arg]) => {
        const start = new Date(
          (arg as { data: { startsAt: string } }).data.startsAt,
        );
        return `${start.getFullYear()}-${start.getMonth()}-${start.getDate()}`;
      }),
    );
    expect(days.size).toBe(2);
  });

  it("skips all-day registration when selected day is closed", async () => {
    const closedDate = new Date(allDaySingleStart);
    const closedDayOfWeek = closedDate.getDay();
    mockUsePublicBookingSettings.mockReturnValue({
      data: {
        data: {
          businessHours: {
            weekly: Array.from({ length: 7 }, (_, dayOfWeek) => ({
              dayOfWeek,
              isClosed: dayOfWeek === closedDayOfWeek,
              timeWindows:
                dayOfWeek === closedDayOfWeek
                  ? []
                  : [{ startTime: "10:00", endTime: "17:00" }],
            })),
            includePublicHolidays: true,
            exceptions: [],
          },
        },
      },
    });

    render(<ConsultantSlotsPage />);
    fireEvent.click(screen.getByText("select-all-day-single"));

    expect(mockCreateSlotMutateAsync).not.toHaveBeenCalled();
    expect(mockToasterCreate).toHaveBeenCalledWith({
      type: "error",
      title: "選択した日には営業時間が設定されていません",
    });
  });

  it("shows error and skips API call when selecting outside business hours", async () => {
    const targetDate = new Date(allDaySingleStart);
    futureSlotStart = new Date(targetDate);
    futureSlotStart.setHours(9, 0, 0, 0);
    futureSlotEnd = new Date(targetDate);
    futureSlotEnd.setHours(9, 30, 0, 0);

    render(<ConsultantSlotsPage />);
    fireEvent.click(screen.getByText("select-future-slot"));

    expect(mockCreateSlotMutateAsync).not.toHaveBeenCalled();
    expect(mockToasterCreate).toHaveBeenCalledWith({
      type: "error",
      title: "営業時間外の時間は選択できません",
    });
  });

  it("does not switch to day view in month view when selected day is closed", async () => {
    const closedDayOfWeek = allDaySingleStart.getDay();
    futureSlotStart = new Date(allDaySingleStart);
    futureSlotEnd = new Date(allDaySingleStart);
    futureSlotEnd.setHours(0, 30, 0, 0);

    mockUsePublicBookingSettings.mockReturnValue({
      data: {
        data: {
          businessHours: {
            weekly: Array.from({ length: 7 }, (_, dayOfWeek) => ({
              dayOfWeek,
              isClosed: dayOfWeek === closedDayOfWeek,
              timeWindows:
                dayOfWeek === closedDayOfWeek
                  ? []
                  : [{ startTime: "10:00", endTime: "17:00" }],
            })),
            includePublicHolidays: true,
            exceptions: [],
          },
        },
      },
    });

    render(<ConsultantSlotsPage />);
    fireEvent.click(screen.getByText("change-to-month"));
    fireEvent.click(screen.getByText("select-future-slot"));

    expect(screen.getByTestId("calendar-view")).toHaveTextContent("month");
    expect(mockToasterCreate).toHaveBeenCalledWith({
      type: "error",
      title: "選択した日は営業時間外のため選択できません",
    });
  });
});
