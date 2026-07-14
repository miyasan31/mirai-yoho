import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  class MockAuthError extends Error {
    constructor(
      public readonly statusCode: number,
      public readonly code: string,
      message: string,
    ) {
      super(message);
      this.name = "AuthError";
    }
  }

  return {
    AuthError: MockAuthError,
    verifyAuth: vi.fn(),
    verifyCloudSchedulerAuth: vi.fn(),
    requirePermission: vi.fn(),
    requireSystemAdminRole: vi.fn(),
    requireRoleId: vi.fn(),
    requireConsultant: vi.fn(),
    accountDocGet: vi.fn(),
    accountDocSet: vi.fn(),
    createUser: vi.fn(),
    getUser: vi.fn(),
    getUserByEmail: vi.fn(),
    generatePasswordResetLink: vi.fn(),
    sendInvitation: vi.fn(),
    roleFindById: vi.fn(),
    createRoleRepository: vi.fn(),
    consultantFindById: vi.fn(),
    consultantSave: vi.fn(),
    createConsultantRepository: vi.fn(),
    createSettingsRepository: vi.fn(),
  };
});

vi.mock("@/config/env.server", () => ({
  envServer: {
    get firebaseStorageBucket() {
      return "test-bucket";
    },
  },
}));

vi.mock("@/infrastructure/container", () => ({
  createBatchChargeUseCase: vi.fn(),
  createBookingRepository: vi.fn(),
  createCancelBookingUseCase: vi.fn(),
  createChargePaymentUseCase: vi.fn(),
  createPricePlanRepository: vi.fn(),
  createConsultantRepository: mocks.createConsultantRepository,
  createCreateBookingUseCase: vi.fn(),
  createCreatePricePlanUseCase: vi.fn(),
  createCustomerRepository: vi.fn(),
  createNotifyLateConsultantArrivalUseCase: vi.fn(),
  createRoleRepository: mocks.createRoleRepository,
  createSettingsRepository: mocks.createSettingsRepository,
  createPaymentRepository: vi.fn(),
  createSendConsultationReminderUseCase: vi.fn(),
  createSetupPaymentUseCase: vi.fn(),
  createSlotRepository: vi.fn(),
  createUpdatePricePlanUseCase: vi.fn(),
}));

vi.mock("@/infrastructure/firestore/firestore-customer", () => ({
  app: {},
  db: {
    collection: vi.fn(() => ({
      doc: vi.fn(() => ({
        get: mocks.accountDocGet,
        set: mocks.accountDocSet,
      })),
    })),
  },
}));

vi.mock("@/infrastructure/firebase/firebase-auth-admin", () => ({
  createUser: mocks.createUser,
  deleteUser: vi.fn(),
  generatePasswordResetLink: mocks.generatePasswordResetLink,
  getUser: mocks.getUser,
  getUserByEmail: mocks.getUserByEmail,
  getUsersByUids: vi.fn(),
}));

vi.mock("firebase-admin/storage", () => ({
  getStorage: vi.fn(),
}));

vi.mock("@/infrastructure/resend/resend-email-service", () => ({
  ResendEmailService: vi.fn(function ResendEmailService() {
    return { sendInvitation: mocks.sendInvitation };
  }),
}));

vi.mock("@/infrastructure/auth/verify-cloud-scheduler-auth", () => ({
  verifyCloudSchedulerAuth: mocks.verifyCloudSchedulerAuth,
}));

vi.mock("@/infrastructure/auth/verify-auth", () => ({
  AuthError: mocks.AuthError,
  verifyAuth: mocks.verifyAuth,
}));

vi.mock("@/infrastructure/auth/require-role", () => ({
  requireRoleId: mocks.requireRoleId,
  requireConsultant: mocks.requireConsultant,
}));

vi.mock("@/infrastructure/auth/require-permission", () => ({
  requirePermission: mocks.requirePermission,
  requireSystemAdminRole: mocks.requireSystemAdminRole,
}));

import { createOrganizationRoutes } from "../organization-router";

