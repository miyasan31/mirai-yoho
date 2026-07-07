// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";

const mockUseAdminBookings = vi.fn();
const mockUseAdminCustomers = vi.fn();
const mockUseAdminConsultants = vi.fn();
const mockMutateAsync = vi.fn();
const mockUseChargePayment = vi.fn();

vi.mock("@/hooks/use-list-query-params", () => ({
  useListQueryParams: () => ({
    page: 1,
    pageSize: 20,
    sortBy: "createdAt",
    setPage: vi.fn(),
    setPageSize: vi.fn(),
    setSortBy: vi.fn(),
  }),
}));

vi.mock("@/hooks/use-admin-bookings", () => ({
  useAdminBookings: () => mockUseAdminBookings(),
}));

vi.mock("@/hooks/use-booking", () => ({
  useChargePayment: () => mockUseChargePayment(),
}));

vi.mock("@/hooks/use-admin-customers", () => ({
  useAdminCustomers: (
    params?: Record<string, unknown>,
    options?: { enabled?: boolean },
  ) => mockUseAdminCustomers(params, options),
}));

vi.mock("@/hooks/use-admin-consultants", () => ({
  useAdminConsultants: (
    params?: Record<string, unknown>,
    options?: { enabled?: boolean },
  ) => mockUseAdminConsultants(params, options),
}));

vi.mock("@mirai-yoho/ui/components/list-controls", () => ({
  ListControls: () => <div>list-controls</div>,
}));

vi.mock("@/hooks/use-organization-routing", () => ({
  useOrganizationRouting: () => ({ organizationId: "org-test" }),
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

vi.mock("@mirai-yoho/ui/components/ui/button", () => ({
  Button: ({
    children,
    loading,
    loadingText,
    ...props
  }: {
    children: ReactNode;
    loading?: boolean;
    loadingText?: string;
  } & React.ComponentProps<"button">) => (
    <button type="button" {...props}>
      {loading ? loadingText : children}
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

vi.mock("@mirai-yoho/ui/components/ui/tooltip", () => ({
  Tooltip: ({
    children,
    content,
    disabled,
  }: {
    children: ReactNode;
    content: ReactNode;
    disabled?: boolean;
  }) => (
    <div>
      {children}
      {!disabled && <span>{content}</span>}
    </div>
  ),
}));

vi.mock("@mirai-yoho/ui/components/empty-state", () => ({
  EmptyState: ({ message }: { message: string }) => <div>{message}</div>,
}));

vi.mock("@mirai-yoho/ui/components/status-badge", () => ({
  BookingStatusBadge: ({ status }: { status: string }) => <span>{status}</span>,
}));

vi.mock("@mirai-yoho/ui/components/truncated-id", () => ({
  TruncatedId: ({ id }: { id: string }) => <span>{id}</span>,
}));

vi.mock("@mirai-yoho/ui/components/table-skeleton", () => ({
  TableSkeleton: () => <div>loading</div>,
}));

vi.mock("lucide-react", () => ({
  CalendarDays: () => <span>CalendarDays</span>,
  InfoIcon: () => <span>InfoIcon</span>,
  CircleAlertIcon: () => <span>CircleAlertIcon</span>,
  CheckCircleIcon: () => <span>CheckCircleIcon</span>,
  CircleXIcon: () => <span>CircleXIcon</span>,
}));

import AdminBookingsPage from "../page";

describe("AdminBookingsPage", () => {
  afterEach(() => {
    cleanup();
    vi.resetAllMocks();
  });

  it("disables charge button and shows reason when booking is not chargeable", () => {
    mockUseAdminBookings.mockReturnValue({
      data: {
        data: {
          bookings: [
            {
              bookingId: "b1",
              customerId: "c1",
              consultantId: "co1",
              slotId: "s1",
              startsAt: "2026-04-21T01:30:00.000Z",
              status: "confirmed",
              joinUrl: null,
              consultantJoinedAt: null,
              consultantMemo: "",
              consultationContent: null,
              chargeable: false,
              chargeDisabledReason: "予約開始前のため課金できません",
            },
          ],
        },
      },
      isLoading: false,
    });
    mockUseChargePayment.mockReturnValue({
      mutateAsync: mockMutateAsync,
      isPending: false,
      variables: null,
    });
    mockUseAdminCustomers.mockReturnValue({
      data: { data: { customers: [] } },
      isLoading: false,
      error: null,
    });
    mockUseAdminConsultants.mockReturnValue({
      data: { data: { consultants: [] } },
      isLoading: false,
      error: null,
    });

    render(<AdminBookingsPage />);

    expect(
      (screen.getByRole("button", { name: "課金" }) as HTMLButtonElement)
        .disabled,
    ).toBe(true);
    expect(screen.getByText("未確認")).toBeInTheDocument();
    expect(screen.getByText("予約開始前のため課金できません")).toBeDefined();
  });

  it("calls charge API when booking is chargeable", () => {
    mockUseAdminBookings.mockReturnValue({
      data: {
        data: {
          bookings: [
            {
              bookingId: "b2",
              customerId: "c2",
              consultantId: "co2",
              slotId: "s2",
              startsAt: "2026-04-19T01:30:00.000Z",
              status: "confirmed",
              joinUrl: null,
              consultantJoinedAt: "2026-04-19T01:20:00.000Z",
              consultantMemo: "",
              consultationContent: null,
              chargeable: true,
              chargeDisabledReason: null,
            },
          ],
        },
      },
      isLoading: false,
    });
    mockUseChargePayment.mockReturnValue({
      mutateAsync: mockMutateAsync.mockResolvedValue({}),
      isPending: false,
      variables: null,
    });
    mockUseAdminCustomers.mockReturnValue({
      data: { data: { customers: [] } },
      isLoading: false,
      error: null,
    });
    mockUseAdminConsultants.mockReturnValue({
      data: { data: { consultants: [] } },
      isLoading: false,
      error: null,
    });

    render(<AdminBookingsPage />);

    expect(screen.getByText("2026/04/19 10:30")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "課金" }));

    expect(mockMutateAsync).toHaveBeenCalledWith({
      organizationId: "org-test",
      bookingId: "b2",
      data: { method: "manual" },
    });
  });
});
