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
    execute: vi.fn(),
    createNotifyLateConsultantArrivalUseCase: vi.fn(),
    requireOrganizationPermission: vi.fn(),
    requireOrganizationRole: vi.fn(),
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
  createBatchChargeUseCase: vi.fn(),
  createBookingRepository: vi.fn(),
  createCancelBookingUseCase: vi.fn(),
  createChargePaymentUseCase: vi.fn(),
  createCustomerRepository: vi.fn(),
  createConsultantRepository: vi.fn(),
  createCreateBookingUseCase: vi.fn(),
  createNotifyLateConsultantArrivalUseCase:
    mocks.createNotifyLateConsultantArrivalUseCase,
  createOrganizationRoleRepository: vi.fn(),
  createOrganizationSettingsRepository: vi.fn(),
  createPaymentRepository: vi.fn(),
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
  verifyAuth: mocks.verifyAuth,
}));

vi.mock("@/infrastructure/auth/require-organization-role", () => ({
  requireOrganizationRole: mocks.requireOrganizationRole,
}));

vi.mock("@/infrastructure/auth/require-organization-permission", () => ({
  requireOrganizationPermission: mocks.requireOrganizationPermission,
}));

import { createOrganizationRoutes } from "../organization-router";

function postLateArrivalAlerts(headers?: HeadersInit) {
  return createOrganizationRoutes().request(
    "/org-1/batch/late-arrival-alerts",
    {
      method: "POST",
      headers,
    },
  );
}

describe("late arrival alert route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.execute.mockResolvedValue({
      targetCount: 2,
      notifiedCount: 1,
      errors: [{ bookingId: "booking-2", error: "webhook failed" }],
    });
    mocks.createNotifyLateConsultantArrivalUseCase.mockReturnValue({
      execute: mocks.execute,
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

  it("rejects the removed cron secret header", async () => {
    const response = await postLateArrivalAlerts({
      "x-cron-secret": "legacy-secret",
    });

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      code: "UNAUTHORIZED",
      message: "Missing or invalid Authorization header",
    });
    expect(mocks.execute).not.toHaveBeenCalled();
  });

  it("executes the batch for a verified Scheduler principal", async () => {
    mocks.verifyCloudSchedulerAuth.mockResolvedValue({
      serviceAccountEmail: "batch-scheduler@project-1.iam.gserviceaccount.com",
    });

    const response = await postLateArrivalAlerts();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      targetCount: 2,
      notifiedCount: 1,
      errors: [{ bookingId: "booking-2", error: "webhook failed" }],
    });
    expect(mocks.execute).toHaveBeenCalledWith({
      organizationId: "org-1",
      now: expect.any(Date),
    });
    expect(mocks.verifyAuth).not.toHaveBeenCalled();
  });

  it("executes the batch for an admin manually", async () => {
    mocks.verifyAuth.mockResolvedValue({
      uid: "admin-1",
      accounts: [],
      currentOrganizationId: "org-1",
      currentDisplayName: "Admin",
    });

    const response = await postLateArrivalAlerts({
      Authorization: "Bearer firebase-id-token",
    });

    expect(response.status).toBe(200);
    expect(mocks.requireOrganizationPermission).toHaveBeenCalledWith(
      expect.objectContaining({ uid: "admin-1" }),
      "org-1",
      "admin.payments.charge",
    );
    expect(mocks.execute).toHaveBeenCalledTimes(1);
  });
});
