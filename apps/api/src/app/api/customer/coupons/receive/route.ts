import { NextResponse } from "next/server";
import * as v from "valibot";
import { AppError } from "@/application/shared/app-error";
import { envServer } from "@/config/env.server";
import { DomainError } from "@/domain/shared/domain-error";
import { createReceiveCouponUseCase } from "@/infrastructure/container";
import { withNoStore } from "../../../cache-control";

const receiveBodySchema = v.object({
  userId: v.pipe(v.string(), v.minLength(1)),
  couponId: v.pipe(v.string(), v.minLength(1)),
  organizationId: v.optional(v.string()),
  expiresAt: v.optional(v.pipe(v.string(), v.isoDateTime())),
});

function jsonError(statusCode: number, code: string, message: string) {
  return withNoStore(
    NextResponse.json({ code, message }, { status: statusCode }),
  );
}

function handleError(error: unknown) {
  if (error instanceof AppError) {
    return jsonError(error.statusCode, error.code, error.message);
  }
  if (error instanceof DomainError) {
    return jsonError(400, error.code, error.message);
  }
  return jsonError(500, "INTERNAL_ERROR", "Internal server error");
}

function verifyCouponWebhookSecret(request: Request): boolean {
  const headerSecret = request.headers.get("X-Coupon-Webhook-Secret");
  if (!headerSecret) return false;
  const expected = process.env.COUPON_WEBHOOK_SECRET;
  if (!expected) return false;
  return headerSecret === expected;
}

export async function POST(request: Request) {
  if (!verifyCouponWebhookSecret(request)) {
    return jsonError(401, "UNAUTHORIZED", "Invalid webhook secret");
  }
  try {
    const body = await request.json();
    const input = v.parse(receiveBodySchema, body);
    const result = await createReceiveCouponUseCase().execute({
      userId: input.userId,
      couponId: input.couponId,
      organizationId: input.organizationId,
      expiresAt: input.expiresAt ? new Date(input.expiresAt) : undefined,
    });
    void envServer;
    return withNoStore(NextResponse.json(result, { status: 201 }));
  } catch (error) {
    if (error instanceof v.ValiError) {
      return jsonError(400, "INVALID_REQUEST", "Invalid request body");
    }
    return handleError(error);
  }
}
