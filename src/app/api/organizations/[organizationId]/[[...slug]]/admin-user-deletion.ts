interface DeleteAdminUserWithAuthCleanupParams {
  uid: string;
  accountData: Record<string, unknown>;
  countAccountsByUid: (uid: string) => Promise<number>;
  deleteAccount: () => Promise<void>;
  restoreAccount: (accountData: Record<string, unknown>) => Promise<void>;
  deleteAuthUser: (uid: string) => Promise<void>;
}

export async function deleteAdminUserWithAuthCleanup(
  params: DeleteAdminUserWithAuthCleanupParams,
): Promise<void> {
  const accountCount = await params.countAccountsByUid(params.uid);
  const isLastAccount = accountCount <= 1;

  await params.deleteAccount();

  if (!isLastAccount) {
    return;
  }

  try {
    await params.deleteAuthUser(params.uid);
  } catch (error) {
    await params.restoreAccount(params.accountData);
    throw error;
  }
}
