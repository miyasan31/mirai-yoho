// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";

const mockUseConsoleZoomSession = vi.fn();
const mockNavigate = vi.fn();
const mockSearch = vi.fn(() => ({}) as Record<string, unknown>);

vi.mock("@/hooks/use-console-zoom-session", () => ({
  useConsoleZoomSession: (params?: unknown) =>
    mockUseConsoleZoomSession(params),
}));

vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => mockNavigate,
  useSearch: () => mockSearch(),
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
      withProvider: (c: unknown) => c,
      withRootProvider: (c: unknown) => c,
      withContext: (c: unknown) => c,
    }),
  };
});

vi.mock("@mirai-yoho/ui/components/ui/text", () => ({
  Text: ({
    as: Tag = "span",
    children,
    ...props
  }: { as?: string; children: ReactNode } & Record<string, unknown>) => {
    const Element = Tag as unknown as React.ElementType;
    return <Element {...props}>{children}</Element>;
  },
}));

vi.mock("@mirai-yoho/ui/components/ui/button", () => ({
  Button: ({
    children,
    ...props
  }: { children: ReactNode } & React.ComponentProps<"button">) => (
    <button type="button" {...props}>
      {children}
    </button>
  ),
}));

vi.mock("@mirai-yoho/ui/components/ui/input", () => ({
  Input: (props: React.ComponentProps<"input">) => <input {...props} />,
}));

vi.mock("@mirai-yoho/ui/components/ui/badge", () => ({
  Badge: ({ children }: { children: ReactNode }) => <span>{children}</span>,
}));

vi.mock("@mirai-yoho/ui/components/ui/table", () => ({
  Root: (props: React.ComponentProps<"table">) => <table {...props} />,
  Head: (props: React.ComponentProps<"thead">) => <thead {...props} />,
  Body: (props: React.ComponentProps<"tbody">) => <tbody {...props} />,
  Row: (props: React.ComponentProps<"tr">) => <tr {...props} />,
  Header: (props: React.ComponentProps<"th">) => <th {...props} />,
  Cell: (props: React.ComponentProps<"td">) => <td {...props} />,
}));

vi.mock("@mirai-yoho/ui/components/ui/tooltip", () => ({
  Tooltip: ({
    children,
    content,
  }: {
    children: ReactNode;
    content: ReactNode;
  }) => (
    <div>
      {children}
      <span>{content}</span>
    </div>
  ),
}));

vi.mock("@mirai-yoho/ui/components/empty-state", () => ({
  EmptyState: ({ message }: { message: string }) => <div>{message}</div>,
}));

vi.mock("@mirai-yoho/ui/components/status-badge", () => ({
  BookingStatusBadge: ({ status }: { status: string }) => <span>{status}</span>,
}));

vi.mock("@mirai-yoho/ui/components/truncated-id", () => ({
  TruncatedId: ({ id }: { id: string }) => <span>{id}</span>,
}));

vi.mock("@mirai-yoho/ui/components/table-skeleton", () => ({
  TableSkeleton: () => <div>loading</div>,
}));

vi.mock("lucide-react", () => ({
  AlertTriangle: () => <span>AlertTriangle</span>,
  Video: () => <span>Video</span>,
}));

import ConsoleZoomSessionsPage from "../page";

function room(overrides: Record<string, unknown> = {}) {
  return {
    bookingId: "booking-1",
    roomName: "佐藤相談員 19:00-19:30",
    consultantId: "consultant-1",
    consultantName: "佐藤相談員",
    customerId: "customer-1",
    customerName: "山田太郎",
    customerEmail: "zoom@example.com",
    startsAt: "2026-05-01T10:00:00.000Z",
    endsAt: "2026-05-01T10:30:00.000Z",
    bookingStatus: "confirmed",
    isStale: false,
    ...overrides,
  };
}

describe("ConsoleZoomSessionsPage", () => {
  afterEach(() => {
    cleanup();
    vi.resetAllMocks();
    mockSearch.mockReturnValue({});
  });

  it("ルーム名・時間・顧客・割り当て済み Zoom アカウントを表示する", () => {
    mockUseConsoleZoomSession.mockReturnValue({
      data: {
        data: {
          sessionDate: "2026-05-01",
          zoomMeetingId: "12345",
          joinUrl: "https://zoom.us/j/12345",
          breakoutRooms: [room()],
        },
      },
      isLoading: false,
      error: null,
    });

    render(<ConsoleZoomSessionsPage />);

    expect(screen.getByText("佐藤相談員 19:00-19:30")).toBeTruthy();
    expect(screen.getByText("19:00 - 19:30")).toBeTruthy();
    expect(screen.getByText("山田太郎")).toBeTruthy();
    expect(screen.getByText("zoom@example.com")).toBeTruthy();
    expect(screen.getByText("12345")).toBeTruthy();
  });

  it("予約が確定状態でないルームは要確認として件数を表示する", () => {
    mockUseConsoleZoomSession.mockReturnValue({
      data: {
        data: {
          sessionDate: "2026-05-01",
          zoomMeetingId: "12345",
          joinUrl: null,
          breakoutRooms: [
            room({
              bookingId: "booking-stale",
              bookingStatus: null,
              customerName: null,
              isStale: true,
            }),
          ],
        },
      },
      isLoading: false,
      error: null,
    });

    render(<ConsoleZoomSessionsPage />);

    expect(screen.getByText("要確認 1 件")).toBeTruthy();
    expect(screen.getByText("予約なし")).toBeTruthy();
  });

  it("ルームが無い日は空状態を表示する", () => {
    mockUseConsoleZoomSession.mockReturnValue({
      data: {
        data: {
          sessionDate: "2026-05-01",
          zoomMeetingId: null,
          joinUrl: null,
          breakoutRooms: [],
        },
      },
      isLoading: false,
      error: null,
    });

    render(<ConsoleZoomSessionsPage />);

    expect(
      screen.getByText("この日のブレイクアウトルームはありません"),
    ).toBeTruthy();
  });

  it("URL の date を検索条件として API に渡す", () => {
    mockSearch.mockReturnValue({ date: "2026-05-01" });
    mockUseConsoleZoomSession.mockReturnValue({
      data: {
        data: {
          sessionDate: "2026-05-01",
          zoomMeetingId: null,
          joinUrl: null,
          breakoutRooms: [],
        },
      },
      isLoading: false,
      error: null,
    });

    render(<ConsoleZoomSessionsPage />);

    expect(mockUseConsoleZoomSession).toHaveBeenCalledWith({
      date: "2026-05-01",
    });
  });
});
