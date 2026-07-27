import type { Consultant } from "@/hooks/use-auth";

/**
 * 相談員として所属する組織のうち最古のものを返す。
 * consultants は API 側で createdAt 昇順に並んでいる。
 */
export function findDefaultOrganizationId(
  consultants: Consultant[],
): string | null {
  return consultants[0]?.organizationId ?? null;
}
