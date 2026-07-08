// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";

vi.mock("@tanstack/react-router", () => ({
  useParams: () => ({ organizationId: "org-test" }),
  useLocation: ({
    select,
  }: {
    select: (location: { pathname: string }) => string;
  }) => select({ pathname: "/org-test/consultant/profile" }),
  useNavigate: () => vi.fn(),
  Link: ({ to, children }: { to: string; children: React.ReactNode }) => (
    <a href={to}>{children}</a>
  ),
}));

const mockUseConsultantProfile = vi.fn();
const mockMutateAsync = vi.fn();
const mockCreateUploadUrlMutateAsync = vi.fn();
const mockPublishAvatarMutateAsync = vi.fn();
const mockToasterCreate = vi.fn();

vi.mock("@/hooks/use-consultant-profile", () => ({
  useConsultantProfile: () => mockUseConsultantProfile(),
  useCreateConsultantAvatarUploadUrl: () => ({
    mutateAsync: mockCreateUploadUrlMutateAsync,
    isPending: false,
  }),
  usePublishConsultantAvatar: () => ({
    mutateAsync: mockPublishAvatarMutateAsync,
    isPending: false,
  }),
  useUpdateConsultantProfile: () => ({
    mutateAsync: mockMutateAsync,
    isPending: false,
  }),
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

vi.mock("@mirai-yoho/ui/components/ui/button", () => ({
  Button: (props: React.ComponentProps<"button">) => (
    <button type={props.type} {...props}>
      {props.children}
    </button>
  ),
}));

vi.mock("@mirai-yoho/ui/components/ui/field", () => ({
  Root: ({
    children,
    ...props
  }: { children: React.ReactNode } & Record<string, unknown>) => (
    <div {...props}>{children}</div>
  ),
  // biome-ignore lint/a11y/noLabelWithoutControl: test mock
  Label: (props: React.ComponentProps<"label">) => <label {...props} />,
  RequiredIndicator: () => <span>*</span>,
  HelperText: (props: React.ComponentProps<"span">) => <span {...props} />,
}));

vi.mock("@mirai-yoho/ui/components/ui/input", () => ({
  Input: (props: React.ComponentProps<"input">) => <input {...props} />,
}));

vi.mock("@mirai-yoho/ui/components/ui/textarea", () => ({
  Textarea: (props: React.ComponentProps<"textarea">) => (
    <textarea {...props} />
  ),
}));

vi.mock("@mirai-yoho/ui/components/ui/skeleton", () => ({
  Skeleton: (props: React.ComponentProps<"div">) => (
    <div data-testid="skeleton" {...props} />
  ),
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

vi.mock("@mirai-yoho/ui/components/ui/toast", () => ({
  toaster: { create: (...args: unknown[]) => mockToasterCreate(...args) },
}));

import ConsultantProfilePage from "../page";

function createWrapper() {
  const queryCustomer = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryCustomer}>{children}</QueryClientProvider>
  );
}

describe("ConsultantProfilePage", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  it("loads and displays profile data", async () => {
    mockUseConsultantProfile.mockReturnValue({
      data: {
        data: {
          consultantId: "c1",
          name: "田中太郎",
          bio: "自己紹介テスト",
          specialties: ["キャリア", "転職"],
          isActive: true,
        },
      },
      isLoading: false,
      error: null,
    });

    const { container } = render(<ConsultantProfilePage />, {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect((container.querySelector("#name") as HTMLInputElement).value).toBe(
        "田中太郎",
      );
      expect(
        (container.querySelector("#bio") as HTMLTextAreaElement).value,
      ).toBe("自己紹介テスト");
      expect(
        (container.querySelector("#specialties") as HTMLInputElement).value,
      ).toBe("キャリア, 転職");
    });
  });

  it("submits profile updates", async () => {
    mockUseConsultantProfile.mockReturnValue({
      data: {
        data: {
          consultantId: "c1",
          name: "田中太郎",
          bio: "",
          specialties: [],
          isActive: true,
        },
      },
      isLoading: false,
      error: null,
    });
    mockMutateAsync.mockResolvedValue({});

    const user = userEvent.setup();
    const { container } = render(<ConsultantProfilePage />, {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect((container.querySelector("#name") as HTMLInputElement).value).toBe(
        "田中太郎",
      );
    });

    await user.click(screen.getByText("保存"));

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledWith({
        organizationId: "org-test",
        data: {
          name: "田中太郎",
          bio: "",
          phone: "",
          imageUrl: undefined,
          specialties: [],
        },
      });
    });
  });

  it("submits the published avatar URL after uploading an image", async () => {
    const imageUrl =
      "https://storage.googleapis.com/test-bucket/organizations/org-test/consultants/c1/avatar.jpg";

    mockUseConsultantProfile.mockReturnValue({
      data: {
        data: {
          consultantId: "c1",
          name: "田中太郎",
          bio: "",
          specialties: [],
          isActive: true,
        },
      },
      isLoading: false,
      error: null,
    });
    mockCreateUploadUrlMutateAsync.mockResolvedValue({
      data: {
        uploadUrl: "https://storage.example/upload",
        objectPath: "organizations/org-test/consultants/c1/avatar.jpg",
      },
    });
    mockPublishAvatarMutateAsync.mockResolvedValue({
      data: {
        imageUrl,
      },
    });
    mockMutateAsync.mockResolvedValue({});
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
    } as Response);
    vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:avatar-preview");
    vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});

    class MockImage {
      width = 96;
      height = 96;
      onload: (() => void) | null = null;

      set src(_value: string) {
        queueMicrotask(() => this.onload?.());
      }
    }
    vi.stubGlobal("Image", MockImage);

    const user = userEvent.setup();
    const { container } = render(<ConsultantProfilePage />, {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect((container.querySelector("#name") as HTMLInputElement).value).toBe(
        "田中太郎",
      );
    });

    const fileInput = container.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement;
    await user.upload(
      fileInput,
      new File(["avatar"], "avatar.jpg", { type: "image/jpeg" }),
    );

    await waitFor(() => {
      expect(mockPublishAvatarMutateAsync).toHaveBeenCalledWith({
        organizationId: "org-test",
        data: {
          objectPath: "organizations/org-test/consultants/c1/avatar.jpg",
        },
      });
    });

    // アップロードのトランジション（useTransition）が完了して保存ボタンが
    // 有効になるのを待つ。CI の負荷次第で非同期トランジションの解消がデフォルト
    // の 1s を超えることがあるため、タイムアウトに余裕を持たせる。
    const saveButton = screen.getByText("保存") as HTMLButtonElement;
    await waitFor(
      () => {
        expect(saveButton.disabled).toBe(false);
      },
      { timeout: 5000 },
    );

    await user.click(saveButton);

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledWith({
        organizationId: "org-test",
        data: {
          name: "田中太郎",
          bio: "",
          phone: "",
          imageUrl,
          specialties: [],
        },
      });
    });
  });

  it("shows success message after saving", async () => {
    mockUseConsultantProfile.mockReturnValue({
      data: {
        data: {
          name: "テスト",
          bio: "",
          specialties: [],
        },
      },
      isLoading: false,
      error: null,
    });
    mockMutateAsync.mockResolvedValue({});

    const user = userEvent.setup();
    const { container } = render(<ConsultantProfilePage />, {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect((container.querySelector("#name") as HTMLInputElement).value).toBe(
        "テスト",
      );
    });

    await user.click(screen.getByText("保存"));

    await waitFor(() => {
      expect(mockToasterCreate).toHaveBeenCalledWith(
        expect.objectContaining({ type: "success" }),
      );
    });
  });
});
