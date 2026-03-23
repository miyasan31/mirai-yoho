import { Booking } from "@/domain/booking/booking";
import type { BookingConfirmedEvent } from "@/domain/booking/bookingEvents";
import { ConsultantMemo } from "@/domain/booking/consultantMemo";
import { ZoomUrl } from "@/domain/booking/zoomUrl";
import type { IBookingRepository } from "@/domain/booking/iBookingRepository";
import { Client } from "@/domain/client/client";
import type { IClientRepository } from "@/domain/client/iClientRepository";
import { Money } from "@/domain/payment/money";
import { Payment } from "@/domain/payment/payment";
import type { IPaymentRepository } from "@/domain/payment/iPaymentRepository";
import type { ISlotRepository } from "@/domain/slot/iSlotRepository";
import type { IEmailService } from "@/application/shared/iEmailService";
import type { IStripeService } from "@/application/shared/iStripeService";
import type { IUnitOfWork } from "@/application/shared/iUnitOfWork";
import type { IZoomService } from "@/application/shared/iZoomService";

interface CreateBookingInput {
  slotId: string;
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  amountJPY: number;
  taxRate: number;
  consultationContent?: string;
}

interface CreateBookingOutput {
  bookingId: string;
  clientSecret: string;
  zoomUrl: string;
}

export class CreateBookingUseCase {
  constructor(
    private readonly slotRepository: ISlotRepository,
    private readonly clientRepository: IClientRepository,
    private readonly bookingRepository: IBookingRepository,
    private readonly paymentRepository: IPaymentRepository,
    private readonly stripeService: IStripeService,
    private readonly zoomService: IZoomService,
    private readonly unitOfWork: IUnitOfWork,
    private readonly emailService: IEmailService,
  ) {}

  async execute(input: CreateBookingInput): Promise<CreateBookingOutput> {
    const slot = await this.slotRepository.findById(input.slotId);
    if (!slot) {
      throw new Error("Slot not found");
    }

    const bookingId = crypto.randomUUID();
    slot.reserve(bookingId);

    const client = Client.create({
      clientId: crypto.randomUUID(),
      name: input.clientName,
      email: input.clientEmail,
      phone: input.clientPhone,
    });

    const booking = Booking.create({
      bookingId,
      clientId: client.getClientId(),
      consultantId: slot.getConsultantId(),
      slotId: slot.getSlotId(),
      startDatetime: slot.getTimeRange().getStartAt(),
      consultantMemo: ConsultantMemo.create(""),
      consultationContent: input.consultationContent,
    });

    const money = Money.create(input.amountJPY, input.taxRate);

    const { paymentIntentId, clientSecret } =
      await this.stripeService.createPaymentIntent({
        amountJPY: money.getTotalJPY(),
        metadata: { bookingId },
      });

    const meetingUrl = await this.zoomService.createMeetingUrl({
      startDatetime: slot.getTimeRange().getStartAt(),
      consultantId: slot.getConsultantId(),
    });

    const zoomUrl = ZoomUrl.create(meetingUrl);
    booking.confirm(zoomUrl, paymentIntentId);

    const payment = Payment.create({
      paymentId: crypto.randomUUID(),
      bookingId,
      clientId: client.getClientId(),
      stripePaymentIntentId: paymentIntentId,
      money,
    });

    await this.unitOfWork.runInTransaction(async () => {
      await this.clientRepository.save(client);
      await this.slotRepository.save(slot);
      await this.bookingRepository.save(booking);
      await this.paymentRepository.save(payment);
    });

    const events = booking.pullDomainEvents();
    for (const event of events) {
      if (event.eventName === "BookingConfirmed") {
        const e = event as BookingConfirmedEvent;
        await this.emailService.sendBookingConfirmation({
          clientEmail: input.clientEmail,
          clientName: input.clientName,
          consultantName: slot.getConsultantId(),
          zoomUrl: e.payload.zoomUrl,
          startDatetime: e.payload.startDatetime,
          bookingId: e.payload.bookingId,
        });
      }
    }

    return { bookingId, clientSecret, zoomUrl: meetingUrl };
  }
}
