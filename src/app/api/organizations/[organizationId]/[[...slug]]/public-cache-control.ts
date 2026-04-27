import type { NextResponse } from "next/server";

type PublicCacheKey = "consultants" | "slots" | "settings-public";

const PUBLIC_CACHE_CONTROL_BY_KEY: Record<PublicCacheKey, string> = {
  consultants: "public, max-age=60, s-maxage=300, stale-while-revalidate=600",
  slots: "public, max-age=30, s-maxage=120, stale-while-revalidate=300",
  "settings-public":
    "public, max-age=300, s-maxage=900, stale-while-revalidate=1800",
};

export function getPublicCacheControl(cacheKey: PublicCacheKey): string {
  return PUBLIC_CACHE_CONTROL_BY_KEY[cacheKey];
}

export function withPublicCacheControl(
  response: NextResponse,
  cacheKey: PublicCacheKey,
): NextResponse {
  response.headers.set("Cache-Control", getPublicCacheControl(cacheKey));
  return response;
}
