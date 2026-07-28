// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";

vi.mock("@tanstack/react-router", () => ({
  useParams: () => ({ organizationId: "org-test", id: "booking-1" }),
  useNavigate: () => vi.fn(),
  Link: ({ to, children }: { to: string; children: React.ReactNode }) => (
    <a href={to}>{children}</a>
  ),
}));

const mockUseConsultantAppraisalReport = vi.fn();
const mockSaveDraft = vi.fn();
const mockPublish = vi.fn();

vi.mock("@/hooks/use-consultant-appraisal-reports", () => ({
  useConsultantAppraisalReport: () => mockUseConsultantAppraisalReport(),
  useSaveConsultantAppraisalReportDraft: () => mockSaveDraft(),
  usePublishConsultantAppraisalReport: () => mockPublish(),
}));

vi.mock("@mirai-yoho/console-core/hooks/use-organization-routing", () => ({
  useOrganizationRouting: () => ({
    organizationId: "org-test",
    buildPath: (path: string) => `/org-test${path}`,
  }),
}));

vi.mock("@mirai-yoho/console-core/query/invalidation-map", () => ({
  invalidateAfter: { appraisalReportMutation: vi.fn() },
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
  absoluteCenter: () => ({}),
  button: Object.assign(() => ({}), {
    splitVariantProps: (props: Record<string, unknown>) => [{}, props],
  }),
  group: () => ({}),
  spinner: () => ({}),
  tooltip: () => ({}),
}));

vi.mock("@mirai-yoho/ui/components/ui/toast", () => ({
  toaster: { create: vi.fn() },
}));

vi.mock("@mirai-yoho/ui/components/ui/badge", () => ({
  Badge: ({ children }: { children: React.ReactNode }) => (
    <span>{children}</span>
  ),
}));

vi.mock("@mirai-yoho/ui/components/ui/button", () => ({
  Button: ({
    children,
    asChild: _asChild,
    loading: _loading,
    loadingText: _loadingText,
    ...props
  }: { children: ReactNode } & Record<string, unknown>) => (
    <button type="button" {...props}>
      {children}
    </button>
  ),
}));

vi.mock("@mirai-yoho/ui/components/ui/icon-button", () => ({
  IconButton: ({
    asChild: _asChild,
    children,
    ...props
  }: { asChild?: boolean; children: React.ReactNode } & Record<
    string,
    unknown
  >) => <button {...props}>{children}</button>,
}));

vi.mock("@mirai-yoho/ui/components/ui/input", () => ({
  Input: (props: React.ComponentProps<"input">) => <input {...props} />,
}));

vi.mock("@mirai-yoho/ui/components/ui/textarea", () => ({
  Textarea: (props: React.ComponentProps<"textarea">) => (
    <textarea {...props} />
  ),
}));

vi.mock("@mirai-yoho/ui/components/ui/skeleton", () => ({
  Skeleton: (props: React.ComponentProps<"div">) => (
    <div data-testid="skeleton" {...props} />
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

vi.mock("@mirai-yoho/ui/components/ui/tooltip", () => ({
  Tooltip: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

vi.mock("@mirai-yoho/ui/components/ui/field", () => ({
  Root: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  // 本物の Field.Root が持つ label と input の紐付けはモックでは再現しない
  Label: ({ children }: { children: React.ReactNode }) => (
    <span>{children}</span>
  ),
  HelperText: ({ children }: { children: React.ReactNode }) => (
    <small>{children}</small>
  ),
  ErrorText: ({ children }: { children: React.ReactNode }) => (
    <strong>{children}</strong>
  ),
}));

vi.mock("@mirai-yoho/ui/components/ui/dialog", () => ({
  Root: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Trigger: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  Backdrop: () => null,
  Positioner: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  Content: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  Header: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  Title: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
  Body: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Footer: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  CloseTrigger: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
}));

vi.mock("lucide-react", () => ({
  ArrowLeft: () => <span>ArrowLeft</span>,
}));

import ConsultantAppraisalReportEditPage from "../page";

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

// Field.Root をモックしているため label と input が紐づかない。id で直接引く
function field(id: string): HTMLInputElement | HTMLTextAreaElement {
  const element = document.getElementById(id);
  if (!element) throw new Error(`field not found: ${id}`);
  return element as HTMLInputElement | HTMLTextAreaElement;
}

const publishedReport = {
  reportId: "report-1",
  bookingId: "booking-1",
  status: "published" as const,
  publishedAt: "2026-07-09T00:00:00.000Z",
  updatedAt: "2026-07-09T00:00:00.000Z",
  createdAt: "2026-07-08T00:00:00.000Z",
  title: "2026年下半期の運勢",
  customerName: "山田 花子",
  birthDate: "1990-01-01",
  appraisalDate: "2026-07-08",
  theme: "仕事運",
  currentSituation: "転職を検討中",
  result: "秋以降が good タイミング",
  luckyAction: "朝の散歩",
  summary: "焦らず準備を進める",
};

describe("ConsultantAppraisalReportEditPage", () => {
  beforeEach(() => {
    mockSaveDraft.mockReturnValue({ mutateAsync: vi.fn(), isPending: false });
    mockPublish.mockReturnValue({ mutateAsync: vi.fn(), isPending: false });
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("発行済みの鑑定書は全項目が readOnly になり保存・発行できない", async () => {
    mockUseConsultantAppraisalReport.mockReturnValue({
      data: {
        data: {
          report: publishedReport,
          editable: false,
          memoDefaults: {
            customerName: "",
            birthDate: "",
            appraisalDate: "",
          },
        },
      },
      isLoading: false,
    });

    render(<ConsultantAppraisalReportEditPage />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText("発行済み")).toBeInTheDocument();
    });

    expect(field("title")).toHaveAttribute("readonly");
    expect(field("result")).toHaveAttribute("readonly");
    expect(field("summary")).toHaveAttribute("readonly");
    expect(screen.queryByText("下書きを保存")).not.toBeInTheDocument();
    expect(screen.queryByText("発行する")).not.toBeInTheDocument();
  });

  it("未作成のときは鑑定メモの値をヘッダの初期値に引き継ぐ", async () => {
    mockUseConsultantAppraisalReport.mockReturnValue({
      data: {
        data: {
          report: null,
          editable: true,
          memoDefaults: {
            customerName: "佐藤 太郎",
            birthDate: "1985-05-05",
            appraisalDate: "2026-07-08",
          },
        },
      },
      isLoading: false,
    });

    render(<ConsultantAppraisalReportEditPage />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(field("customerName")).toHaveValue("佐藤 太郎");
    });
    expect(field("birthDate")).toHaveValue("1985-05-05");
    expect(field("appraisalDate")).toHaveValue("2026-07-08");
    expect(field("result")).toHaveValue("");
    expect(screen.getByText("下書きを保存")).toBeInTheDocument();
    expect(screen.getAllByText("発行する").length).toBeGreaterThanOrEqual(1);
  });

  it("鑑定の終了時刻前は保存・発行ボタンが無効になる", async () => {
    mockUseConsultantAppraisalReport.mockReturnValue({
      data: {
        data: {
          report: null,
          editable: false,
          memoDefaults: {
            customerName: "",
            birthDate: "",
            appraisalDate: "",
          },
        },
      },
      isLoading: false,
    });

    render(<ConsultantAppraisalReportEditPage />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(
        screen.getByText(
          "鑑定の終了時刻を過ぎた予約でのみ鑑定書を作成できます。",
        ),
      ).toBeInTheDocument();
    });
    expect(screen.getByText("下書きを保存")).toBeDisabled();
  });
});
