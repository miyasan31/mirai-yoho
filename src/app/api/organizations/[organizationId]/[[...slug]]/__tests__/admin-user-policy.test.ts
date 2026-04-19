import {
  canUpdateDisplayNameTarget,
  isLastAdminSelfDemotion,
} from "../admin-user-policy";

describe("admin-user-policy", () => {
  it("allows display name update for admin and operator self only", () => {
    expect(canUpdateDisplayNameTarget("admin", "admin-1", "user-2")).toBe(true);
    expect(canUpdateDisplayNameTarget("operator", "op-1", "op-1")).toBe(true);
    expect(canUpdateDisplayNameTarget("operator", "op-1", "op-2")).toBe(false);
  });

  it("blocks last admin self demotion", () => {
    expect(
      isLastAdminSelfDemotion({
        actorUid: "admin-1",
        targetUid: "admin-1",
        nextRole: "operator",
        activeAdminCount: 1,
      }),
    ).toBe(true);

    expect(
      isLastAdminSelfDemotion({
        actorUid: "admin-1",
        targetUid: "admin-1",
        nextRole: "operator",
        activeAdminCount: 2,
      }),
    ).toBe(false);

    expect(
      isLastAdminSelfDemotion({
        actorUid: "admin-1",
        targetUid: "admin-2",
        nextRole: "operator",
        activeAdminCount: 1,
      }),
    ).toBe(false);
  });
});
