interface DeleteAdminUserWithAuthCleanupParams {
  authUid: string;
  accountData: Record<string, unknown>;
  countAccountsByAuthUid: (authUid: string) => Promise<number>;
  deleteAccount: () => Promise<void>;
  restoreAccount: (accountData: Record<string, unknown>) => Promise<void>;
  deleteAuthUser: (authUid: string) => Promise<void>;
}

export async function deleteAdminUserWithAuthCleanup(
  params: DeleteAdminUserWithAuthCleanupParams,
): Promise<void> {
  const accountCount = await params.countAccountsByAuthUid(params.authUid);
  const isLastAccount = accountCount <= 1;

  await params.deleteAccount();

  if (!isLastAccount) {
    return;
  }

  try {
    await params.deleteAuthUser(params.authUid);
  } catch (error) {
    await params.restoreAccount(params.accountData);
    throw error;
  }
}
