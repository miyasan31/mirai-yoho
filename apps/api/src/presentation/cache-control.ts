export type PublicCacheKey = "price-plans" | "slots" | "settings-public";

const PUBLIC_SHORT_CACHE_CONTROL_BY_KEY: Record<PublicCacheKey, string> = {
  "price-plans": "public, max-age=30, s-maxage=120, stale-while-revalidate=300",
  slots: "public, max-age=30, s-maxage=120, stale-while-revalidate=300",
  "settings-public":
    "public, max-age=300, s-maxage=900, stale-while-revalidate=1800",
};

export function getPublicShortCacheControl(cacheKey: PublicCacheKey): string {
  return PUBLIC_SHORT_CACHE_CONTROL_BY_KEY[cacheKey];
}

export function withPublicShortCache(
  response: Response,
  cacheKey: PublicCacheKey,
): Response {
  response.headers.set("Cache-Control", getPublicShortCacheControl(cacheKey));
  return response;
}

export function withNoStore(response: Response): Response {
  response.headers.set(
    "Cache-Control",
    "no-store, no-cache, must-revalidate, private",
  );
  response.headers.set("Pragma", "no-cache");
  response.headers.set("Expires", "0");
  return response;
}
