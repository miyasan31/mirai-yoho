import { activateInvitedAccounts } from "@/infrastructure/auth/load-auth-context";

const {
  mockGet,
  mockWhereStatus,
  mockWhereUid,
  mockCollection,
  mockBatchUpdate,
  mockBatchCommit,
  mockBatch,
} = vi.hoisted(() => {
  const mockGet = vi.fn();
  const mockWhereStatus = vi.fn(() => ({ get: mockGet }));
  const mockWhereUid = vi.fn(() => ({ where: mockWhereStatus }));
  const mockCollection = vi.fn(() => ({ where: mockWhereUid }));
  const mockBatchUpdate = vi.fn();
  const mockBatchCommit = vi.fn();
  const mockBatch = vi.fn(() => ({
    update: mockBatchUpdate,
    commit: mockBatchCommit,
  }));

  return {
    mockGet,
    mockWhereStatus,
    mockWhereUid,
    mockCollection,
    mockBatchUpdate,
    mockBatchCommit,
    mockBatch,
  };
});

vi.mock("@/infrastructure/firestore/firestore-customer", () => ({
  db: {
    collection: mockCollection,
    batch: mockBatch,
  },
}));

describe("activateInvitedAccounts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("promotes all invited accounts to active regardless of role", async () => {
    const docs = [
      { ref: { id: "org-1_u1_admin" }, data: () => ({ role: "admin" }) },
      { ref: { id: "org-1_u1_operator" }, data: () => ({ role: "operator" }) },
      {
        ref: { id: "org-1_u1_consultant" },
        data: () => ({ role: "consultant" }),
      },
    ];
    mockGet.mockResolvedValueOnce({
      empty: false,
      docs,
    });

    await activateInvitedAccounts("u1");

    expect(mockCollection).toHaveBeenCalledWith("accounts");
    expect(mockWhereUid).toHaveBeenCalledWith("uid", "==", "u1");
    expect(mockWhereStatus).toHaveBeenCalledWith("status", "==", "invited");
    expect(mockBatch).toHaveBeenCalledTimes(1);
    expect(mockBatchUpdate).toHaveBeenCalledTimes(3);
    for (const doc of docs) {
      expect(mockBatchUpdate).toHaveBeenCalledWith(
        doc.ref,
        expect.objectContaining({
          status: "active",
          updatedAt: expect.any(Date),
        }),
      );
    }
    expect(mockBatchCommit).toHaveBeenCalledTimes(1);
  });

  it("does nothing when no invited accounts exist", async () => {
    mockGet.mockResolvedValueOnce({
      empty: true,
      docs: [],
    });

    await activateInvitedAccounts("u2");

    expect(mockBatch).not.toHaveBeenCalled();
    expect(mockBatchUpdate).not.toHaveBeenCalled();
    expect(mockBatchCommit).not.toHaveBeenCalled();
  });
});
