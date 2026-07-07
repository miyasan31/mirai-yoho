import { type NextRequest, NextResponse } from "next/server";
import { envServer } from "@/config/env.server";

export const config = {
  matcher: "/api/:path*",
};

const CORS_HEADERS = {
  "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Authorization, Content-Type",
  "Access-Control-Max-Age": "86400",
} as const;

function applyCorsHeaders(response: NextResponse, origin: string): void {
  response.headers.set("Access-Control-Allow-Origin", origin);
  for (const [key, value] of Object.entries(CORS_HEADERS)) {
    response.headers.set(key, value);
  }
  response.headers.append("Vary", "Origin");
}

export function middleware(request: NextRequest): NextResponse {
  const origin = request.headers.get("Origin");
  const isAllowedOrigin =
    origin !== null && envServer.corsAllowedOrigins.includes(origin);

  if (request.method === "OPTIONS") {
    const response = new NextResponse(null, { status: 204 });
    if (isAllowedOrigin) {
      applyCorsHeaders(response, origin);
    }
    return response;
  }

  const response = NextResponse.next();
  if (isAllowedOrigin) {
    applyCorsHeaders(response, origin);
  }
  return response;
}
