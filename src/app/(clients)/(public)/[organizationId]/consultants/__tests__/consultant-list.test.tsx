// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import { format, parseISO } from "date-fns";

vi.mock("next/navigation", () => ({
  useParams: () => ({ organizationId: "org-test" }),
  usePathname: () => "/org-test/consultants",
  useRouter: () => ({ push: vi.fn() }),
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

vi.mock("@/components/ui/badge", () => ({
  Badge: (props: React.ComponentProps<"span">) => <span {...props} />,
}));

vi.mock("@/components/ui/button", () => ({
  Button: ({
    asChild,
    children,
    ...props
  }: { asChild?: boolean; children: React.ReactNode } & Record<
    string,
    unknown
  >) => <div {...props}>{children}</div>,
}));

vi.mock("@/components/ui/skeleton", () => ({
  Skeleton: (props: React.ComponentProps<"div">) => (
    <div data-testid="skeleton" {...props} />
  ),
  SkeletonText: (props: React.ComponentProps<"div">) => (
    <div data-testid="skeleton-text" {...props} />
  ),
}));

vi.mock("lucide-react", () => ({
  CircleX: () => <span>CircleX</span>,
  Users: () => <span>Users</span>,
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

const mockUseGetConsultants = vi.fn();
vi.mock("@/hooks/use-consultants", () => ({
  useGetConsultants: () => mockUseGetConsultants(),
}));

const mockUsePublicBookingSettings = vi.fn();
vi.mock("@/hooks/use-booking-settings", () => ({
  usePublicBookingSettings: () => mockUsePublicBookingSettings(),
}));

const mockUseGetSlots = vi.fn();
vi.mock("@/hooks/use-slots", () => ({
  useGetSlots: (...args: unknown[]) => mockUseGetSlots(...args),
}));

import ConsultantsPage from "../page";

describe("ConsultantsPage", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("shows skeleton loading while fetching", () => {
    mockUsePublicBookingSettings.mockReturnValue({
      data: undefined,
      isLoading: true,
    });
    mockUseGetSlots.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: null,
    });
    mockUseGetConsultants.mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
    });

    render(<ConsultantsPage />);
    expect(screen.getAllByTestId("skeleton").length).toBeGreaterThan(0);
  });

  it("shows error message on failure", () => {
    mockUsePublicBookingSettings.mockReturnValue({
      data: { data: { consultantSelectionEnabled: true } },
      isLoading: false,
    });
    mockUseGetSlots.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: null,
    });
    mockUseGetConsultants.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error("fetch error"),
    });

    render(<ConsultantsPage />);
    expect(screen.getByText("相談員情報の取得に失敗しました")).toBeDefined();
  });

  it("shows empty message when no consultants", () => {
    mockUsePublicBookingSettings.mockReturnValue({
      data: { data: { consultantSelectionEnabled: true } },
      isLoading: false,
    });
    mockUseGetSlots.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: null,
    });
    mockUseGetConsultants.mockReturnValue({
      data: { data: { consultants: [] } },
      isLoading: false,
      error: null,
    });

    render(<ConsultantsPage />);
    expect(screen.getByText("現在利用可能な相談員はいません")).toBeDefined();
  });

  it("renders consultant cards with name and specialties", () => {
    mockUsePublicBookingSettings.mockReturnValue({
      data: { data: { consultantSelectionEnabled: true } },
      isLoading: false,
    });
    mockUseGetSlots.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: null,
    });
    mockUseGetConsultants.mockReturnValue({
      data: {
        data: {
          consultants: [
            {
              consultantId: "c1",
              name: "田中太郎",
              bio: "テスト自己紹介",
              specialties: ["キャリア相談", "転職支援"],
              isActive: true,
            },
          ],
        },
      },
      isLoading: false,
      error: null,
    });

    render(<ConsultantsPage />);
    expect(screen.getByText("田中太郎")).toBeDefined();
    expect(screen.getByText("キャリア相談")).toBeDefined();
    expect(screen.getByText("転職支援")).toBeDefined();
    expect(screen.getByText("テスト自己紹介")).toBeDefined();
  });

  it("renders aggregated slots when consultant selection is disabled", () => {
    const startDatetime = "2026-05-01T10:00:00.000Z";
    const endDatetime = "2026-05-01T10:30:00.000Z";

    mockUsePublicBookingSettings.mockReturnValue({
      data: { data: { consultantSelectionEnabled: false } },
      isLoading: false,
    });
    mockUseGetConsultants.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: null,
    });
    mockUseGetSlots.mockReturnValue({
      data: {
        data: {
          aggregatedSlots: [
            {
              startDatetime,
              endDatetime,
            },
          ],
        },
      },
      isLoading: false,
      error: null,
    });

    render(<ConsultantsPage />);

    const expectedTimeRange = `${format(parseISO(startDatetime), "HH:mm")} 〜 ${format(parseISO(endDatetime), "HH:mm")}`;

    expect(screen.getByText("予約可能な日時")).toBeDefined();
    expect(
      screen.getByRole("link", { name: expectedTimeRange }),
    ).toHaveAttribute(
      "href",
      `/org-test/booking?startDatetime=${encodeURIComponent(startDatetime)}&endDatetime=${encodeURIComponent(endDatetime)}`,
    );
  });
});
