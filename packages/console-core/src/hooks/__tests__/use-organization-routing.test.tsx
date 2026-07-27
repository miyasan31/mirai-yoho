// @vitest-environment jsdom
import { renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

let mockParams: Record<string, unknown> = {};
let mockPathname = "/";

const mockNavigate = vi.fn();

vi.mock("@tanstack/react-router", () => ({
  useParams: () => mockParams,
  useLocation: (options: {
    select: (location: { pathname: string }) => string;
  }) => options.select({ pathname: mockPathname }),
  useNavigate: () => mockNavigate,
}));

import { useOrganizationRouting } from "../use-organization-routing";

describe("useOrganizationRouting", () => {
  it("組織 ID をルートパラメータから取得する", () => {
    mockParams = { organizationId: "org-a" };
    mockPathname = "/org-a/bookings";

    const { result } = renderHook(() => useOrganizationRouting());

    expect(result.current.organizationId).toBe("org-a");
    expect(result.current.buildPath("/bookings")).toBe("/org-a/bookings");
  });

  it("組織切り替えでは切り替え先のホームへ遷移する", () => {
    mockParams = { organizationId: "org-a", id: "consultant-1" };
    mockPathname = "/org-a/consultants/consultant-1";

    const { result } = renderHook(() => useOrganizationRouting());
    result.current.replaceOrganization("org-b");

    // 他組織に存在しない ID を引き継がないよう、詳細ページからでもホームへ送る
    expect(mockNavigate).toHaveBeenCalledWith({ href: "/org-b/home" });
  });
});
