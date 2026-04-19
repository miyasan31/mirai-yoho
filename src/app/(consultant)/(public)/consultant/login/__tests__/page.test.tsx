// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";

vi.mock("@/hooks/use-auth", () => ({
  useAuth: () => ({
    signIn: vi.fn(),
  }),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
  }: {
    href: string;
    children: React.ReactNode;
  }) => <a href={href}>{children}</a>,
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

vi.mock("@/components/ui/button", () => ({
  Button: (props: React.ComponentProps<"button">) => (
    <button type={props.type} {...props}>
      {props.children}
    </button>
  ),
}));

vi.mock("@/components/ui/field", () => ({
  Root: (props: React.ComponentProps<"div">) => <div {...props} />,
  // biome-ignore lint/a11y/noLabelWithoutControl: test mock
  Label: (props: React.ComponentProps<"label">) => <label {...props} />,
}));

vi.mock("@/components/ui/input", () => ({
  Input: (props: React.ComponentProps<"input">) => <input {...props} />,
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
});
