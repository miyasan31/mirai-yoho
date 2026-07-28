// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import type { ReactNode } from "react";

vi.mock("@tanstack/react-router", () => ({
  useParams: () => ({ organizationId: "org-test" }),
  useLocation: ({
    select,
  }: {
    select: (location: { pathname: string }) => string;
  }) => select({ pathname: "/org-test/bookings" }),
  useNavigate: () => vi.fn(),
  Link: ({ to, children }: { to: string; children: React.ReactNode }) => (
    <a href={to}>{children}</a>
  ),
}));

const mockUseConsultantBookings = vi.fn();
const mockUseJoinConsultantBooking = vi.fn();

vi.mock("@/hooks/use-consultant-bookings", () => ({
  useConsultantBookings: () => mockUseConsultantBookings(),
  useJoinConsultantBooking: () => mockUseJoinConsultantBooking(),
}));

const mockUseConsultantAppraisalReports = vi.fn();

vi.mock("@/hooks/use-consultant-appraisal-reports", () => ({
  useConsultantAppraisalReports: () => mockUseConsultantAppraisalReports(),
}));

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

vi.mock("@mirai-yoho/ui/components/list-controls", () => ({
  ListControls: () => <div>list-controls</div>,
}));

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
      withProvider: (c: unknown) => c,
      withRootProvider: (c: unknown) => c,
      withContext: (c: unknown) => c,
    }),
  };
});

vi.mock("styled-system/recipes", () => ({
  absoluteCenter: () => ({}),
  button: Object.assign(() => ({}), {
    splitVariantProps: (props: Record<string, unknown>) => [{}, props],
  }),
  group: () => ({}),
  spinner: () => ({}),
  tooltip: () => ({}),
}));

vi.mock("@mirai-yoho/ui/components/ui/toast", () => ({
  toaster: { create: vi.fn() },
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
  }: { as?: string; children: React.ReactNode } & Record<string, unknown>) => {
    const Element = Tag as unknown as React.ElementType;
    return <Element {...props}>{children}</Element>;
  },
}));

vi.mock("@mirai-yoho/ui/components/ui/tooltip", () => ({
  Tooltip: ({
    children,
    content,
  }: { children: React.ReactNode; content: React.ReactNode } & Record<
    string,
    unknown
  >) => (
    <div>
      {children}
      <span>{content}</span>
    </div>
  ),
}));

