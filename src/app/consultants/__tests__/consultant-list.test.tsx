// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("styled-system/css", () => ({
  css: () => "",
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
vi.mock("@/generated/api/consultant/consultant", () => ({
  useGetConsultants: () => mockUseGetConsultants(),
}));

import ConsultantsPage from "../page";

describe("ConsultantsPage", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("shows skeleton loading while fetching", () => {
    mockUseGetConsultants.mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
    });

    render(<ConsultantsPage />);
    expect(screen.getAllByTestId("skeleton").length).toBeGreaterThan(0);
  });

  it("shows error message on failure", () => {
    mockUseGetConsultants.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error("fetch error"),
    });

    render(<ConsultantsPage />);
    expect(screen.getByText("相談員情報の取得に失敗しました")).toBeDefined();
  });

  it("shows empty message when no consultants", () => {
    mockUseGetConsultants.mockReturnValue({
      data: { data: { consultants: [] } },
      isLoading: false,
      error: null,
    });

    render(<ConsultantsPage />);
    expect(screen.getByText("現在利用可能な相談員はいません")).toBeDefined();
  });

  it("renders consultant cards with name and specialties", () => {
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
});
