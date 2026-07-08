// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const mockSearchParams = new URLSearchParams({ slotId: "slot-1" });
const mockNavigate = vi.fn();

vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => (options: Record<string, unknown>) => ({
    ...options,
    useSearch: () => Object.fromEntries(mockSearchParams.entries()),
    useParams: () => ({ organizationId: "org-test" }),
  }),
  useNavigate: () => mockNavigate,
  useRouterState: <T,>({
    select,
  }: {
    select: (state: { location: { href: string; pathname: string } }) => T;
  }) =>
    select({
      location: {
        href: "/org-test/booking?slotId=slot-1",
        pathname: "/org-test/booking",
      },
    }),
  Link: ({
    to,
    children,
  }: { to?: string; children: React.ReactNode } & Record<string, unknown>) => (
    <a href={to ?? "#"}>{children}</a>
  ),
}));

const mockMutateAsync = vi.fn();
vi.mock("@/hooks/use-booking", () => ({
  useCreateBooking: () => ({
    mutateAsync: mockMutateAsync,
    isPending: false,
  }),
}));

vi.mock("@/hooks/use-price-plans", () => ({
  useBookingPricePlans: () => ({
    data: {
      data: {
        pricePlans: [
          {
            selectionId: "signature:%E9%80%9A%E5%B8%B8:5000",
            name: "通常",
            totalJPY: 5000,
          },
        ],
      },
    },
    isLoading: false,
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

vi.mock("styled-system/recipes", () => ({
  tooltip: () => ({}),
  spinner: () => ({}),
}));

vi.mock("@mirai-yoho/ui/components/empty-state", () => ({
  EmptyState: ({
    message,
    hint,
  }: {
    icon: unknown;
    message: string;
    hint?: string;
  }) => (
    <div>
      <span>{message}</span>
      {hint && <span>{hint}</span>}
    </div>
  ),
}));

vi.mock("@mirai-yoho/ui/components/ui/button", () => ({
  Button: ({
    asChild,
    variant,
    ...props
  }: React.ComponentProps<"button"> & {
    asChild?: boolean;
    variant?: string;
  }) => (
    <button type={props.type} {...props}>
      {props.children}
    </button>
  ),
}));

vi.mock("@mirai-yoho/ui/components/ui/field", () => ({
  Root: (props: React.ComponentProps<"div">) => <div {...props} />,
  // biome-ignore lint/a11y/noLabelWithoutControl: test mock
  Label: (props: React.ComponentProps<"label">) => <label {...props} />,
  RequiredIndicator: () => <span>*</span>,
  ErrorText: (props: React.ComponentProps<"span">) => <span {...props} />,
  HelperText: (props: React.ComponentProps<"span">) => <span {...props} />,
}));

vi.mock("lucide-react", () => ({
  ArrowLeft: () => <span>ArrowLeft</span>,
  CalendarX: () => <span>CalendarX</span>,
  LogIn: () => <span>LogIn</span>,
  Video: () => <span>Video</span>,
}));

vi.mock("@/hooks/use-customer-auth", () => ({
  useCustomerAuth: () => ({
    user: { uid: "auth-uid-1" },
    token: "test-token",
    profile: null,
    isSignedUp: true,
    isAnonymous: false,
    hasGoogleProvider: true,
    hasActiveZoomConnection: true,
    isLoading: false,
    signInAnonymously: vi.fn(),
    signInWithGoogle: vi.fn(),
    linkGoogleAccount: vi.fn(),
    signupOrLink: vi.fn(),
    refreshProfile: vi.fn(),
    signOut: vi.fn(),
  }),
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

vi.mock("@mirai-yoho/ui/components/ui/toast", () => ({
  toaster: {
    create: vi.fn(),
  },
}));

vi.mock("@mirai-yoho/ui/components/ui/textarea", () => ({
  Textarea: (props: React.ComponentProps<"textarea">) => (
    <textarea {...props} />
  ),
}));

vi.mock("@mirai-yoho/ui/components/ui/icon-button", () => ({
  IconButton: ({
    asChild,
    children,
    ...props
  }: { asChild?: boolean; children: React.ReactNode } & Record<
    string,
    unknown
  >) => <button {...props}>{children}</button>,
}));

vi.mock("@mirai-yoho/ui/components/ui/radio-group", () => ({
  Root: ({
    children,
    value,
    name,
  }: {
    children: React.ReactNode;
    value?: string;
    name?: string;
  }) => (
    <div data-radio-name={name} data-radio-value={value}>
      {children}
    </div>
  ),
  Item: ({ children, value }: { children: React.ReactNode; value: string }) => (
    <div data-radio-item={value}>{children}</div>
  ),
  ItemHiddenInput: () => <input type="radio" readOnly />,
  ItemControl: (props: React.ComponentProps<"span">) => <span {...props} />,
  Indicator: () => <span />,
  ItemText: ({
    children,
  }: {
    asChild?: boolean;
    children: React.ReactNode;
  }) => <span>{children}</span>,
}));

vi.mock("@mirai-yoho/ui/components/ui/tooltip", () => ({
  Tooltip: ({
    children,
    content,
  }: { children: React.ReactNode; content: React.ReactNode } & Record<
    string,
    unknown
  >) => (
    <div>
      {children}
      <span>{content}</span>
    </div>
  ),
}));

import { BookingPage } from "@/routes/$organizationId/booking/index";

function getBirthdateInput() {
  const input = document.querySelector(
    'input[name="customerBirthDate"]',
  ) as HTMLInputElement | null;
  if (!input) {
    throw new Error("Birthdate input not found");
  }
  return input;
}

describe("BookingPage", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
    const keys = [...mockSearchParams.keys()];
    for (const key of keys) {
      mockSearchParams.delete(key);
    }
    mockSearchParams.set("slotId", "slot-1");
    vi.useRealTimers();
  });

  it("displays the booking form with required fields", () => {
    render(<BookingPage />);

    expect(screen.getByPlaceholderText("山田 太郎")).toBeDefined();
    expect(screen.getByPlaceholderText("example@email.com")).toBeDefined();
    expect(screen.getByPlaceholderText("090-1234-5678")).toBeDefined();
    expect(getBirthdateInput()).toBeDefined();
    expect(
      screen.getByPlaceholderText("ご相談内容をお書きください"),
    ).toBeDefined();
  });

  it("shows validation errors when submitting empty form", async () => {
    const user = userEvent.setup();
    render(<BookingPage />);

    await user.click(screen.getByText("お支払いへ進む"));

    await waitFor(() => {
      expect(screen.getByText("お名前を入力してください")).toBeDefined();
    });
  });

  it("shows email validation error for invalid email", async () => {
    const user = userEvent.setup();
    render(<BookingPage />);

    await user.type(screen.getByPlaceholderText("山田 太郎"), "テスト太郎");
    await user.type(
      screen.getByPlaceholderText("example@email.com"),
      "invalid",
    );
    await user.type(
      screen.getByPlaceholderText("090-1234-5678"),
      "090-0000-0000",
    );
    await user.type(getBirthdateInput(), "2050-01-01");
    await user.click(screen.getByText("お支払いへ進む"));

    await waitFor(() => {
      expect(mockMutateAsync).not.toHaveBeenCalled();
    });
  });

  it("shows birthDate validation error for future date", async () => {
    const user = userEvent.setup();
    render(<BookingPage />);

    await user.type(screen.getByPlaceholderText("山田 太郎"), "テスト太郎");
    await user.type(
      screen.getByPlaceholderText("example@email.com"),
      "test@example.com",
    );
    await user.type(
      screen.getByPlaceholderText("090-1234-5678"),
      "090-0000-0000",
    );
    await user.type(getBirthdateInput(), "2050-01-01");
    await user.click(screen.getByText("お支払いへ進む"));

    await waitFor(() => {
      expect(screen.getByText("未来の日付は指定できません")).toBeDefined();
      expect(mockMutateAsync).not.toHaveBeenCalled();
    });
  });

  it("submits the form with valid data", async () => {
    mockMutateAsync.mockResolvedValue({
      data: {
        bookingId: "b1",
        joinUrl: "https://zoom.us/j/1",
        bookingActionToken: "booking-action-token-1",
      },
    });

    const user = userEvent.setup();
    render(<BookingPage />);

    await user.type(screen.getByPlaceholderText("山田 太郎"), "テスト太郎");
    await user.type(
      screen.getByPlaceholderText("example@email.com"),
      "test@example.com",
    );
    await user.type(
      screen.getByPlaceholderText("090-1234-5678"),
      "090-0000-0000",
    );
    await user.type(getBirthdateInput(), "1990-01-01");
    await user.click(screen.getByText("お支払いへ進む"));

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledWith({
        organizationId: "org-test",
        data: expect.objectContaining({
          slotId: "slot-1",
          startsAt: undefined,
          endsAt: undefined,
          customerName: "テスト太郎",
          customerEmail: "test@example.com",
          customerPhone: "090-0000-0000",
          customerBirthDate: "1990-01-01",
        }),
      });
      expect(mockNavigate).toHaveBeenCalledWith({
        to: "/$organizationId/booking/payment",
        params: { organizationId: "org-test" },
        search: {
          bookingId: "b1",
          bookingActionToken: "booking-action-token-1",
        },
      });
    });
  });

  it("handles API failure without unhandled rejection", async () => {
    mockMutateAsync.mockRejectedValue(
      new Error("Cannot reserve a slot in the past"),
    );

    const user = userEvent.setup();
    render(<BookingPage />);

    await user.type(screen.getByPlaceholderText("山田 太郎"), "テスト太郎");
    await user.type(
      screen.getByPlaceholderText("example@email.com"),
      "test@example.com",
    );
    await user.type(
      screen.getByPlaceholderText("090-1234-5678"),
      "090-0000-0000",
    );
    await user.type(getBirthdateInput(), "1990-01-01");
    await user.click(screen.getByText("お支払いへ進む"));

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalled();
      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });

  it("submits the form with startsAt/endsAt when consultant is auto assigned", async () => {
    mockMutateAsync.mockResolvedValue({
      data: {
        bookingId: "b2",
        joinUrl: "https://zoom.us/j/2",
        bookingActionToken: "booking-action-token-2",
      },
    });
    // カットオフ判定は実時間に依存するため、常に未来になる枠を動的に生成する
    const startsAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    const endsAt = new Date(
      Date.now() + 24 * 60 * 60 * 1000 + 30 * 60 * 1000,
    ).toISOString();
    mockSearchParams.delete("slotId");
    mockSearchParams.set("startsAt", startsAt);
    mockSearchParams.set("endsAt", endsAt);

    // 予約締切（開始15分前）を過ぎないよう、現在時刻を開始前に固定する
    // shouldAdvanceTime で時計を実時間進行させ、userEvent / waitFor を動作させる
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(new Date("2026-07-01T09:00:00.000Z"));

    const user = userEvent.setup();
    render(<BookingPage />);

    await user.type(screen.getByPlaceholderText("山田 太郎"), "自動割当太郎");
    await user.type(
      screen.getByPlaceholderText("example@email.com"),
      "auto@example.com",
    );
    await user.type(
      screen.getByPlaceholderText("090-1234-5678"),
      "080-0000-0000",
    );
    await user.type(getBirthdateInput(), "1995-12-31");
    await user.click(screen.getByText("お支払いへ進む"));

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledWith({
        organizationId: "org-test",
        data: expect.objectContaining({
          slotId: undefined,
          startsAt,
          endsAt,
          customerName: "自動割当太郎",
          customerEmail: "auto@example.com",
          customerPhone: "080-0000-0000",
          customerBirthDate: "1995-12-31",
        }),
      });
    });
  });

  it("hides the form when the selected slot is past the 15-minute cutoff", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-01T09:45:00.000Z"));
    mockSearchParams.set("startsAt", "2026-05-01T10:00:00.000Z");
    mockSearchParams.set("endsAt", "2026-05-01T10:30:00.000Z");

    render(<BookingPage />);

    expect(screen.getByText("この予約枠の受付は終了しました")).toBeDefined();
    expect(screen.queryByPlaceholderText("山田 太郎")).toBeNull();

    vi.useRealTimers();
  });
});
