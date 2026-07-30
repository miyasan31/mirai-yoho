// @vitest-environment jsdom
import type { SettlementStatement } from "@mirai-yoho/api-client/schemas";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";

const mockUseConsultantSettlementStatement = vi.fn();

vi.mock("@/hooks/use-consultant-settlement-statement", () => ({
  useConsultantSettlementStatement: (params: Record<string, string>) =>
    mockUseConsultantSettlementStatement(params),
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

vi.mock("styled-system/recipes", () => ({
  button: Object.assign(() => ({}), {
    splitVariantProps: (props: Record<string, unknown>) => [{}, props],
  }),
  input: Object.assign(() => ({}), {
    splitVariantProps: (props: Record<string, unknown>) => [{}, props],
  }),
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

vi.mock("@mirai-yoho/ui/components/ui/button", () => ({
  Button: ({
    children,
    ...props
  }: { children: React.ReactNode } & Record<string, unknown>) => (
    <button type="button" {...props}>
      {children}
    </button>
  ),
}));

vi.mock("@mirai-yoho/ui/components/ui/input", () => ({
  Input: (props: Record<string, unknown>) => <input {...props} />,
}));

vi.mock("@mirai-yoho/ui/components/ui/skeleton", () => ({
  Skeleton: (props: React.ComponentProps<"div">) => (
    <div data-testid="skeleton" {...props} />
  ),
}));

vi.mock("@mirai-yoho/ui/components/ui/table", () => {
  const passthrough =
    (Tag: string) =>
    ({ children, ...props }: Record<string, unknown>) => {
      const Element = Tag as unknown as React.ElementType;
      return <Element {...props}>{children as React.ReactNode}</Element>;
    };
  return {
    Root: passthrough("table"),
    Head: passthrough("thead"),
    Body: passthrough("tbody"),
    Row: passthrough("tr"),
    Header: passthrough("th"),
    Cell: passthrough("td"),
  };
});

vi.mock("@mirai-yoho/ui/components/ui/checkbox", () => {
  const noop = ({ children }: { children?: React.ReactNode }) => (
    <>{children}</>
  );
  return {
    Root: ({
      children,
      checked,
      onCheckedChange,
    }: {
      children: React.ReactNode;
      checked: boolean;
      onCheckedChange: (details: { checked: boolean }) => void;
    }) => (
      <label>
        <input
          type="checkbox"
          checked={checked}
          onChange={(event) =>
            onCheckedChange({ checked: event.target.checked })
          }
        />
        {children}
      </label>
    ),
    Control: noop,
    Indicator: noop,
    Label: noop,
    HiddenInput: () => null,
  };
});

vi.mock("@mirai-yoho/ui/components/ui/select", () => {
  const noop = ({ children }: { children?: React.ReactNode }) => (
    <>{children}</>
  );
  return {
    Root: noop,
    Label: noop,
    Control: noop,
    Trigger: noop,
    ValueText: () => null,
    Indicator: () => null,
    Positioner: noop,
    Content: noop,
    Item: noop,
    ItemText: noop,
    ItemIndicator: () => null,
  };
});

vi.mock("@ark-ui/react/select", () => ({
  createListCollection: ({ items }: { items: unknown[] }) => ({ items }),
}));

import SettlementStatementPage from "../page";

const STATEMENT: SettlementStatement = {
  month: "2026-06",
  issuedAt: "2026-07-01T00:00:00.000Z",
  issuedTo: { companyName: "みらい予報株式会社", address: "東京都渋谷区1-1-1" },
  issuer: { name: "山田花子", address: null },
  consultantStatusName: "標準",
  usesOfficeAddress: false,
  items: [
    {
      bookingId: "booking-1",
      startsAt: "2026-06-15T03:00:00.000Z",
      endsAt: "2026-06-15T03:30:00.000Z",
      customerName: "佐藤太郎",
      pricePlanName: "30分プラン",
      amountJPY: 110000,
    },
  ],
  grossJPY: 110000,
  systemFeeRatePercent: 30,
  systemFeeJPY: 33000,
  systemFeeTaxJPY: 3300,
  officeFeeJPY: 0,
  settlementAmountJPY: 73700,
};

const OFFICE_STATEMENT: SettlementStatement = {
  ...STATEMENT,
  usesOfficeAddress: true,
  issuer: { name: "山田花子", address: "東京都渋谷区2-2-2 みらいビル" },
  officeFeeJPY: 500,
  settlementAmountJPY: 73200,
};

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("SettlementStatementPage", () => {
  it("renders the statement summary and detail rows", () => {
    mockUseConsultantSettlementStatement.mockReturnValue({
      data: { data: STATEMENT },
      isLoading: false,
    });

    render(<SettlementStatementPage />);

    expect(screen.getByText("借受金合計")).toBeInTheDocument();
    // 明細行の金額と借受金合計の 2 箇所に出る
    expect(screen.getAllByText("¥110,000")).toHaveLength(2);
    expect(screen.getByText("システム利用料（30%）")).toBeInTheDocument();
    expect(screen.getByText("− ¥33,000")).toBeInTheDocument();
    expect(screen.getByText("消費税（10%）")).toBeInTheDocument();
    expect(screen.getByText("− ¥3,300")).toBeInTheDocument();
    expect(screen.getByText("精算料")).toBeInTheDocument();
    expect(screen.getByText("¥73,700")).toBeInTheDocument();
    expect(screen.getByText("佐藤太郎")).toBeInTheDocument();
    expect(screen.queryByText("事務所利用料")).not.toBeInTheDocument();
  });

  it("defaults to the previous month and requests it without the office fee", () => {
    vi.setSystemTime(new Date("2026-07-20T00:00:00.000Z"));
    mockUseConsultantSettlementStatement.mockReturnValue({
      data: { data: STATEMENT },
      isLoading: false,
    });

    render(<SettlementStatementPage />);

    expect(mockUseConsultantSettlementStatement).toHaveBeenCalledWith({
      month: "2026-06",
      "uses-office-address": "false",
    });
    vi.useRealTimers();
  });

  it("requests the office fee once the checkbox is checked", () => {
    mockUseConsultantSettlementStatement.mockReturnValue({
      data: { data: STATEMENT },
      isLoading: false,
    });

    render(<SettlementStatementPage />);
    mockUseConsultantSettlementStatement.mockReturnValue({
      data: { data: OFFICE_STATEMENT },
      isLoading: false,
    });
    fireEvent.click(screen.getByRole("checkbox"));

    expect(mockUseConsultantSettlementStatement).toHaveBeenLastCalledWith(
      expect.objectContaining({ "uses-office-address": "true" }),
    );
    expect(screen.getByText("事務所利用料")).toBeInTheDocument();
    expect(screen.getByText("− ¥500")).toBeInTheDocument();
    expect(screen.getByText("¥73,200")).toBeInTheDocument();
    expect(
      screen.getByText("東京都渋谷区2-2-2 みらいビル"),
    ).toBeInTheDocument();
  });

  it("shows an empty message when nothing was charged", () => {
    mockUseConsultantSettlementStatement.mockReturnValue({
      data: {
        data: {
          ...STATEMENT,
          items: [],
          grossJPY: 0,
          systemFeeJPY: 0,
          systemFeeTaxJPY: 0,
          settlementAmountJPY: 0,
        },
      },
      isLoading: false,
    });

    render(<SettlementStatementPage />);

    expect(
      screen.getByText("対象月に精算対象の鑑定はありません。"),
    ).toBeInTheDocument();
  });

  it("shows a skeleton while loading", () => {
    mockUseConsultantSettlementStatement.mockReturnValue({
      data: undefined,
      isLoading: true,
    });

    render(<SettlementStatementPage />);

    expect(screen.getByTestId("skeleton")).toBeInTheDocument();
  });

  it("disables the PDF save button when the issuer name is cleared", () => {
    mockUseConsultantSettlementStatement.mockReturnValue({
      data: { data: OFFICE_STATEMENT },
      isLoading: false,
    });

    render(<SettlementStatementPage />);
    fireEvent.click(screen.getByRole("checkbox"));

    const nameInput = screen.getByLabelText("発行者名") as HTMLInputElement;
    expect(nameInput.value).toBe("山田花子");
    expect(
      screen.getByRole("button", { name: /PDFとして保存/ }),
    ).not.toBeDisabled();

    fireEvent.change(nameInput, { target: { value: "" } });

    expect(
      screen.getByRole("button", { name: /PDFとして保存/ }),
    ).toBeDisabled();
  });

  it("disables the PDF save button when the address is empty and the office address checkbox is unchecked", () => {
    mockUseConsultantSettlementStatement.mockReturnValue({
      data: { data: STATEMENT },
      isLoading: false,
    });

    render(<SettlementStatementPage />);

    expect(
      screen.getByRole("button", { name: /PDFとして保存/ }),
    ).toBeDisabled();

    const addressInput = screen.getByLabelText("住所") as HTMLInputElement;
    fireEvent.change(addressInput, { target: { value: "東京都新宿区1-1-1" } });

    expect(
      screen.getByRole("button", { name: /PDFとして保存/ }),
    ).not.toBeDisabled();
  });

  it("does not require the address input once the office address checkbox is checked", () => {
    mockUseConsultantSettlementStatement.mockReturnValue({
      data: { data: STATEMENT },
      isLoading: false,
    });

    render(<SettlementStatementPage />);
    mockUseConsultantSettlementStatement.mockReturnValue({
      data: { data: OFFICE_STATEMENT },
      isLoading: false,
    });
    fireEvent.click(screen.getByRole("checkbox"));

    const addressInput = screen.getByLabelText("住所") as HTMLInputElement;
    expect(addressInput).toBeDisabled();
    expect(
      screen.getByRole("button", { name: /PDFとして保存/ }),
    ).not.toBeDisabled();
  });
});
