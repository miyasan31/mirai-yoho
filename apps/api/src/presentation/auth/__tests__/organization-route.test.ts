import { describe, expect, it, vi } from "vitest";
import { setLastOrganizationId } from "@/infrastructure/auth/load-auth-context";
import { getAccount } from "@/infrastructure/auth/require-role";
import { AuthError, verifyEitherAuth } from "@/infrastructure/auth/verify-auth";
import { PATCH } from "../organization";

vi.mock("@/infrastructure/auth/verify-auth", () => ({
  verifyEitherAuth: vi.fn(),
  AuthError: class extends Error {
    statusCode: number;
    code: string;

    constructor(statusCode: number, code: string, message: string) {
      super(message);
      this.statusCode = statusCode;
      this.code = code;
    }
  },
}));

vi.mock("@/infrastructure/auth/require-role", () => ({
  getAccount: vi.fn(),
}));

vi.mock("@/infrastructure/auth/load-auth-context", () => ({
  setLastOrganizationId: vi.fn(),
}));

describe("PATCH /api/auth/organization", () => {
  it("returns no-store for success response", async () => {
    vi.mocked(verifyEitherAuth).mockResolvedValueOnce({
      authUid: "authUid-1",
      accounts: [],
      consultants: [],
      currentOrganizationId: "org-1",
      currentDisplayName: "User",
    });
    vi.mocked(getAccount).mockReturnValueOnce({
      roleId: "admin",
      roleName: "管理者",
      permissions: [],
      organizationId: "org-1",
      name: "テスト組織",
      status: "active",
      createdAt: "2026-04-01T00:00:00+09:00",
    });

    const response = await PATCH(
      new Request("http://localhost/api/auth/organization", {
        method: "PATCH",
        body: JSON.stringify({ organizationId: "org-1" }),
      }),
    );

    expect(response.status).toBe(200);
    expect(setLastOrganizationId).toHaveBeenCalledWith("authUid-1", "org-1");
    expect(response.headers.get("Cache-Control")).toBe(
      "no-store, no-cache, must-revalidate, private",
    );
  });

  it("returns no-store for auth error response", async () => {
    vi.mocked(verifyEitherAuth).mockRejectedValueOnce(
      new AuthError(401, "UNAUTHORIZED", "Unauthorized"),
    );

    const response = await PATCH(
      new Request("http://localhost/api/auth/organization", {
        method: "PATCH",
        body: JSON.stringify({ organizationId: "org-1" }),
      }),
    );

    expect(response.status).toBe(401);
    expect(response.headers.get("Cache-Control")).toBe(
      "no-store, no-cache, must-revalidate, private",
    );
  });
});
