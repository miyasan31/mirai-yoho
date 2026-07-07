import { afterEach, describe, expect, it, vi } from "vitest";

const ORIGINAL_SECRET = process.env.CANCEL_TOKEN_SECRET;

async function createService() {
  vi.resetModules();
  const { HmacBookingActionTokenService } = await import(
    "@/infrastructure/token/booking-action-token-service"
  );
  return new HmacBookingActionTokenService();
}

describe("HmacBookingActionTokenService", () => {
  afterEach(() => {
    vi.useRealTimers();
    if (ORIGINAL_SECRET === undefined) {
      delete process.env.CANCEL_TOKEN_SECRET;
      return;
    }
    process.env.CANCEL_TOKEN_SECRET = ORIGINAL_SECRET;
  });

  it("generates and verifies token payload", async () => {
    process.env.CANCEL_TOKEN_SECRET = "test-secret";
    const service = await createService();
    const token = service.generateToken({
      bookingId: "booking-1",
      organizationId: "org-1",
      expiresAt: new Date("2030-01-01T00:00:00.000Z"),
    });

    const verified = service.verifyToken(token);
    expect(verified?.bookingId).toBe("booking-1");
    expect(verified?.organizationId).toBe("org-1");
    expect(verified?.exp).toBe("2030-01-01T00:00:00.000Z");
    expect(typeof verified?.nonce).toBe("string");
    expect(verified?.nonce.length).toBeGreaterThan(0);
  });

  it("rejects expired token", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00.000Z"));
    process.env.CANCEL_TOKEN_SECRET = "test-secret";
    const service = await createService();
    const token = service.generateToken({
      bookingId: "booking-1",
      organizationId: "org-1",
      expiresAt: new Date("2025-12-31T23:59:59.000Z"),
    });

    expect(service.verifyToken(token)).toBeNull();
  });

  it("rejects tampered token", async () => {
    process.env.CANCEL_TOKEN_SECRET = "test-secret";
    const service = await createService();
    const token = service.generateToken({
      bookingId: "booking-1",
      organizationId: "org-1",
      expiresAt: new Date("2030-01-01T00:00:00.000Z"),
    });
    const [, signature] = token.split(".");
    const tamperedPayload = Buffer.from(
      JSON.stringify({
        bookingId: "booking-2",
        organizationId: "org-1",
        exp: "2030-01-01T00:00:00.000Z",
        nonce: "x",
      }),
    ).toString("base64url");
    const tampered = `${tamperedPayload}.${signature}`;

    expect(service.verifyToken(tampered)).toBeNull();
  });
});
