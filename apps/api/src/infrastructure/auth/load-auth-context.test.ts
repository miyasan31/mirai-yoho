import { beforeEach, describe, expect, it, vi } from "vitest";
import { Account } from "@/domain/account/account";
import { activateInvitedAccounts } from "@/infrastructure/auth/load-auth-context";

const mocks = vi.hoisted(() => ({
  findByAccountId: vi.fn(),
  saveAll: vi.fn(),
  createAccountRepository: vi.fn(),
}));

vi.mock("@/infrastructure/container", () => ({
  createAccountRepository: mocks.createAccountRepository,
}));

function buildAccount(status: "active" | "invited" | "disabled"): Account {
  return Account.reconstruct({
    organizationId: "org-1",
    accountId: "u1",
    roleId: "admin",
    status,
    name: null,
    createdAt: new Date("2026-01-01T00:00:00Z"),
    updatedAt: new Date("2026-01-01T00:00:00Z"),
  });
}

describe("activateInvitedAccounts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.createAccountRepository.mockReturnValue({
      findByAccountId: mocks.findByAccountId,
      saveAll: mocks.saveAll,
    });
    mocks.saveAll.mockResolvedValue(undefined);
  });

  it("promotes all invited accounts to active regardless of role", async () => {
    const invited1 = buildAccount("invited");
    const invited2 = buildAccount("invited");
    const already = buildAccount("active");
    mocks.findByAccountId.mockResolvedValueOnce([invited1, invited2, already]);

    await activateInvitedAccounts("u1");

    expect(mocks.findByAccountId).toHaveBeenCalledWith("u1");
    expect(mocks.saveAll).toHaveBeenCalledTimes(1);
    const savedAccounts = mocks.saveAll.mock.calls[0][0] as Account[];
    expect(savedAccounts).toHaveLength(2);
    for (const account of savedAccounts) {
      expect(account.getStatus()).toBe("active");
    }
  });

  it("does nothing when no invited accounts exist", async () => {
    mocks.findByAccountId.mockResolvedValueOnce([buildAccount("active")]);

    await activateInvitedAccounts("u2");

    expect(mocks.saveAll).not.toHaveBeenCalled();
  });

  it("does nothing when the user has no accounts at all", async () => {
    mocks.findByAccountId.mockResolvedValueOnce([]);

    await activateInvitedAccounts("u3");

    expect(mocks.saveAll).not.toHaveBeenCalled();
  });
});
