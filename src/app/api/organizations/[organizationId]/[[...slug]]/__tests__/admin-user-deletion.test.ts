import { describe, expect, it, vi } from "vitest";
import { deleteAdminUserWithAuthCleanup } from "../admin-user-deletion";

describe("admin-user-deletion", () => {
  it("deletes membership and auth user when this is the last membership", async () => {
    const countMembershipsByUid = vi.fn().mockResolvedValue(1);
    const deleteMembership = vi.fn().mockResolvedValue(undefined);
    const restoreMembership = vi.fn().mockResolvedValue(undefined);
    const deleteAuthUser = vi.fn().mockResolvedValue(undefined);

    await deleteAdminUserWithAuthCleanup({
      uid: "user-1",
      membershipData: { uid: "user-1", organizationId: "org-1" },
      countMembershipsByUid,
      deleteMembership,
      restoreMembership,
      deleteAuthUser,
    });

    expect(countMembershipsByUid).toHaveBeenCalledWith("user-1");
    expect(deleteMembership).toHaveBeenCalledTimes(1);
    expect(deleteAuthUser).toHaveBeenCalledWith("user-1");
    expect(restoreMembership).not.toHaveBeenCalled();
  });

  it("deletes only membership when user still belongs to other organizations", async () => {
    const countMembershipsByUid = vi.fn().mockResolvedValue(2);
    const deleteMembership = vi.fn().mockResolvedValue(undefined);
    const restoreMembership = vi.fn().mockResolvedValue(undefined);
    const deleteAuthUser = vi.fn().mockResolvedValue(undefined);

    await deleteAdminUserWithAuthCleanup({
      uid: "user-1",
      membershipData: { uid: "user-1", organizationId: "org-1" },
      countMembershipsByUid,
      deleteMembership,
      restoreMembership,
      deleteAuthUser,
    });

    expect(deleteMembership).toHaveBeenCalledTimes(1);
    expect(deleteAuthUser).not.toHaveBeenCalled();
    expect(restoreMembership).not.toHaveBeenCalled();
  });

  it("restores membership and rethrows when auth deletion fails", async () => {
    const countMembershipsByUid = vi.fn().mockResolvedValue(1);
    const deleteMembership = vi.fn().mockResolvedValue(undefined);
    const restoreMembership = vi.fn().mockResolvedValue(undefined);
    const deleteAuthUser = vi
      .fn()
      .mockRejectedValue(new Error("firebase auth delete failed"));
    const membershipData = { uid: "user-1", organizationId: "org-1" };

    await expect(
      deleteAdminUserWithAuthCleanup({
        uid: "user-1",
        membershipData,
        countMembershipsByUid,
        deleteMembership,
        restoreMembership,
        deleteAuthUser,
      }),
    ).rejects.toThrow("firebase auth delete failed");

    expect(deleteMembership).toHaveBeenCalledTimes(1);
    expect(deleteAuthUser).toHaveBeenCalledWith("user-1");
    expect(restoreMembership).toHaveBeenCalledWith(membershipData);
  });
});
