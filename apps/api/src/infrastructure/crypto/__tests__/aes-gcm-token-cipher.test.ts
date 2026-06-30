import { randomBytes } from "node:crypto";
import { AesGcmTokenCipher } from "@/infrastructure/crypto/aes-gcm-token-cipher";

const KEY = randomBytes(32).toString("base64");

describe("AesGcmTokenCipher", () => {
  it("encrypt して decrypt すると元の文字列が返る", () => {
    const cipher = new AesGcmTokenCipher(KEY);
    const plain = "super-secret-zoom-access-token";
    const encrypted = cipher.encrypt(plain);
    expect(cipher.decrypt(encrypted)).toBe(plain);
  });

  it("毎回 IV が変わるため同じ平文でも暗号文は異なる", () => {
    const cipher = new AesGcmTokenCipher(KEY);
    const a = cipher.encrypt("same");
    const b = cipher.encrypt("same");
    expect(a).not.toBe(b);
  });

  it("改ざんされた暗号文は decrypt で例外", () => {
    const cipher = new AesGcmTokenCipher(KEY);
    const encrypted = cipher.encrypt("secret");
    const tampered = `${encrypted.slice(0, -2)}AA`;
    expect(() => cipher.decrypt(tampered)).toThrow();
  });

  it("鍵長が 32 バイトでなければ初期化エラー", () => {
    const shortKey = randomBytes(16).toString("base64");
    expect(() => new AesGcmTokenCipher(shortKey)).toThrow();
  });
});
