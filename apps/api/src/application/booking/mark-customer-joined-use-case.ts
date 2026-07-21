import { DomainError } from "@mirai-yoho/shared/domain-error";
import type { IBookingRepository } from "@/domain/booking/booking-repository";
import type { ICustomerRepository } from "@/domain/customer/customer-repository";

interface MarkCustomerJoinedInput {
  organizationId: string;
  bookingId: string;
  userId: string;
  joinedAt: Date;
}

export class MarkCustomerJoinedUseCase {
  constructor(
    private readonly bookingRepository: IBookingRepository,
    private readonly customerRepository: ICustomerRepository,
  ) {}

  async execute(input: MarkCustomerJoinedInput): Promise<void> {
    const booking = await this.bookingRepository.findById(
      input.organizationId,
      input.bookingId,
    );
    if (!booking) {
      throw new Error("Booking not found");
    }

    const customer =
      await this.customerRepository.findByUserIdAndOrganizationId(
        input.userId,
        input.organizationId,
      );
    if (!customer || customer.getCustomerId() !== booking.getCustomerId()) {
      throw new DomainError("FORBIDDEN", "You do not own this booking");
    }

    if (booking.getCustomerJoinedAt()) {
      // 冪等: 既に記録済みなら何もしない（Zoom を複数回開いても失敗しない）
      return;
    }

    booking.markCustomerJoined(input.joinedAt);
    await this.bookingRepository.save(booking);
  }
}
