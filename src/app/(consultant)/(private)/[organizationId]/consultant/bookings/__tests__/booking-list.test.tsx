// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";

vi.mock("next/navigation", () => ({
  useParams: () => ({ organizationId: "org-test" }),
  usePathname: () => "/org-test/consultant/bookings",
  useRouter: () => ({ push: vi.fn() }),
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

vi.mock("styled-system/recipes", () => ({
  tooltip: () => ({}),
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

vi.mock("@/components/ui/tooltip", () => ({
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

vi.mock("@/components/ui/icon-button", () => ({
  IconButton: ({
    asChild,
    children,
    ...props
  }: { asChild?: boolean; children: React.ReactNode } & Record<
    string,
    unknown
  >) => <button {...props}>{children}</button>,
}));

vi.mock("@/components/ui/table", () => ({
  Root: (props: React.ComponentProps<"table">) => <table {...props} />,
  Head: (props: React.ComponentProps<"thead">) => <thead {...props} />,
  Body: (props: React.ComponentProps<"tbody">) => <tbody {...props} />,
  Row: (props: React.ComponentProps<"tr">) => <tr {...props} />,
  Header: (props: React.ComponentProps<"th">) => <th {...props} />,
  Cell: (props: React.ComponentProps<"td">) => <td {...props} />,
}));

vi.mock("@/components/status-badge", () => ({
  BookingStatusBadge: ({ status }: { status: string }) => <span>{status}</span>,
}));

vi.mock("@/components/table-skeleton", () => ({
  TableSkeleton: () => <div data-testid="table-skeleton" />,
}));

vi.mock("lucide-react", () => ({
  CalendarX: () => <span>CalendarX</span>,
  ExternalLink: () => <span>ExternalLink</span>,
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
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("shows loading state initially", () => {
    mockUseConsultantBookings.mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
    });
    render(<ConsultantBookingsPage />, { wrapper: createWrapper() });
    expect(screen.getByTestId("table-skeleton")).toBeInTheDocument();
  });

  it("renders booking list from API response", async () => {
    mockUseConsultantBookings.mockReturnValue({
      data: {
        data: {
          bookings: [
            {
              bookingId: "b1",
              clientId: "c1",
              startDatetime: "2026-04-01T10:00:00Z",
              status: "confirmed",
              zoomUrl: "https://zoom.us/j/123",
              consultantMemo: "テストメモ",
              consultationContent: null,
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
    });
  });

  it("shows empty message when no bookings", async () => {
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
});
