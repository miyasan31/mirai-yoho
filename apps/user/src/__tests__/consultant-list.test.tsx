// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import { format, parseISO } from "date-fns";

vi.mock("@tanstack/react-router", () => ({
  useParams: () => ({ organizationId: "org-test" }),
  useLocation: () => ({ pathname: "/org-test/consultants" }),
  useRouter: () => ({ history: { push: vi.fn(), back: vi.fn() } }),
  Link: ({
    to,
    children,
  }: { to?: string; children: React.ReactNode } & Record<string, unknown>) => (
    <a href={to ?? "#"}>{children}</a>
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

vi.mock("@mirai-yoho/ui/components/ui/badge", () => ({
  Badge: (props: React.ComponentProps<"span">) => <span {...props} />,
}));

vi.mock("@mirai-yoho/ui/components/ui/button", () => ({
  Button: ({
    asChild,
    children,
    ...props
  }: { asChild?: boolean; children: React.ReactNode } & Record<
    string,
    unknown
  >) => <div {...props}>{children}</div>,
}));

vi.mock("@mirai-yoho/ui/components/ui/skeleton", () => ({
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

const mockUseGetConsultants = vi.fn();
vi.mock("@/hooks/use-consultants", () => ({
  useGetConsultants: (...args: unknown[]) => mockUseGetConsultants(...args),
}));

const mockUsePublicBookingSettings = vi.fn();
vi.mock("@/hooks/use-booking-settings", () => ({
  usePublicBookingSettings: () => mockUsePublicBookingSettings(),
}));

const mockUseGetSlots = vi.fn();
vi.mock("@/hooks/use-slots", () => ({
  useGetSlots: (...args: unknown[]) => mockUseGetSlots(...args),
}));

import { ConsultantsPage } from "@/components/consultants-page";

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

  it("does not enable data queries before settings are resolved", () => {
    mockUsePublicBookingSettings.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: null,
    });
    mockUseGetSlots.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: null,
    });
    mockUseGetConsultants.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: null,
    });

    render(<ConsultantsPage />);

    expect(mockUseGetConsultants).toHaveBeenCalledWith(false);
    expect(mockUseGetSlots).toHaveBeenCalledWith(
      {},
      { query: { enabled: false } },
    );
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

  it("renders consultant avatar image when imageUrl exists", () => {
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
              bio: "",
              specialties: [],
              imageUrl: "https://storage.googleapis.com/example/avatar.jpg",
              isActive: true,
            },
          ],
        },
      },
      isLoading: false,
      error: null,
    });

    render(<ConsultantsPage />);
    expect(
      screen.getByRole("img", { name: "田中太郎 のアバター画像" }),
    ).toBeDefined();
  });

  it("renders aggregated slots when consultant selection is disabled", () => {
    const startsAt = "2026-05-01T10:00:00.000Z";
    const endsAt = "2026-05-01T10:30:00.000Z";

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
              startsAt,
              endsAt,
            },
          ],
        },
      },
      isLoading: false,
      error: null,
    });

    render(<ConsultantsPage />);

    const expectedTimeRange = `${format(parseISO(startsAt), "HH:mm")} 〜 ${format(parseISO(endsAt), "HH:mm")}`;

    expect(screen.getByText("予約可能な日時")).toBeDefined();
    expect(
      screen.getByRole("link", { name: expectedTimeRange }),
    ).toHaveAttribute(
      "href",
      `/org-test/booking?startsAt=${encodeURIComponent(startsAt)}&endsAt=${encodeURIComponent(endsAt)}`,
    );
  });
});
