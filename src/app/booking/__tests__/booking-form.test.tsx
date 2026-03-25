// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
  useSearchParams: () => ({
    get: (key: string) => (key === "slotId" ? "slot-1" : null),
  }),
}));

const mockMutateAsync = vi.fn();
vi.mock("@/generated/api/booking/booking", () => ({
  useCreateBooking: () => ({
    mutateAsync: mockMutateAsync,
    isPending: false,
  }),
}));

vi.mock("styled-system/css", () => ({
  css: () => "",
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

import BookingPage from "../page";

describe("BookingPage", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("displays the booking form with required fields", () => {
    render(<BookingPage />);

    expect(screen.getByPlaceholderText("山田 太郎")).toBeDefined();
    expect(screen.getByPlaceholderText("example@email.com")).toBeDefined();
    expect(screen.getByPlaceholderText("090-1234-5678")).toBeDefined();
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
    await user.click(screen.getByText("お支払いへ進む"));

    await waitFor(() => {
      expect(mockMutateAsync).not.toHaveBeenCalled();
    });
  });

  it("submits the form with valid data", async () => {
    mockMutateAsync.mockResolvedValue({
      data: {
        bookingId: "b1",
        clientSecret: "cs_1",
        zoomUrl: "https://zoom.us/j/1",
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
    await user.click(screen.getByText("お支払いへ進む"));

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledWith({
        data: expect.objectContaining({
          slotId: "slot-1",
          clientName: "テスト太郎",
          clientEmail: "test@example.com",
          clientPhone: "090-0000-0000",
        }),
      });
    });
  });
});
