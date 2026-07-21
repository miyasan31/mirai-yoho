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
    executeCharge: vi.fn(),
    executeReminder: vi.fn(),
    createBatchChargeUseCase: vi.fn(),
    createSendConsultationReminderUseCase: vi.fn(),
    requirePermission: vi.fn(),
    requireRoleId: vi.fn(),
    requireConsultant: vi.fn(),
    verifyAuth: vi.fn(),
    verifyCloudSchedulerAuth: vi.fn(),
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
  createBatchChargeUseCase: mocks.createBatchChargeUseCase,
  createBookingRepository: vi.fn(),
  createCancelBookingUseCase: vi.fn(),
  createChargePaymentUseCase: vi.fn(),
  createCustomerRepository: vi.fn(),
  createConsultantRepository: vi.fn(),
  createCreateBookingUseCase: vi.fn(),
  createNotifyLateConsultantArrivalUseCase: vi.fn(),
  createRoleRepository: vi.fn(),
  createSettingsRepository: vi.fn(),
  createPaymentRepository: vi.fn(),
  createSendConsultationReminderUseCase:
    mocks.createSendConsultationReminderUseCase,
  createSetupPaymentUseCase: vi.fn(),
  createSlotRepository: vi.fn(),
}));

vi.mock("@/infrastructure/firestore/firestore-customer", () => ({
  app: {},
  db: {},
}));

vi.mock("@/infrastructure/firebase/firebase-auth-admin", () => ({
  createUser: vi.fn(),
  deleteUser: vi.fn(),
  generatePasswordResetLink: vi.fn(),
  getUser: vi.fn(),
  getUserByEmail: vi.fn(),
  getUsersByUids: vi.fn(),
}));

vi.mock("firebase-admin/storage", () => ({
  getStorage: vi.fn(),
}));

vi.mock("@/infrastructure/resend/resend-email-service", () => ({
  ResendEmailService: vi.fn(),
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
  requireSystemAdminRole: vi.fn(),
}));

import { createOrganizationRoutes } from "../organization-router";

function postBatch(
  organizationId: string,
  batchName: string,
  headers?: HeadersInit,
) {
  return createOrganizationRoutes().request(
    `/${organizationId}/batch/${batchName}`,
    {
      method: "POST",
      headers,
    },
  );
}

describe("batch charge / consultation reminder routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.executeCharge.mockResolvedValue({
      chargedCount: 2,
      completedCount: 1,
      noShowCount: 0,
      errors: [],
    });
    mocks.createBatchChargeUseCase.mockReturnValue({
      execute: mocks.executeCharge,
    });
    mocks.executeReminder.mockResolvedValue({
      sentCount: 3,
      skippedCount: 1,
      errors: [],
    });
    mocks.createSendConsultationReminderUseCase.mockReturnValue({
      execute: mocks.executeReminder,
    });
    mocks.verifyCloudSchedulerAuth.mockResolvedValue(null);
    mocks.verifyAuth.mockRejectedValue(
      new mocks.AuthError(
        401,
        "UNAUTHORIZED",
        "Missing or invalid Authorization header",
      ),
    );
  });

  it("executes batch charge for a verified Scheduler principal without user auth", async () => {
    mocks.verifyCloudSchedulerAuth.mockResolvedValue({
      serviceAccountEmail: "batch-scheduler@project-1.iam.gserviceaccount.com",
    });

    const response = await postBatch("org-charge-scheduler", "charge");

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      chargedCount: 2,
      completedCount: 1,
      noShowCount: 0,
    });
    expect(mocks.executeCharge).toHaveBeenCalledWith("org-charge-scheduler");
    expect(mocks.verifyAuth).not.toHaveBeenCalled();
  });

  it("executes consultation reminders for a verified Scheduler principal without user auth", async () => {
    mocks.verifyCloudSchedulerAuth.mockResolvedValue({
      serviceAccountEmail: "batch-scheduler@project-1.iam.gserviceaccount.com",
    });

    const response = await postBatch(
      "org-reminder-scheduler",
      "consultation-reminders",
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      sentCount: 3,
      skippedCount: 1,
    });
    expect(mocks.executeReminder).toHaveBeenCalledWith(
      "org-reminder-scheduler",
    );
    expect(mocks.verifyAuth).not.toHaveBeenCalled();
  });

  it("executes batch charge for an admin manually", async () => {
    mocks.verifyAuth.mockResolvedValue({
      authUid: "admin-1",
      accounts: [],
      currentOrganizationId: "org-charge-admin",
      currentDisplayName: "Admin",
    });

    const response = await postBatch("org-charge-admin", "charge", {
      Authorization: "Bearer firebase-id-token",
    });

    expect(response.status).toBe(200);
    expect(mocks.requirePermission).toHaveBeenCalledWith(
      expect.objectContaining({ authUid: "admin-1" }),
      "org-charge-admin",
      "console.payments.charge",
    );
    expect(mocks.executeCharge).toHaveBeenCalledTimes(1);
  });

  it("rejects an unauthenticated request", async () => {
    const response = await postBatch("org-charge-unauthed", "charge");

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      code: "UNAUTHORIZED",
      message: "Missing or invalid Authorization header",
    });
    expect(mocks.executeCharge).not.toHaveBeenCalled();
  });
});
