import { DomainError } from "@mirai-yoho/shared/domain-error";
import { Hono } from "hono";
import { AppError } from "@/application/shared/app-error";
import { AuthError } from "@/infrastructure/auth/verify-auth";
import { verifyCustomerAuth } from "@/infrastructure/auth/verify-customer-auth";
import {
  createListCustomerBookingsUseCase,
  createUserRepository,
} from "@/infrastructure/container";

function jsonError(statusCode: number, code: string, message: string) {
  return Response.json({ code, message }, { status: statusCode });
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

export const customerBookingRoutes = new Hono();

customerBookingRoutes.get("/customers/me/bookings", async (c) => {
  try {
    const organizationId = c.req.param("organizationId") ?? "";
    const { authUid } = await verifyCustomerAuth(c.req.raw);
    const user = await createUserRepository().findByAuthUid(authUid);
    if (!user) {
      return jsonError(
        404,
        "CUSTOMER_NOT_SIGNED_UP",
        "Customer has not signed up yet",
      );
    }
    const results = await createListCustomerBookingsUseCase().execute({
      userId: user.getUserId(),
      scope: { organizationId },
    });
    return Response.json({
      bookings: results
        .slice()
        .sort(
          (a, b) =>
            b.booking.getStartsAt().getTime() -
            a.booking.getStartsAt().getTime(),
        )
        .map(({ booking }) => ({
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
});
