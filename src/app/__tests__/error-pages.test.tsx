// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
vi.mock("next/link", () => ({
  default: ({
    href,
    children,
  }: {
    href: string;
    children: React.ReactNode;
  }) => <a href={href}>{children}</a>,
}));

vi.mock("@/components/back-navigation-button", () => ({
  BackNavigationButton: ({ children }: { children?: React.ReactNode }) => (
    <button type="button">{children ?? "前の画面に戻る"}</button>
  ),
}));

vi.mock("@/components/ui/button", () => ({
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

vi.mock("@/components/error-status-page", () => ({
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

import NotFound from "../not-found";

describe("error pages", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("renders not-found page with key links", () => {
    render(<NotFound />);

    expect(screen.getByText("404")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "ページが見つかりません" }),
    ).toBeVisible();
    expect(screen.getByRole("link", { name: "トップへ戻る" })).toHaveAttribute(
      "href",
      "/",
    );
  });
});
