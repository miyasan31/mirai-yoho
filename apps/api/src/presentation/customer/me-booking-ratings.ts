import { DomainError } from "@mirai-yoho/shared/domain-error";
import { AppError } from "@/application/shared/app-error";
import type { BookingRating } from "@/domain/booking-rating/booking-rating";
import { AuthError } from "@/infrastructure/auth/verify-auth";
import { verifyCustomerAuth } from "@/infrastructure/auth/verify-customer-auth";
import {
  createGetCustomerBookingRatingUseCase,
  createSubmitBookingRatingUseCase,
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

function toRatingResponse(rating: BookingRating) {
  return {
    bookingId: rating.getBookingId(),
    score: rating.getScore().getValue(),
    comment: rating.getComment().isEmpty()
      ? null
      : rating.getComment().getValue(),
    ratedAt: rating.getRatedAt().toISOString(),
  };
}

/**
 * 評価ページの初期表示。
 *
 * 未評価は 404 ではなく 200 + rating: null で返す。custom-fetch が 404 を /404 へ
 * 強制リダイレクトするため、「まだ評価していない」を状態として扱えなくなる。
 * 他人の予約・存在しない予約は 404 が正しい挙動なのでそのまま通す。
 */
export async function GET(request: Request, bookingId: string) {
  try {
    const userId = await resolveUserId(request);
    const result = await createGetCustomerBookingRatingUseCase().execute({
      userId,
      bookingId,
    });

    return withNoStore(
      Response.json({
        booking: toMyBookingResponse({
          booking: result.booking,
          consultantName: result.consultantName,
          organizationName: result.organizationName,
          isRated: result.rating !== null,
          ratableUntil: result.eligibility.ratableUntil,
        }),
        rating: result.rating ? toRatingResponse(result.rating) : null,
        ratable: result.eligibility.ratable,
        ratableReasonCode: result.eligibility.code,
        ratableReason: result.eligibility.reason,
        ratableUntil: result.eligibility.ratableUntil?.toISOString() ?? null,
      }),
    );
  } catch (error) {
    return handleError(error);
  }
}

export async function POST(request: Request, bookingId: string) {
  try {
    const userId = await resolveUserId(request);

    const body: unknown = await request.json().catch(() => null);
    if (typeof body !== "object" || body === null) {
      return jsonError(
        400,
        "VALIDATION_ERROR",
        "Request body must be an object",
      );
    }
    const { score, comment } = body as { score?: unknown; comment?: unknown };
    if (typeof score !== "number") {
      return jsonError(400, "VALIDATION_ERROR", "score is required");
    }
    if (comment !== undefined && typeof comment !== "string") {
      return jsonError(400, "VALIDATION_ERROR", "comment must be a string");
    }

    const result = await createSubmitBookingRatingUseCase().execute({
      userId,
      bookingId,
      score,
      comment,
    });

    return withNoStore(
      Response.json(
        { ...result, ratedAt: result.ratedAt.toISOString() },
        { status: 201 },
      ),
    );
  } catch (error) {
    return handleError(error);
  }
}
