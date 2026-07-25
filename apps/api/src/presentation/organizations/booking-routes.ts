import { Hono } from "hono";
import { AppError } from "@/application/shared/app-error";
import { requirePermission } from "@/infrastructure/auth/require-permission";
import {
  AuthError,
  verifyAccountAuth,
} from "@/infrastructure/auth/verify-auth";
import { verifyCustomerAuth } from "@/infrastructure/auth/verify-customer-auth";
import {
  createCancelBookingUseCase,
  createChargePaymentUseCase,
  createCreateBookingUseCase,
  createSetupPaymentUseCase,
  createUserRepository,
} from "@/infrastructure/container";
import { HmacBookingActionTokenService } from "@/infrastructure/token/booking-action-token-service";
import { HmacCancelTokenService } from "@/infrastructure/token/cancel-token-service";
import { validateCustomerBirthdate } from "./booking-birthdate-validation";
import { jsonError, postRoute } from "./route-handler";

const BOOKING_ACTION_TOKEN_TTL_MS = 30 * 60 * 1000;

function publicForbidden(message = "Invalid booking action request") {
  return jsonError(403, "FORBIDDEN", message);
}

export const bookingRoutes = new Hono();

bookingRoutes.post(
  "/bookings",
  postRoute(async ({ organizationId, request }) => {
    let authContext: { authUid: string };
    try {
      authContext = await verifyCustomerAuth(request);
    } catch (error) {
      if (error instanceof AuthError) {
        return jsonError(error.statusCode, error.code, error.message);
      }
      throw error;
    }
    const customerUser = await createUserRepository().findByAuthUid(
      authContext.authUid,
    );
    if (!customerUser || !customerUser.isActive()) {
      return jsonError(
        401,
        "CUSTOMER_NOT_SIGNED_UP",
        "Customer has not signed up or is withdrawn",
      );
    }

    const body = await request.json();
    const {
      consultantId,
      startsAt,
      durationMinutes,
      customerName,
      customerEmail,
      customerPhone,
      customerBirthDate,
      consultantContent,
      selectionId,
      selectedUserCouponId,
      agreedTermsVersion,
      agreedAt,
      guardianName,
      guardianConsentedAt,
    } = body;

    if (
      !customerName ||
      !customerEmail ||
      !customerPhone ||
      !customerBirthDate ||
      typeof selectionId !== "string" ||
      selectionId.length === 0
    ) {
      return jsonError(
        400,
        "VALIDATION_ERROR",
        "customerName, customerEmail, customerPhone, customerBirthDate, selectionId are required",
      );
    }
    if (typeof consultantId !== "string" || consultantId.length === 0) {
      return jsonError(400, "VALIDATION_ERROR", "consultantId is required");
    }
    if (typeof startsAt !== "string" || startsAt.length === 0) {
      return jsonError(400, "VALIDATION_ERROR", "startsAt is required");
    }
    if (typeof durationMinutes !== "number") {
      return jsonError(
        400,
        "VALIDATION_ERROR",
        "durationMinutes must be a number",
      );
    }
    if (
      typeof agreedTermsVersion !== "string" ||
      agreedTermsVersion.length === 0
    ) {
      return jsonError(
        400,
        "VALIDATION_ERROR",
        "agreedTermsVersion is required",
      );
    }
    if (typeof agreedAt !== "string" || agreedAt.length === 0) {
      return jsonError(400, "VALIDATION_ERROR", "agreedAt is required");
    }
    const parsedAgreedAt = new Date(agreedAt);
    if (Number.isNaN(parsedAgreedAt.getTime())) {
      return jsonError(
        400,
        "VALIDATION_ERROR",
        "agreedAt must be a valid ISO 8601 datetime",
      );
    }

    const birthDateValidation = validateCustomerBirthdate(customerBirthDate);
    if (!birthDateValidation.valid) {
      return jsonError(
        400,
        "VALIDATION_ERROR",
        birthDateValidation.errorMessage ?? "customerBirthDate is invalid",
      );
    }

    let parsedGuardianConsentedAt: Date | undefined;
    if (guardianConsentedAt !== undefined) {
      if (
        typeof guardianConsentedAt !== "string" ||
        guardianConsentedAt.length === 0
      ) {
        return jsonError(
          400,
          "VALIDATION_ERROR",
          "guardianConsentedAt must be an ISO 8601 datetime string",
        );
      }
      parsedGuardianConsentedAt = new Date(guardianConsentedAt);
      if (Number.isNaN(parsedGuardianConsentedAt.getTime())) {
        return jsonError(
          400,
          "VALIDATION_ERROR",
          "guardianConsentedAt must be a valid ISO 8601 datetime",
        );
      }
    }
    if (
      guardianName !== undefined &&
      (typeof guardianName !== "string" || guardianName.trim().length === 0)
    ) {
      return jsonError(
        400,
        "VALIDATION_ERROR",
        "guardianName must be a non-empty string when provided",
      );
    }

    const useCase = createCreateBookingUseCase();
    const result = await useCase.execute({
      organizationId,
      userId: customerUser.getUserId(),
      consultantId,
      startsAt: new Date(startsAt),
      durationMinutes,
      customerName,
      customerEmail,
      customerPhone,
      customerBirthDate: customerBirthDate.trim(),
      consultationContent: consultantContent,
      selectionId,
      selectedUserCouponId:
        typeof selectedUserCouponId === "string" && selectedUserCouponId
          ? selectedUserCouponId
          : undefined,
      agreedTermsVersion,
      agreedAt: parsedAgreedAt,
      guardianName:
        typeof guardianName === "string" ? guardianName.trim() : undefined,
      guardianConsentedAt: parsedGuardianConsentedAt,
    });

    const bookingActionToken =
      new HmacBookingActionTokenService().generateToken({
        bookingId: result.bookingId,
        organizationId,
        expiresAt: new Date(Date.now() + BOOKING_ACTION_TOKEN_TTL_MS),
      });

    return Response.json({ ...result, bookingActionToken }, { status: 201 });
  }),
);

