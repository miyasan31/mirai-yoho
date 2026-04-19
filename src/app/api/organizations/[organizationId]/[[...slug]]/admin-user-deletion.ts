interface DeleteAdminUserWithAuthCleanupParams {
  uid: string;
  membershipData: Record<string, unknown>;
  countMembershipsByUid: (uid: string) => Promise<number>;
  deleteMembership: () => Promise<void>;
  restoreMembership: (membershipData: Record<string, unknown>) => Promise<void>;
  deleteAuthUser: (uid: string) => Promise<void>;
}

export async function deleteAdminUserWithAuthCleanup(
  params: DeleteAdminUserWithAuthCleanupParams,
): Promise<void> {
  const membershipCount = await params.countMembershipsByUid(params.uid);
  const isLastMembership = membershipCount <= 1;

  await params.deleteMembership();

  if (!isLastMembership) {
    return;
  }

  try {
    await params.deleteAuthUser(params.uid);
  } catch (error) {
    await params.restoreMembership(params.membershipData);
    throw error;
  }
}
