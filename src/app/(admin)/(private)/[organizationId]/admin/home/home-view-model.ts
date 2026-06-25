import type {
  BookingDetail,
  CustomerDetail,
  PaymentDetail,
} from "@/generated/schemas";

const UPCOMING_LIMIT_DEFAULT = 5;
const CHARGEABLE_LIMIT_DEFAULT = 5;

export interface AdminHomeBookingItem {
  bookingId: string;
  customerId: string;
  customerName: string;
  consultantId: string;
  status: string;
  startsAt: string;
  consultantMemo: string;
  chargeable: boolean;
}

export interface AdminHomeChargeableItem {
  bookingId: string;
  customerId: string;
  customerName: string;
  startsAt: string;
  status: string;
  paymentStatus: string | null;
}

export interface AdminHomeTodoSummary {
  upcomingUnprocessedCount: number;
  chargePendingCount: number;
  memoMissingCount: number;
}

export interface AdminHomeViewModel {
  todo: AdminHomeTodoSummary;
  upcomingBookings: AdminHomeBookingItem[];
  chargeableBookings: AdminHomeChargeableItem[];
}

interface BuildAdminHomeViewModelParams {
  bookings: BookingDetail[];
  payments: PaymentDetail[];
  customers: CustomerDetail[];
  now?: Date;
  upcomingLimit?: number;
  chargeableLimit?: number;
}

function isPendingStatus(status: string): boolean {
  return status === "pending" || status === "confirmed";
}

function isSameLocalDate(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function isBlank(value: string | undefined): boolean {
  return (value ?? "").trim().length === 0;
}

export function buildAdminHomeViewModel({
  bookings,
  payments,
  customers,
  now = new Date(),
  upcomingLimit = UPCOMING_LIMIT_DEFAULT,
  chargeableLimit = CHARGEABLE_LIMIT_DEFAULT,
}: BuildAdminHomeViewModelParams): AdminHomeViewModel {
  const customerNameById = new Map(
    customers.map((customer) => [customer.customerId, customer.name]),
  );
  const paymentByBookingId = new Map(
    payments.map((payment) => [payment.bookingId, payment]),
  );

  const mappedBookings: AdminHomeBookingItem[] = bookings
    .map((booking) => ({
      bookingId: booking.bookingId,
      customerId: booking.customerId,
      customerName:
        customerNameById.get(booking.customerId) ?? booking.customerId,
      consultantId: booking.consultantId,
      status: booking.status,
      startsAt: booking.startsAt,
      consultantMemo: booking.consultantMemo ?? "",
      chargeable: booking.chargeable,
    }))
    .sort(
      (a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime(),
    );

  const next24Hours = now.getTime() + 24 * 60 * 60 * 1000;

  const upcomingUnprocessed = mappedBookings.filter((booking) => {
    const startTime = new Date(booking.startsAt).getTime();
    return (
      isPendingStatus(booking.status) &&
      startTime >= now.getTime() &&
      startTime <= next24Hours
    );
  });

  const memoMissingToday = mappedBookings.filter(
    (booking) =>
      booking.status === "completed" &&
      isSameLocalDate(new Date(booking.startsAt), now) &&
      isBlank(booking.consultantMemo),
  );

  const chargeableBookings = mappedBookings
    .filter((booking) => booking.chargeable)
    .map((booking) => ({
      bookingId: booking.bookingId,
      customerId: booking.customerId,
      customerName: booking.customerName,
      startsAt: booking.startsAt,
      status: booking.status,
      paymentStatus: paymentByBookingId.get(booking.bookingId)?.status ?? null,
    }))
    .sort(
      (a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime(),
    );

  return {
    todo: {
      upcomingUnprocessedCount: upcomingUnprocessed.length,
      chargePendingCount: chargeableBookings.length,
      memoMissingCount: memoMissingToday.length,
    },
    upcomingBookings: upcomingUnprocessed.slice(0, upcomingLimit),
    chargeableBookings: chargeableBookings.slice(0, chargeableLimit),
  };
}