bookingRoutes.post(
  "/bookings/:bookingId/setup-payment",
  postRoute(async ({ organizationId, request, param }) => {
    const bookingId = param("bookingId");
    const body = await request.json();
    if (
      body.paymentMethodType !== "card" &&
      body.paymentMethodType !== "paypay"
    ) {
      return jsonError(
        400,
        "VALIDATION_ERROR",
        "paymentMethodType must be 'card' or 'paypay'",
      );
    }
    if (
      typeof body.bookingActionToken !== "string" ||
      body.bookingActionToken.length === 0
    ) {
      return publicForbidden();
    }

    const tokenPayload = new HmacBookingActionTokenService().verifyToken(
      body.bookingActionToken,
    );
    if (
      !tokenPayload ||
      tokenPayload.bookingId !== bookingId ||
      tokenPayload.organizationId !== organizationId
    ) {
      return publicForbidden();
    }

    try {
      const result = await createSetupPaymentUseCase().execute({
        organizationId,
        bookingId,
        paymentMethodType: body.paymentMethodType,
      });
      return Response.json(result, { status: 201 });
    } catch (error) {
      if (
        error instanceof AppError &&
        (error.code === "BOOKING_NOT_FOUND" ||
          error.code === "PAYMENT_ALREADY_EXISTS")
      ) {
        return publicForbidden();
      }
      throw error;
    }
  }),
);

bookingRoutes.post(
  "/bookings/:bookingId/cancel",
  postRoute(async ({ organizationId, request, param }) => {
    const bookingId = param("bookingId");
    const body = await request.json();
    const { cancelledBy, token } = body;

    if (!cancelledBy || !["customer", "admin"].includes(cancelledBy)) {
      return jsonError(
        400,
        "VALIDATION_ERROR",
        "cancelledBy must be 'customer' or 'admin'",
      );
    }

    if (cancelledBy === "customer") {
      if (!token) {
        return publicForbidden("Invalid booking cancellation request");
      }
      const tokenService = new HmacCancelTokenService();
      const result = tokenService.verifyToken(token);
      if (!result || result.bookingId !== bookingId) {
        return publicForbidden("Invalid booking cancellation request");
      }
    } else {
      const authUser = await verifyAccountAuth(request);
      requirePermission(authUser, organizationId, "console.bookings.cancel");
    }

    await createCancelBookingUseCase().execute({
      organizationId,
      bookingId,
      cancelledBy,
    });

    return Response.json({ success: true });
  }),
);

bookingRoutes.post(
  "/bookings/:bookingId/charge",
  postRoute(async ({ organizationId, request, param }) => {
    const authUser = await verifyAccountAuth(request);
    requirePermission(authUser, organizationId, "console.payments.charge");

    const body = await request.json();
    if (body.method !== "manual") {
      return jsonError(400, "VALIDATION_ERROR", "method must be 'manual'");
    }

    await createChargePaymentUseCase().execute({
      organizationId,
      bookingId: param("bookingId"),
      method: "manual",
    });

    return Response.json({ success: true });
  }),
);
