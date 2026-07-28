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
    verifyAccountAuth: vi.fn(),
    verifyConsultantAuth: vi.fn(),
    verifyEitherAuth: vi.fn(),
    requirePermission: vi.fn(),
    executeListRatings: vi.fn(),
    createListConsultantRatingsUseCase: vi.fn(),
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
  createConsultantRepository: vi.fn(),
  createCreateBookingUseCase: vi.fn(),
  createCustomerRepository: vi.fn(),
  createListConsultantRatingsUseCase: mocks.createListConsultantRatingsUseCase,
  createNotifyLateConsultantArrivalUseCase: vi.fn(),
  createPaymentRepository: vi.fn(),
  createRoleRepository: vi.fn(),
  createSendConsultationReminderUseCase: vi.fn(),
  createSettingsRepository: vi.fn(),
  createSetupPaymentUseCase: vi.fn(),
  createSlotRepository: vi.fn(),
}));

vi.mock("@/infrastructure/firestore/firestore-client", () => ({
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
  verifyCloudSchedulerAuth: vi.fn(),
}));

vi.mock("@/infrastructure/auth/verify-auth", () => ({
  AuthError: mocks.AuthError,
  verifyAccountAuth: mocks.verifyAccountAuth,
  verifyConsultantAuth: mocks.verifyConsultantAuth,
  verifyEitherAuth: mocks.verifyEitherAuth,
}));

vi.mock("@/infrastructure/auth/require-role", () => ({
  requireRoleId: vi.fn(),
  requireConsultant: vi.fn(),
}));

vi.mock("@/infrastructure/auth/require-permission", () => ({
  requirePermission: mocks.requirePermission,
  requireSystemAdminRole: vi.fn(),
}));

import { createOrganizationRoutes } from "../organization-router";

function getRatings(organizationId: string, consultantId: string) {
  return createOrganizationRoutes().request(
    `/${organizationId}/console/consultants/${consultantId}/ratings`,
    { method: "GET", headers: { Authorization: "Bearer token" } },
  );
}

describe("console consultant rating route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.executeListRatings.mockResolvedValue({
      summary: {
        count: 1,
        averageScore: 5,
        distribution: [
          { score: 1, count: 0 },
          { score: 2, count: 0 },
          { score: 3, count: 0 },
          { score: 4, count: 0 },
          { score: 5, count: 1 },
        ],
      },
      ratings: [
        {
          getBookingId: () => "booking-1",
          getScore: () => ({ getValue: () => 5 }),
          getComment: () => ({ isEmpty: () => false, getValue: () => "最高" }),
          getConsultedAt: () => new Date("2026-05-01T10:00:00.000Z"),
          getRatedAt: () => new Date("2026-05-02T10:00:00.000Z"),
        },
      ],
    });
    mocks.createListConsultantRatingsUseCase.mockReturnValue({
      execute: mocks.executeListRatings,
    });
  });

  it("運営アカウントには評価一覧を返す（顧客の識別情報は含めない）", async () => {
    mocks.verifyAccountAuth.mockResolvedValue({ accounts: [] });

    const response = await getRatings("org-1", "consultant-1");

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.consultantId).toBe("consultant-1");
    expect(body.summary.averageScore).toBe(5);
    expect(body.ratings).toEqual([
      {
        bookingId: "booking-1",
        score: 5,
        comment: "最高",
        consultedAt: "2026-05-01T10:00:00.000Z",
        ratedAt: "2026-05-02T10:00:00.000Z",
      },
    ]);
    expect(JSON.stringify(body)).not.toContain("customerId");
    expect(mocks.requirePermission).toHaveBeenCalledWith(
      expect.anything(),
      "org-1",
      "console.consultants.read",
    );
  });

  it("占い師トークンは認証段階で弾く（評価は占い師に見せない）", async () => {
    // verifyAccountAuth は consultants にしか doc を持たない占い師を 403 NO_ROLE で弾く
    mocks.verifyAccountAuth.mockRejectedValue(
      new mocks.AuthError(
        403,
        "NO_ROLE",
        "User has no role in any organization",
      ),
    );

    const response = await getRatings("org-1", "consultant-1");

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toMatchObject({ code: "NO_ROLE" });
    // 占い師向けの認証関数は一切呼ばれない
    expect(mocks.verifyEitherAuth).not.toHaveBeenCalled();
    expect(mocks.verifyConsultantAuth).not.toHaveBeenCalled();
    expect(mocks.executeListRatings).not.toHaveBeenCalled();
  });
});
