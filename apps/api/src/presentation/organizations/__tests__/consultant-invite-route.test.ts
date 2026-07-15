import { beforeEach, describe, expect, it, vi } from "vitest";
import { Account } from "@/domain/account/account";

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
    accountFindById: vi.fn(),
    accountSave: vi.fn(),
    createAccountRepository: vi.fn(),
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
    createCreateConsultantUseCase: vi.fn(),
    createConsultantUseCaseExecute: vi.fn(),
    settingsFindByOrganizationId: vi.fn(),
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
  createAccountRepository: mocks.createAccountRepository,
  createBatchChargeUseCase: vi.fn(),
  createBookingRepository: vi.fn(),
  createCancelBookingUseCase: vi.fn(),
  createChargePaymentUseCase: vi.fn(),
  createPricePlanRepository: vi.fn(),
  createConsultantRepository: mocks.createConsultantRepository,
  createCreateBookingUseCase: vi.fn(),
  createCreateConsultantUseCase: mocks.createCreateConsultantUseCase,
  createCreatePricePlanUseCase: vi.fn(),
  createCustomerRepository: vi.fn(),
  createDeactivateConsultantUseCase: vi.fn(),
  createNotifyLateConsultantArrivalUseCase: vi.fn(),
  createRoleRepository: mocks.createRoleRepository,
  createSettingsRepository: mocks.createSettingsRepository,
  createPaymentRepository: vi.fn(),
  createSendConsultationReminderUseCase: vi.fn(),
  createSetupPaymentUseCase: vi.fn(),
  createSlotRepository: vi.fn(),
  createUpdateConsultantUseCase: vi.fn(),
  createUpdatePricePlanUseCase: vi.fn(),
}));

vi.mock("@/infrastructure/firestore/firestore-customer", () => ({
  app: {},
  db: {
    collection: vi.fn(() => ({
      doc: vi.fn(() => ({
        get: vi.fn(),
        set: vi.fn(),
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
  return createOrganizationRoutes().request(
    "/org-1/console/consultants/invite",
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    },
  );
}

function makeExistingAccount(overrides: {
  accountId: string;
  roleId?: string;
  status?: "active" | "invited" | "disabled";
}): Account {
  return Account.reconstruct({
    organizationId: "org-1",
    accountId: overrides.accountId,
    roleId: overrides.roleId ?? "admin",
    status: overrides.status ?? "active",
    name: null,
    createdAt: new Date("2026-01-01T00:00:00Z"),
    updatedAt: new Date("2026-01-01T00:00:00Z"),
  });
}

describe("consultant invite route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.verifyAuth.mockResolvedValue({
      authUid: "admin-1",
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
    mocks.createCreateConsultantUseCase.mockReturnValue({
      execute: mocks.createConsultantUseCaseExecute,
    });
    mocks.createConsultantUseCaseExecute.mockResolvedValue({
      consultantId: "new-auth-uid",
    });
    mocks.createSettingsRepository.mockReturnValue({
      findByOrganizationId: mocks.settingsFindByOrganizationId,
    });
    mocks.settingsFindByOrganizationId.mockResolvedValue(null);
    mocks.createAccountRepository.mockReturnValue({
      findById: mocks.accountFindById,
      save: mocks.accountSave,
    });
    mocks.accountFindById.mockResolvedValue(null);
    mocks.accountSave.mockResolvedValue(undefined);
    mocks.createUser.mockResolvedValue("new-auth-uid");
    mocks.getUser.mockResolvedValue({ uid: "new-auth-uid", metadata: {} });
    mocks.getUserByEmail.mockRejectedValue(new Error("not found"));
    mocks.generatePasswordResetLink.mockResolvedValue(
      "https://example.com/reset",
    );
    mocks.sendInvitation.mockResolvedValue(undefined);
  });

  it("invites a new consultant and creates account + consultant", async () => {
    const response = await postInvite({
      email: "consultant@example.com",
      name: "相談員 一郎",
    });

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toEqual({
      accountId: "new-auth-uid",
    });
    expect(mocks.createUser).toHaveBeenCalledWith(
      "consultant@example.com",
      expect.any(String),
    );
    expect(mocks.accountSave).toHaveBeenCalledTimes(1);
    const savedAccount = mocks.accountSave.mock.calls[0][0] as Account;
    expect(savedAccount.getRoleId()).toBe("admin");
    expect(savedAccount.getStatus()).toBe("invited");
    expect(mocks.createConsultantUseCaseExecute).toHaveBeenCalledWith({
      organizationId: "org-1",
      consultantId: "new-auth-uid",
      name: "相談員 一郎",
    });
    expect(mocks.sendInvitation).toHaveBeenCalledWith(
      expect.objectContaining({
        email: "consultant@example.com",
        isConsultant: true,
      }),
    );
  });

  it("fails with 409 when the email already belongs to the same organization", async () => {
    mocks.getUserByEmail.mockResolvedValue({
      uid: "existing-auth-uid",
      metadata: {},
    });
    mocks.accountFindById.mockResolvedValue(
      makeExistingAccount({
        accountId: "existing-auth-uid",
        status: "invited",
      }),
    );

    const response = await postInvite({
      email: "consultant@example.com",
      name: "相談員 一郎",
    });

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toEqual({
      code: "ACCOUNT_ALREADY_EXISTS",
      message: "このメールアドレスは既にこの組織に登録されています",
    });
    expect(mocks.createConsultantUseCaseExecute).not.toHaveBeenCalled();
    expect(mocks.sendInvitation).not.toHaveBeenCalled();
  });

  it("adds membership and creates consultant when the email belongs to another organization", async () => {
    mocks.getUserByEmail.mockResolvedValue({
      uid: "other-org-auth-uid",
      metadata: {},
    });
    mocks.accountFindById.mockResolvedValue(null);
    mocks.createConsultantUseCaseExecute.mockResolvedValue({
      consultantId: "other-org-auth-uid",
    });

    const response = await postInvite({
      email: "consultant@example.com",
      name: "相談員 二郎",
    });

    expect(response.status).toBe(201);
    expect(mocks.createUser).not.toHaveBeenCalled();
    expect(mocks.accountSave).toHaveBeenCalledTimes(1);
    expect(mocks.createConsultantUseCaseExecute).toHaveBeenCalledTimes(1);
    expect(mocks.sendInvitation).toHaveBeenCalledTimes(1);
  });

  it("skips consultant creation when the consultant already exists in the organization", async () => {
    mocks.getUserByEmail.mockResolvedValue({
      uid: "other-org-auth-uid",
      metadata: {},
    });
    mocks.accountFindById.mockResolvedValue(null);
    mocks.consultantFindById.mockResolvedValue({
      /* stand-in for an existing Consultant */
    });

    const response = await postInvite({
      email: "consultant@example.com",
      name: "相談員 三郎",
    });

    expect(response.status).toBe(201);
    expect(mocks.accountSave).toHaveBeenCalledTimes(1);
    expect(mocks.createConsultantUseCaseExecute).not.toHaveBeenCalled();
    expect(mocks.sendInvitation).toHaveBeenCalledTimes(1);
  });
});
