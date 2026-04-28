import { type AuthError, verifyAuth } from "@/infrastructure/auth/verify-auth";

const { mockVerifyIdToken, mockActivateInvitedMemberships, mockLoadAuthUser } =
  vi.hoisted(() => ({
    mockVerifyIdToken: vi.fn(),
    mockActivateInvitedMemberships: vi.fn(),
    mockLoadAuthUser: vi.fn(),
  }));

vi.mock("@/infrastructure/firebase/firebase-auth-admin", () => ({
  verifyIdToken: mockVerifyIdToken,
}));

vi.mock("@/infrastructure/auth/load-auth-context", () => ({
  activateInvitedMemberships: mockActivateInvitedMemberships,
  loadAuthUser: mockLoadAuthUser,
}));

describe("verifyAuth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("activates invited memberships before loading auth user", async () => {
    mockVerifyIdToken.mockResolvedValueOnce({ uid: "user-1" });
    mockLoadAuthUser.mockResolvedValueOnce({
      uid: "user-1",
      memberships: [
        {
          organizationId: "org-1",
          organizationName: "Org 1",
          role: "admin",
          status: "active",
          createdAt: "2026-01-01T00:00:00.000Z",
        },
      ],
      currentOrganizationId: "org-1",
      currentDisplayName: "Admin User",
    });

    const request = new Request("http://localhost/api/auth/me", {
      headers: {
        Authorization: "Bearer test-token",
      },
    });

    await verifyAuth(request);

    expect(mockVerifyIdToken).toHaveBeenCalledWith("test-token");
    expect(mockActivateInvitedMemberships).toHaveBeenCalledWith("user-1");
    expect(mockLoadAuthUser).toHaveBeenCalledWith("user-1");
    expect(
      mockActivateInvitedMemberships.mock.invocationCallOrder[0],
    ).toBeLessThan(mockLoadAuthUser.mock.invocationCallOrder[0]);
  });

  it("allows invited users after activation across all roles", async () => {
    const roles = ["admin", "operator", "consultant"] as const;

    for (const role of roles) {
      mockVerifyIdToken.mockResolvedValueOnce({ uid: `user-${role}` });
      mockLoadAuthUser.mockResolvedValueOnce({
        uid: `user-${role}`,
        memberships: [
          {
            organizationId: "org-1",
            organizationName: "Org 1",
            role,
            status: "active",
            createdAt: "2026-01-01T00:00:00.000Z",
          },
        ],
        currentOrganizationId: "org-1",
        currentDisplayName: `${role} user`,
      });

      const request = new Request("http://localhost/api/auth/me", {
        headers: {
          Authorization: `Bearer token-${role}`,
        },
      });

      await expect(verifyAuth(request)).resolves.toMatchObject({
        uid: `user-${role}`,
      });
      expect(mockActivateInvitedMemberships).toHaveBeenCalledWith(
        `user-${role}`,
      );
    }
  });

  it("throws NO_ROLE when memberships are still empty", async () => {
    mockVerifyIdToken.mockResolvedValueOnce({ uid: "user-2" });
    mockLoadAuthUser.mockResolvedValueOnce({
      uid: "user-2",
      memberships: [],
      currentOrganizationId: null,
      currentDisplayName: null,
    });

    const request = new Request("http://localhost/api/auth/me", {
      headers: {
        Authorization: "Bearer token-no-role",
      },
    });

    await expect(verifyAuth(request)).rejects.toMatchObject({
      code: "NO_ROLE",
      statusCode: 403,
    } satisfies Partial<AuthError>);
    expect(mockActivateInvitedMemberships).toHaveBeenCalledWith("user-2");
  });
});
