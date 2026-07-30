import { DomainError } from "@mirai-yoho/shared/domain-error";

/**
 * ポリシーの読者区分。同じ「利用規約」でも利用者向けと占い師向けで
 * 内容・改版サイクルが独立するため、PolicyType に区分をプレフィックスとして畳み込む。
 */
export type PolicyAudience = "user" | "consultant";

export type PolicyType =
  | "user_terms"
  | "user_cancellation_policy"
  | "user_privacy_policy"
  | "consultant_terms"
  | "consultant_privacy_policy";

export const USER_POLICY_TYPES: readonly PolicyType[] = [
  "user_terms",
  "user_cancellation_policy",
  "user_privacy_policy",
] as const;

export const CONSULTANT_POLICY_TYPES: readonly PolicyType[] = [
  "consultant_terms",
  "consultant_privacy_policy",
] as const;

export const POLICY_TYPES: readonly PolicyType[] = [
  ...USER_POLICY_TYPES,
  ...CONSULTANT_POLICY_TYPES,
] as const;

export const POLICY_TYPES_BY_AUDIENCE: Record<
  PolicyAudience,
  readonly PolicyType[]
> = {
  user: USER_POLICY_TYPES,
  consultant: CONSULTANT_POLICY_TYPES,
};

export function validatePolicyType(value: string): PolicyType {
  if (!POLICY_TYPES.includes(value as PolicyType)) {
    throw new DomainError(
      "INVALID_POLICY_TYPE",
      `Unknown policy type: ${value}`,
    );
  }
  return value as PolicyType;
}

export function policyAudienceOf(type: PolicyType): PolicyAudience {
  return CONSULTANT_POLICY_TYPES.includes(type) ? "consultant" : "user";
}
