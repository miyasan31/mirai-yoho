import {
  evaluateRatingEligibility,
  type RatingEligibility,
} from "@/application/booking-rating/rating-eligibility";
import { resolveOwnedBooking } from "@/application/booking-rating/resolve-owned-booking";
import type { Booking } from "@/domain/booking/booking";
import type { IBookingRepository } from "@/domain/booking/booking-repository";
import type { BookingRating } from "@/domain/booking-rating/booking-rating";
import type { IBookingRatingRepository } from "@/domain/booking-rating/booking-rating-repository";
import type { IConsultantRepository } from "@/domain/consultant/consultant-repository";
import type { ICustomerRepository } from "@/domain/customer/customer-repository";
import type { IOrganizationRepository } from "@/domain/organization/organization-repository";

interface GetCustomerBookingRatingInput {
  userId: string;
  bookingId: string;
  now?: Date;
}

export interface GetCustomerBookingRatingResult {
  booking: Booking;
  consultantName: string | null;
  organizationName: string | null;
  rating: BookingRating | null;
  eligibility: RatingEligibility;
}

export class GetCustomerBookingRatingUseCase {
  constructor(
    private readonly bookingRepository: IBookingRepository,
    private readonly customerRepository: ICustomerRepository,
    private readonly consultantRepository: IConsultantRepository,
    private readonly organizationRepository: IOrganizationRepository,
    private readonly bookingRatingRepository: IBookingRatingRepository,
  ) {}

  async execute(
    input: GetCustomerBookingRatingInput,
  ): Promise<GetCustomerBookingRatingResult> {
    const booking = await resolveOwnedBooking({
      bookingRepository: this.bookingRepository,
      customerRepository: this.customerRepository,
      userId: input.userId,
      bookingId: input.bookingId,
    });

    const organizationId = booking.getOrganizationId();

    const [rating, consultants, organizations] = await Promise.all([
      this.bookingRatingRepository.findByBookingId(
        organizationId,
        input.bookingId,
      ),
      this.consultantRepository.findByIds(organizationId, [
        booking.getConsultantId(),
      ]),
      this.organizationRepository.findByIds([organizationId]),
    ]);

    return {
      booking,
      consultantName: consultants[0]?.getProfile().getDisplayName() ?? null,
      organizationName: organizations[0]?.getName() ?? null,
      rating,
      eligibility: evaluateRatingEligibility({
        booking,
        existingRating: rating,
        now: input.now,
      }),
    };
  }
}
