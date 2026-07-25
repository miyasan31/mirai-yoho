import { DomainError } from "@mirai-yoho/shared/domain-error";

export type PolicyType = "terms" | "cancellation_policy";

export const POLICY_TYPES: readonly PolicyType[] = [
  "terms",
  "cancellation_policy",
] as const;

export function validatePolicyType(value: string): PolicyType {
  if (!POLICY_TYPES.includes(value as PolicyType)) {
    throw new DomainError(
      "INVALID_POLICY_TYPE",
      `Unknown policy type: ${value}`,
    );
  }
  return value as PolicyType;
}