vi.mock("@mirai-yoho/ui/components/ui/icon-button", () => ({
  IconButton: ({
    asChild,
    children,
    ...props
  }: { asChild?: boolean; children: React.ReactNode } & Record<
    string,
    unknown
  >) => <button {...props}>{children}</button>,
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

vi.mock("@mirai-yoho/ui/components/ui/table", () => ({
  Root: (props: React.ComponentProps<"table">) => <table {...props} />,
  Head: (props: React.ComponentProps<"thead">) => <thead {...props} />,
  Body: (props: React.ComponentProps<"tbody">) => <tbody {...props} />,
  Row: (props: React.ComponentProps<"tr">) => <tr {...props} />,
  Header: (props: React.ComponentProps<"th">) => <th {...props} />,
  Cell: (props: React.ComponentProps<"td">) => <td {...props} />,
}));

vi.mock("@mirai-yoho/ui/components/ui/badge", () => ({
  Badge: ({ children }: { children: React.ReactNode }) => (
    <span>{children}</span>
  ),
}));

vi.mock("@mirai-yoho/ui/components/status-badge", () => ({
  BookingStatusBadge: ({ status }: { status: string }) => <span>{status}</span>,
}));

vi.mock("@mirai-yoho/ui/components/table-skeleton", () => ({
  TableSkeleton: () => <div data-testid="table-skeleton" />,
}));

vi.mock("@mirai-yoho/ui/components/truncated-id", () => ({
  TruncatedId: ({ id }: { id: string }) => <span>{`${id.slice(0, 8)}…`}</span>,
}));

vi.mock("lucide-react", () => ({
  CalendarX: () => <span>CalendarX</span>,
  ExternalLink: () => <span>ExternalLink</span>,
  FileText: () => <span>FileText</span>,
  Pencil: () => <span>Pencil</span>,
}));

import ConsultantBookingsPage from "../page";

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

describe("ConsultantBookingsPage", () => {
  beforeEach(() => {
    mockUseConsultantAppraisalReports.mockReturnValue({
      data: { data: { reports: [] } },
    });
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("shows loading state initially", () => {
    mockUseJoinConsultantBooking.mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
      variables: null,
    });
    mockUseConsultantBookings.mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
    });
    render(<ConsultantBookingsPage />, { wrapper: createWrapper() });
    expect(screen.getByTestId("table-skeleton")).toBeInTheDocument();
  });

  it("renders booking list from API response", async () => {
    mockUseJoinConsultantBooking.mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
      variables: null,
    });
    mockUseConsultantBookings.mockReturnValue({
      data: {
        data: {
          bookings: [
            {
              bookingId: "b1",
              customerId: "c1",
              startsAt: "2026-04-01T10:00:00Z",
              endsAt: "2026-04-01T11:00:00Z",
              status: "confirmed",
              joinUrl: "https://zoom.us/j/123",
              consultantJoinedAt: null,
              consultantMemo: "テストメモ",
              consultationContent: null,
              customer: {
                customerId: "c1",
                name: "山田 太郎",
                email: "taro@example.com",
                phone: "090-0000-0000",
                note: "初回相談",
              },
            },
          ],
        },
      },
      isLoading: false,
      error: null,
    });

    render(<ConsultantBookingsPage />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText("confirmed")).toBeDefined();
      expect(screen.getByText("テストメモ")).toBeDefined();
      expect(screen.getByText("山田 太郎")).toBeDefined();
      expect(screen.getByText("顧客")).toBeDefined();
      expect(screen.getAllByText("入室確認").length).toBeGreaterThanOrEqual(1);
    });
  });

  it("shows customer hover card details", async () => {
    mockUseJoinConsultantBooking.mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
      variables: null,
    });
    mockUseConsultantBookings.mockReturnValue({
      data: {
        data: {
          bookings: [
            {
              bookingId: "b1",
              customerId: "customer-001-abcdef",
              startsAt: "2026-04-01T10:00:00Z",
              endsAt: "2026-04-01T11:00:00Z",
              status: "confirmed",
              joinUrl: "https://zoom.us/j/123",
              consultantJoinedAt: null,
              consultantMemo: "テストメモ",
              consultationContent: null,
              customer: {
                customerId: "customer-001-abcdef",
                name: "山田 太郎",
                email: "taro@example.com",
                phone: "090-0000-0000",
                note: "初回相談",
              },
            },
          ],
        },
      },
      isLoading: false,
      error: null,
    });

    render(<ConsultantBookingsPage />, { wrapper: createWrapper() });

    fireEvent.mouseEnter(screen.getByText("山田 太郎"));

    await waitFor(() => {
      expect(screen.getByText("メール: taro@example.com")).toBeDefined();
      expect(screen.getByText("電話: 090-0000-0000")).toBeDefined();
    });
  });

  it("falls back to truncated id and missing message when customer is null", async () => {
    mockUseJoinConsultantBooking.mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
      variables: null,
    });
    mockUseConsultantBookings.mockReturnValue({
      data: {
        data: {
          bookings: [
            {
              bookingId: "b2",
              customerId: "customer-404-abcdef",
              startsAt: "2026-04-01T10:00:00Z",
              endsAt: "2026-04-01T11:00:00Z",
              status: "pending",
              joinUrl: null,
              consultantJoinedAt: null,
              consultantMemo: "",
              consultationContent: null,
              customer: null,
            },
          ],
        },
      },
      isLoading: false,
      error: null,
    });

    render(<ConsultantBookingsPage />, { wrapper: createWrapper() });

    const truncatedId = screen.getByText("customer…");
    fireEvent.mouseEnter(truncatedId);

    await waitFor(() => {
      expect(screen.getByText("情報が見つかりません")).toBeDefined();
    });
  });

  it("shows empty message when no bookings", async () => {
    mockUseJoinConsultantBooking.mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
      variables: null,
    });
    mockUseConsultantBookings.mockReturnValue({
      data: { data: { bookings: [] } },
      isLoading: false,
      error: null,
    });

    render(<ConsultantBookingsPage />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText("予約はありません")).toBeDefined();
    });
  });

  it("shows joined timestamp when consultant already checked in", async () => {
    mockUseJoinConsultantBooking.mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
      variables: null,
    });
    mockUseConsultantBookings.mockReturnValue({
      data: {
        data: {
          bookings: [
            {
              bookingId: "b1",
              customerId: "c1",
              startsAt: "2026-04-01T10:00:00Z",
              endsAt: "2026-04-01T11:00:00Z",
              status: "confirmed",
              joinUrl: "https://zoom.us/j/123",
              consultantJoinedAt: "2026-04-01T09:55:00Z",
              consultantMemo: "",
              consultationContent: null,
              customer: null,
            },
          ],
        },
      },
      isLoading: false,
      error: null,
    });

    render(<ConsultantBookingsPage />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText(/入室確認済み:/)).toBeDefined();
    });
  });
});
