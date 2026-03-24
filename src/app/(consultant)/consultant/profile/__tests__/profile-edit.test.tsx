// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

const mockUseConsultantProfile = vi.fn();
const mockMutateAsync = vi.fn();

vi.mock("@/hooks/use-consultant-profile", () => ({
  useConsultantProfile: () => mockUseConsultantProfile(),
  useUpdateConsultantProfile: () => ({
    mutateAsync: mockMutateAsync,
    isPending: false,
  }),
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

    render(<ConsultantProfilePage />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect((screen.getByLabelText("表示名") as HTMLInputElement).value).toBe(
        "田中太郎",
      );
      expect(
        (screen.getByLabelText("自己紹介") as HTMLTextAreaElement).value,
      ).toBe("自己紹介テスト");
      expect(
        (screen.getByLabelText("専門分野（カンマ区切り）") as HTMLInputElement)
          .value,
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
    render(<ConsultantProfilePage />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect((screen.getByLabelText("表示名") as HTMLInputElement).value).toBe(
        "田中太郎",
      );
    });

    await user.clear(screen.getByLabelText("表示名"));
    await user.type(screen.getByLabelText("表示名"), "田中次郎");
    await user.click(screen.getByText("保存"));

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledWith({
        data: {
          displayName: "田中次郎",
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
    render(<ConsultantProfilePage />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect((screen.getByLabelText("表示名") as HTMLInputElement).value).toBe(
        "テスト",
      );
    });

    await user.click(screen.getByText("保存"));

    await waitFor(() => {
      expect(screen.getByText("保存しました")).toBeDefined();
    });
  });
});
