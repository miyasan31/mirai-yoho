// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";

vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => vi.fn(),
}));

vi.mock("@mirai-yoho/console-core/lib/api-client", () => ({
  UNAUTHORIZED_EVENT_NAME: "auth:unauthorized",
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
vi.mock("@mirai-yoho/console-core/hooks/use-auth", () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock("@mirai-yoho/console-core/hooks/use-organization-routing", () => ({
  useOrganizationRouting: () => ({
    organizationId: "org-test",
    buildPath: (path: string) => `/org-test${path}`,
    replaceOrganization: vi.fn(),
  }),
}));

import ConsoleLayout from "../layout";

describe("ConsoleLayout", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("shows account management nav item for operator", () => {
    mockUseAuth.mockReturnValue({
      user: { email: "operator@example.com" },
      roleId: "operator",
      hasAnyPermission: (permissions: string[]) =>
        permissions.some((permission) =>
          [
            "console.dashboard.read",
            "console.accounts.read",
            "console.bookings.read",
          ].includes(permission),
        ),
      accounts: [
        {
          name: "Org Test",
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
      <ConsoleLayout>
        <div>content</div>
      </ConsoleLayout>,
    );

    expect(screen.getByText("アカウント管理")).toBeInTheDocument();
    expect(screen.getByText("ホーム")).toBeInTheDocument();
    expect(screen.getByText("ダッシュボード")).toBeInTheDocument();
  });
});
