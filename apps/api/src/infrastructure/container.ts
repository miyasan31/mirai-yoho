import { BatchChargeUseCase } from "@/application/booking/batch-charge-use-case";
import { CancelBookingUseCase } from "@/application/booking/cancel-booking-use-case";
import { ChargePaymentUseCase } from "@/application/booking/charge-payment-use-case";
import { CompleteSetupUseCase } from "@/application/booking/complete-setup-use-case";
import { CreateBookingUseCase } from "@/application/booking/create-booking-use-case";
import { NotifyLateConsultantArrivalUseCase } from "@/application/booking/notify-late-consultant-arrival-use-case";
import { SendConsultationReminderUseCase } from "@/application/booking/send-consultation-reminder-use-case";
import { SetupPaymentUseCase } from "@/application/booking/setup-payment-use-case";
import { CreatePricePlanUseCase } from "@/application/price-plan/create-price-plan-use-case";
import { UpdatePricePlanUseCase } from "@/application/price-plan/update-price-plan-use-case";
import { ConnectZoomAccountUseCase } from "@/application/user/connect-zoom-account-use-case";
import { DisconnectZoomAccountUseCase } from "@/application/user/disconnect-zoom-account-use-case";
import { LinkExistingCustomersToUserUseCase } from "@/application/user/link-existing-customers-to-user-use-case";
import { LinkGoogleToAnonymousUserUseCase } from "@/application/user/link-google-to-anonymous-user-use-case";
import { SignInWithGoogleUseCase } from "@/application/user/sign-in-with-google-use-case";
import { SignupAnonymouslyUseCase } from "@/application/user/signup-anonymously-use-case";
import { UpdateUserProfileUseCase } from "@/application/user/update-user-profile-use-case";
import { WithdrawUserUseCase } from "@/application/user/withdraw-user-use-case";
import { ListUserCouponsUseCase } from "@/application/user-coupon/list-user-coupons-use-case";
import { ReceiveCouponUseCase } from "@/application/user-coupon/receive-coupon-use-case";
import { envServer } from "@/config/env.server";
import { AesGcmTokenCipher } from "@/infrastructure/crypto/aes-gcm-token-cipher";
import { FirebaseAuthAdminService } from "@/infrastructure/firebase/firebase-auth-admin-service";
import { FirebaseUserContactService } from "@/infrastructure/firebase/firebase-user-contact-service";
import { FirestoreBookingRepository } from "@/infrastructure/firestore/firestore-booking-repository";
import { FirestoreConsultantRepository } from "@/infrastructure/firestore/firestore-consultant-repository";
import { FirestoreCustomerRepository } from "@/infrastructure/firestore/firestore-customer-repository";
import { FirestorePaymentRepository } from "@/infrastructure/firestore/firestore-payment-repository";
import { FirestorePricePlanRepository } from "@/infrastructure/firestore/firestore-price-plan-repository";
import { FirestoreRoleRepository } from "@/infrastructure/firestore/firestore-role-repository";
import { FirestoreSettingsRepository } from "@/infrastructure/firestore/firestore-settings-repository";
import { FirestoreSlotRepository } from "@/infrastructure/firestore/firestore-slot-repository";
import { FirestoreUnitOfWork } from "@/infrastructure/firestore/firestore-unit-of-work";
import { FirestoreUserCouponRepository } from "@/infrastructure/firestore/firestore-user-coupon-repository";
import { FirestoreUserRepository } from "@/infrastructure/firestore/firestore-user-repository";
import { FirestoreZoomSessionRepository } from "@/infrastructure/firestore/firestore-zoom-session-repository";
import { LineWorksLateArrivalAlertService } from "@/infrastructure/line-works/line-works-late-arrival-alert-service";
import { ResendEmailService } from "@/infrastructure/resend/resend-email-service";
import { StripeService } from "@/infrastructure/stripe/stripe-service";
import { ZoomService } from "@/infrastructure/zoom/zoom-service";
import { ZoomUserOAuthService } from "@/infrastructure/zoom/zoom-user-oauth-service";

