import { SubmitBookingRatingUseCase } from "@/application/booking-rating/submit-booking-rating-use-case";
import { AppError } from "@/application/shared/app-error";
import { BookingRating } from "@/domain/booking-rating/booking-rating";
import { InMemoryBookingRatingRepository } from "./in-memory-booking-rating-repository";
import {
  createBooking,
  createCustomer,
  ENDS_AT,
  InMemoryBookingRepository,
  InMemoryCustomerRepository,
  RATING_EXPIRES_AT,
  STARTS_AT,
} from "./test-doubles";

const USER_ID = "user-1";
const NOW = new Date("2026-05-02T00:00:00.000Z");

function createUseCase(params: {
  bookings: ReturnType<typeof createBooking>[];
  ratings?: BookingRating[];
}) {
  const ratingRepository = new InMemoryBookingRatingRepository(
    params.ratings ?? [],
  );
  const useCase = new SubmitBookingRatingUseCase(
    new InMemoryBookingRepository(params.bookings),
    new InMemoryCustomerRepository([
      createCustomer({ customerId: "customer-1", userId: USER_ID }),
    ]),
    ratingRepository,
  );
  return { useCase, ratingRepository };
}

async function expectAppError(
  promise: Promise<unknown>,
  statusCode: number,
  code: string,
) {
  await expect(promise).rejects.toThrow(AppError);
  await promise.catch((error: unknown) => {
    expect(error).toBeInstanceOf(AppError);
    expect((error as AppError).statusCode).toBe(statusCode);
    expect((error as AppError).code).toBe(code);
  });
}

