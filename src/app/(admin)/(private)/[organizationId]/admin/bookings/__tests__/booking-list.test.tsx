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

const mockUseAdminBookings = vi.fn();
const mockUseAdminClients = vi.fn();
const mockUseAdminConsultants = vi.fn();
const mockMutateAsync = vi.fn();

vi.mock("@/hooks/use-admin-bookings", () => ({
  useAdminBookings: () => mockUseAdminBookings(),
}));

vi.mock("@/hooks/use-admin-clients", () => ({
  useAdminClients: (
    params?: Record<string, unknown>,
    options?: { enabled?: boolean },
  ) => mockUseAdminClients(params, options),
}));

vi.mock("@/hooks/use-admin-consultants", () => ({
  useAdminConsultants: (
    params?: Record<string, unknown>,
    options?: { enabled?: boolean },
  ) => mockUseAdminConsultants(params, options),
}));

vi.mock("@/components/list-controls", () => ({
  ListControls: () => <div>list-controls</div>,
}));

vi.mock("@/hooks/use-booking", () => ({
  useChargePayment: () => ({
    mutateAsync: mockMutateAsync,
    isPending: false,
    variables: null,
  }),
}));

vi.mock("@/hooks/use-organization-routing", () => ({
  useOrganizationRouting: () => ({ organizationId: "org-test" }),
}));

vi.mock("@/components/table-skeleton", () => ({
  TableSkeleton: () => <div data-testid="table-skeleton" />,
}));

vi.mock("@/components/empty-state", () => ({
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

vi.mock("@/components/status-badge", () => ({
  BookingStatusBadge: ({ status }: { status: string }) => <span>{status}</span>,
}));

vi.mock("@/components/truncated-id", () => ({
  TruncatedId: ({ id }: { id: string }) => <span>{`${id.slice(0, 8)}…`}</span>,
}));

vi.mock("@/components/ui/text", () => ({
  Text: ({
    as: Tag = "span",
    children,
    ...props
  }: { as?: string; children: React.ReactNode } & Record<string, unknown>) => {
    const Element = Tag as unknown as React.ElementType;
    return <Element {...props}>{children}</Element>;
  },
}));

vi.mock("@/components/ui/table", () => ({
  Root: (props: React.ComponentProps<"table">) => <table {...props} />,
  Head: (props: React.ComponentProps<"thead">) => <thead {...props} />,
  Body: (props: React.ComponentProps<"tbody">) => <tbody {...props} />,
  Row: (props: React.ComponentProps<"tr">) => <tr {...props} />,
  Header: (props: React.ComponentProps<"th">) => <th {...props} />,
  Cell: (props: React.ComponentProps<"td">) => <td {...props} />,
}));

vi.mock("@/components/ui/button", () => ({
  Button: ({
    children,
    ...props
  }: { children: ReactNode } & React.ComponentProps<"button">) => (
    <button {...props}>{children}</button>
  ),
}));

vi.mock("@/components/ui/tooltip", () => ({
  Tooltip: ({
    children,
  }: {
    children: React.ReactNode;
    content: React.ReactNode;
    disabled?: boolean;
  }) => <>{children}</>,
}));

vi.mock("@/components/ui/hover-card", () => ({
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

import AdminBookingsPage from "../page";

function createBooking() {
  return {
    bookingId: "booking-1",
    clientId: "client-001-abcdef",
    consultantId: "consultant-001-abcdef",
    startDatetime: "2026-04-01T10:00:00.000Z",
    status: "confirmed",
    chargeable: true,
    chargeDisabledReason: null,
  };
}

describe("AdminBookingsPage", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("shows loading state if any query is loading", () => {
    mockUseAdminBookings.mockReturnValue({
      data: { data: { bookings: [createBooking()] } },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });
    mockUseAdminClients.mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
      refetch: vi.fn(),
    });
    mockUseAdminConsultants.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    render(<AdminBookingsPage />);
    expect(screen.getByTestId("table-skeleton")).toBeInTheDocument();
  });

  it("shows names on first table render and keeps charge action working", async () => {
    mockUseAdminBookings.mockReturnValue({
      data: { data: { bookings: [createBooking()] } },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });
    mockUseAdminClients.mockReturnValue({
      data: {
        data: {
          clients: [
            {
              clientId: "client-001-abcdef",
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
    mockUseAdminConsultants.mockReturnValue({
      data: {
        data: {
          consultants: [
            {
              consultantId: "consultant-001-abcdef",
              displayName: "佐藤 花子",
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

    render(<AdminBookingsPage />);

    expect(screen.getByText("クライアント")).toBeInTheDocument();
    expect(screen.getByText("相談員")).toBeInTheDocument();
    expect(screen.getByText("山田 太郎")).toBeInTheDocument();
    expect(screen.getByText("佐藤 花子")).toBeInTheDocument();
    expect(mockUseAdminClients).toHaveBeenCalledWith(
      { page: 1, pageSize: 100, sortBy: "createdAt", sortOrder: "desc" },
      { enabled: true },
    );
    expect(mockUseAdminConsultants).toHaveBeenCalledWith(
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
    mockUseAdminBookings.mockReturnValue({
      data: { data: { bookings: [createBooking()] } },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });
    mockUseAdminClients.mockReturnValue({
      data: {
        data: {
          clients: [
            {
              clientId: "client-001-abcdef",
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
    mockUseAdminConsultants.mockReturnValue({
      data: {
        data: {
          consultants: [
            {
              consultantId: "consultant-001-abcdef",
              displayName: "佐藤 花子",
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

    render(<AdminBookingsPage />);

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

    expect(mockUseAdminClients).toHaveBeenCalledTimes(1);
    expect(mockUseAdminConsultants).toHaveBeenCalledTimes(1);
  });

  it("shows error screen and retries when clients or consultants query fails", async () => {
    const refetchBookings = vi.fn();
    const refetchClients = vi.fn();
    const refetchConsultants = vi.fn();

    mockUseAdminBookings.mockReturnValue({
      data: { data: { bookings: [createBooking()] } },
      isLoading: false,
      error: null,
      refetch: refetchBookings,
    });
    mockUseAdminClients.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error("clients failed"),
      refetch: refetchClients,
    });
    mockUseAdminConsultants.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: null,
      refetch: refetchConsultants,
    });

    render(<AdminBookingsPage />);

    expect(
      screen.getByText("予約情報の表示に必要なデータ取得に失敗しました"),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "再試行" }));

    await waitFor(() => {
      expect(refetchBookings).toHaveBeenCalledTimes(1);
      expect(refetchClients).toHaveBeenCalledTimes(1);
      expect(refetchConsultants).toHaveBeenCalledTimes(1);
    });
  });

  it("keeps fallback for unresolved ids", async () => {
    mockUseAdminBookings.mockReturnValue({
      data: {
        data: {
          bookings: [
            {
              ...createBooking(),
              clientId: "client-404-abcdef",
              consultantId: "consultant-404-abcdef",
            },
          ],
        },
      },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });
    mockUseAdminClients.mockReturnValue({
      data: { data: { clients: [] } },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });
    mockUseAdminConsultants.mockReturnValue({
      data: { data: { consultants: [] } },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    render(<AdminBookingsPage />);

    expect(screen.getByText("client-4…")).toBeInTheDocument();
    expect(screen.getByText("consulta…")).toBeInTheDocument();

    fireEvent.mouseEnter(screen.getByText("client-4…"));
    fireEvent.mouseEnter(screen.getByText("consulta…"));

    await waitFor(() => {
      expect(
        screen.getAllByText("情報が見つかりません").length,
      ).toBeGreaterThan(0);
    });
  });
});
