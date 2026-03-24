import { Money } from "@/domain/payment/money";
import type { CaptureMethod, Payment } from "@/domain/payment/payment";
import { Payment as PaymentEntity } from "@/domain/payment/payment";
import type { IPaymentRepository } from "@/domain/payment/payment-repository";
import { PaymentStatus } from "@/domain/payment/payment-status";
import { db } from "@/infrastructure/firestore/firestore-client";

const COLLECTION = "payments";

interface PaymentDoc {
  paymentId: string;
  bookingId: string;
  clientId: string;
  stripePaymentIntentId: string;
  amountJPY: number;
  taxAmountJPY: number;
  taxRate: number;
  status: string;
  captureMethod?: CaptureMethod;
}

function toDomain(doc: PaymentDoc): Payment {
  return PaymentEntity.reconstruct({
    paymentId: doc.paymentId,
    bookingId: doc.bookingId,
    clientId: doc.clientId,
    stripePaymentIntentId: doc.stripePaymentIntentId,
    money: Money.reconstruct(doc.amountJPY, doc.taxAmountJPY, doc.taxRate),
    status: PaymentStatus.reconstruct(doc.status),
    captureMethod: doc.captureMethod,
  });
}

function toFirestore(payment: Payment): Record<string, unknown> {
  const money = payment.getMoney();
  return {
    paymentId: payment.getPaymentId(),
    bookingId: payment.getBookingId(),
    clientId: payment.getClientId(),
    stripePaymentIntentId: payment.getStripePaymentIntentId(),
    amountJPY: money.getAmountJPY(),
    taxAmountJPY: money.getTaxAmountJPY(),
    taxRate: money.getTaxRate(),
    status: payment.getStatus().getValue(),
    captureMethod: payment.getCaptureMethod() ?? null,
  };
}

export class FirestorePaymentRepository implements IPaymentRepository {
  async findByBookingId(bookingId: string): Promise<Payment | null> {
    const snapshot = await db
      .collection(COLLECTION)
      .where("bookingId", "==", bookingId)
      .limit(1)
      .get();
    if (snapshot.empty) return null;
    return toDomain(snapshot.docs[0].data() as PaymentDoc);
  }

  async findAll(): Promise<Payment[]> {
    const snapshot = await db.collection(COLLECTION).get();
    return snapshot.docs.map((doc) => toDomain(doc.data() as PaymentDoc));
  }

  async save(payment: Payment): Promise<void> {
    await db
      .collection(COLLECTION)
      .doc(payment.getPaymentId())
      .set(toFirestore(payment));
  }
}
