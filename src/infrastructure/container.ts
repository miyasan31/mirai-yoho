import { BatchChargeUseCase } from "@/application/booking/batch-charge-use-case";
import { CancelBookingUseCase } from "@/application/booking/cancel-booking-use-case";
import { ChargePaymentUseCase } from "@/application/booking/charge-payment-use-case";
import { CompleteSetupUseCase } from "@/application/booking/complete-setup-use-case";
import { CreateBookingUseCase } from "@/application/booking/create-booking-use-case";
import { NotifyLateConsultantArrivalUseCase } from "@/application/booking/notify-late-consultant-arrival-use-case";
import { SendConsultationReminderUseCase } from "@/application/booking/send-consultation-reminder-use-case";
import { SetupPaymentUseCase } from "@/application/booking/setup-payment-use-case";
import { CreateConsultantPricePlanUseCase } from "@/application/consultant-price-plan/create-consultant-price-plan-use-case";
import { UpdateConsultantPricePlanUseCase } from "@/application/consultant-price-plan/update-consultant-price-plan-use-case";
import { envServer } from "@/config/env.server";
import { FirebaseUserContactService } from "@/infrastructure/firebase/firebase-user-contact-service";
import { FirestoreBookingRepository } from "@/infrastructure/firestore/firestore-booking-repository";
import { FirestoreConsultantPricePlanRepository } from "@/infrastructure/firestore/firestore-consultant-price-plan-repository";
import { FirestoreConsultantRepository } from "@/infrastructure/firestore/firestore-consultant-repository";
import { FirestoreCustomerRepository } from "@/infrastructure/firestore/firestore-customer-repository";
import { FirestoreOrganizationSettingsRepository } from "@/infrastructure/firestore/firestore-organization-settings-repository";
import { FirestorePaymentRepository } from "@/infrastructure/firestore/firestore-payment-repository";
import { FirestoreSlotRepository } from "@/infrastructure/firestore/firestore-slot-repository";
import { FirestoreUnitOfWork } from "@/infrastructure/firestore/firestore-unit-of-work";
import { FirestoreZoomDailySessionRepository } from "@/infrastructure/firestore/firestore-zoom-daily-session-repository";
import { LineWorksLateArrivalAlertService } from "@/infrastructure/line-works/line-works-late-arrival-alert-service";
import { ResendEmailService } from "@/infrastructure/resend/resend-email-service";
import { StripeService } from "@/infrastructure/stripe/stripe-service";
import { ZoomService } from "@/infrastructure/zoom/zoom-service";

export function createConsultantRepository() {
  return new FirestoreConsultantRepository();
}

export function createConsultantPricePlanRepository() {
  return new FirestoreConsultantPricePlanRepository();
}

export function createSlotRepository() {
  return new FirestoreSlotRepository();
}

export function createBookingRepository() {
  return new FirestoreBookingRepository();
}

export function createOrganizationSettingsRepository() {
  return new FirestoreOrganizationSettingsRepository();
}

export function createCreateBookingUseCase() {
  return new CreateBookingUseCase(
    new FirestoreSlotRepository(),
    new FirestoreCustomerRepository(),
    new FirestoreBookingRepository(),
    new ZoomService(),
    new FirestoreUnitOfWork(),
    new ResendEmailService(),
    new FirestoreZoomDailySessionRepository(),
    new FirestoreConsultantRepository(),
    new FirestoreConsultantPricePlanRepository(),
    new FirestoreOrganizationSettingsRepository(),
  );
}

export function createSetupPaymentUseCase() {
  return new SetupPaymentUseCase(
    new FirestoreBookingRepository(),
    new FirestorePaymentRepository(),
    new StripeService(),
    new FirestoreUnitOfWork(),
  );
}

export function createCreateConsultantPricePlanUseCase() {
  return new CreateConsultantPricePlanUseCase(
    new FirestoreConsultantPricePlanRepository(),
    new FirestoreOrganizationSettingsRepository(),
  );
}

export function createUpdateConsultantPricePlanUseCase() {
  return new UpdateConsultantPricePlanUseCase(
    new FirestoreConsultantPricePlanRepository(),
  );
}

export function createCancelBookingUseCase() {
  return new CancelBookingUseCase(
    new FirestoreBookingRepository(),
    new FirestorePaymentRepository(),
    new FirestoreSlotRepository(),
    new StripeService(),
    new ResendEmailService(),
    new FirestoreZoomDailySessionRepository(),
    new ZoomService(),
    new FirestoreCustomerRepository(),
  );
}

export function createChargePaymentUseCase() {
  return new ChargePaymentUseCase(
    new FirestoreBookingRepository(),
    new FirestorePaymentRepository(),
    new FirestoreCustomerRepository(),
    new StripeService(),
    new ResendEmailService(),
  );
}

export function createCompleteSetupUseCase() {
  return new CompleteSetupUseCase(new FirestorePaymentRepository());
}

export function createCustomerRepository() {
  return new FirestoreCustomerRepository();
}

export function createPaymentRepository() {
  return new FirestorePaymentRepository();
}

export function createBatchChargeUseCase() {
  return new BatchChargeUseCase(
    new FirestoreBookingRepository(),
    new FirestorePaymentRepository(),
    new FirestoreCustomerRepository(),
    new StripeService(),
    new ResendEmailService(),
  );
}

export function createSendConsultationReminderUseCase() {
  return new SendConsultationReminderUseCase(
    new FirestoreBookingRepository(),
    new FirestoreCustomerRepository(),
    new FirestoreConsultantRepository(),
    new ResendEmailService(),
  );
}

export function createNotifyLateConsultantArrivalUseCase() {
  return new NotifyLateConsultantArrivalUseCase(
    new FirestoreBookingRepository(),
    new FirestoreConsultantRepository(),
    new FirestoreCustomerRepository(),
    new FirebaseUserContactService(),
    new LineWorksLateArrivalAlertService(),
    envServer.appUrl,
  );
}
