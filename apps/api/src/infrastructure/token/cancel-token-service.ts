import { createHmac } from "node:crypto";
import type { ICancelTokenService } from "@/application/shared/cancel-token-service";
import { envServer } from "@/config/env.server";

// import 時ではなく利用時に読む（envServer.cancelTokenSecret は未設定なら throw する）。
// ビルド（next build の page data 収集）でシークレットを不要にするための遅延評価。
function secretKey(): string {
  return envServer.cancelTokenSecret;
}

export class HmacCancelTokenService implements ICancelTokenService {
  generateToken(bookingId: string, expiresAt: Date): string {
    const expiresAtIso = expiresAt.toISOString();
    const payload = `${bookingId}.${expiresAtIso}`;
    const signature = createHmac("sha256", secretKey())
      .update(payload)
      .digest("base64url");
    return `${payload}.${signature}`;
  }

  verifyToken(token: string): { bookingId: string; expiresAt: string } | null {
    const firstDotIndex = token.indexOf(".");
    const lastDotIndex = token.lastIndexOf(".");
    if (firstDotIndex === -1 || firstDotIndex === lastDotIndex) return null;

    const bookingId = token.substring(0, firstDotIndex);
    const expiresAt = token.substring(firstDotIndex + 1, lastDotIndex);
    const signature = token.substring(lastDotIndex + 1);

    const payload = `${bookingId}.${expiresAt}`;
    const expectedSignature = createHmac("sha256", secretKey())
      .update(payload)
      .digest("base64url");

    if (signature !== expectedSignature) return null;
    if (Number.isNaN(Date.parse(expiresAt))) return null;
    if (new Date(expiresAt) <= new Date()) return null;
    return { bookingId, expiresAt };
  }
}
