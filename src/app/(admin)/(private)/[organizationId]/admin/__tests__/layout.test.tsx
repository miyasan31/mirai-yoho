// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn() }),
}));

vi.mock("styled-system/css", () => ({
  css: () => "",
  cva: () => () => "",
}));

vi.mock("@/components/sidebar-layout", () => ({
  SidebarLayout: ({
    navItems,
    children,
  }: {
    navItems: Array<{ label: string }>;
    children: ReactNode;
  }) => (
    <div>
      <ul>
        {navItems.map((item) => (
          <li key={item.label}>{item.label}</li>
        ))}
      </ul>
      {children}
    </div>
  ),
  SidebarLayoutSkeleton: () => <div>loading...</div>,
}));

const mockUseAuth = vi.fn();
vi.mock("@/hooks/use-auth", () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock("@/hooks/use-organization-routing", () => ({
  useOrganizationRouting: () => ({
    organizationId: "org-test",
    buildPath: (path: string) => `/org-test${path}`,
    replaceOrganization: vi.fn(),
  }),
}));

import AdminLayout from "../layout";

describe("AdminLayout", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("shows user management nav item for operator", () => {
    mockUseAuth.mockReturnValue({
      user: { email: "operator@example.com" },
      role: "operator",
      memberships: [
        {
          organizationName: "Org Test",
          organizationId: "org-test",
        },
      ],
      currentOrganizationId: "org-test",
      currentDisplayName: "Operator",
      isLoading: false,
      signOut: vi.fn(),
      setCurrentOrganizationId: vi.fn(),
    });

    render(
      <AdminLayout>
        <div>content</div>
      </AdminLayout>,
    );

    expect(screen.getByText("ユーザー管理")).toBeInTheDocument();
    expect(screen.getByText("ホーム")).toBeInTheDocument();
    expect(screen.getByText("ダッシュボード（集計）")).toBeInTheDocument();
  });
});
