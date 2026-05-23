import { NextResponse } from "next/server";
import { describe, expect, it } from "vitest";
import {
  getPublicShortCacheControl,
  withNoStore,
  withPublicShortCache,
} from "../../../../cache-control";

describe("cache-control", () => {
  it("returns cache control for each public endpoint", () => {
    expect(getPublicShortCacheControl("consultants")).toBe(
      "public, max-age=60, s-maxage=300, stale-while-revalidate=600",
    );
    expect(getPublicShortCacheControl("slots")).toBe(
      "public, max-age=30, s-maxage=120, stale-while-revalidate=300",
    );
    expect(getPublicShortCacheControl("settings-public")).toBe(
      "public, max-age=300, s-maxage=900, stale-while-revalidate=1800",
    );
  });

  it("sets Cache-Control header on response", () => {
    const response = withPublicShortCache(
      NextResponse.json({ ok: true }),
      "consultants",
    );

    expect(response.headers.get("Cache-Control")).toBe(
      "public, max-age=60, s-maxage=300, stale-while-revalidate=600",
    );
  });

  it("sets no-store headers on response", () => {
    const response = withNoStore(NextResponse.json({ ok: true }));

    expect(response.headers.get("Cache-Control")).toBe(
      "no-store, no-cache, must-revalidate, private",
    );
    expect(response.headers.get("Pragma")).toBe("no-cache");
    expect(response.headers.get("Expires")).toBe("0");
  });
});
