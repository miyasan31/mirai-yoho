// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";

const mockUseAdminBookings = vi.fn();
const mockUseAdminPayments = vi.fn();
const mockUseAdminClients = vi.fn();
const mockUseAuth = vi.fn();

vi.mock("@/hooks/use-admin-bookings", () => ({
  useAdminBookings: () => mockUseAdminBookings(),
}));

vi.mock("@/hooks/use-admin-payments", () => ({
  useAdminPayments: () => mockUseAdminPayments(),
}));

vi.mock("@/hooks/use-admin-clients", () => ({
  useAdminClients: (
    params?: Record<string, unknown>,
    options?: { enabled?: boolean },
  ) => mockUseAdminClients(params, options),
}));

vi.mock("@/hooks/use-auth", () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock("@/hooks/use-organization-routing", () => ({
  useOrganizationRouting: () => ({
    buildPath: (path: string) => `/org-test${path}`,
  }),
}));

vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children: ReactNode }) => (
    <a href={href}>{children}</a>
  ),
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
      withRootProvider: (c: unknown) => c,
      withContext: (c: unknown) => c,
    }),
  };
});

vi.mock("@/components/ui/button", () => ({
  Button: ({ children, ...props }: React.ComponentProps<"button">) => (
    <button type="button" {...props}>
      {children}
    </button>
  ),
}));

vi.mock("@/components/ui/skeleton", () => ({
  Skeleton: (props: React.ComponentProps<"div">) => (
    <div data-testid="skeleton" {...props} />
  ),
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

vi.mock("@/components/status-badge", () => ({
  BookingStatusBadge: ({ status }: { status: string }) => <span>{status}</span>,
  PaymentStatusBadge: ({ status }: { status: string }) => <span>{status}</span>,
}));

vi.mock("@/components/empty-state", () => ({
  EmptyState: ({ message }: { message: string }) => <div>{message}</div>,
}));

import AdminHomePage from "../page";

describe("AdminHomePage", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("ToDo件数と一覧を表示する", () => {
    const now = new Date();
    const plus1h = new Date(now.getTime() + 60 * 60 * 1000).toISOString();
    const plus2h = new Date(now.getTime() + 2 * 60 * 60 * 1000).toISOString();

    mockUseAuth.mockReturnValue({ role: "admin" });
    mockUseAdminBookings.mockReturnValue({
      data: {
        data: {
          bookings: [
            {
              bookingId: "booking-1",
              clientId: "client-1",
              consultantId: "consultant-1",
              slotId: "slot-1",
              startDatetime: plus1h,
              status: "confirmed",
              zoomUrl: null,
              consultantMemo: "",
              consultationContent: null,
              chargeable: true,
              chargeDisabledReason: null,
            },
            {
              bookingId: "booking-2",
              clientId: "client-2",
              consultantId: "consultant-1",
              slotId: "slot-2",
              startDatetime: plus2h,
              status: "completed",
              zoomUrl: null,
              consultantMemo: " ",
              consultationContent: null,
              chargeable: false,
              chargeDisabledReason: null,
            },
          ],
        },
      },
      isLoading: false,
      error: null,
    });
    mockUseAdminPayments.mockReturnValue({
      data: {
        data: {
          payments: [
            {
              paymentId: "payment-1",
              bookingId: "booking-1",
              clientId: "client-1",
              paymentStrategy: "deferred",
              stripePaymentIntentId: null,
              stripeSetupIntentId: null,
              stripePaymentMethodId: null,
              amountJPY: 5000,
              taxAmountJPY: 500,
              totalJPY: 5500,
              status: "setup_complete",
              chargeMethod: null,
            },
          ],
        },
      },
      isLoading: false,
      error: null,
    });
    mockUseAdminClients.mockReturnValue({
      data: {
        data: {
          clients: [
            {
              clientId: "client-1",
              name: "山田 太郎",
              email: "taro@example.com",
              phone: "090-0000-0000",
              memo: null,
            },
            {
              clientId: "client-2",
              name: "佐藤 花子",
              email: "hanako@example.com",
              phone: "080-0000-0000",
              memo: null,
            },
          ],
        },
      },
      isLoading: false,
      error: null,
    });

    render(<AdminHomePage />);

    expect(screen.getByText("未対応予約")).toBeInTheDocument();
    expect(screen.getByText("本決済待ち")).toBeInTheDocument();
    expect(screen.getByText("メモ未入力")).toBeInTheDocument();
    expect(screen.getAllByText("1").length).toBeGreaterThanOrEqual(3);
    expect(screen.getByText("直近開始予約")).toBeInTheDocument();
    expect(screen.getByText("要対応決済")).toBeInTheDocument();
    expect(screen.getAllByText(/クライアント: 山田 太郎/).length).toBe(2);
    expect(
      screen.getByRole("link", { name: "設定を編集する" }),
    ).toHaveAttribute("href", "/org-test/admin/settings");

    expect(mockUseAdminClients).toHaveBeenCalledWith(
      { page: 1, pageSize: 100, sortBy: "createdAt", sortOrder: "desc" },
      { enabled: true },
    );
  });

  it("operator は設定編集アクションを実行できない", () => {
    mockUseAuth.mockReturnValue({ role: "operator" });
    mockUseAdminBookings.mockReturnValue({
      data: { data: { bookings: [] } },
      isLoading: false,
      error: null,
    });
    mockUseAdminPayments.mockReturnValue({
      data: { data: { payments: [] } },
      isLoading: false,
      error: null,
    });
    mockUseAdminClients.mockReturnValue({
      data: { data: { clients: [] } },
      isLoading: false,
      error: null,
    });

    render(<AdminHomePage />);

    const button = screen.getByRole("button", { name: "設定を編集する" });
    expect(button).toBeDisabled();
    expect(
      screen.getByText("オペレーターは設定の閲覧のみ可能です。"),
    ).toBeInTheDocument();
  });

  it("読み込み中はスケルトンを表示する", () => {
    mockUseAuth.mockReturnValue({ role: "admin" });
    mockUseAdminBookings.mockReturnValue({ isLoading: true });
    mockUseAdminPayments.mockReturnValue({ isLoading: false });
    mockUseAdminClients.mockReturnValue({ isLoading: false });

    render(<AdminHomePage />);

    expect(screen.getAllByTestId("skeleton").length).toBeGreaterThan(0);
  });
});
