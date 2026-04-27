import {
  isFutureClientBirthdate,
  isValidClientBirthdateFormat,
} from "@/lib/client-birthdate";

export function validateClientBirthdate(value: unknown): {
  valid: boolean;
  errorMessage?: string;
} {
  if (typeof value !== "string" || value.trim().length === 0) {
    return {
      valid: false,
      errorMessage: "clientBirthdate is required",
    };
  }

  const birthdate = value.trim();
  if (!isValidClientBirthdateFormat(birthdate)) {
    return {
      valid: false,
      errorMessage: "clientBirthdate must be in YYYY-MM-DD format",
    };
  }

  if (isFutureClientBirthdate(birthdate)) {
    return {
      valid: false,
      errorMessage: "clientBirthdate cannot be in the future",
    };
  }

  return { valid: true };
}
