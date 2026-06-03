// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const mockSearchParams = new URLSearchParams({ slotId: "slot-1" });
const mockPush = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
  useParams: () => ({ organizationId: "org-test" }),
  usePathname: () => "/org-test/booking",
  useSearchParams: () => ({
    get: (key: string) => mockSearchParams.get(key),
  }),
}));

const mockMutateAsync = vi.fn();
vi.mock("@/hooks/use-booking", () => ({
  useCreateBooking: () => ({
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

vi.mock("styled-system/recipes", () => ({
  tooltip: () => ({}),
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

vi.mock("@/components/empty-state", () => ({
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

vi.mock("@/components/ui/button", () => ({
  Button: (props: React.ComponentProps<"button">) => (
    <button type={props.type} {...props}>
      {props.children}
    </button>
  ),
}));

vi.mock("@/components/ui/field", () => ({
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
}));

vi.mock("@/components/ui/input", () => ({
  Input: (props: React.ComponentProps<"input">) => <input {...props} />,
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

vi.mock("@/components/ui/textarea", () => ({
  Textarea: (props: React.ComponentProps<"textarea">) => (
    <textarea {...props} />
  ),
}));

vi.mock("@/components/ui/icon-button", () => ({
  IconButton: ({
    asChild,
    children,
    ...props
  }: { asChild?: boolean; children: React.ReactNode } & Record<
    string,
    unknown
  >) => <button {...props}>{children}</button>,
}));

vi.mock("@/components/ui/tooltip", () => ({
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

import BookingPage from "../page";

function getBirthdateInput() {
  const input = document.querySelector(
    'input[name="clientBirthdate"]',
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

  it("shows birthdate validation error for future date", async () => {
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
        zoomUrl: "https://zoom.us/j/1",
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
          startDatetime: undefined,
          endDatetime: undefined,
          clientName: "テスト太郎",
          clientEmail: "test@example.com",
          clientPhone: "090-0000-0000",
          clientBirthdate: "1990-01-01",
        }),
      });
      expect(mockPush).toHaveBeenCalledWith(
        "/org-test/booking/payment?bookingId=b1&bookingActionToken=booking-action-token-1",
      );
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
      expect(mockPush).not.toHaveBeenCalled();
    });
  });

  it("submits the form with startDatetime/endDatetime when consultant is auto assigned", async () => {
    mockMutateAsync.mockResolvedValue({
      data: {
        bookingId: "b2",
        zoomUrl: "https://zoom.us/j/2",
        bookingActionToken: "booking-action-token-2",
      },
    });
    mockSearchParams.delete("slotId");
    mockSearchParams.set("startDatetime", "2026-05-01T10:00:00.000Z");
    mockSearchParams.set("endDatetime", "2026-05-01T10:30:00.000Z");

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
          startDatetime: "2026-05-01T10:00:00.000Z",
          endDatetime: "2026-05-01T10:30:00.000Z",
          clientName: "自動割当太郎",
          clientEmail: "auto@example.com",
          clientPhone: "080-0000-0000",
          clientBirthdate: "1995-12-31",
        }),
      });
    });
  });

  it("hides the form when the selected slot is past the 15-minute cutoff", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-01T09:45:00.000Z"));
    mockSearchParams.set("startDatetime", "2026-05-01T10:00:00.000Z");
    mockSearchParams.set("endDatetime", "2026-05-01T10:30:00.000Z");

    render(<BookingPage />);

    expect(screen.getByText("この予約枠の受付は終了しました")).toBeDefined();
    expect(screen.queryByPlaceholderText("山田 太郎")).toBeNull();

    vi.useRealTimers();
  });
});
