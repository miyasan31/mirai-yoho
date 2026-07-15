import type { Context, Handler } from "hono";
import { AuthError } from "@/infrastructure/auth/verify-auth";
import { withNoStore } from "../cache-control";
import { logUnexpectedPostError, mapApiError } from "./api-error-mapper";

export interface RequestErrorContext {
  endpoint?: string;
  organizationId?: string;
  consultantId?: string | null;
}

export interface OrganizationRouteContext {
  request: Request;
  requestUrl: URL;
  organizationId: string;
  param: (key: string) => string;
  errorContext: RequestErrorContext;
}

type OrganizationRouteHandler = (
  ctx: OrganizationRouteContext,
) => Promise<Response>;

export function jsonError(
  status: number,
  code: string,
  message: string,
): Response {
  return Response.json({ code, message }, { status });
}

export function noStoreJson<T>(payload: T, init?: ResponseInit): Response {
  return withNoStore(Response.json(payload, init));
}

export function noStoreError(
  status: number,
  code: string,
  message: string,
): Response {
  return withNoStore(jsonError(status, code, message));
}

export function isFirestoreFailedPrecondition(error: unknown): boolean {
  if (typeof error !== "object" || error === null) return false;

  const candidate = error as { code?: unknown; message?: unknown };
  const code = candidate.code;
  const message =
    typeof candidate.message === "string" ? candidate.message : "";

  return (
    code === 9 ||
    code === "9" ||
    code === "failed-precondition" ||
    code === "FAILED_PRECONDITION" ||
    message.includes("FAILED_PRECONDITION") ||
    message.includes("requires an index")
  );
}

export function logAuthorizationFailure(params: {
  method: string;
  endpoint: string;
  organizationId?: string;
  errorCode: string;
  message: string;
}) {
  console.warn("Authorization failed", {
    category: "security",
    method: params.method,
    endpoint: params.endpoint,
    organizationId: params.organizationId ?? "unknown",
    errorCode: params.errorCode,
    message: params.message,
  });
}

function organizationPathSegments(requestUrl: URL): string[] {
  // /api/organizations/:organizationId/ 以降のパスセグメント
  return requestUrl.pathname
    .split("/")
    .filter((segment) => segment.length > 0)
    .slice(3)
    .map((segment) => decodeURIComponent(segment));
}

function buildRouteContext(c: Context): OrganizationRouteContext {
  const request = c.req.raw;
  const requestUrl = new URL(request.url);
  const organizationId = c.req.param("organizationId") ?? "";
  return {
    request,
    requestUrl,
    organizationId,
    param: (key) => c.req.param(key) ?? "",
    errorContext: { organizationId },
  };
}

export function getRoute(handler: OrganizationRouteHandler): Handler {
  return async (c) => {
    const ctx = buildRouteContext(c);
    try {
      return await handler(ctx);
    } catch (error) {
      if (error instanceof AuthError) {
        if (error.statusCode === 403) {
          logAuthorizationFailure({
            method: "GET",
            endpoint:
              ctx.errorContext.endpoint ?? `GET ${ctx.requestUrl.pathname}`,
            organizationId: ctx.errorContext.organizationId,
            errorCode: error.code,
            message: error.message,
          });
        }
        return withNoStore(
          jsonError(error.statusCode, error.code, error.message),
        );
      }
      if (isFirestoreFailedPrecondition(error)) {
        console.error("Firestore failed precondition on slots query", {
          endpoint: ctx.errorContext.endpoint ?? ctx.requestUrl.pathname,
          organizationId: ctx.errorContext.organizationId,
          consultantId: ctx.errorContext.consultantId,
          error,
        });
        return withNoStore(
          jsonError(
            500,
            "FIRESTORE_INDEX_MISSING",
            "Required Firestore index is missing. Please deploy Firestore indexes.",
          ),
        );
      }
      return withNoStore(
        jsonError(500, "INTERNAL_ERROR", "Internal server error"),
      );
    }
  };
}

export function postRoute(handler: OrganizationRouteHandler): Handler {
  return async (c) => {
    const ctx = buildRouteContext(c);
    const endpoint = `POST ${ctx.requestUrl.pathname}`;
    try {
      return await handler(ctx);
    } catch (error) {
      if (error instanceof AuthError) {
        if (error.statusCode === 403) {
          logAuthorizationFailure({
            method: "POST",
            endpoint,
            organizationId: ctx.organizationId,
            errorCode: error.code,
            message: error.message,
          });
        }
        return jsonError(error.statusCode, error.code, error.message);
      }
      logUnexpectedPostError(error, {
        endpoint,
        organizationId: ctx.organizationId,
        segments: organizationPathSegments(ctx.requestUrl),
      });
      const mappedError = mapApiError(error);
      return jsonError(
        mappedError.status,
        mappedError.code,
        mappedError.message,
      );
    }
  };
}

function mutationRoute(
  method: "PATCH" | "DELETE",
  handler: OrganizationRouteHandler,
): Handler {
  return async (c) => {
    const ctx = buildRouteContext(c);
    try {
      return await handler(ctx);
    } catch (error) {
      if (error instanceof AuthError) {
        if (error.statusCode === 403) {
          logAuthorizationFailure({
            method,
            endpoint: `${method} ${ctx.requestUrl.pathname}`,
            organizationId: ctx.organizationId,
            errorCode: error.code,
            message: error.message,
          });
        }
        return jsonError(error.statusCode, error.code, error.message);
      }
      const mappedError = mapApiError(error);
      return jsonError(
        mappedError.status,
        mappedError.code,
        mappedError.message,
      );
    }
  };
}

export function patchRoute(handler: OrganizationRouteHandler): Handler {
  return mutationRoute("PATCH", handler);
}

export function deleteRoute(handler: OrganizationRouteHandler): Handler {
  return mutationRoute("DELETE", handler);
}
