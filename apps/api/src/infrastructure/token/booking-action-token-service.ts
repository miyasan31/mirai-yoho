import crypto, { createHmac } from "node:crypto";
import { envServer } from "@/config/env.server";

// import 時ではなく利用時に読む（envServer.cancelTokenSecret は未設定なら throw する）。
// ビルド（next build の page data 収集）でシークレットを不要にするための遅延評価。
function secretKey(): string {
  return envServer.cancelTokenSecret;
}

interface BookingActionTokenPayload {
  bookingId: string;
  organizationId: string;
  exp: string;
  nonce: string;
}

interface GenerateBookingActionTokenInput {
  bookingId: string;
  organizationId: string;
  expiresAt: Date;
}

function signPayload(payload: string): string {
  return createHmac("sha256", secretKey()).update(payload).digest("base64url");
}

export class HmacBookingActionTokenService {
  generateToken(input: GenerateBookingActionTokenInput): string {
    const payload: BookingActionTokenPayload = {
      bookingId: input.bookingId,
      organizationId: input.organizationId,
      exp: input.expiresAt.toISOString(),
      nonce: crypto.randomUUID(),
    };
    const encodedPayload = Buffer.from(JSON.stringify(payload)).toString(
      "base64url",
    );
    const signature = signPayload(encodedPayload);
    return `${encodedPayload}.${signature}`;
  }

  verifyToken(token: string): BookingActionTokenPayload | null {
    const [encodedPayload, signature] = token.split(".");
    if (!encodedPayload || !signature) return null;

    const expectedSignature = signPayload(encodedPayload);
    if (
      expectedSignature.length !== signature.length ||
      !crypto.timingSafeEqual(
        Buffer.from(expectedSignature),
        Buffer.from(signature),
      )
    ) {
      return null;
    }

    let payload: BookingActionTokenPayload;
    try {
      payload = JSON.parse(
        Buffer.from(encodedPayload, "base64url").toString("utf8"),
      ) as BookingActionTokenPayload;
    } catch {
      return null;
    }

    if (
      !payload.bookingId ||
      !payload.organizationId ||
      !payload.exp ||
      !payload.nonce
    ) {
      return null;
    }

    const expiresAt = Date.parse(payload.exp);
    if (Number.isNaN(expiresAt) || expiresAt <= Date.now()) {
      return null;
    }

    return payload;
  }
}
