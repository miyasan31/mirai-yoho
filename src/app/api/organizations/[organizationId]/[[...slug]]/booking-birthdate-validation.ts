import {
  isFutureCustomerBirthdate,
  isValidCustomerBirthdateFormat,
} from "@/lib/customer-birthdate";

export function validateCustomerBirthdate(value: unknown): {
  valid: boolean;
  errorMessage?: string;
} {
  if (typeof value !== "string" || value.trim().length === 0) {
    return {
      valid: false,
      errorMessage: "customerBirthDate is required",
    };
  }

  const birthDate = value.trim();
  if (!isValidCustomerBirthdateFormat(birthDate)) {
    return {
      valid: false,
      errorMessage: "customerBirthDate must be in YYYY-MM-DD format",
    };
  }

  if (isFutureCustomerBirthdate(birthDate)) {
    return {
      valid: false,
      errorMessage: "customerBirthDate cannot be in the future",
    };
  }

  return { valid: true };
}
