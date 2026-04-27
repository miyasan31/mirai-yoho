import { NextResponse } from "next/server";
import { describe, expect, it } from "vitest";
import {
  getPublicCacheControl,
  withPublicCacheControl,
} from "../public-cache-control";

describe("public-cache-control", () => {
  it("returns cache control for each public endpoint", () => {
    expect(getPublicCacheControl("consultants")).toBe(
      "public, max-age=60, s-maxage=300, stale-while-revalidate=600",
    );
    expect(getPublicCacheControl("slots")).toBe(
      "public, max-age=30, s-maxage=120, stale-while-revalidate=300",
    );
    expect(getPublicCacheControl("settings-public")).toBe(
      "public, max-age=300, s-maxage=900, stale-while-revalidate=1800",
    );
  });

  it("sets Cache-Control header on response", () => {
    const response = withPublicCacheControl(
      NextResponse.json({ ok: true }),
      "consultants",
    );

    expect(response.headers.get("Cache-Control")).toBe(
      "public, max-age=60, s-maxage=300, stale-while-revalidate=600",
    );
  });
});
