// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";

vi.mock("@tanstack/react-router", () => ({
  Link: ({
    to,
    params,
    children,
  }: {
    to: string;
    params?: Record<string, string>;
    children: React.ReactNode;
  }) => {
    const href = params
      ? Object.entries(params).reduce(
          (acc, [key, value]) => acc.replace(`$${key}`, value),
          to,
        )
      : to;
    return <a href={href}>{children}</a>;
  },
}));

vi.mock("@/components/back-navigation-button", () => ({
  BackNavigationButton: ({ children }: { children?: React.ReactNode }) => (
    <button type="button">{children ?? "前の画面に戻る"}</button>
  ),
}));

vi.mock("@mirai-yoho/ui/components/ui/button", () => ({
  Button: ({
    asChild,
    children,
  }: {
    asChild?: boolean;
    children: React.ReactNode;
  }) => {
    if (asChild && children) {
      return children;
    }
    return <button type="button">{children}</button>;
  },
}));

vi.mock("@mirai-yoho/ui/components/error-status-page", () => ({
  ErrorStatusPage: ({
    statusCode,
    title,
    description,
    actions,
  }: {
    statusCode: string;
    title: string;
    description: string;
    actions: React.ReactNode;
  }) => (
    <main>
      <span>{statusCode}</span>
      <h1>{title}</h1>
      <p>{description}</p>
      <div>{actions}</div>
    </main>
  ),
}));

const useAuthMock = vi.fn();

vi.mock("@/hooks/use-auth", () => ({
  useAuth: () => useAuthMock(),
}));

import NotFound from "../not-found";

describe("error pages", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("shows the 404 page with a link to the organization home when authenticated", () => {
    useAuthMock.mockReturnValue({ currentOrganizationId: "org-1" });

    render(<NotFound />);

    expect(screen.getByText("404")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "ページが見つかりません" }),
    ).toBeVisible();
    expect(screen.getByRole("link", { name: "ホームへ戻る" })).toHaveAttribute(
      "href",
      "/org-1/home",
    );
  });

  it("shows the 404 page with a link to login when there is no organization", () => {
    useAuthMock.mockReturnValue({ currentOrganizationId: null });

    render(<NotFound />);

    expect(screen.getByText("404")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "ログイン画面へ" }),
    ).toHaveAttribute("href", "/login");
  });
});
