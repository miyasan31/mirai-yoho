import { afterEach, describe, expect, it, vi } from "vitest";

const ORIGINAL_SECRET = process.env.CANCEL_TOKEN_SECRET;

async function createService() {
  vi.resetModules();
  const { HmacCancelTokenService } = await import(
    "@/infrastructure/token/cancel-token-service"
  );
  return new HmacCancelTokenService();
}

describe("HmacCancelTokenService", () => {
  afterEach(() => {
    vi.useRealTimers();
    if (ORIGINAL_SECRET === undefined) {
      delete process.env.CANCEL_TOKEN_SECRET;
      return;
    }
    process.env.CANCEL_TOKEN_SECRET = ORIGINAL_SECRET;
  });

  it("generates and verifies token with expiry", async () => {
    process.env.CANCEL_TOKEN_SECRET = "test-secret";
    const service = await createService();
    const expiresAt = new Date("2030-01-01T00:00:00.000Z");

    const token = service.generateToken("booking-1", expiresAt);
    const verified = service.verifyToken(token);

    expect(verified).toEqual({
      bookingId: "booking-1",
      expiresAt: "2030-01-01T00:00:00.000Z",
    });
  });

  it("rejects expired token", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00.000Z"));
    process.env.CANCEL_TOKEN_SECRET = "test-secret";
    const service = await createService();

    const expired = new Date("2025-12-31T23:59:59.000Z");
    const token = service.generateToken("booking-1", expired);

    expect(service.verifyToken(token)).toBeNull();
  });

  it("rejects tampered token", async () => {
    process.env.CANCEL_TOKEN_SECRET = "test-secret";
    const service = await createService();
    const token = service.generateToken(
      "booking-1",
      new Date("2030-01-01T00:00:00.000Z"),
    );
    const tampered = token.replace("booking-1", "booking-2");

    expect(service.verifyToken(tampered)).toBeNull();
  });
});
