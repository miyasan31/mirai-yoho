import { describe, expect, it, vi } from "vitest";
import { Account } from "@/domain/account/account";
import { deleteConsoleUserWithAuthCleanup } from "../console-user-deletion";

function buildAccount(): Account {
  return Account.reconstruct({
    organizationId: "org-1",
    accountId: "user-1",
    roleId: "admin",
    status: "active",
    name: "Test",
    createdAt: new Date("2026-01-01T00:00:00Z"),
    updatedAt: new Date("2026-01-01T00:00:00Z"),
  });
}

describe("console-user-deletion", () => {
  it("deletes account and auth user when this is the last account", async () => {
    const account = buildAccount();
    const countAccountsByAccountId = vi.fn().mockResolvedValue(1);
    const deleteAccount = vi.fn().mockResolvedValue(undefined);
    const restoreAccount = vi.fn().mockResolvedValue(undefined);
    const deleteAuthUser = vi.fn().mockResolvedValue(undefined);

    await deleteConsoleUserWithAuthCleanup({
      accountId: "user-1",
      account,
      countAccountsByAccountId,
      deleteAccount,
      restoreAccount,
      deleteAuthUser,
    });

    expect(countAccountsByAccountId).toHaveBeenCalledWith("user-1");
    expect(deleteAccount).toHaveBeenCalledTimes(1);
    expect(deleteAuthUser).toHaveBeenCalledWith("user-1");
    expect(restoreAccount).not.toHaveBeenCalled();
  });

  it("deletes only account when user still belongs to other organizations", async () => {
    const account = buildAccount();
    const countAccountsByAccountId = vi.fn().mockResolvedValue(2);
    const deleteAccount = vi.fn().mockResolvedValue(undefined);
    const restoreAccount = vi.fn().mockResolvedValue(undefined);
    const deleteAuthUser = vi.fn().mockResolvedValue(undefined);

    await deleteConsoleUserWithAuthCleanup({
      accountId: "user-1",
      account,
      countAccountsByAccountId,
      deleteAccount,
      restoreAccount,
      deleteAuthUser,
    });

    expect(deleteAccount).toHaveBeenCalledTimes(1);
    expect(deleteAuthUser).not.toHaveBeenCalled();
    expect(restoreAccount).not.toHaveBeenCalled();
  });

  it("restores account and rethrows when auth deletion fails", async () => {
    const account = buildAccount();
    const countAccountsByAccountId = vi.fn().mockResolvedValue(1);
    const deleteAccount = vi.fn().mockResolvedValue(undefined);
    const restoreAccount = vi.fn().mockResolvedValue(undefined);
    const deleteAuthUser = vi
      .fn()
      .mockRejectedValue(new Error("firebase auth delete failed"));

    await expect(
      deleteConsoleUserWithAuthCleanup({
        accountId: "user-1",
        account,
        countAccountsByAccountId,
        deleteAccount,
        restoreAccount,
        deleteAuthUser,
      }),
    ).rejects.toThrow("firebase auth delete failed");

    expect(deleteAccount).toHaveBeenCalledTimes(1);
    expect(deleteAuthUser).toHaveBeenCalledWith("user-1");
    expect(restoreAccount).toHaveBeenCalledWith(account);
  });
});
