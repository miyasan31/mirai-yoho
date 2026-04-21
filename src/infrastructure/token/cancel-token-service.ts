import { createHmac } from "node:crypto";
import type { ICancelTokenService } from "@/application/shared/cancel-token-service";
import { envServer } from "@/config/env.server";

const SECRET_KEY = envServer.cancelTokenSecret;

export class HmacCancelTokenService implements ICancelTokenService {
  generateToken(bookingId: string): string {
    const signature = createHmac("sha256", SECRET_KEY)
      .update(bookingId)
      .digest("base64url");
    return `${bookingId}.${signature}`;
  }

  verifyToken(token: string): { bookingId: string } | null {
    const dotIndex = token.indexOf(".");
    if (dotIndex === -1) return null;

    const bookingId = token.substring(0, dotIndex);
    const signature = token.substring(dotIndex + 1);

    const expectedSignature = createHmac("sha256", SECRET_KEY)
      .update(bookingId)
      .digest("base64url");

    if (signature !== expectedSignature) return null;
    return { bookingId };
  }
}
