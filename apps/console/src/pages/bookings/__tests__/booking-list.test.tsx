// @vitest-environment jsdom
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import type { ReactNode } from "react";

vi.mock("styled-system/css", () => ({
  css: () => "",
  cva: () => () => "",
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
  return {
    styled: styledProxy,
    createStyleContext: () => ({
      withRootProvider: (c: unknown) => c,
      withContext: (c: unknown) => c,
    }),
  };
});

vi.mock("styled-system/recipes", () => ({
  tooltip: () => ({}),
}));

const mockUseConsoleBookings = vi.fn();
const mockUseConsoleCustomers = vi.fn();
const mockUseConsoleConsultants = vi.fn();
const mockMutateAsync = vi.fn();

vi.mock("@mirai-yoho/console-core/hooks/use-list-query-params", () => ({
  useListQueryParams: () => ({
    page: 1,
    pageSize: 20,
    sortBy: "createdAt",
    setPage: vi.fn(),
    setPageSize: vi.fn(),
    setSortBy: vi.fn(),
  }),
}));

vi.mock("@/hooks/use-console-bookings", () => ({
  useConsoleBookings: () => mockUseConsoleBookings(),
}));

vi.mock("@/hooks/use-console-customers", () => ({
  useConsoleCustomers: (
    params?: Record<string, unknown>,
    options?: { enabled?: boolean },
  ) => mockUseConsoleCustomers(params, options),
}));

vi.mock("@/hooks/use-console-consultants", () => ({
  useConsoleConsultants: (
    params?: Record<string, unknown>,
    options?: { enabled?: boolean },
  ) => mockUseConsoleConsultants(params, options),
}));

vi.mock("@mirai-yoho/ui/components/list-controls", () => ({
  ListControls: () => <div>list-controls</div>,
}));

vi.mock("@/hooks/use-booking", () => ({
  useChargePayment: () => ({
    mutateAsync: mockMutateAsync,
    isPending: false,
    variables: null,
  }),
}));

vi.mock("@mirai-yoho/console-core/hooks/use-organization-routing", () => ({
  useOrganizationRouting: () => ({ organizationId: "org-test" }),
}));

vi.mock("@mirai-yoho/ui/components/table-skeleton", () => ({
  TableSkeleton: () => <div data-testid="table-skeleton" />,
}));

vi.mock("@mirai-yoho/ui/components/empty-state", () => ({
  EmptyState: ({
    message,
    hint,
  }: {
    message: string;
    hint: string;
    icon: React.ComponentType;
  }) => (
    <div>
      <span>{message}</span>
      <span>{hint}</span>
    </div>
  ),
}));

vi.mock("@mirai-yoho/ui/components/status-badge", () => ({
  BookingStatusBadge: ({ status }: { status: string }) => <span>{status}</span>,
}));

vi.mock("@mirai-yoho/ui/components/truncated-id", () => ({
  TruncatedId: ({ id }: { id: string }) => <span>{`${id.slice(0, 8)}…`}</span>,
}));

vi.mock("@mirai-yoho/ui/components/ui/text", () => ({
  Text: ({
    as: Tag = "span",
    children,
    ...props
  }: { as?: string; children: React.ReactNode } & Record<string, unknown>) => {
    const Element = Tag as unknown as React.ElementType;
    return <Element {...props}>{children}</Element>;
  },
}));

vi.mock("@mirai-yoho/ui/components/ui/table", () => ({
  Root: (props: React.ComponentProps<"table">) => <table {...props} />,
  Head: (props: React.ComponentProps<"thead">) => <thead {...props} />,
  Body: (props: React.ComponentProps<"tbody">) => <tbody {...props} />,
  Row: (props: React.ComponentProps<"tr">) => <tr {...props} />,
  Header: (props: React.ComponentProps<"th">) => <th {...props} />,
  Cell: (props: React.ComponentProps<"td">) => <td {...props} />,
}));

vi.mock("@mirai-yoho/ui/components/ui/button", () => ({
  Button: ({
    children,
    ...props
  }: { children: ReactNode } & React.ComponentProps<"button">) => (
    <button {...props}>{children}</button>
  ),
}));

vi.mock("@mirai-yoho/ui/components/ui/tooltip", () => ({
  Tooltip: ({
    children,
  }: {
    children: React.ReactNode;
    content: React.ReactNode;
    disabled?: boolean;
  }) => <>{children}</>,
}));

vi.mock("@mirai-yoho/ui/components/ui/hover-card", () => ({
  HoverCard: ({
    children,
    content,
    open,
    onOpenChange,
  }: {
    children: React.ReactNode;
    content: React.ReactNode;
    open?: boolean;
    onOpenChange?: (details: { open: boolean }) => void;
  }) => (
    <button
      type="button"
      onMouseEnter={() => onOpenChange?.({ open: true })}
      style={{ all: "unset", display: "contents" }}
    >
      {children}
      {open ? <div>{content}</div> : null}
    </button>
  ),
}));

vi.mock("lucide-react", () => ({
  AlertTriangle: () => <span>AlertTriangle</span>,
  CalendarDays: () => <span>CalendarDays</span>,
}));

import ConsoleBookingsPage from "../page";

function createBooking() {
  return {
    bookingId: "booking-1",
    customerId: "customer-001-abcdef",
    consultantId: "consultant-001-abcdef",
    startsAt: "2026-04-01T10:00:00.000Z",
    status: "confirmed",
    consultantJoinedAt: null,
    chargeable: true,
    chargeDisabledReason: null,
  };
}

describe("ConsoleBookingsPage", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("shows loading state if any query is loading", () => {
    mockUseConsoleBookings.mockReturnValue({
      data: { data: { bookings: [createBooking()] } },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });
    mockUseConsoleCustomers.mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
      refetch: vi.fn(),
    });
    mockUseConsoleConsultants.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    render(<ConsoleBookingsPage />);
    expect(screen.getByTestId("table-skeleton")).toBeInTheDocument();
  });

  it("shows names on first table render and keeps charge action working", async () => {
    mockUseConsoleBookings.mockReturnValue({
      data: { data: { bookings: [createBooking()] } },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });
    mockUseConsoleCustomers.mockReturnValue({
      data: {
        data: {
          customers: [
            {
              customerId: "customer-001-abcdef",
              name: "山田 太郎",
              email: "taro@example.com",
              phone: "090-0000-0000",
              memo: "初回相談",
            },
          ],
        },
      },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });
    mockUseConsoleConsultants.mockReturnValue({
      data: {
        data: {
          consultants: [
            {
              consultantId: "consultant-001-abcdef",
              name: "佐藤 花子",
              email: "hanako@example.com",
              specialties: ["キャリア", "子育て"],
              bio: "5年の相談実績",
              isActive: true,
            },
          ],
        },
      },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });
    mockMutateAsync.mockResolvedValue(undefined);

    render(<ConsoleBookingsPage />);

    expect(screen.getByText("顧客")).toBeInTheDocument();
    expect(screen.getByText("占い師")).toBeInTheDocument();
    expect(screen.getByText("入室確認")).toBeInTheDocument();
    expect(screen.getByText("未確認")).toBeInTheDocument();
    expect(screen.getByText("山田 太郎")).toBeInTheDocument();
    expect(screen.getByText("佐藤 花子")).toBeInTheDocument();
    expect(mockUseConsoleCustomers).toHaveBeenCalledWith(
      { page: 1, pageSize: 100, sortBy: "createdAt", sortOrder: "desc" },
      { enabled: true },
    );
    expect(mockUseConsoleConsultants).toHaveBeenCalledWith(
      { page: 1, pageSize: 100, sortBy: "createdAt", sortOrder: "desc" },
      { enabled: true },
    );

    fireEvent.click(screen.getByRole("button", { name: "課金" }));

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledWith({
        organizationId: "org-test",
        bookingId: "booking-1",
        data: { method: "manual" },
      });
    });
  });

  it("shows hover card details without additional fetch", async () => {
    mockUseConsoleBookings.mockReturnValue({
      data: { data: { bookings: [createBooking()] } },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });
    mockUseConsoleCustomers.mockReturnValue({
      data: {
        data: {
          customers: [
            {
              customerId: "customer-001-abcdef",
              name: "山田 太郎",
              email: "taro@example.com",
              phone: "090-0000-0000",
              memo: "初回相談",
            },
          ],
        },
      },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });
    mockUseConsoleConsultants.mockReturnValue({
      data: {
        data: {
          consultants: [
            {
              consultantId: "consultant-001-abcdef",
              name: "佐藤 花子",
              email: "hanako@example.com",
              specialties: ["キャリア", "子育て"],
              bio: "5年の相談実績",
              isActive: true,
            },
          ],
        },
      },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    render(<ConsoleBookingsPage />);

    fireEvent.mouseEnter(screen.getByText("山田 太郎"));
    fireEvent.mouseEnter(screen.getByText("佐藤 花子"));

    await waitFor(() => {
      expect(screen.getByText("メール: taro@example.com")).toBeInTheDocument();
      expect(screen.getByText("電話: 090-0000-0000")).toBeInTheDocument();
      expect(screen.getByText("メモ: 初回相談")).toBeInTheDocument();
      expect(
        screen.getByText("メール: hanako@example.com"),
      ).toBeInTheDocument();
      expect(
        screen.getByText("専門分野: キャリア, 子育て"),
      ).toBeInTheDocument();
      expect(screen.getByText("自己紹介: 5年の相談実績")).toBeInTheDocument();
    });

    expect(mockUseConsoleCustomers).toHaveBeenCalledTimes(1);
    expect(mockUseConsoleConsultants).toHaveBeenCalledTimes(1);
  });

  it("shows error screen and retries when customers or consultants query fails", async () => {
    const refetchBookings = vi.fn();
    const refetchCustomers = vi.fn();
    const refetchConsultants = vi.fn();

    mockUseConsoleBookings.mockReturnValue({
      data: { data: { bookings: [createBooking()] } },
      isLoading: false,
      error: null,
      refetch: refetchBookings,
    });
    mockUseConsoleCustomers.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error("customers failed"),
      refetch: refetchCustomers,
    });
    mockUseConsoleConsultants.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: null,
      refetch: refetchConsultants,
    });

    render(<ConsoleBookingsPage />);

    expect(
      screen.getByText("予約情報の表示に必要なデータ取得に失敗しました"),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "再試行" }));

    await waitFor(() => {
      expect(refetchBookings).toHaveBeenCalledTimes(1);
      expect(refetchCustomers).toHaveBeenCalledTimes(1);
      expect(refetchConsultants).toHaveBeenCalledTimes(1);
    });
  });

  it("keeps fallback for unresolved ids", async () => {
    mockUseConsoleBookings.mockReturnValue({
      data: {
        data: {
          bookings: [
            {
              ...createBooking(),
              customerId: "customer-404-abcdef",
              consultantId: "consultant-404-abcdef",
            },
          ],
        },
      },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });
    mockUseConsoleCustomers.mockReturnValue({
      data: { data: { customers: [] } },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });
    mockUseConsoleConsultants.mockReturnValue({
      data: { data: { consultants: [] } },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    render(<ConsoleBookingsPage />);

    expect(screen.getByText("customer…")).toBeInTheDocument();
    expect(screen.getByText("consulta…")).toBeInTheDocument();

    fireEvent.mouseEnter(screen.getByText("customer…"));
    fireEvent.mouseEnter(screen.getByText("consulta…"));

    await waitFor(() => {
      expect(
        screen.getAllByText("情報が見つかりません").length,
      ).toBeGreaterThan(0);
    });
  });
});
