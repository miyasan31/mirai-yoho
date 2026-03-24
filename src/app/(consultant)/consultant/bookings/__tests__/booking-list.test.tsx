// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/hooks/use-auth", () => ({
  useAuth: () => ({ token: "test-token", role: "consultant" }),
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

import ConsultantBookingsPage from "../page";

describe("ConsultantBookingsPage", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("shows loading state initially", () => {
    vi.mocked(fetch).mockReturnValue(new Promise(() => {}));
    render(<ConsultantBookingsPage />);
    expect(screen.getByText("Loading...")).toBeDefined();
  });

  it("renders booking list from API response", async () => {
    vi.mocked(fetch).mockResolvedValue({
      json: () =>
        Promise.resolve({
          bookings: [
            {
              bookingId: "b1",
              clientId: "c1",
              startDatetime: "2026-04-01T10:00:00Z",
              status: "confirmed",
              zoomUrl: "https://zoom.us/j/123",
              consultantMemo: "テストメモ",
              consultationContent: null,
            },
          ],
        }),
    } as Response);

    render(<ConsultantBookingsPage />);

    await waitFor(() => {
      expect(screen.getByText("confirmed")).toBeDefined();
      expect(screen.getByText("テストメモ")).toBeDefined();
      expect(screen.getByText("参加")).toBeDefined();
      expect(screen.getByText("メモ編集")).toBeDefined();
    });
  });

  it("shows empty message when no bookings", async () => {
    vi.mocked(fetch).mockResolvedValue({
      json: () => Promise.resolve({ bookings: [] }),
    } as Response);

    render(<ConsultantBookingsPage />);

    await waitFor(() => {
      expect(screen.getByText("予約はありません")).toBeDefined();
    });
  });

  it("sends Authorization header with token", async () => {
    vi.mocked(fetch).mockResolvedValue({
      json: () => Promise.resolve({ bookings: [] }),
    } as Response);

    render(<ConsultantBookingsPage />);

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith("/api/consultant/bookings", {
        headers: { Authorization: "Bearer test-token" },
      });
    });
  });
});
