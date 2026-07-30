import { DomainError } from "@mirai-yoho/shared/domain-error";
import { AppError } from "@/application/shared/app-error";
import { AuthError } from "@/infrastructure/auth/verify-auth";
import { verifyCustomerAuth } from "@/infrastructure/auth/verify-customer-auth";
import {
  createCancelBookingUseCase,
  createListCustomerBookingsUseCase,
  createUserRepository,
} from "@/infrastructure/container";
import { toMyBookingResponse } from "@/presentation/customer/my-booking-response";
import { withNoStore } from "../cache-control";

function jsonError(statusCode: number, code: string, message: string) {
  return withNoStore(Response.json({ code, message }, { status: statusCode }));
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

async function resolveUserId(request: Request): Promise<string> {
  const { authUid } = await verifyCustomerAuth(request);
  const user = await createUserRepository().findByAuthUid(authUid);
  if (!user) {
    throw new AppError(
      404,
      "CUSTOMER_NOT_SIGNED_UP",
      "Customer has not signed up yet",
    );
  }
  return user.getUserId();
}

export async function GET(request: Request) {
  try {
    const userId = await resolveUserId(request);
    const results = await createListCustomerBookingsUseCase().execute({
      userId,
    });
    const bookings = results
      .slice()
      .sort(
        (a, b) =>
          b.booking.getStartsAt().getTime() - a.booking.getStartsAt().getTime(),
      )
      .map(toMyBookingResponse);
    return withNoStore(Response.json({ bookings }));
  } catch (error) {
    return handleError(error);
  }
}

export async function CANCEL(request: Request, bookingId: string) {
  try {
    const userId = await resolveUserId(request);
    const results = await createListCustomerBookingsUseCase().execute({
      userId,
    });
    const owned = results.find(
      ({ booking }) => booking.getBookingId() === bookingId,
    );
    if (!owned) {
      return jsonError(404, "BOOKING_NOT_FOUND", "Booking not found");
    }
    await createCancelBookingUseCase().execute({
      organizationId: owned.booking.getOrganizationId(),
      bookingId,
      cancelledBy: "customer",
    });
    return withNoStore(new Response(null, { status: 204 }));
  } catch (error) {
    return handleError(error);
  }
}
