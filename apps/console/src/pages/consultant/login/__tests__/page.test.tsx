// @vitest-environment jsdom
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";

const mockSignIn = vi.fn();
const mockNavigate = vi.fn();

vi.mock("@mirai-yoho/ui/components/ui/toast", () => ({
  toaster: {
    create: vi.fn(),
  },
}));

vi.mock("@/hooks/use-auth", () => ({
  useAuth: () => ({
    signIn: mockSignIn,
  }),
}));

vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => mockNavigate,
  Link: ({ to, children }: { to: string; children: React.ReactNode }) => (
    <a href={to}>{children}</a>
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

vi.mock("lucide-react", () => ({
  UserCircle: () => <span>UserCircle</span>,
}));

vi.mock("@mirai-yoho/ui/components/ui/button", () => ({
  Button: (props: React.ComponentProps<"button">) => (
    <button type={props.type} {...props}>
      {props.children}
    </button>
  ),
}));

vi.mock("@mirai-yoho/ui/components/ui/field", () => ({
  Root: (props: React.ComponentProps<"div">) => <div {...props} />,
  // biome-ignore lint/a11y/noLabelWithoutControl: test mock
  Label: (props: React.ComponentProps<"label">) => <label {...props} />,
}));

vi.mock("@mirai-yoho/ui/components/ui/input", () => ({
  Input: (props: React.ComponentProps<"input">) => <input {...props} />,
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

import ConsultantLoginPage from "../page";

describe("ConsultantLoginPage", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("shows password reset link", () => {
    render(<ConsultantLoginPage />);

    const link = screen.getByRole("link", {
      name: "パスワードをお忘れですか？",
    });

    expect(link.getAttribute("href")).toBe("/consultant/password-reset");
    expect(screen.queryByText("管理者ログインはこちら")).toBeNull();
  });

  it("redirects to consultant home after successful login", async () => {
    mockSignIn.mockResolvedValue({
      currentOrganizationId: "org-test",
      currentRole: "consultant",
    });

    const { container } = render(<ConsultantLoginPage />);

    fireEvent.change(container.querySelector("#email") as HTMLInputElement, {
      target: { value: "consultant@example.com" },
    });
    fireEvent.change(container.querySelector("#password") as HTMLInputElement, {
      target: { value: "password" },
    });
    fireEvent.click(screen.getByRole("button", { name: "ログイン" }));

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith({
        to: "/$organizationId/consultant/home",
        params: { organizationId: "org-test" },
      });
    });
  });
});
