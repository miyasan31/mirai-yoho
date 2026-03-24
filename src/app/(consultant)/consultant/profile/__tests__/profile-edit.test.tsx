// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/hooks/use-auth", () => ({
  useAuth: () => ({ token: "test-token", role: "consultant" }),
}));

import ConsultantProfilePage from "../page";

describe("ConsultantProfilePage", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("loads and displays profile data", async () => {
    vi.mocked(fetch).mockResolvedValue({
      json: () =>
        Promise.resolve({
          consultantId: "c1",
          displayName: "田中太郎",
          bio: "自己紹介テスト",
          specialties: ["キャリア", "転職"],
          isActive: true,
        }),
    } as Response);

    render(<ConsultantProfilePage />);

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
    vi.mocked(fetch)
      .mockResolvedValueOnce({
        json: () =>
          Promise.resolve({
            consultantId: "c1",
            displayName: "田中太郎",
            bio: "",
            specialties: [],
            isActive: true,
          }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      } as Response);

    const user = userEvent.setup();
    render(<ConsultantProfilePage />);

    await waitFor(() => {
      expect((screen.getByLabelText("表示名") as HTMLInputElement).value).toBe(
        "田中太郎",
      );
    });

    await user.clear(screen.getByLabelText("表示名"));
    await user.type(screen.getByLabelText("表示名"), "田中次郎");
    await user.click(screen.getByText("保存"));

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith("/api/consultant/profile", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer test-token",
        },
        body: JSON.stringify({
          displayName: "田中次郎",
          bio: "",
          specialties: [],
        }),
      });
    });
  });

  it("shows success message after saving", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce({
        json: () =>
          Promise.resolve({
            displayName: "テスト",
            bio: "",
            specialties: [],
          }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      } as Response);

    const user = userEvent.setup();
    render(<ConsultantProfilePage />);

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
