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

const mockSidebarLayout = vi.fn();
vi.mock("@/components/sidebar-layout", () => ({
  SidebarLayout: ({
    navItems,
    currentDisplayName,
    children,
  }: {
    navItems: Array<{ label: string }>;
    currentDisplayName?: string | null;
    children: ReactNode;
  }) => {
    mockSidebarLayout({ navItems, currentDisplayName });
    return (
      <div>
        <div data-testid="display-name">{currentDisplayName}</div>
        <ul>
          {navItems.map((item) => (
            <li key={item.label}>{item.label}</li>
          ))}
        </ul>
        {children}
      </div>
    );
  },
  SidebarLayoutSkeleton: () => <div>loading...</div>,
}));

const mockUseAuth = vi.fn();
vi.mock("@/hooks/use-auth", () => ({
  useAuth: () => mockUseAuth(),
}));

const mockUseConsultantProfile = vi.fn();
vi.mock("@/hooks/use-consultant-profile", () => ({
  useConsultantProfile: () => mockUseConsultantProfile(),
}));

vi.mock("@/hooks/use-organization-routing", () => ({
  useOrganizationRouting: () => ({
    organizationId: "org-test",
    buildPath: (path: string) => `/org-test${path}`,
    replaceOrganization: vi.fn(),
  }),
}));

import ConsultantLayout from "../layout";

describe("ConsultantLayout", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  function mockAuthorizedConsultantAuth() {
    mockUseAuth.mockReturnValue({
      user: { email: "consultant@example.com" },
      role: "consultant",
      memberships: [
        {
          name: "Org Test",
          organizationId: "org-test",
        },
      ],
      currentOrganizationId: "org-test",
      currentDisplayName: "Auth Display Name",
      isLoading: false,
      signOut: vi.fn(),
      setCurrentOrganizationId: vi.fn(),
    });
  }

  it("shows consultant profile name when available", () => {
    mockAuthorizedConsultantAuth();
    mockUseConsultantProfile.mockReturnValue({
      data: {
        data: {
          name: "相談員プロフィール名",
        },
      },
    });

    render(
      <ConsultantLayout>
        <div>content</div>
      </ConsultantLayout>,
    );

    expect(screen.getByTestId("display-name")).toHaveTextContent(
      "相談員プロフィール名",
    );
  });

  it("falls back to user email when consultant profile name is empty", () => {
    mockUseAuth.mockReturnValue({
      user: { email: "consultant@example.com" },
      role: "consultant",
      memberships: [
        {
          name: "Org Test",
          organizationId: "org-test",
        },
      ],
      currentOrganizationId: "org-test",
      currentDisplayName: "",
      isLoading: false,
      signOut: vi.fn(),
      setCurrentOrganizationId: vi.fn(),
    });
    mockUseConsultantProfile.mockReturnValue({
      data: {
        data: {
          name: "   ",
        },
      },
    });

    render(
      <ConsultantLayout>
        <div>content</div>
      </ConsultantLayout>,
    );

    expect(screen.getByTestId("display-name")).toHaveTextContent(
      "consultant@example.com",
    );
  });

  it("does not crash and falls back while consultant profile is not loaded", () => {
    mockAuthorizedConsultantAuth();
    mockUseConsultantProfile.mockReturnValue({
      data: undefined,
    });

    render(
      <ConsultantLayout>
        <div>content</div>
      </ConsultantLayout>,
    );

    expect(screen.getByTestId("display-name")).toHaveTextContent(
      "Auth Display Name",
    );
    expect(screen.getByText("ホーム")).toBeInTheDocument();
  });
});
