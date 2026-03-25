// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

const mockUseConsultantBookings = vi.fn();

vi.mock("@/hooks/use-consultant-bookings", () => ({
  useConsultantBookings: () => mockUseConsultantBookings(),
}));

vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children: ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

import ConsultantBookingsPage from "../page";

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

describe("ConsultantBookingsPage", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("shows loading state initially", () => {
    mockUseConsultantBookings.mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
    });
    render(<ConsultantBookingsPage />, { wrapper: createWrapper() });
    expect(screen.getByText("Loading...")).toBeDefined();
  });

  it("renders booking list from API response", async () => {
    mockUseConsultantBookings.mockReturnValue({
      data: {
        data: {
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
        },
      },
      isLoading: false,
      error: null,
    });

    render(<ConsultantBookingsPage />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText("confirmed")).toBeDefined();
      expect(screen.getByText("テストメモ")).toBeDefined();
      expect(screen.getByText("参加")).toBeDefined();
      expect(screen.getByText("メモ編集")).toBeDefined();
    });
  });

  it("shows empty message when no bookings", async () => {
    mockUseConsultantBookings.mockReturnValue({
      data: { data: { bookings: [] } },
      isLoading: false,
      error: null,
    });

    render(<ConsultantBookingsPage />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText("予約はありません")).toBeDefined();
    });
  });
});
