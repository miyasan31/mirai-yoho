import { BatchCaptureUseCase } from "@/application/booking/batch-capture-use-case";
import { CancelBookingUseCase } from "@/application/booking/cancel-booking-use-case";
import { CapturePaymentUseCase } from "@/application/booking/capture-payment-use-case";
import { CreateBookingUseCase } from "@/application/booking/create-booking-use-case";
import { FirestoreBookingRepository } from "@/infrastructure/firestore/firestore-booking-repository";
import { FirestoreClientRepository } from "@/infrastructure/firestore/firestore-client-repository";
import { FirestoreConsultantRepository } from "@/infrastructure/firestore/firestore-consultant-repository";
import { FirestorePaymentRepository } from "@/infrastructure/firestore/firestore-payment-repository";
import { FirestoreSlotRepository } from "@/infrastructure/firestore/firestore-slot-repository";
import { FirestoreUnitOfWork } from "@/infrastructure/firestore/firestore-unit-of-work";
import { ResendEmailService } from "@/infrastructure/resend/resend-email-service";
import { StripeService } from "@/infrastructure/stripe/stripe-service";
import { ZoomService } from "@/infrastructure/zoom/zoom-service";

export function createConsultantRepository() {
  return new FirestoreConsultantRepository();
}

export function createSlotRepository() {
  return new FirestoreSlotRepository();
}

export function createBookingRepository() {
  return new FirestoreBookingRepository();
}

export function createCreateBookingUseCase() {
  return new CreateBookingUseCase(
    new FirestoreSlotRepository(),
    new FirestoreClientRepository(),
    new FirestoreBookingRepository(),
    new FirestorePaymentRepository(),
    new StripeService(),
    new ZoomService(),
    new FirestoreUnitOfWork(),
    new ResendEmailService(),
  );
}

export function createCancelBookingUseCase() {
  return new CancelBookingUseCase(
    new FirestoreBookingRepository(),
    new FirestorePaymentRepository(),
    new FirestoreSlotRepository(),
    new StripeService(),
    new ResendEmailService(),
  );
}

export function createCapturePaymentUseCase() {
  return new CapturePaymentUseCase(
    new FirestoreBookingRepository(),
    new FirestorePaymentRepository(),
    new FirestoreClientRepository(),
    new StripeService(),
    new ResendEmailService(),
  );
}

export function createClientRepository() {
  return new FirestoreClientRepository();
}

export function createPaymentRepository() {
  return new FirestorePaymentRepository();
}

export function createBatchCaptureUseCase() {
  return new BatchCaptureUseCase(
    new FirestoreBookingRepository(),
    new FirestorePaymentRepository(),
    new FirestoreClientRepository(),
    new StripeService(),
    new ResendEmailService(),
  );
}
