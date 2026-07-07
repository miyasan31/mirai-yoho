import { describe, expect, it, vi } from "vitest";
import { deleteAdminUserWithAuthCleanup } from "../admin-user-deletion";

describe("admin-user-deletion", () => {
  it("deletes account and auth user when this is the last account", async () => {
    const countAccountsByUid = vi.fn().mockResolvedValue(1);
    const deleteAccount = vi.fn().mockResolvedValue(undefined);
    const restoreAccount = vi.fn().mockResolvedValue(undefined);
    const deleteAuthUser = vi.fn().mockResolvedValue(undefined);

    await deleteAdminUserWithAuthCleanup({
      uid: "user-1",
      accountData: { uid: "user-1", organizationId: "org-1" },
      countAccountsByUid,
      deleteAccount,
      restoreAccount,
      deleteAuthUser,
    });

    expect(countAccountsByUid).toHaveBeenCalledWith("user-1");
    expect(deleteAccount).toHaveBeenCalledTimes(1);
    expect(deleteAuthUser).toHaveBeenCalledWith("user-1");
    expect(restoreAccount).not.toHaveBeenCalled();
  });

  it("deletes only account when user still belongs to other organizations", async () => {
    const countAccountsByUid = vi.fn().mockResolvedValue(2);
    const deleteAccount = vi.fn().mockResolvedValue(undefined);
    const restoreAccount = vi.fn().mockResolvedValue(undefined);
    const deleteAuthUser = vi.fn().mockResolvedValue(undefined);

    await deleteAdminUserWithAuthCleanup({
      uid: "user-1",
      accountData: { uid: "user-1", organizationId: "org-1" },
      countAccountsByUid,
      deleteAccount,
      restoreAccount,
      deleteAuthUser,
    });

    expect(deleteAccount).toHaveBeenCalledTimes(1);
    expect(deleteAuthUser).not.toHaveBeenCalled();
    expect(restoreAccount).not.toHaveBeenCalled();
  });

  it("restores account and rethrows when auth deletion fails", async () => {
    const countAccountsByUid = vi.fn().mockResolvedValue(1);
    const deleteAccount = vi.fn().mockResolvedValue(undefined);
    const restoreAccount = vi.fn().mockResolvedValue(undefined);
    const deleteAuthUser = vi
      .fn()
      .mockRejectedValue(new Error("firebase auth delete failed"));
    const accountData = { uid: "user-1", organizationId: "org-1" };

    await expect(
      deleteAdminUserWithAuthCleanup({
        uid: "user-1",
        accountData,
        countAccountsByUid,
        deleteAccount,
        restoreAccount,
        deleteAuthUser,
      }),
    ).rejects.toThrow("firebase auth delete failed");

    expect(deleteAccount).toHaveBeenCalledTimes(1);
    expect(deleteAuthUser).toHaveBeenCalledWith("user-1");
    expect(restoreAccount).toHaveBeenCalledWith(accountData);
  });
});
