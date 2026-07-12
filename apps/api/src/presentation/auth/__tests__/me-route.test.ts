import { describe, expect, it, vi } from "vitest";
import { AuthError, verifyAuth } from "@/infrastructure/auth/verify-auth";
import { GET } from "../me";

vi.mock("@/infrastructure/auth/verify-auth", () => ({
  verifyAuth: vi.fn(),
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

describe("GET /api/auth/me", () => {
  it("returns no-store for success response", async () => {
    vi.mocked(verifyAuth).mockResolvedValueOnce({
      uid: "uid-1",
      accounts: [],
      currentOrganizationId: "org-1",
      currentDisplayName: "User",
    });

    const response = await GET(new Request("http://localhost/api/auth/me"));

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe(
      "no-store, no-cache, must-revalidate, private",
    );
    expect(response.headers.get("Pragma")).toBe("no-cache");
    expect(response.headers.get("Expires")).toBe("0");
  });

  it("returns no-store for auth error response", async () => {
    vi.mocked(verifyAuth).mockRejectedValueOnce(
      new AuthError(401, "UNAUTHORIZED", "Unauthorized"),
    );

    const response = await GET(new Request("http://localhost/api/auth/me"));

    expect(response.status).toBe(401);
    expect(response.headers.get("Cache-Control")).toBe(
      "no-store, no-cache, must-revalidate, private",
    );
  });
});
