import { GetCustomerBookingRatingUseCase } from "@/application/booking-rating/get-customer-booking-rating-use-case";
import { AppError } from "@/application/shared/app-error";
import { BookingRating } from "@/domain/booking-rating/booking-rating";
import { Organization } from "@/domain/organization/organization";
import { InMemoryBookingRatingRepository } from "./in-memory-booking-rating-repository";
import {
  createBooking,
  createConsultant,
  createCustomer,
  InMemoryBookingRepository,
  InMemoryConsultantRepository,
  InMemoryCustomerRepository,
  InMemoryOrganizationRepository,
  STARTS_AT,
} from "./test-doubles";

const USER_ID = "user-1";
const NOW = new Date("2026-05-02T00:00:00.000Z");

function createUseCase(ratings: BookingRating[] = []) {
  return new GetCustomerBookingRatingUseCase(
    new InMemoryBookingRepository([
      createBooking({ bookingId: "booking-1", status: "completed" }),
    ]),
    new InMemoryCustomerRepository([
      createCustomer({ customerId: "customer-1", userId: USER_ID }),
    ]),
    new InMemoryConsultantRepository([
      createConsultant({ consultantId: "consultant-1", name: "相談員A" }),
    ]),
    new InMemoryOrganizationRepository([
      Organization.create({ organizationId: "org-1", name: "組織A" }),
    ]),
    new InMemoryBookingRatingRepository(ratings),
  );
}

describe("GetCustomerBookingRatingUseCase", () => {
  it("未評価でも例外を投げず rating: null と評価可否を返す", async () => {
    const result = await createUseCase().execute({
      userId: USER_ID,
      bookingId: "booking-1",
      now: NOW,
    });

    expect(result.rating).toBeNull();
    expect(result.eligibility.ratable).toBe(true);
    expect(result.consultantName).toBe("相談員A");
    expect(result.organizationName).toBe("組織A");
    expect(result.booking.getBookingId()).toBe("booking-1");
  });

  it("評価済みなら rating を返し ratable は false になる", async () => {
    const useCase = createUseCase([
      BookingRating.create({
        organizationId: "org-1",
        bookingId: "booking-1",
        consultantId: "consultant-1",
        customerId: "customer-1",
        score: 4,
        comment: "満足しました",
        consultedAt: STARTS_AT,
      }),
    ]);

    const result = await useCase.execute({
      userId: USER_ID,
      bookingId: "booking-1",
      now: NOW,
    });

    expect(result.rating?.getScore().getValue()).toBe(4);
    expect(result.rating?.getComment().getValue()).toBe("満足しました");
    expect(result.eligibility.ratable).toBe(false);
    expect(result.eligibility.code).toBe("RATING_ALREADY_SUBMITTED");
  });

  it("他人の予約は 404 BOOKING_NOT_FOUND", async () => {
    const useCase = createUseCase();

    await expect(
      useCase.execute({
        userId: "someone-else",
        bookingId: "booking-1",
        now: NOW,
      }),
    ).rejects.toThrow(AppError);
  });

  it("相談員が見つからなくても consultantName は null で返る", async () => {
    const useCase = new GetCustomerBookingRatingUseCase(
      new InMemoryBookingRepository([
        createBooking({ bookingId: "booking-1", status: "completed" }),
      ]),
      new InMemoryCustomerRepository([
        createCustomer({ customerId: "customer-1", userId: USER_ID }),
      ]),
      new InMemoryConsultantRepository([]),
      new InMemoryOrganizationRepository([]),
      new InMemoryBookingRatingRepository(),
    );

    const result = await useCase.execute({
      userId: USER_ID,
      bookingId: "booking-1",
      now: NOW,
    });

    expect(result.consultantName).toBeNull();
    expect(result.organizationName).toBeNull();
  });
});
