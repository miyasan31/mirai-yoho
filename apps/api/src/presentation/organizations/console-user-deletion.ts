import type { Account } from "@/domain/account/account";

interface DeleteConsoleUserWithAuthCleanupParams {
  accountId: string;
  account: Account;
  countAccountsByAccountId: (accountId: string) => Promise<number>;
  deleteAccount: () => Promise<void>;
  restoreAccount: (account: Account) => Promise<void>;
  deleteAuthUser: (accountId: string) => Promise<void>;
}

export async function deleteConsoleUserWithAuthCleanup(
  params: DeleteConsoleUserWithAuthCleanupParams,
): Promise<void> {
  const accountCount = await params.countAccountsByAccountId(params.accountId);
  const isLastAccount = accountCount <= 1;

  await params.deleteAccount();

  if (!isLastAccount) {
    return;
  }

  try {
    await params.deleteAuthUser(params.accountId);
  } catch (error) {
    await params.restoreAccount(params.account);
    throw error;
  }
}
