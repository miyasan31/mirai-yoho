import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

const STATE_TTL_MS = 5 * 60 * 1000;

interface StatePayload {
  authUid: string;
  nonce: string;
  exp: number;
}

function base64UrlEncode(buffer: Buffer): string {
  return buffer
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function base64UrlDecode(value: string): Buffer {
  const padded = value
    .replace(/-/g, "+")
    .replace(/_/g, "/")
    .padEnd(value.length + ((4 - (value.length % 4)) % 4), "=");
  return Buffer.from(padded, "base64");
}

function hmac(secret: string, message: string): Buffer {
  return createHmac("sha256", secret).update(message).digest();
}

export function signZoomOAuthState(params: {
  authUid: string;
  secret: string;
}): string {
  const payload: StatePayload = {
    authUid: params.authUid,
    nonce: base64UrlEncode(randomBytes(16)),
    exp: Date.now() + STATE_TTL_MS,
  };
  const payloadJson = JSON.stringify(payload);
  const encodedPayload = base64UrlEncode(Buffer.from(payloadJson, "utf8"));
  const signature = base64UrlEncode(hmac(params.secret, encodedPayload));
  return `${encodedPayload}.${signature}`;
}

export function verifyZoomOAuthState(params: {
  state: string;
  secret: string;
  now?: number;
}): { authUid: string } {
  const parts = params.state.split(".");
  if (parts.length !== 2) {
    throw new Error("Invalid state format");
  }
  const [encodedPayload, signature] = parts;
  const expected = base64UrlEncode(hmac(params.secret, encodedPayload));
  const expectedBuffer = Buffer.from(expected);
  const actualBuffer = Buffer.from(signature);
  if (
    expectedBuffer.length !== actualBuffer.length ||
    !timingSafeEqual(expectedBuffer, actualBuffer)
  ) {
    throw new Error("Invalid state signature");
  }
  const payload = JSON.parse(
    base64UrlDecode(encodedPayload).toString("utf8"),
  ) as StatePayload;
  const now = params.now ?? Date.now();
  if (payload.exp < now) {
    throw new Error("State expired");
  }
  return { authUid: payload.authUid };
}
