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
    createAccountRepository: vi.fn(),
    createUser: vi.fn(),
    getUser: vi.fn(),
    getUserByEmail: vi.fn(),
    generatePasswordResetLink: vi.fn(),
    sendInvitation: vi.fn(),
    consultantFindById: vi.fn(),
    createConsultantRepository: vi.fn(),
    createCreateConsultantUseCase: vi.fn(),
    createConsultantUseCaseExecute: vi.fn(),
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
  createRoleRepository: vi.fn(),
  createSettingsRepository: mocks.createSettingsRepository,
  createPaymentRepository: vi.fn(),
  createSendConsultationReminderUseCase: vi.fn(),
  createSetupPaymentUseCase: vi.fn(),
  createSlotRepository: vi.fn(),
  createUpdateConsultantUseCase: vi.fn(),
  createUpdatePricePlanUseCase: vi.fn(),
}));

vi.mock("@/infrastructure/firestore/firestore-client", () => ({
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
  verifyAccountAuth: mocks.verifyAuth,
  verifyConsultantAuth: mocks.verifyAuth,
  verifyEitherAuth: mocks.verifyAuth,
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

describe("consultant invite route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.verifyAuth.mockResolvedValue({
      authUid: "admin-1",
      accounts: [],
      consultants: [],
    });
    mocks.requireSystemAdminRole.mockReturnValue({ roleId: "admin" });
    mocks.createConsultantRepository.mockReturnValue({
      findById: mocks.consultantFindById,
    });
    mocks.consultantFindById.mockResolvedValue(null);
    mocks.createCreateConsultantUseCase.mockReturnValue({
      execute: mocks.createConsultantUseCaseExecute,
    });
    mocks.createConsultantUseCaseExecute.mockResolvedValue({
      consultantId: "new-auth-uid",
    });
    mocks.createSettingsRepository.mockReturnValue({
      findByOrganizationId: vi.fn().mockResolvedValue(null),
    });
    mocks.createUser.mockResolvedValue("new-auth-uid");
    mocks.getUser.mockResolvedValue({ uid: "new-auth-uid", metadata: {} });
    mocks.getUserByEmail.mockRejectedValue(new Error("not found"));
    mocks.generatePasswordResetLink.mockResolvedValue(
      "https://example.com/reset",
    );
    mocks.sendInvitation.mockResolvedValue(undefined);
  });

  it("invites a new consultant: creates Firebase user + Consultant (not Account)", async () => {
    const response = await postInvite({
      email: "consultant@example.com",
      name: "相談員 一郎",
    });

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toEqual({
      consultantId: "new-auth-uid",
    });
    expect(mocks.createUser).toHaveBeenCalledWith(
      "consultant@example.com",
      expect.any(String),
    );
    expect(mocks.createConsultantUseCaseExecute).toHaveBeenCalledWith({
      organizationId: "org-1",
      consultantId: "new-auth-uid",
      name: "相談員 一郎",
    });
    expect(mocks.createAccountRepository).not.toHaveBeenCalled();
    expect(mocks.sendInvitation).toHaveBeenCalledWith(
      expect.objectContaining({
        email: "consultant@example.com",
        isConsultant: true,
      }),
    );
  });

  it("fails with 409 when the email is already a consultant in this organization", async () => {
    mocks.getUserByEmail.mockResolvedValue({
      uid: "existing-auth-uid",
      metadata: {},
    });
    mocks.consultantFindById.mockResolvedValue({
      /* stand-in for an existing Consultant */
    });

    const response = await postInvite({
      email: "consultant@example.com",
      name: "相談員 一郎",
    });

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toEqual({
      code: "CONSULTANT_ALREADY_EXISTS",
      message: "このメールアドレスは既にこの組織の占い師として登録されています",
    });
    expect(mocks.createConsultantUseCaseExecute).not.toHaveBeenCalled();
    expect(mocks.sendInvitation).not.toHaveBeenCalled();
  });

  it("adds consultant when the email is a consultant in another organization", async () => {
    mocks.getUserByEmail.mockResolvedValue({
      uid: "other-org-auth-uid",
      metadata: {},
    });
    mocks.consultantFindById.mockResolvedValue(null);
    mocks.createConsultantUseCaseExecute.mockResolvedValue({
      consultantId: "other-org-auth-uid",
    });

    const response = await postInvite({
      email: "consultant@example.com",
      name: "相談員 二郎",
    });

    expect(response.status).toBe(201);
    expect(mocks.createUser).not.toHaveBeenCalled();
    expect(mocks.createConsultantUseCaseExecute).toHaveBeenCalledTimes(1);
    expect(mocks.createAccountRepository).not.toHaveBeenCalled();
    expect(mocks.sendInvitation).toHaveBeenCalledTimes(1);
  });
});
