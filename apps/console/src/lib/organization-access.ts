import type { Account } from "@/hooks/use-auth";
import { CONSOLE_NAV_PERMISSIONS } from "@/pages/nav-items";

/** そのアカウントでコンソールを開けるか */
export function canOpenConsole(account: Account): boolean {
  return account.permissions.some((permission) =>
    CONSOLE_NAV_PERMISSIONS.includes(permission),
  );
}

/**
 * コンソールを開ける組織のうち最古のものを返す。
 * accounts は API 側で createdAt 昇順に並んでいる。
 */
export function findDefaultOrganizationId(accounts: Account[]): string | null {
  return accounts.find(canOpenConsole)?.organizationId ?? null;
}
