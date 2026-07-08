import { DomainError } from "@mirai-yoho/shared/domain-error";
import { NextResponse } from "next/server";
import { AppError } from "@/application/shared/app-error";
import { AuthError } from "@/infrastructure/auth/verify-auth";
import { verifyCustomerAuth } from "@/infrastructure/auth/verify-customer-auth";
import {
  createListUserCouponsUseCase,
  createUserRepository,
} from "@/infrastructure/container";
import { withNoStore } from "../../../cache-control";

function jsonError(statusCode: number, code: string, message: string) {
  return withNoStore(
    NextResponse.json({ code, message }, { status: statusCode }),
  );
}

function handleError(error: unknown) {
  if (error instanceof AuthError) {
    return jsonError(error.statusCode, error.code, error.message);
  }
  if (error instanceof AppError) {
    return jsonError(error.statusCode, error.code, error.message);
  }
  if (error instanceof DomainError) {
    return jsonError(400, error.code, error.message);
  }
  return jsonError(500, "INTERNAL_ERROR", "Internal server error");
}

export async function GET(request: Request) {
  try {
    const { authUid } = await verifyCustomerAuth(request);
    const user = await createUserRepository().findByAuthUid(authUid);
    if (!user) {
      return jsonError(
        404,
        "CUSTOMER_NOT_SIGNED_UP",
        "Customer has not signed up yet",
      );
    }
    const coupons = await createListUserCouponsUseCase().execute({
      userId: user.getUserId(),
    });
    const now = new Date();
    return withNoStore(
      NextResponse.json({
        coupons: coupons.map((coupon) => ({
          userCouponId: coupon.getUserCouponId(),
          couponId: coupon.getCouponId(),
          organizationId: coupon.getOrganizationId() ?? null,
          receivedAt: coupon.getReceivedAt().toISOString(),
          expiresAt: coupon.getExpiresAt()?.toISOString() ?? null,
          redeemedAt: coupon.getRedeemedAt()?.toISOString() ?? null,
          isRedeemable: coupon.isRedeemable(now),
        })),
      }),
    );
  } catch (error) {
    return handleError(error);
  }
}
