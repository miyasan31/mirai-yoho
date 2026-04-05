import { Money } from "@/domain/payment/money";
import type { ChargeMethod, Payment } from "@/domain/payment/payment";
import { Payment as PaymentEntity } from "@/domain/payment/payment";
import type { IPaymentRepository } from "@/domain/payment/payment-repository";
import { PaymentStatus } from "@/domain/payment/payment-status";
import { PaymentStrategy } from "@/domain/payment/payment-strategy";
import { db } from "@/infrastructure/firestore/firestore-client";
import { FIRESTORE_COLLECTIONS } from "@/infrastructure/firestore/firestore-collections";

const COLLECTION = FIRESTORE_COLLECTIONS.payments;

interface PaymentDoc {
  organizationId: string;
  paymentId: string;
  bookingId: string;
  clientId: string;
  amountJPY: number;
  taxAmountJPY: number;
  taxRate: number;
  status: string;
  paymentStrategy: string;
  stripePaymentIntentId?: string;
  stripeSetupIntentId?: string;
  stripePaymentMethodId?: string;
  chargeMethod?: ChargeMethod;
}

function toDomain(doc: PaymentDoc): Payment {
  return PaymentEntity.reconstruct({
    organizationId: doc.organizationId,
    paymentId: doc.paymentId,
    bookingId: doc.bookingId,
    clientId: doc.clientId,
    money: Money.reconstruct(doc.amountJPY, doc.taxAmountJPY, doc.taxRate),
    status: PaymentStatus.reconstruct(doc.status),
    paymentStrategy: PaymentStrategy.reconstruct(doc.paymentStrategy),
    stripePaymentIntentId: doc.stripePaymentIntentId,
    stripeSetupIntentId: doc.stripeSetupIntentId,
    stripePaymentMethodId: doc.stripePaymentMethodId,
    chargeMethod: doc.chargeMethod,
  });
}

function toFirestore(payment: Payment): Record<string, unknown> {
  const money = payment.getMoney();
  return {
    organizationId: payment.getOrganizationId(),
    paymentId: payment.getPaymentId(),
    bookingId: payment.getBookingId(),
    clientId: payment.getClientId(),
    amountJPY: money.getAmountJPY(),
    taxAmountJPY: money.getTaxAmountJPY(),
    taxRate: money.getTaxRate(),
    status: payment.getStatus().getValue(),
    paymentStrategy: payment.getPaymentStrategy().getValue(),
    stripePaymentIntentId: payment.getStripePaymentIntentId() ?? null,
    stripeSetupIntentId: payment.getStripeSetupIntentId() ?? null,
    stripePaymentMethodId: payment.getStripePaymentMethodId() ?? null,
    chargeMethod: payment.getChargeMethod() ?? null,
  };
}

export class FirestorePaymentRepository implements IPaymentRepository {
  async findByBookingId(
    organizationId: string,
    bookingId: string,
  ): Promise<Payment | null> {
    const snapshot = await db
      .collection(COLLECTION)
      .where("organizationId", "==", organizationId)
      .where("bookingId", "==", bookingId)
      .limit(1)
      .get();
    if (snapshot.empty) return null;
    return toDomain(snapshot.docs[0].data() as PaymentDoc);
  }

  async findBySetupIntentId(setupIntentId: string): Promise<Payment | null> {
    const snapshot = await db
      .collection(COLLECTION)
      .where("stripeSetupIntentId", "==", setupIntentId)
      .limit(1)
      .get();
    if (snapshot.empty) return null;
    return toDomain(snapshot.docs[0].data() as PaymentDoc);
  }

  async findByPaymentIntentId(
    paymentIntentId: string,
  ): Promise<Payment | null> {
    const snapshot = await db
      .collection(COLLECTION)
      .where("stripePaymentIntentId", "==", paymentIntentId)
      .limit(1)
      .get();
    if (snapshot.empty) return null;
    return toDomain(snapshot.docs[0].data() as PaymentDoc);
  }

  async findAll(organizationId: string): Promise<Payment[]> {
    const snapshot = await db
      .collection(COLLECTION)
      .where("organizationId", "==", organizationId)
      .get();
    return snapshot.docs.map((doc) => toDomain(doc.data() as PaymentDoc));
  }

  async save(payment: Payment): Promise<void> {
    await db
      .collection(COLLECTION)
      .doc(payment.getPaymentId())
      .set(toFirestore(payment));
  }
}
