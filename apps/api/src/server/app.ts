import { Hono } from "hono";
import { cors } from "hono/cors";
import { envServer } from "@/config/env.server";
import * as authMe from "@/presentation/auth/me";
import * as authOrganization from "@/presentation/auth/organization";
import * as zoomAuthorize from "@/presentation/auth/zoom-authorize";
import * as zoomCallback from "@/presentation/auth/zoom-callback";
import * as zoomRevoke from "@/presentation/auth/zoom-revoke";
import * as couponsReceive from "@/presentation/customer/coupons-receive";
import * as customerMe from "@/presentation/customer/me";
import * as customerMeCoupons from "@/presentation/customer/me-coupons";
import * as customerSignup from "@/presentation/customer/signup";
import * as customerBookings from "@/presentation/organizations/customer-bookings";
import * as organizationRoutes from "@/presentation/organizations/organization-routes";
import * as stripeWebhook from "@/presentation/webhooks/stripe";

interface OrganizationRouteContext {
  params: Promise<{
    organizationId: string;
    slug?: string[];
  }>;
}

type OrganizationRouteHandler = (
  request: Request,
  context: OrganizationRouteContext,
) => Promise<Response>;

const organizationRouteHandlers: Record<string, OrganizationRouteHandler> = {
  GET: organizationRoutes.GET,
  POST: organizationRoutes.POST,
  PATCH: organizationRoutes.PATCH,
  DELETE: organizationRoutes.DELETE,
};

// /api/organizations/:organizationId/ 以降のパスセグメントを
// Next.js の optional catch-all（[[...slug]]）と同じ形に分解する
function parseOrganizationSlug(requestUrl: string): string[] {
  return new URL(requestUrl).pathname
    .split("/")
    .filter((segment) => segment.length > 0)
    .slice(3)
    .map((segment) => decodeURIComponent(segment));
}

export function createApp(): Hono {
  const app = new Hono();

  app.use(
    "/api/*",
    cors({
      origin: (origin) =>
        envServer.corsAllowedOrigins.includes(origin) ? origin : null,
      allowMethods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
      allowHeaders: ["Authorization", "Content-Type"],
      maxAge: 86400,
    }),
  );

  app.get("/api/auth/me", (c) => authMe.GET(c.req.raw));
  app.patch("/api/auth/organization", (c) => authOrganization.PATCH(c.req.raw));
  app.post("/api/auth/zoom/authorize", (c) => zoomAuthorize.POST(c.req.raw));
  app.get("/api/auth/zoom/callback", (c) => zoomCallback.GET(c.req.raw));
  app.post("/api/auth/zoom/revoke", (c) => zoomRevoke.POST(c.req.raw));

  app.get("/api/customer/me", (c) => customerMe.GET(c.req.raw));
  app.patch("/api/customer/me", (c) => customerMe.PATCH(c.req.raw));
  app.delete("/api/customer/me", (c) => customerMe.DELETE(c.req.raw));
  app.post("/api/customer/me/signup", (c) => customerSignup.POST(c.req.raw));
  app.get("/api/customer/me/coupons", (c) => customerMeCoupons.GET(c.req.raw));
  app.post("/api/customer/coupons/receive", (c) =>
    couponsReceive.POST(c.req.raw),
  );

  app.post("/api/webhooks/stripe", (c) => stripeWebhook.POST(c.req.raw));

  // 具体的なパスを catch-all より先に登録する（Hono は登録順に一致を評価する）
  app.get("/api/organizations/:organizationId/customers/me/bookings", (c) =>
    customerBookings.GET(c.req.raw, {
      params: Promise.resolve({
        organizationId: c.req.param("organizationId"),
      }),
    }),
  );

  app.on(
    ["GET", "POST", "PATCH", "DELETE"],
    [
      "/api/organizations/:organizationId",
      "/api/organizations/:organizationId/*",
    ],
    (c) => {
      const handler = organizationRouteHandlers[c.req.method];
      if (!handler) {
        return c.json(
          { code: "METHOD_NOT_ALLOWED", message: "Method not allowed" },
          405,
        );
      }
      return handler(c.req.raw, {
        params: Promise.resolve({
          organizationId: c.req.param("organizationId"),
          slug: parseOrganizationSlug(c.req.url),
        }),
      });
    },
  );

  app.notFound((c) =>
    c.json({ code: "NOT_FOUND", message: "Endpoint not found" }, 404),
  );

  app.onError((error, c) => {
    console.error("Unhandled error", {
      method: c.req.method,
      path: new URL(c.req.url).pathname,
      error,
    });
    return c.json(
      { code: "INTERNAL_ERROR", message: "Internal server error" },
      500,
    );
  });

  return app;
}
