import { DomainError } from "@mirai-yoho/shared/domain-error";
import { NextResponse } from "next/server";
import { AppError } from "@/application/shared/app-error";
import { AuthError } from "@/infrastructure/auth/verify-auth";
import { verifyCustomerAuth } from "@/infrastructure/auth/verify-customer-auth";
import {
  createBookingRepository,
  createCustomerRepository,
  createUserRepository,
} from "@/infrastructure/container";

function jsonError(statusCode: number, code: string, message: string) {
  return NextResponse.json({ code, message }, { status: statusCode });
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

interface RouteContext {
  params: Promise<{ organizationId: string }>;
}

export async function GET(request: Request, context: RouteContext) {
  try {
    const { organizationId } = await context.params;
    const { authUid } = await verifyCustomerAuth(request);
    const user = await createUserRepository().findByAuthUid(authUid);
    if (!user) {
      return jsonError(
        404,
        "CUSTOMER_NOT_SIGNED_UP",
        "Customer has not signed up yet",
      );
    }
    const customer =
      await createCustomerRepository().findByUserIdAndOrganizationId(
        user.getUserId(),
        organizationId,
      );
    if (!customer) {
      return NextResponse.json({ bookings: [] });
    }
    const bookings = await createBookingRepository().findByCustomerId(
      organizationId,
      customer.getCustomerId(),
    );
    return NextResponse.json({
      bookings: bookings
        .sort((a, b) => b.getStartsAt().getTime() - a.getStartsAt().getTime())
        .map((booking) => ({
          bookingId: booking.getBookingId(),
          status: booking.getStatus().getValue(),
          startsAt: booking.getStartsAt().toISOString(),
          consultantId: booking.getConsultantId(),
          joinUrl: booking.getJoinUrl()?.getValue() ?? null,
          pricePlanName: booking.getPricePlanName() ?? null,
          pricePlanTotalJPY: booking.getPricePlanTotalJPY() ?? null,
        })),
    });
  } catch (error) {
    return handleError(error);
  }
}
