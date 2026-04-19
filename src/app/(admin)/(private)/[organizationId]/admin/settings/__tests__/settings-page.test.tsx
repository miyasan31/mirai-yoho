// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useParams: () => ({ organizationId: "org-test" }),
  usePathname: () => "/org-test/admin/settings",
  useRouter: () => ({ push: vi.fn() }),
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
    <button type={props.type ?? "button"} {...props}>
      {props.children}
    </button>
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

const mockMutateAsync = vi.fn();
vi.mock("@/hooks/use-booking-settings", () => ({
  useAdminBookingSettings: () => ({
    data: { data: { consultantSelectionEnabled: true } },
    isLoading: false,
  }),
  useUpdateAdminBookingSettings: () => ({
    mutateAsync: mockMutateAsync,
    isPending: false,
  }),
}));

import AdminSettingsPage from "../page";

describe("AdminSettingsPage", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("updates consultant selection setting", async () => {
    mockMutateAsync.mockResolvedValue({
      data: { consultantSelectionEnabled: false },
    });

    const user = userEvent.setup();
    render(<AdminSettingsPage />);

    await user.click(screen.getByRole("checkbox"));
    await user.click(screen.getByText("保存"));

    expect(mockMutateAsync).toHaveBeenCalledWith({
      organizationId: "org-test",
      data: { consultantSelectionEnabled: false },
    });
  });
});
