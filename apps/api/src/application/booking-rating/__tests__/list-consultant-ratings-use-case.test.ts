import { ListConsultantRatingsUseCase } from "@/application/booking-rating/list-consultant-ratings-use-case";
import { AppError } from "@/application/shared/app-error";
import { BookingRating } from "@/domain/booking-rating/booking-rating";
import { InMemoryBookingRatingRepository } from "./in-memory-booking-rating-repository";
import {
  createConsultant,
  InMemoryConsultantRepository,
  STARTS_AT,
} from "./test-doubles";

function createRating(params: {
  bookingId: string;
  score: number;
  ratedAt: string;
  consultantId?: string;
  organizationId?: string;
}) {
  return BookingRating.create({
    organizationId: params.organizationId ?? "org-1",
    bookingId: params.bookingId,
    consultantId: params.consultantId ?? "consultant-1",
    customerId: "customer-1",
    score: params.score,
    consultedAt: STARTS_AT,
    ratedAt: new Date(params.ratedAt),
  });
}

function createUseCase(ratings: BookingRating[]) {
  return new ListConsultantRatingsUseCase(
    new InMemoryConsultantRepository([
      createConsultant({ consultantId: "consultant-1", name: "相談員A" }),
    ]),
    new InMemoryBookingRatingRepository(ratings),
  );
}

describe("ListConsultantRatingsUseCase", () => {
  it("評価0件なら averageScore は null、distribution は5要素すべて0", async () => {
    const result = await createUseCase([]).execute({
      organizationId: "org-1",
      consultantId: "consultant-1",
    });

    expect(result.summary.count).toBe(0);
    expect(result.summary.averageScore).toBeNull();
    expect(result.summary.distribution).toEqual([
      { score: 1, count: 0 },
      { score: 2, count: 0 },
      { score: 3, count: 0 },
      { score: 4, count: 0 },
      { score: 5, count: 0 },
    ]);
    expect(result.ratings).toEqual([]);
  });

  it("平均を小数第2位で丸める", async () => {
    const result = await createUseCase([
      createRating({
        bookingId: "b-1",
        score: 4,
        ratedAt: "2026-05-02T00:00:00.000Z",
      }),
      createRating({
        bookingId: "b-2",
        score: 5,
        ratedAt: "2026-05-03T00:00:00.000Z",
      }),
      createRating({
        bookingId: "b-3",
        score: 5,
        ratedAt: "2026-05-04T00:00:00.000Z",
      }),
    ]).execute({ organizationId: "org-1", consultantId: "consultant-1" });

    expect(result.summary.count).toBe(3);
    expect(result.summary.averageScore).toBe(4.67);
  });

  it("スコア分布を集計する", async () => {
    const result = await createUseCase([
      createRating({
        bookingId: "b-1",
        score: 5,
        ratedAt: "2026-05-02T00:00:00.000Z",
      }),
      createRating({
        bookingId: "b-2",
        score: 5,
        ratedAt: "2026-05-03T00:00:00.000Z",
      }),
      createRating({
        bookingId: "b-3",
        score: 1,
        ratedAt: "2026-05-04T00:00:00.000Z",
      }),
    ]).execute({ organizationId: "org-1", consultantId: "consultant-1" });

    const countByScore = new Map(
      result.summary.distribution.map((row) => [row.score, row.count]),
    );
    expect(countByScore.get(5)).toBe(2);
    expect(countByScore.get(1)).toBe(1);
    expect(countByScore.get(3)).toBe(0);
  });

  it("評価を ratedAt の降順で返す", async () => {
    const result = await createUseCase([
      createRating({
        bookingId: "b-old",
        score: 3,
        ratedAt: "2026-05-02T00:00:00.000Z",
      }),
      createRating({
        bookingId: "b-new",
        score: 4,
        ratedAt: "2026-05-10T00:00:00.000Z",
      }),
    ]).execute({ organizationId: "org-1", consultantId: "consultant-1" });

    expect(result.ratings.map((r) => r.getBookingId())).toEqual([
      "b-new",
      "b-old",
    ]);
  });

  it("他の占い師の評価は含めない", async () => {
    const result = await createUseCase([
      createRating({
        bookingId: "b-1",
        score: 5,
        ratedAt: "2026-05-02T00:00:00.000Z",
      }),
      createRating({
        bookingId: "b-2",
        score: 1,
        ratedAt: "2026-05-03T00:00:00.000Z",
        consultantId: "consultant-other",
      }),
    ]).execute({ organizationId: "org-1", consultantId: "consultant-1" });

    expect(result.summary.count).toBe(1);
    expect(result.summary.averageScore).toBe(5);
  });

  it("存在しない占い師は 404 CONSULTANT_NOT_FOUND", async () => {
    const useCase = createUseCase([]);

    await expect(
      useCase.execute({ organizationId: "org-1", consultantId: "unknown" }),
    ).rejects.toThrow(AppError);
    await useCase
      .execute({ organizationId: "org-1", consultantId: "unknown" })
      .catch((error: unknown) => {
        expect((error as AppError).statusCode).toBe(404);
        expect((error as AppError).code).toBe("CONSULTANT_NOT_FOUND");
      });
  });

  it("別組織の占い師 ID では 404（テナント越境を遮断する）", async () => {
    const useCase = createUseCase([]);

    await expect(
      useCase.execute({
        organizationId: "org-other",
        consultantId: "consultant-1",
      }),
    ).rejects.toThrow(AppError);
  });
});
