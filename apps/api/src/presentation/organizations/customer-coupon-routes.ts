import { Hono } from "hono";
import { AuthError } from "@/infrastructure/auth/verify-auth";
import { verifyCustomerAuth } from "@/infrastructure/auth/verify-customer-auth";
import {
  createListAvailableCouponsForOrgUseCase,
  createReceiveBirthdayCouponUseCase,
  createReceiveWelcomeCouponsUseCase,
  createUserRepository,
} from "@/infrastructure/container";
import { getRoute, jsonError, noStoreJson, postRoute } from "./route-handler";

export const customerCouponRoutes = new Hono();

customerCouponRoutes.get(
  "/customer/coupons/available",
  getRoute(async ({ organizationId, request }) => {
    const { authUid } = await verifyCustomerAuth(request);
    const user = await createUserRepository().findByAuthUid(authUid);
    if (!user) {
      throw new AuthError(
        403,
        "CUSTOMER_NOT_SIGNED_UP",
        "Customer has not signed up yet",
      );
    }
    const coupons = await createListAvailableCouponsForOrgUseCase().execute({
      userId: user.getUserId(),
      organizationId,
    });
    return noStoreJson({ coupons });
  }),
);

customerCouponRoutes.post(
  "/customer/coupons/receive-welcome",
  postRoute(async ({ organizationId, request }) => {
    const { authUid } = await verifyCustomerAuth(request);
    const user = await createUserRepository().findByAuthUid(authUid);
    if (!user) {
      throw new AuthError(
        403,
        "CUSTOMER_NOT_SIGNED_UP",
        "Customer has not signed up yet",
      );
    }
    const result = await createReceiveWelcomeCouponsUseCase().execute({
      userId: user.getUserId(),
      organizationId,
    });
    if (result.alreadyReceived) {
      return jsonError(
        409,
        "WELCOME_COUPON_ALREADY_RECEIVED",
        "Welcome coupon has already been received",
      );
    }
    return Response.json(result, { status: 201 });
  }),
);

customerCouponRoutes.post(
  "/customer/coupons/receive-birthday",
  postRoute(async ({ organizationId, request }) => {
    const { authUid } = await verifyCustomerAuth(request);
    const user = await createUserRepository().findByAuthUid(authUid);
    if (!user) {
      throw new AuthError(
        403,
        "CUSTOMER_NOT_SIGNED_UP",
        "Customer has not signed up yet",
      );
    }
    const result = await createReceiveBirthdayCouponUseCase().execute({
      userId: user.getUserId(),
      organizationId,
    });
    return Response.json(result, { status: 201 });
  }),
);
