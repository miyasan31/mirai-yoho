// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useParams: () => ({ organizationId: "org-test" }),
  usePathname: () => "/org-test/consultant/profile",
  useRouter: () => ({ push: vi.fn() }),
}));

const mockUseConsultantProfile = vi.fn();
const mockMutateAsync = vi.fn();
const mockToasterCreate = vi.fn();

vi.mock("@/hooks/use-consultant-profile", () => ({
  useConsultantProfile: () => mockUseConsultantProfile(),
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

vi.mock("@/components/ui/button", () => ({
  Button: (props: React.ComponentProps<"button">) => (
    <button type={props.type} {...props}>
      {props.children}
    </button>
  ),
}));

vi.mock("@/components/ui/field", () => ({
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

vi.mock("@/components/ui/input", () => ({
  Input: (props: React.ComponentProps<"input">) => <input {...props} />,
}));

vi.mock("@/components/ui/textarea", () => ({
  Textarea: (props: React.ComponentProps<"textarea">) => (
    <textarea {...props} />
  ),
}));

vi.mock("@/components/ui/skeleton", () => ({
  Skeleton: (props: React.ComponentProps<"div">) => (
    <div data-testid="skeleton" {...props} />
  ),
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

vi.mock("@/components/ui/toast", () => ({
  toaster: { create: (...args: unknown[]) => mockToasterCreate(...args) },
}));

import ConsultantProfilePage from "../page";

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

describe("ConsultantProfilePage", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("loads and displays profile data", async () => {
    mockUseConsultantProfile.mockReturnValue({
      data: {
        data: {
          consultantId: "c1",
          displayName: "田中太郎",
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
      expect(
        (container.querySelector("#displayName") as HTMLInputElement).value,
      ).toBe("田中太郎");
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
          displayName: "田中太郎",
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
      expect(
        (container.querySelector("#displayName") as HTMLInputElement).value,
      ).toBe("田中太郎");
    });

    await user.click(screen.getByText("保存"));

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledWith({
        organizationId: "org-test",
        data: {
          displayName: "田中太郎",
          bio: "",
          specialties: [],
        },
      });
    });
  });

  it("shows success message after saving", async () => {
    mockUseConsultantProfile.mockReturnValue({
      data: {
        data: {
          displayName: "テスト",
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
      expect(
        (container.querySelector("#displayName") as HTMLInputElement).value,
      ).toBe("テスト");
    });

    await user.click(screen.getByText("保存"));

    await waitFor(() => {
      expect(mockToasterCreate).toHaveBeenCalledWith(
        expect.objectContaining({ type: "success" }),
      );
    });
  });
});
