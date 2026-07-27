import {
  type AuthError,
  verifyAccountAuth,
  verifyConsultantAuth,
  verifyEitherAuth,
} from "@/infrastructure/auth/verify-auth";

const {
  mockVerifyIdToken,
  mockActivateInvitedAccounts,
  mockLoadAccountAuthUser,
  mockLoadConsultantAuthUser,
  mockLoadAuthUser,
} = vi.hoisted(() => ({
  mockVerifyIdToken: vi.fn(),
  mockActivateInvitedAccounts: vi.fn(),
  mockLoadAccountAuthUser: vi.fn(),
  mockLoadConsultantAuthUser: vi.fn(),
  mockLoadAuthUser: vi.fn(),
}));

vi.mock("@/infrastructure/firebase/firebase-auth-admin", () => ({
  verifyIdToken: mockVerifyIdToken,
}));

vi.mock("@/infrastructure/auth/load-auth-context", () => ({
  activateInvitedAccounts: mockActivateInvitedAccounts,
  loadAccountAuthUser: mockLoadAccountAuthUser,
  loadConsultantAuthUser: mockLoadConsultantAuthUser,
  loadAuthUser: mockLoadAuthUser,
}));

function bearerRequest(token: string): Request {
  return new Request("http://localhost/api/auth/me", {
    headers: { Authorization: `Bearer ${token}` },
  });
}

describe("verifyAccountAuth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("activates invited accounts, loads account-only user, and returns it", async () => {
    mockVerifyIdToken.mockResolvedValueOnce({ uid: "user-1" });
    mockLoadAccountAuthUser.mockResolvedValueOnce({
      authUid: "user-1",
      accounts: [
        {
          organizationId: "org-1",
          name: "Org 1",
          roleId: "admin",
          roleName: "管理者",
          permissions: [],
          status: "active",
          createdAt: "2026-01-01T00:00:00.000Z",
        },
      ],
    });

    await expect(verifyAccountAuth(bearerRequest("t"))).resolves.toMatchObject({
      authUid: "user-1",
    });
    expect(mockActivateInvitedAccounts).toHaveBeenCalledWith("user-1");
    expect(mockLoadAccountAuthUser).toHaveBeenCalledWith("user-1");
    expect(mockLoadConsultantAuthUser).not.toHaveBeenCalled();
  });

  it("throws NO_ROLE when accounts are empty", async () => {
    mockVerifyIdToken.mockResolvedValueOnce({ uid: "user-2" });
    mockLoadAccountAuthUser.mockResolvedValueOnce({
      authUid: "user-2",
      accounts: [],
    });

    await expect(verifyAccountAuth(bearerRequest("t"))).rejects.toMatchObject({
      code: "NO_ROLE",
      statusCode: 403,
    } satisfies Partial<AuthError>);
  });
});

describe("verifyConsultantAuth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("loads consultant-only user and returns it (no account activation)", async () => {
    mockVerifyIdToken.mockResolvedValueOnce({ uid: "consultant-1" });
    mockLoadConsultantAuthUser.mockResolvedValueOnce({
      authUid: "consultant-1",
      consultants: [
        {
          organizationId: "org-1",
          name: "相談員 一郎",
          isActive: true,
          createdAt: "2026-01-01T00:00:00.000Z",
        },
      ],
    });

    await expect(
      verifyConsultantAuth(bearerRequest("t")),
    ).resolves.toMatchObject({ authUid: "consultant-1" });
    expect(mockLoadConsultantAuthUser).toHaveBeenCalledWith("consultant-1");
    expect(mockLoadAccountAuthUser).not.toHaveBeenCalled();
    expect(mockActivateInvitedAccounts).not.toHaveBeenCalled();
  });

  it("throws NO_ROLE when consultants are empty", async () => {
    mockVerifyIdToken.mockResolvedValueOnce({ uid: "not-consultant" });
    mockLoadConsultantAuthUser.mockResolvedValueOnce({
      authUid: "not-consultant",
      consultants: [],
    });

    await expect(
      verifyConsultantAuth(bearerRequest("t")),
    ).rejects.toMatchObject({
      code: "NO_ROLE",
      statusCode: 403,
    } satisfies Partial<AuthError>);
  });
});

describe("verifyEitherAuth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("allows account-only users", async () => {
    mockVerifyIdToken.mockResolvedValueOnce({ uid: "admin-1" });
    mockLoadAuthUser.mockResolvedValueOnce({
      authUid: "admin-1",
      accounts: [
        {
          organizationId: "org-1",
          name: "Org 1",
          roleId: "admin",
          roleName: "管理者",
          permissions: [],
          status: "active",
          createdAt: "2026-01-01T00:00:00.000Z",
        },
      ],
      consultants: [],
    });

    await expect(verifyEitherAuth(bearerRequest("t"))).resolves.toMatchObject({
      authUid: "admin-1",
    });
    expect(mockActivateInvitedAccounts).toHaveBeenCalledWith("admin-1");
  });

  it("allows consultant-only users", async () => {
    mockVerifyIdToken.mockResolvedValueOnce({ uid: "consultant-1" });
    mockLoadAuthUser.mockResolvedValueOnce({
      authUid: "consultant-1",
      accounts: [],
      consultants: [
        {
          organizationId: "org-1",
          name: "相談員 一郎",
          isActive: true,
          createdAt: "2026-01-01T00:00:00.000Z",
        },
      ],
    });

    await expect(verifyEitherAuth(bearerRequest("t"))).resolves.toMatchObject({
      authUid: "consultant-1",
    });
  });

  it("throws NO_ROLE when both accounts and consultants are empty", async () => {
    mockVerifyIdToken.mockResolvedValueOnce({ uid: "user-2" });
    mockLoadAuthUser.mockResolvedValueOnce({
      authUid: "user-2",
      accounts: [],
      consultants: [],
    });

    await expect(verifyEitherAuth(bearerRequest("t"))).rejects.toMatchObject({
      code: "NO_ROLE",
      statusCode: 403,
    } satisfies Partial<AuthError>);
  });
});
