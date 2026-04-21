// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";

vi.mock("next/navigation", () => ({
  useParams: () => ({ organizationId: "org-test" }),
  usePathname: () => "/org-test/consultant/home",
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

const mockUseConsultantBookings = vi.fn();

vi.mock("@/hooks/use-consultant-bookings", () => ({
  useConsultantBookings: () => mockUseConsultantBookings(),
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
  Button: ({
    children,
    ...props
  }: { children: ReactNode } & Record<string, unknown>) => (
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
}));

vi.mock("@/components/empty-state", () => ({
  EmptyState: ({ message }: { message: string }) => <div>{message}</div>,
}));

import ConsultantHomePage from "../page";

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

describe("ConsultantHomePage", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("次予約カードと今日の予約一覧を表示する", async () => {
    mockUseConsultantBookings.mockReturnValue({
      data: {
        data: {
          bookings: [
            {
              bookingId: "b-later",
              clientId: "c-1",
              consultantId: "cons-1",
              slotId: "s-1",
              startDatetime: "2026-04-22T14:00:00+09:00",
              status: "confirmed",
              zoomUrl: "https://zoom.us/j/123",
              consultantMemo: "",
              consultationContent: null,
              chargeable: false,
              chargeDisabledReason: null,
              client: {
                clientId: "c-1",
                name: "山田 太郎",
                email: "taro@example.com",
                phone: "090-0000-0000",
                memo: null,
              },
            },
            {
              bookingId: "b-earlier",
              clientId: "c-2",
              consultantId: "cons-1",
              slotId: "s-2",
              startDatetime: "2026-04-22T10:00:00+09:00",
              status: "pending",
              zoomUrl: null,
              consultantMemo: "",
              consultationContent: null,
              chargeable: false,
              chargeDisabledReason: null,
              client: {
                clientId: "c-2",
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

    await waitFor(() => {
      expect(screen.getAllByText(/クライアント: 佐藤 花子/).length).toBe(2);
      expect(screen.getByText("今日の担当件数: 2件")).toBeInTheDocument();
      expect(screen.getAllByText("メモ編集").length).toBeGreaterThanOrEqual(2);
      expect(screen.getByText("予約一覧を開く")).toBeInTheDocument();
      expect(screen.getByText("プロフィールを更新する")).toBeInTheDocument();
    });

    expect(screen.queryByText("本日のToDo")).not.toBeInTheDocument();
  });

  it("予約がない場合は空状態を表示する", async () => {
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
});