describe("SubmitBookingRatingUseCase", () => {
  it("終了済みの確定予約に評価を保存する", async () => {
    const { useCase, ratingRepository } = createUseCase({
      bookings: [
        createBooking({ bookingId: "booking-1", status: "confirmed" }),
      ],
    });

    const result = await useCase.execute({
      userId: USER_ID,
      bookingId: "booking-1",
      score: 5,
      comment: "  とても良かった  ",
      now: NOW,
    });

    expect(result.bookingId).toBe("booking-1");
    expect(result.score).toBe(5);
    expect(result.comment).toBe("とても良かった");
    expect(result.ratedAt.toISOString()).toBe(NOW.toISOString());

    const saved = await ratingRepository.findByBookingId("org-1", "booking-1");
    expect(saved?.getConsultantId()).toBe("consultant-1");
    expect(saved?.getCustomerId()).toBe("customer-1");
    // consultedAt は booking.startsAt を非正規化したもの
    expect(saved?.getConsultedAt().toISOString()).toBe(STARTS_AT.toISOString());
  });

  it("コメント未指定なら comment は null で返る", async () => {
    const { useCase } = createUseCase({
      bookings: [
        createBooking({ bookingId: "booking-1", status: "completed" }),
      ],
    });

    const result = await useCase.execute({
      userId: USER_ID,
      bookingId: "booking-1",
      score: 3,
      now: NOW,
    });

    expect(result.comment).toBeNull();
  });

  it("他人の予約は 404 BOOKING_NOT_FOUND（403 ではない）", async () => {
    const { useCase } = createUseCase({
      bookings: [
        createBooking({
          bookingId: "booking-other",
          status: "completed",
          customerId: "customer-other",
        }),
      ],
    });

    await expectAppError(
      useCase.execute({
        userId: USER_ID,
        bookingId: "booking-other",
        score: 5,
        now: NOW,
      }),
      404,
      "BOOKING_NOT_FOUND",
    );
  });

  it("存在しない予約は 404 BOOKING_NOT_FOUND", async () => {
    const { useCase } = createUseCase({ bookings: [] });

    await expectAppError(
      useCase.execute({
        userId: USER_ID,
        bookingId: "unknown",
        score: 5,
        now: NOW,
      }),
      404,
      "BOOKING_NOT_FOUND",
    );
  });

  it.each(["pending", "cancelled"] as const)(
    "%s の予約は 409 BOOKING_NOT_RATABLE",
    async (status) => {
      const { useCase } = createUseCase({
        bookings: [createBooking({ bookingId: "booking-1", status })],
      });

      await expectAppError(
        useCase.execute({
          userId: USER_ID,
          bookingId: "booking-1",
          score: 5,
          now: NOW,
        }),
        409,
        "BOOKING_NOT_RATABLE",
      );
    },
  );

  it("鑑定終了前は 409 BOOKING_NOT_FINISHED", async () => {
    const { useCase } = createUseCase({
      bookings: [
        createBooking({ bookingId: "booking-1", status: "confirmed" }),
      ],
    });

    await expectAppError(
      useCase.execute({
        userId: USER_ID,
        bookingId: "booking-1",
        score: 5,
        now: new Date(ENDS_AT.getTime() - 1),
      }),
      409,
      "BOOKING_NOT_FINISHED",
    );
  });

  it("受付期限を過ぎたら 409 RATING_WINDOW_EXPIRED", async () => {
    const { useCase } = createUseCase({
      bookings: [
        createBooking({ bookingId: "booking-1", status: "completed" }),
      ],
    });

    await expectAppError(
      useCase.execute({
        userId: USER_ID,
        bookingId: "booking-1",
        score: 5,
        now: new Date(RATING_EXPIRES_AT.getTime() + 1),
      }),
      409,
      "RATING_WINDOW_EXPIRED",
    );
  });

  it("二重送信は 409 RATING_ALREADY_SUBMITTED", async () => {
    const { useCase } = createUseCase({
      bookings: [
        createBooking({ bookingId: "booking-1", status: "completed" }),
      ],
    });

    await useCase.execute({
      userId: USER_ID,
      bookingId: "booking-1",
      score: 5,
      now: NOW,
    });

    await expectAppError(
      useCase.execute({
        userId: USER_ID,
        bookingId: "booking-1",
        score: 1,
        now: NOW,
      }),
      409,
      "RATING_ALREADY_SUBMITTED",
    );
  });

  it("リポジトリ側の衝突（レース）も 409 RATING_ALREADY_SUBMITTED に変換する", async () => {
    const existing = BookingRating.create({
      organizationId: "org-1",
      bookingId: "booking-1",
      consultantId: "consultant-1",
      customerId: "customer-1",
      score: 2,
      consultedAt: STARTS_AT,
    });
    const ratingRepository = new InMemoryBookingRatingRepository([existing]);
    // 事前チェックをすり抜けたレース状態を再現する
    ratingRepository.findByBookingId = async () => null;

    const useCase = new SubmitBookingRatingUseCase(
      new InMemoryBookingRepository([
        createBooking({ bookingId: "booking-1", status: "completed" }),
      ]),
      new InMemoryCustomerRepository([
        createCustomer({ customerId: "customer-1", userId: USER_ID }),
      ]),
      ratingRepository,
    );

    await expectAppError(
      useCase.execute({
        userId: USER_ID,
        bookingId: "booking-1",
        score: 5,
        now: NOW,
      }),
      409,
      "RATING_ALREADY_SUBMITTED",
    );
  });

  it("不正なスコアは 400 INVALID_RATING_SCORE", async () => {
    const { useCase } = createUseCase({
      bookings: [
        createBooking({ bookingId: "booking-1", status: "completed" }),
      ],
    });

    await expectAppError(
      useCase.execute({
        userId: USER_ID,
        bookingId: "booking-1",
        score: 0,
        now: NOW,
      }),
      400,
      "INVALID_RATING_SCORE",
    );
  });

  it("評価できない予約には値エラーより先に 409 を返す", async () => {
    const { useCase } = createUseCase({
      bookings: [
        createBooking({ bookingId: "booking-1", status: "cancelled" }),
      ],
    });

    await expectAppError(
      useCase.execute({
        userId: USER_ID,
        bookingId: "booking-1",
        score: 99,
        now: NOW,
      }),
      409,
      "BOOKING_NOT_RATABLE",
    );
  });
});
