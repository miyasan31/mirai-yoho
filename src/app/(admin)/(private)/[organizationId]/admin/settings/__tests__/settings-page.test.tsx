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

vi.mock("next/navigation", () => ({
  useParams: () => ({ organizationId: "org-test" }),
  usePathname: () => "/org-test/admin/settings",
  useRouter: () => ({
    push: vi.fn(),
    replace: (url: string) => {
      mockReplace(url);
      const parsed = new URL(url, "http://localhost");
      currentTabParam = parsed.searchParams.get("tab");
    },
  }),
  useSearchParams: () =>
    new URLSearchParams(currentTabParam ? `tab=${currentTabParam}` : ""),
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
vi.mock("@/components/ui/toast", () => ({
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
vi.mock("@/hooks/use-booking-settings", () => ({
  useAdminBookingSettings: () => ({
    data: {
      data: {
        consultantSelectionEnabled: true,
        businessHours: defaultBusinessHours,
      },
    },
    isLoading: false,
  }),
  useAdminConsultantRanks: () => ({
    data: {
      data: {
        consultantRanks: [
          { rankId: "premium", name: "プレミアム" },
          { rankId: "standard", name: "標準" },
        ],
        defaultConsultantRankId: "standard",
      },
    },
    isLoading: false,
  }),
  useUpdateAdminBookingSettings: () => ({
    mutateAsync: mockMutateAsync,
    isPending: false,
  }),
  useUpdateAdminConsultantRanks: () => ({
    mutateAsync: mockMutateAsync,
    isPending: false,
  }),
}));
vi.mock("@/hooks/use-auth", () => ({
  useAuth: () => mockUseAuth(),
}));

import AdminSettingsPage from "../page";

describe("AdminSettingsPage", () => {
  beforeEach(() => {
    mockUseAuth.mockReturnValue({ role: "admin" });
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
    currentTabParam = null;
  });

  it("shows booking tab by default", () => {
    render(<AdminSettingsPage />);
    const tabPanels = screen.getAllByRole("tabpanel", { hidden: true });
    const businessHoursPanel = tabPanels.find((panel) =>
      panel.id.includes("content-business-hours"),
    );

    expect(screen.getByRole("tab", { name: "予約" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(screen.getByRole("tabpanel", { name: "予約" })).toHaveAttribute(
      "data-state",
      "open",
    );
    expect(businessHoursPanel).toHaveAttribute("data-state", "closed");
  });

  it("opens business-hours tab from query", () => {
    currentTabParam = "business-hours";
    render(<AdminSettingsPage />);
    const tabPanels = screen.getAllByRole("tabpanel", { hidden: true });
    const bookingPanel = tabPanels.find((panel) =>
      panel.id.includes("content-booking"),
    );

    expect(screen.getByRole("tab", { name: "営業時間" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(screen.getByRole("tabpanel", { name: "営業時間" })).toHaveAttribute(
      "data-state",
      "open",
    );
    expect(bookingPanel).toHaveAttribute("data-state", "closed");
  });

  it("updates tab query when switching tabs", async () => {
    const user = userEvent.setup();
    render(<AdminSettingsPage />);

    await user.click(screen.getByRole("tab", { name: "営業時間" }));

    expect(mockReplace).toHaveBeenCalled();
    expect(currentTabParam).toBe("business-hours");
  });

  it("shows consultant rank settings", async () => {
    const user = userEvent.setup();
    render(<AdminSettingsPage />);

    await user.click(screen.getByRole("tab", { name: "相談員ランク" }));
    const panel = screen.getByRole("tabpanel", { name: "相談員ランク" });

    expect(within(panel).getByDisplayValue("プレミアム")).toBeInTheDocument();
    expect(within(panel).getByDisplayValue("標準")).toBeInTheDocument();

    expect(
      within(panel).getByRole("button", { name: "ランクを追加" }),
    ).toBeInTheDocument();
  });

  it("keeps unsaved booking form state across tab switches", async () => {
    const user = userEvent.setup();
    render(<AdminSettingsPage />);

    const bookingCheckbox = screen.getAllByRole("checkbox")[0];
    expect(bookingCheckbox).toBeChecked();
    await user.click(bookingCheckbox);
    expect(bookingCheckbox).not.toBeChecked();

    await user.click(screen.getByRole("tab", { name: "営業時間" }));
    await user.click(screen.getByRole("tab", { name: "予約" }));

    expect(screen.getAllByRole("checkbox")[0]).not.toBeChecked();
  });

  it("saves booking tab with persisted business hours", async () => {
    mockUseAuth.mockReturnValue({ role: "admin" });
    mockMutateAsync.mockResolvedValue({
      data: {
        consultantSelectionEnabled: false,
        businessHours: defaultBusinessHours,
        pricePlanRange: {
          minTotalJPY: 0,
          maxTotalJPY: 100000,
        },
      },
    });

    const user = userEvent.setup();
    render(<AdminSettingsPage />);

    const bookingCheckbox = screen.getAllByRole("checkbox")[0];
    await user.click(bookingCheckbox);
    await user.click(screen.getByRole("button", { name: "保存" }));

    expect(mockMutateAsync).toHaveBeenCalledWith({
      organizationId: "org-test",
      data: {
        consultantSelectionEnabled: false,
        businessHours: defaultBusinessHours,
        pricePlanRange: {
          minTotalJPY: 0,
          maxTotalJPY: 100000,
        },
      },
    });
  });

  it("saves business-hours tab with edited exception", async () => {
    mockUseAuth.mockReturnValue({ role: "admin" });
    mockMutateAsync.mockResolvedValue({
      data: {
        consultantSelectionEnabled: true,
        businessHours: defaultBusinessHours,
      },
    });

    const user = userEvent.setup();
    render(<AdminSettingsPage />);

    await user.click(screen.getByRole("tab", { name: "営業時間" }));
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
        consultantSelectionEnabled: true,
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
    mockUseAuth.mockReturnValue({ role: "admin" });
    const user = userEvent.setup();
    render(<AdminSettingsPage />);

    await user.click(screen.getByRole("tab", { name: "営業時間" }));
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
    mockUseAuth.mockReturnValue({ role: "operator" });
    const user = userEvent.setup();
    render(<AdminSettingsPage />);

    const checkboxes = screen.getAllByRole("checkbox");
    const saveButton = screen.getByRole("button", { name: "保存" });

    expect(
      checkboxes.every((checkbox) => checkbox.hasAttribute("disabled")),
    ).toBe(true);
    expect(saveButton).toBeDisabled();

    await user.click(saveButton);
    expect(mockMutateAsync).not.toHaveBeenCalled();
  });
});
