import type { ConsultantBookingDetail } from "@mirai-yoho/api-client/schemas";

export interface HomeBookingItem {
  bookingId: string;
  customerId: string;
  customerName: string;
  status: string;
  startsAt: string;
  joinUrl: string | null;
  consultantJoinedAt: string | null;
  consultantMemo: string;
}

export interface HomeSummary {
  todayTotal: number;
  todayCompleted: number;
  todayRemaining: number;
  todayMemoMissing: number;
}

export interface ConsultantHomeViewModel {
  nextBooking: HomeBookingItem | null;
  todayBookings: HomeBookingItem[];
  summary: HomeSummary;
}

function toHomeBookingItem(booking: ConsultantBookingDetail): HomeBookingItem {
  return {
    bookingId: booking.bookingId,
    customerId: booking.customerId,
    customerName: booking.customer?.name ?? booking.customerId,
    status: booking.status,
    startsAt: booking.startsAt,
    joinUrl: booking.joinUrl ?? null,
    consultantJoinedAt: booking.consultantJoinedAt ?? null,
    consultantMemo: booking.consultantMemo ?? "",
  };
}

function isSameLocalDate(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function hasMemo(booking: HomeBookingItem): boolean {
  return booking.consultantMemo.trim().length > 0;
}

function isRemainingStatus(status: string): boolean {
  return status === "pending" || status === "confirmed";
}

function isTodayOrFuture(booking: HomeBookingItem, now: Date): boolean {
  return (
    isSameLocalDate(new Date(booking.startsAt), now) ||
    new Date(booking.startsAt).getTime() >= now.getTime()
  );
}

export function buildConsultantHomeViewModel(
  sourceBookings: ConsultantBookingDetail[],
  now = new Date(),
): ConsultantHomeViewModel {
  const bookings = sourceBookings
    .map(toHomeBookingItem)
    .sort(
      (a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime(),
    );

  const nextBooking =
    bookings.find(
      (booking) =>
        isRemainingStatus(booking.status) && isTodayOrFuture(booking, now),
    ) ?? null;

  const todayBookings = bookings.filter((booking) =>
    isSameLocalDate(new Date(booking.startsAt), now),
  );

  const summary: HomeSummary = {
    todayTotal: todayBookings.length,
    todayCompleted: todayBookings.filter(
      (booking) => booking.status === "completed",
    ).length,
    todayRemaining: todayBookings.filter((booking) =>
      isRemainingStatus(booking.status),
    ).length,
    todayMemoMissing: todayBookings.filter((booking) => !hasMemo(booking))
      .length,
  };

  return {
    nextBooking,
    todayBookings,
    summary,
  };
}
