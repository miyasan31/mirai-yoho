// @vitest-environment jsdom
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const mockMutateAsync = vi.fn();
const mockUseAuth = vi.fn();
const mockToasterCreate = vi.fn();
const mockReplace = vi.fn();
let currentTabParam: string | null = null;

class MockResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

vi.stubGlobal("ResizeObserver", MockResizeObserver);

vi.mock("@tanstack/react-router", () => ({
  useParams: () => ({ organizationId: "org-test" }),
  useLocation: ({
    select,
  }: {
    select: (location: { pathname: string }) => string;
  }) => select({ pathname: "/org-test/settings" }),
  useSearch: () => (currentTabParam ? { tab: currentTabParam } : {}),
  useNavigate:
    () =>
    (options: {
      search: (previous: Record<string, unknown>) => Record<string, unknown>;
      replace?: boolean;
    }) => {
      mockReplace(options);
      const nextSearch = options.search(
        currentTabParam ? { tab: currentTabParam } : {},
      );
      currentTabParam =
        typeof nextSearch.tab === "string" ? nextSearch.tab : null;
    },
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

vi.mock("@mirai-yoho/ui/components/ui/button", () => ({
  Button: (props: React.ComponentProps<"button">) => (
    <button type={props.type ?? "button"} {...props}>
      {props.children}
    </button>
  ),
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
    create: (...args: unknown[]) => mockToasterCreate(...args),
  },
}));

const defaultBusinessHours = {
  weekly: Array.from({ length: 7 }, (_, dayOfWeek) => ({
    dayOfWeek,
    isClosed: false,
    timeWindows: [{ startTime: "10:00", endTime: "17:00" }],
  })),
  includePublicHolidays: true,
  exceptions: [],
};
vi.mock("@/hooks/use-console-booking-settings", () => ({
  useConsoleBookingSettings: () => ({
    data: {
      data: {
        businessHours: defaultBusinessHours,
      },
    },
    isLoading: false,
  }),
  useConsoleConsultantStatuses: () => ({
    data: {
      data: {
        consultantStatuses: [
          { statusId: "premium", name: "プレミアム" },
          { statusId: "standard", name: "標準" },
        ],
        defaultConsultantStatusId: "standard",
      },
    },
    isLoading: false,
  }),
  useUpdateConsoleBookingSettings: () => ({
    mutateAsync: mockMutateAsync,
    isPending: false,
  }),
  useUpdateConsoleConsultantStatuses: () => ({
    mutateAsync: mockMutateAsync,
    isPending: false,
  }),
}));
vi.mock("@/hooks/use-auth", () => ({
  useAuth: () => mockUseAuth(),
}));

import ConsoleSettingsPage from "../page";

describe("ConsoleSettingsPage", () => {
  beforeEach(() => {
    mockUseAuth.mockReturnValue({
      roleId: "admin",
      hasPermission: () => true,
    });
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
    currentTabParam = null;
  });

  it("shows business-hours tab by default", () => {
    render(<ConsoleSettingsPage />);

    expect(screen.getByRole("tab", { name: "営業時間" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(screen.getByRole("tabpanel", { name: "営業時間" })).toHaveAttribute(
      "data-state",
      "open",
    );
  });

  it("opens price tab from query", () => {
    currentTabParam = "price";
    render(<ConsoleSettingsPage />);

    expect(screen.getByRole("tab", { name: "料金" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(screen.getByRole("tabpanel", { name: "料金" })).toHaveAttribute(
      "data-state",
      "open",
    );
  });

  it("updates tab query when switching tabs", async () => {
    const user = userEvent.setup();
    render(<ConsoleSettingsPage />);

    await user.click(screen.getByRole("tab", { name: "料金" }));

    expect(mockReplace).toHaveBeenCalled();
    expect(currentTabParam).toBe("price");
  });

  it("shows consultant status settings", async () => {
    const user = userEvent.setup();
    render(<ConsoleSettingsPage />);

    await user.click(screen.getByRole("tab", { name: "占い師ステータス" }));
    const panel = screen.getByRole("tabpanel", { name: "占い師ステータス" });

    expect(within(panel).getByDisplayValue("プレミアム")).toBeInTheDocument();
    expect(within(panel).getByDisplayValue("標準")).toBeInTheDocument();

    expect(
      within(panel).getByRole("button", { name: "ステータスを追加" }),
    ).toBeInTheDocument();
  });

  it("saves business-hours tab with edited exception", async () => {
    mockUseAuth.mockReturnValue({ roleId: "admin", hasPermission: () => true });
    mockMutateAsync.mockResolvedValue({
      data: {
        businessHours: defaultBusinessHours,
      },
    });

    const user = userEvent.setup();
    render(<ConsoleSettingsPage />);

    await user.click(screen.getByRole("button", { name: "例外日を追加" }));

    const dateInputs = Array.from(
      document.querySelectorAll<HTMLInputElement>('input[type="date"]'),
    );
    fireEvent.change(dateInputs[0], { target: { value: "2026-08-13" } });

    await user.click(screen.getByText("休業"));

    const timeInputs = Array.from(
      document.querySelectorAll<HTMLInputElement>('input[type="time"]'),
    ).filter((input) => input.value === "10:00");
    const lastStart = timeInputs[timeInputs.length - 1];
    fireEvent.change(lastStart, { target: { value: "13:00" } });

    await user.click(screen.getByRole("button", { name: "保存" }));

    expect(mockMutateAsync).toHaveBeenCalledWith({
      organizationId: "org-test",
      data: {
        businessHours: {
          weekly: defaultBusinessHours.weekly,
          includePublicHolidays: true,
          exceptions: [
            {
              startDate: "2026-08-13",
              endDate: "2026-08-13",
              isClosed: false,
              timeWindows: [{ startTime: "13:00", endTime: "17:00" }],
            },
          ],
        },
        pricePlanRange: {
          minTotalJPY: 0,
          maxTotalJPY: 100000,
        },
      },
    });
  });

  it("shows validation error on invalid business-hours range", async () => {
    mockUseAuth.mockReturnValue({ roleId: "admin", hasPermission: () => true });
    const user = userEvent.setup();
    render(<ConsoleSettingsPage />);

    await user.click(screen.getByRole("button", { name: "例外日を追加" }));

    const dateInput =
      document.querySelector<HTMLInputElement>('input[type="date"]');
    if (!dateInput) {
      throw new Error("date input not found");
    }
    fireEvent.change(dateInput, { target: { value: "2026-08-13" } });

    await user.click(screen.getByText("休業"));

    const startInput = Array.from(
      document.querySelectorAll<HTMLInputElement>('input[type="time"]'),
    ).filter((input) => input.value === "10:00");
    const lastStart = startInput[startInput.length - 1];
    fireEvent.change(lastStart, { target: { value: "18:00" } });

    await user.click(screen.getByRole("button", { name: "保存" }));
    expect(mockMutateAsync).not.toHaveBeenCalled();
    expect(mockToasterCreate).toHaveBeenCalledWith({
      type: "error",
      title: "例外日の入力内容が不正です",
    });
  });

  it("operator cannot edit settings", async () => {
    mockUseAuth.mockReturnValue({
      roleId: "operator",
      hasPermission: () => false,
    });
    const user = userEvent.setup();
    render(<ConsoleSettingsPage />);

    const saveButton = screen.getByRole("button", { name: "保存" });
    expect(saveButton).toBeDisabled();

    await user.click(saveButton);
    expect(mockMutateAsync).not.toHaveBeenCalled();
  });
});
