import { Hono } from "hono";
import * as v from "valibot";
import { requirePermission } from "@/infrastructure/auth/require-permission";
import { verifyAccountAuth } from "@/infrastructure/auth/verify-auth";
import {
  createArchiveCouponUseCase,
  createCreateCouponUseCase,
  createGetCouponUseCase,
  createListCouponsUseCase,
  createUpdateCouponUseCase,
} from "@/infrastructure/container";
import {
  deleteRoute,
  getRoute,
  jsonError,
  noStoreJson,
  patchRoute,
  postRoute,
} from "./route-handler";

const couponTypeSchema = v.picklist(["welcome", "birthday"]);

const createCouponBodySchema = v.object({
  type: couponTypeSchema,
  name: v.pipe(v.string(), v.minLength(1), v.maxLength(80)),
  amountJPY: v.pipe(v.number(), v.integer(), v.minValue(1)),
  distributionCount: v.pipe(v.number(), v.integer(), v.minValue(1)),
  expiresInDays: v.pipe(v.number(), v.integer(), v.minValue(1)),
});

const updateCouponBodySchema = v.object({
  name: v.optional(v.pipe(v.string(), v.minLength(1), v.maxLength(80))),
  amountJPY: v.optional(v.pipe(v.number(), v.integer(), v.minValue(1))),
  distributionCount: v.optional(v.pipe(v.number(), v.integer(), v.minValue(1))),
});

export const consoleCouponRoutes = new Hono();

consoleCouponRoutes.get(
  "/console/coupons",
  getRoute(async ({ organizationId, request }) => {
    const authUser = await verifyAccountAuth(request);
    requirePermission(authUser, organizationId, "console.coupons.read");
    const coupons = await createListCouponsUseCase().execute({
      organizationId,
    });
    return noStoreJson({ coupons });
  }),
);

consoleCouponRoutes.get(
  "/console/coupons/:couponId",
  getRoute(async ({ organizationId, request, param }) => {
    const authUser = await verifyAccountAuth(request);
    requirePermission(authUser, organizationId, "console.coupons.read");
    const coupon = await createGetCouponUseCase().execute({
      organizationId,
      couponId: param("couponId"),
    });
    return noStoreJson(coupon);
  }),
);

consoleCouponRoutes.post(
  "/console/coupons",
  postRoute(async ({ organizationId, request }) => {
    const authUser = await verifyAccountAuth(request);
    requirePermission(authUser, organizationId, "console.coupons.manage");
    const body = await request.json();
    const parsed = v.safeParse(createCouponBodySchema, body);
    if (!parsed.success) {
      return jsonError(400, "VALIDATION_ERROR", "Invalid coupon payload");
    }
    const coupon = await createCreateCouponUseCase().execute({
      organizationId,
      type: parsed.output.type,
      name: parsed.output.name,
      amountJPY: parsed.output.amountJPY,
      distributionCount: parsed.output.distributionCount,
      expiresInDays: parsed.output.expiresInDays,
    });
    return Response.json(coupon, { status: 201 });
  }),
);

consoleCouponRoutes.patch(
  "/console/coupons/:couponId",
  patchRoute(async ({ organizationId, request, param }) => {
    const authUser = await verifyAccountAuth(request);
    requirePermission(authUser, organizationId, "console.coupons.manage");
    const body = await request.json();
    const parsed = v.safeParse(updateCouponBodySchema, body);
    if (!parsed.success) {
      return jsonError(400, "VALIDATION_ERROR", "Invalid coupon payload");
    }
    const coupon = await createUpdateCouponUseCase().execute({
      organizationId,
      couponId: param("couponId"),
      name: parsed.output.name,
      amountJPY: parsed.output.amountJPY,
      distributionCount: parsed.output.distributionCount,
    });
    return Response.json(coupon);
  }),
);

consoleCouponRoutes.delete(
  "/console/coupons/:couponId",
  deleteRoute(async ({ organizationId, request, param }) => {
    const authUser = await verifyAccountAuth(request);
    requirePermission(authUser, organizationId, "console.coupons.manage");
    await createArchiveCouponUseCase().execute({
      organizationId,
      couponId: param("couponId"),
    });
    return Response.json({ success: true });
  }),
);
