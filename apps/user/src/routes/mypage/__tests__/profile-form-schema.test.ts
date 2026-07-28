import * as v from "valibot";
import { profileFormSchema } from "../-profile-form-schema";

const validValues = {
  displayName: "山田 太郎",
  primaryEmail: "taro@example.com",
  phoneNumber: "090-1234-5678",
  birthDate: "1990-01-01",
};

describe("profileFormSchema primaryEmail", () => {
  it("accepts a valid email", () => {
    const result = v.safeParse(profileFormSchema, validValues);
    expect(result.success).toBe(true);
  });

  it("rejects an empty email because it is required", () => {
    const result = v.safeParse(profileFormSchema, {
      ...validValues,
      primaryEmail: "",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.issues[0].message).toBe("メールアドレスを入力してください");
    }
  });

  it("rejects a whitespace-only email", () => {
    const result = v.safeParse(profileFormSchema, {
      ...validValues,
      primaryEmail: "  ",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.issues[0].message).toBe("メールアドレスを入力してください");
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

describe("profileFormSchema phoneNumber", () => {
  it.each(["090-1234-5678", "09012345678", "0312345678", "+819012345678"])(
    "accepts %s",
    (phoneNumber) => {
      const result = v.safeParse(profileFormSchema, {
        ...validValues,
        phoneNumber,
      });
      expect(result.success).toBe(true);
    },
  );

  it("rejects an empty phone number because it is required", () => {
    const result = v.safeParse(profileFormSchema, {
      ...validValues,
      phoneNumber: "",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.issues[0].message).toBe("電話番号を入力してください");
    }
  });

  it("rejects a whitespace-only phone number", () => {
    const result = v.safeParse(profileFormSchema, {
      ...validValues,
      phoneNumber: "  ",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.issues[0].message).toBe("電話番号を入力してください");
    }
  });

  it.each(["090", "090-1234-5678-9012", "090abc5678"])(
    "rejects %s",
    (phoneNumber) => {
      const result = v.safeParse(profileFormSchema, {
        ...validValues,
        phoneNumber,
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.issues[0].message).toBe("電話番号の形式が不正です");
      }
    },
  );
});
