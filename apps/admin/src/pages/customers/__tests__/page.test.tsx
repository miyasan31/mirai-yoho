// @vitest-environment jsdom
import { render } from "@testing-library/react";
import type * as React from "react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockUseAdminCustomers = vi.fn();
const mockNavigate = vi.fn();

type QueryState = {
  page: number;
  "page-size": 20 | 50 | 100;
  "sort-by": 1 | 2;
};

let mockSearch: QueryState = {
  page: 3,
  "page-size": 50,
  "sort-by": 2,
};

vi.mock("@/hooks/use-admin-customers", () => ({
  useAdminCustomers: (params?: Record<string, unknown>) =>
    mockUseAdminCustomers(params),
}));

vi.mock("@mirai-yoho/ui/components/list-controls", () => ({
  ListControls: ({ children }: { children?: ReactNode }) => (
    <div>{children}</div>
  ),
}));

vi.mock("@mirai-yoho/ui/components/empty-state", () => ({
  EmptyState: ({ message }: { message: string }) => <div>{message}</div>,
}));

vi.mock("@mirai-yoho/ui/components/table-skeleton", () => ({
  TableSkeleton: () => <div>loading</div>,
}));

vi.mock("@mirai-yoho/ui/components/ui/table", () => ({
  Root: (props: React.ComponentProps<"table">) => <table {...props} />,
  Head: (props: React.ComponentProps<"thead">) => <thead {...props} />,
  Body: (props: React.ComponentProps<"tbody">) => <tbody {...props} />,
  Row: (props: React.ComponentProps<"tr">) => <tr {...props} />,
  Header: (props: React.ComponentProps<"th">) => <th {...props} />,
  Cell: (props: React.ComponentProps<"td">) => <td {...props} />,
}));

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

vi.mock("@tanstack/react-router", () => ({
  useSearch: () => mockSearch,
  useNavigate: () => mockNavigate,
}));

import AdminCustomersPage from "../page";

describe("AdminCustomersPage query params", () => {
  beforeEach(() => {
    mockUseAdminCustomers.mockReset();
    mockNavigate.mockClear();
    mockSearch = {
      page: 3,
      "page-size": 50,
      "sort-by": 2,
    };
    mockUseAdminCustomers.mockReturnValue({
      data: {
        data: {
          customers: [],
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
    render(<AdminCustomersPage />);

    expect(mockUseAdminCustomers).toHaveBeenCalledWith({
      page: 3,
      pageSize: 50,
      sortBy: "updatedAt",
      sortOrder: "desc",
    });
  });
});