function postInvite(body: Record<string, unknown>) {
  return createOrganizationRoutes().request("/org-1/admin/accounts/invite", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("account invite route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.verifyAuth.mockResolvedValue({
      uid: "admin-1",
      accounts: [],
      currentOrganizationId: "org-1",
      currentDisplayName: "Admin",
    });
    mocks.requireSystemAdminRole.mockReturnValue({ roleId: "admin" });
    mocks.createRoleRepository.mockReturnValue({
      findById: mocks.roleFindById,
    });
    mocks.roleFindById.mockResolvedValue({
      getRoleId: () => "admin",
      getName: () => "管理者",
    });
    mocks.createConsultantRepository.mockReturnValue({
      findById: mocks.consultantFindById,
      save: mocks.consultantSave,
    });
    mocks.consultantFindById.mockResolvedValue(null);
    mocks.createSettingsRepository.mockReturnValue({
      findByOrganizationId: vi.fn().mockResolvedValue(null),
    });
    mocks.accountDocGet.mockResolvedValue({ exists: false });
    mocks.accountDocSet.mockResolvedValue(undefined);
    mocks.createUser.mockResolvedValue("new-uid");
    mocks.getUser.mockResolvedValue({ uid: "new-uid", metadata: {} });
    mocks.getUserByEmail.mockRejectedValue(new Error("not found"));
    mocks.generatePasswordResetLink.mockResolvedValue(
      "https://example.com/reset",
    );
    mocks.sendInvitation.mockResolvedValue(undefined);
  });

  it("invites a new email address and creates the auth user", async () => {
    const response = await postInvite({
      email: "new@example.com",
      roleId: "admin",
      name: "新規 太郎",
    });

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toEqual({ uid: "new-uid" });
    expect(mocks.createUser).toHaveBeenCalledWith(
      "new@example.com",
      expect.any(String),
    );
    expect(mocks.accountDocSet).toHaveBeenCalledWith(
      expect.objectContaining({
        uid: "new-uid",
        organizationId: "org-1",
        roleId: "admin",
        status: "invited",
      }),
      { merge: true },
    );
    expect(mocks.sendInvitation).toHaveBeenCalledTimes(1);
  });

  it("fails with 409 when the email already belongs to the same organization", async () => {
    mocks.getUserByEmail.mockResolvedValue({
      uid: "existing-uid",
      metadata: { lastSignInTime: "2026-01-01T00:00:00Z" },
    });
    mocks.accountDocGet.mockResolvedValue({
      exists: true,
      data: () => ({
        uid: "existing-uid",
        organizationId: "org-1",
        roleId: "operator",
        status: "active",
      }),
    });

    const response = await postInvite({
      email: "member@example.com",
      roleId: "admin",
      name: "既存 花子",
    });

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toEqual({
      code: "ACCOUNT_ALREADY_EXISTS",
      message: "このメールアドレスは既にこの組織に登録されています",
    });
    expect(mocks.createUser).not.toHaveBeenCalled();
    expect(mocks.accountDocSet).not.toHaveBeenCalled();
    expect(mocks.sendInvitation).not.toHaveBeenCalled();
  });

  it("fails with 409 for a consultant invite when the email already belongs to the same organization", async () => {
    mocks.getUserByEmail.mockResolvedValue({
      uid: "existing-uid",
      metadata: {},
    });
    mocks.accountDocGet.mockResolvedValue({
      exists: true,
      data: () => ({
        uid: "existing-uid",
        organizationId: "org-1",
        roleId: "admin",
        status: "invited",
      }),
    });

    const response = await postInvite({
      email: "consultant@example.com",
      roleId: "admin",
      isConsultant: true,
      name: "相談員 一郎",
    });

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toEqual({
      code: "ACCOUNT_ALREADY_EXISTS",
      message: "このメールアドレスは既にこの組織に登録されています",
    });
    expect(mocks.consultantSave).not.toHaveBeenCalled();
    expect(mocks.sendInvitation).not.toHaveBeenCalled();
  });

  it("adds organization membership when the email belongs to another organization", async () => {
    mocks.getUserByEmail.mockResolvedValue({
      uid: "other-org-uid",
      metadata: { lastSignInTime: "2026-01-01T00:00:00Z" },
    });
    mocks.accountDocGet.mockResolvedValue({ exists: false });

    const response = await postInvite({
      email: "member@example.com",
      roleId: "admin",
      name: "兼務 次郎",
    });

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toEqual({ uid: "other-org-uid" });
    expect(mocks.createUser).not.toHaveBeenCalled();
    expect(mocks.accountDocSet).toHaveBeenCalledWith(
      expect.objectContaining({
        uid: "other-org-uid",
        organizationId: "org-1",
        roleId: "admin",
        status: "active",
      }),
      { merge: true },
    );
    expect(mocks.sendInvitation).toHaveBeenCalledTimes(1);
  });

  it("adds membership and creates the consultant when isConsultant=true from another organization", async () => {
    mocks.getUserByEmail.mockResolvedValue({
      uid: "other-org-uid",
      metadata: {},
    });
    mocks.accountDocGet.mockResolvedValue({ exists: false });

    const response = await postInvite({
      email: "consultant@example.com",
      roleId: "admin",
      isConsultant: true,
      name: "相談員 二郎",
    });

    expect(response.status).toBe(201);
    expect(mocks.createUser).not.toHaveBeenCalled();
    expect(mocks.consultantSave).toHaveBeenCalledTimes(1);
    expect(mocks.accountDocSet).toHaveBeenCalledWith(
      expect.objectContaining({
        uid: "other-org-uid",
        organizationId: "org-1",
        roleId: "admin",
        status: "invited",
      }),
      { merge: true },
    );
    expect(mocks.sendInvitation).toHaveBeenCalledTimes(1);
  });
});
