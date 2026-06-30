import { describe, expect, it } from "vitest";
import { isLastAdminSelfDemotion } from "../admin-user-policy";

describe("admin user policy", () => {
  it("blocks the last admin from changing themself to any non-admin role", () => {
    expect(
      isLastAdminSelfDemotion({
        actorUid: "admin-1",
        targetUid: "admin-1",
        nextRole: "booking-manager",
        activeAdminCount: 1,
      }),
    ).toBe(true);
  });

  it("allows changing another admin when at least one admin remains", () => {
    expect(
      isLastAdminSelfDemotion({
        actorUid: "admin-1",
        targetUid: "admin-2",
        nextRole: "booking-manager",
        activeAdminCount: 2,
      }),
    ).toBe(false);
  });
});
