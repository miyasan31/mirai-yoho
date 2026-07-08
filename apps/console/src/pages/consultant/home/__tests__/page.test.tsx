// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";

vi.mock("@tanstack/react-router", () => ({
  useParams: () => ({ organizationId: "org-test" }),
  useLocation: ({
    select,
  }: {
    select: (location: { pathname: string }) => string;
  }) => select({ pathname: "/org-test/consultant/home" }),
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
  icon: () => ({}),
  spinner: () => ({}),
  toast: () => ({}),
}));

vi.mock("@mirai-yoho/ui/components/ui/toast", () => ({
  toaster: { create: vi.fn() },
}));

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

vi.mock("@mirai-yoho/ui/components/status-badge", () => ({
  BookingStatusBadge: ({ status }: { status: string }) => <span>{status}</span>,
}));

vi.mock("@mirai-yoho/ui/components/empty-state", () => ({
  EmptyState: ({ message }: { message: string }) => <div>{message}</div>,
}));

import ConsultantHomePage from "../page";

function createWrapper() {
  const queryCustomer = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryCustomer}>{children}</QueryClientProvider>
  );
}

describe("ConsultantHomePage", () => {
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("次予約カードと今日の予約一覧を表示する", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-22T09:50:00+09:00"));
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
              bookingId: "b-later",
              customerId: "c-1",
              consultantId: "cons-1",
              slotId: "s-1",
              startsAt: "2026-04-22T14:00:00+09:00",
              status: "confirmed",
              joinUrl: "https://zoom.us/j/123",
              consultantJoinedAt: null,
              consultantMemo: "",
              consultationContent: null,
              chargeable: false,
              chargeDisabledReason: null,
              customer: {
                customerId: "c-1",
                name: "山田 太郎",
                email: "taro@example.com",
                phone: "090-0000-0000",
                memo: null,
              },
            },
            {
              bookingId: "b-earlier",
              customerId: "c-2",
              consultantId: "cons-1",
              slotId: "s-2",
              startsAt: "2026-04-22T10:00:00+09:00",
              status: "pending",
              joinUrl: null,
              consultantJoinedAt: null,
              consultantMemo: "",
              consultationContent: null,
              chargeable: false,
              chargeDisabledReason: null,
              customer: {
                customerId: "c-2",
                name: "佐藤 花子",
                email: "hanako@example.com",
                phone: "080-0000-0000",
                memo: null,
              },
            },
          ],
        },
      },
      isLoading: false,
      error: null,
    });

    render(<ConsultantHomePage />, { wrapper: createWrapper() });

    await vi.runAllTimersAsync();

    expect(screen.getAllByText(/顧客: 佐藤 花子/).length).toBe(2);
    expect(screen.getByText("今日の担当件数: 2件")).toBeInTheDocument();
    expect(screen.getAllByText("鑑定メモ編集").length).toBeGreaterThanOrEqual(
      2,
    );
    expect(screen.getAllByText("入室確認").length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText("予約一覧を開く")).toBeInTheDocument();
    expect(screen.getByText("プロフィールを更新する")).toBeInTheDocument();

    expect(screen.queryByText("本日のToDo")).not.toBeInTheDocument();
  });

  it("予約がない場合は空状態を表示する", async () => {
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

    render(<ConsultantHomePage />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(
        screen.getByText("未対応の次予約はありません"),
      ).toBeInTheDocument();
      expect(screen.getByText("今日の予約はありません")).toBeInTheDocument();
      expect(screen.getByText("今日の担当件数: 0件")).toBeInTheDocument();
    });
  });

  it("入室確認済みの予約は日時を表示する", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-22T09:50:00+09:00"));
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
              bookingId: "b-joined",
              customerId: "c-1",
              consultantId: "cons-1",
              slotId: "s-1",
              startsAt: "2026-04-22T10:00:00+09:00",
              status: "confirmed",
              joinUrl: "https://zoom.us/j/123",
              consultantJoinedAt: "2026-04-22T09:48:00+09:00",
              consultantMemo: "",
              consultationContent: null,
              chargeable: false,
              chargeDisabledReason: null,
              customer: {
                customerId: "c-1",
                name: "山田 太郎",
                email: "taro@example.com",
                phone: "090-0000-0000",
                memo: null,
              },
            },
          ],
        },
      },
      isLoading: false,
      error: null,
    });

    render(<ConsultantHomePage />, { wrapper: createWrapper() });

    await vi.runAllTimersAsync();

    expect(screen.getAllByText(/入室確認済み:/).length).toBeGreaterThanOrEqual(
      2,
    );
  });
});
