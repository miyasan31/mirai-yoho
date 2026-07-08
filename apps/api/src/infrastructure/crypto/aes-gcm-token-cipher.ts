import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import type { ITokenCipher } from "@/application/shared/token-cipher";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;
const KEY_LENGTH = 32;
const VERSION_PREFIX = "v1";

function loadKey(base64Key: string): Buffer {
  const key = Buffer.from(base64Key, "base64");
  if (key.length !== KEY_LENGTH) {
    throw new Error(
      `Token cipher key must decode to ${KEY_LENGTH} bytes (got ${key.length})`,
    );
  }
  return key;
}

export class AesGcmTokenCipher implements ITokenCipher {
  private readonly key: Buffer;

  constructor(base64Key: string) {
    this.key = loadKey(base64Key);
  }

  encrypt(plaintext: string): string {
    const iv = randomBytes(IV_LENGTH);
    const cipher = createCipheriv(ALGORITHM, this.key, iv);
    const encrypted = Buffer.concat([
      cipher.update(plaintext, "utf8"),
      cipher.final(),
    ]);
    const authTag = cipher.getAuthTag();
    return [
      VERSION_PREFIX,
      iv.toString("base64"),
      authTag.toString("base64"),
      encrypted.toString("base64"),
    ].join(".");
  }

  decrypt(ciphertext: string): string {
    const parts = ciphertext.split(".");
    if (parts.length !== 4 || parts[0] !== VERSION_PREFIX) {
      throw new Error("Invalid ciphertext format");
    }
    const [, ivBase64, authTagBase64, encryptedBase64] = parts;
    const iv = Buffer.from(ivBase64, "base64");
    const authTag = Buffer.from(authTagBase64, "base64");
    const encrypted = Buffer.from(encryptedBase64, "base64");
    if (authTag.length !== AUTH_TAG_LENGTH) {
      throw new Error("Invalid auth tag length");
    }
    const decipher = createDecipheriv(ALGORITHM, this.key, iv);
    decipher.setAuthTag(authTag);
    const decrypted = Buffer.concat([
      decipher.update(encrypted),
      decipher.final(),
    ]);
    return decrypted.toString("utf8");
  }
}
