import * as v from "valibot";
import { profileFormSchema } from "../-profile-form-schema";

const validValues = {
  displayName: "山田 太郎",
  primaryEmail: "taro@example.com",
  birthDate: "1990-01-01",
};

describe("profileFormSchema primaryEmail", () => {
  it("accepts a valid email", () => {
    const result = v.safeParse(profileFormSchema, validValues);
    expect(result.success).toBe(true);
  });

  it("accepts an empty email because it is optional", () => {
    const result = v.safeParse(profileFormSchema, {
      ...validValues,
      primaryEmail: "",
    });
    expect(result.success).toBe(true);
  });

  it("accepts a whitespace-only email as empty", () => {
    const result = v.safeParse(profileFormSchema, {
      ...validValues,
      primaryEmail: "  ",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.output.primaryEmail).toBe("");
    }
  });

  it("rejects an invalid email format", () => {
    const result = v.safeParse(profileFormSchema, {
      ...validValues,
      primaryEmail: "invalid-email",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.issues[0].message).toBe("メールアドレスの形式が不正です");
    }
  });
});
