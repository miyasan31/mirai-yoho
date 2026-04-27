// @vitest-environment jsdom
import { render } from "@testing-library/react";
import type { ReactNode } from "react";

const mockUseAdminClients = vi.fn();
const mockSetQuery = vi.fn(
  async () => new URLSearchParams("page=3&page-size=50&sort-by=2"),
);
const mockUseQueryStates = vi.fn();

type QueryState = {
  page: number;
  "page-size": 20 | 50 | 100;
  "sort-by": "1" | "2";
};

let mockSearchParams = new URLSearchParams("page=3&page-size=50&sort-by=2");
let mockQueryState: QueryState = {
  page: 3,
  "page-size": 50,
  "sort-by": "2",
};

vi.mock("@/hooks/use-admin-clients", () => ({
  useAdminClients: (params?: Record<string, unknown>) =>
    mockUseAdminClients(params),
}));

vi.mock("@/components/list-controls", () => ({
  ListControls: ({ children }: { children?: ReactNode }) => (
    <div>{children}</div>
  ),
}));

vi.mock("@/components/empty-state", () => ({
  EmptyState: ({ message }: { message: string }) => <div>{message}</div>,
}));

vi.mock("@/components/table-skeleton", () => ({
  TableSkeleton: () => <div>loading</div>,
}));

vi.mock("@/components/ui/table", () => ({
  Root: (props: React.ComponentProps<"table">) => <table {...props} />,
  Head: (props: React.ComponentProps<"thead">) => <thead {...props} />,
  Body: (props: React.ComponentProps<"tbody">) => <tbody {...props} />,
  Row: (props: React.ComponentProps<"tr">) => <tr {...props} />,
  Header: (props: React.ComponentProps<"th">) => <th {...props} />,
  Cell: (props: React.ComponentProps<"td">) => <td {...props} />,
}));

vi.mock("@/components/ui/text", () => ({
  Text: ({
    as: Tag = "span",
    children,
    ...props
  }: { as?: string; children: ReactNode } & Record<string, unknown>) => {
    const Element = Tag as unknown as React.ElementType;
    return <Element {...props}>{children}</Element>;
  },
}));

vi.mock("lucide-react", () => ({
  Building2: () => <span>Building2</span>,
}));

vi.mock("styled-system/css", () => ({
  css: () => "",
  cva: () => () => "",
}));

vi.mock("styled-system/jsx", () => {
  const styledProxy = new Proxy(
    (tag: string) =>
      ({ children, ...props }: Record<string, unknown>) => {
        const Element = tag as unknown as React.ElementType;
        return <Element {...props}>{children as ReactNode}</Element>;
      },
    {
      get:
        (_target, tag: string) =>
        ({ children, ...props }: Record<string, unknown>) => {
          const Element = tag as unknown as React.ElementType;
          return <Element {...props}>{children as ReactNode}</Element>;
        },
    },
  );

  return {
    styled: styledProxy,
  };
});

vi.mock("next/navigation", () => ({
  useSearchParams: () => mockSearchParams,
}));

type ParserBuilder<T> = {
  withDefault: (defaultValue: T) => ParserWithDefault<T>;
};

type ParserWithDefault<T> = {
  defaultValue: T;
};

vi.mock("nuqs", () => ({
  parseAsInteger: {
    withDefault: (defaultValue: number): ParserWithDefault<number> => ({
      defaultValue,
    }),
  } satisfies ParserBuilder<number>,
  parseAsStringLiteral: <Literal extends string>(
    _values: readonly Literal[],
  ): ParserBuilder<Literal> => ({
    withDefault: (defaultValue: Literal): ParserWithDefault<Literal> => ({
      defaultValue,
    }),
  }),
  useQueryStates: (...args: unknown[]) => mockUseQueryStates(...args),
}));

import AdminClientsPage from "../page";

describe("AdminClientsPage query params", () => {
  beforeEach(() => {
    mockUseAdminClients.mockReset();
    mockSetQuery.mockClear();
    mockSearchParams = new URLSearchParams("page=3&page-size=50&sort-by=2");
    mockQueryState = {
      page: 3,
      "page-size": 50,
      "sort-by": "2",
    };
    mockUseQueryStates.mockReset();
    mockUseQueryStates.mockReturnValue([mockQueryState, mockSetQuery]);
    mockUseAdminClients.mockReturnValue({
      data: {
        data: {
          clients: [],
          pagination: {
            page: 3,
            pageSize: 50,
            total: 0,
            totalPages: 1,
          },
        },
      },
      isLoading: false,
    });
  });

  it("passes URL query values to API query params", () => {
    render(<AdminClientsPage />);

    expect(mockUseAdminClients).toHaveBeenCalledWith({
      page: 3,
      pageSize: 50,
      sortBy: "updatedAt",
      sortOrder: "desc",
    });
  });
});