export function createConsultantRepository() {
  return new FirestoreConsultantRepository();
}

export function createPricePlanRepository() {
  return new FirestorePricePlanRepository();
}

export function createSlotRepository() {
  return new FirestoreSlotRepository();
}

export function createBookingRepository() {
  return new FirestoreBookingRepository();
}

export function createSettingsRepository() {
  return new FirestoreSettingsRepository();
}

export function createRoleRepository() {
  return new FirestoreRoleRepository();
}

export function createCreateBookingUseCase() {
  return new CreateBookingUseCase(
    new FirestoreSlotRepository(),
    new FirestoreCustomerRepository(),
    new FirestoreBookingRepository(),
    new ZoomService(),
    new FirestoreUnitOfWork(),
    new ResendEmailService(),
    new FirestoreZoomSessionRepository(),
    new FirestoreConsultantRepository(),
    new FirestorePricePlanRepository(),
    new FirestoreSettingsRepository(),
    new FirestoreUserRepository(),
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

export function createCreatePricePlanUseCase() {
  return new CreatePricePlanUseCase(
    new FirestorePricePlanRepository(),
    new FirestoreSettingsRepository(),
  );
}

export function createUpdatePricePlanUseCase() {
  return new UpdatePricePlanUseCase(new FirestorePricePlanRepository());
}

export function createCancelBookingUseCase() {
  return new CancelBookingUseCase(
    new FirestoreBookingRepository(),
    new FirestorePaymentRepository(),
    new FirestoreSlotRepository(),
    new StripeService(),
    new ResendEmailService(),
    new FirestoreZoomSessionRepository(),
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
    envServer.adminAppUrl,
  );
}

export function createUserRepository() {
  return new FirestoreUserRepository();
}

export function createUserCouponRepository() {
  return new FirestoreUserCouponRepository();
}

export function createSignupAnonymouslyUseCase() {
  return new SignupAnonymouslyUseCase(new FirestoreUserRepository());
}

export function createSignInWithGoogleUseCase() {
  return new SignInWithGoogleUseCase(new FirestoreUserRepository());
}

export function createLinkGoogleToAnonymousUserUseCase() {
  return new LinkGoogleToAnonymousUserUseCase(new FirestoreUserRepository());
}

export function createUpdateUserProfileUseCase() {
  return new UpdateUserProfileUseCase(new FirestoreUserRepository());
}

export function createTokenCipher() {
  return new AesGcmTokenCipher(envServer.zoomCredentialEncryptionKey);
}

export function createZoomUserOAuthService() {
  return new ZoomUserOAuthService();
}

export function createConnectZoomAccountUseCase() {
  return new ConnectZoomAccountUseCase(
    new FirestoreUserRepository(),
    new ZoomUserOAuthService(),
    new AesGcmTokenCipher(envServer.zoomCredentialEncryptionKey),
  );
}

export function createDisconnectZoomAccountUseCase() {
  return new DisconnectZoomAccountUseCase(
    new FirestoreUserRepository(),
    new ZoomUserOAuthService(),
    new AesGcmTokenCipher(envServer.zoomCredentialEncryptionKey),
  );
}

export function createLinkExistingCustomersToUserUseCase() {
  return new LinkExistingCustomersToUserUseCase(
    new FirestoreUserRepository(),
    new FirestoreCustomerRepository(),
  );
}

export function createWithdrawUserUseCase() {
  return new WithdrawUserUseCase(
    new FirestoreUserRepository(),
    new FirestoreCustomerRepository(),
    new ZoomUserOAuthService(),
    new AesGcmTokenCipher(envServer.zoomCredentialEncryptionKey),
    new FirebaseAuthAdminService(),
    new FirestoreUnitOfWork(),
  );
}

export function createReceiveCouponUseCase() {
  return new ReceiveCouponUseCase(new FirestoreUserCouponRepository());
}

export function createListUserCouponsUseCase() {
  return new ListUserCouponsUseCase(new FirestoreUserCouponRepository());
}
