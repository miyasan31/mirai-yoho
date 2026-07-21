// @vitest-environment jsdom
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";

const mockSendPasswordResetEmail = vi.fn();
const mockToasterCreate = vi.fn();

vi.mock("@mirai-yoho/ui/components/ui/toast", () => ({
  toaster: {
    create: (...args: unknown[]) => mockToasterCreate(...args),
  },
}));

vi.mock("@/hooks/use-auth", () => ({
  useAuth: () => ({
    sendPasswordResetEmail: (...args: unknown[]) =>
      mockSendPasswordResetEmail(...args),
  }),
}));

vi.mock("@tanstack/react-router", () => ({
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

import ConsolePasswordResetPage from "../page";

describe("ConsolePasswordResetPage", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("shows success toast after submit", async () => {
    mockSendPasswordResetEmail.mockResolvedValueOnce(undefined);

    render(<ConsolePasswordResetPage />);

    fireEvent.change(screen.getByRole("textbox"), {
      target: { value: "test@example.com" },
    });
    fireEvent.click(screen.getByText("再設定メールを送信"));

    await waitFor(() => {
      expect(mockToasterCreate).toHaveBeenCalledWith({
        type: "success",
        title:
          "該当メールアドレスにパスワード再設定リンクを送信しました。メールをご確認ください。",
      });
    });
  });

  it("shows error toast when sending fails", async () => {
    mockSendPasswordResetEmail.mockRejectedValueOnce(
      new Error("メール送信に失敗しました。時間をおいて再度お試しください。"),
    );

    render(<ConsolePasswordResetPage />);

    fireEvent.change(screen.getByRole("textbox"), {
      target: { value: "test@example.com" },
    });
    fireEvent.click(screen.getByText("再設定メールを送信"));

    await waitFor(() => {
      expect(mockToasterCreate).toHaveBeenCalledWith({
        type: "error",
        title: "メール送信に失敗しました。時間をおいて再度お試しください。",
      });
    });
  });

  it("shows only admin login back link", () => {
    render(<ConsolePasswordResetPage />);

    const link = screen.getByRole("link", { name: "管理者ログインに戻る" });
    expect(link.getAttribute("href")).toBe("/login");
    expect(screen.queryByText("占い師ログインに戻る")).toBeNull();
  });
});
