import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  execute: vi.fn(),
  createNotifyLateConsultantArrivalUseCase: vi.fn(),
}));

vi.mock("@/config/env.server", () => ({
  envServer: {
    get lateArrivalAlertCronSecret() {
      return "cron-secret";
    },
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
  createClientRepository: vi.fn(),
  createConsultantRepository: vi.fn(),
  createCreateBookingUseCase: vi.fn(),
  createNotifyLateConsultantArrivalUseCase:
    mocks.createNotifyLateConsultantArrivalUseCase,
  createOrganizationSettingsRepository: vi.fn(),
  createPaymentRepository: vi.fn(),
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

import { POST } from "../route";

function createRequest(secret: string) {
  return new NextRequest(
    "http://localhost/api/organizations/org-1/batch/late-arrival-alerts",
    {
      method: "POST",
      headers: {
        "x-cron-secret": secret,
      },
    },
  );
}

function createContext() {
  return {
    params: Promise.resolve({
      organizationId: "org-1",
      slug: ["batch", "late-arrival-alerts"],
    }),
  };
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
  });

  it("returns 401 when cron secret is invalid", async () => {
    const response = await POST(createRequest("wrong"), createContext());

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      code: "UNAUTHORIZED",
      message: "Invalid cron secret",
    });
    expect(mocks.execute).not.toHaveBeenCalled();
  });

  it("executes late arrival alert batch when cron secret is valid", async () => {
    const response = await POST(createRequest("cron-secret"), createContext());

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
  });
});
