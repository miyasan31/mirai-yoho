import type { CustomerBookingResult } from "@/application/booking/list-customer-bookings-use-case";

/**
 * OpenAPI の MyBooking スキーマに対応するレスポンス。
 * me-bookings.ts と me-booking-ratings.ts の両方から使うことで整合を1箇所で担保する。
 */
export function toMyBookingResponse(result: CustomerBookingResult) {
  const { booking, consultantName, organizationName, isRated, ratableUntil } =
    result;

  return {
    bookingId: booking.getBookingId(),
    organizationId: booking.getOrganizationId(),
    organizationName,
    status: booking.getStatus().getValue(),
    startsAt: booking.getStartsAt().toISOString(),
    endsAt: booking.getEndsAt().toISOString(),
    durationMinutes: booking.getDurationMinutes(),
    cancelDeadlineAt: booking.getCancelDeadlineAt().getValue().toISOString(),
    consultantId: booking.getConsultantId(),
    consultantName,
    joinUrl: booking.getJoinUrl()?.getValue() ?? null,
    pricePlanName: booking.getPricePlanName() ?? null,
    pricePlanTotalJPY: booking.getPricePlanTotalJPY() ?? null,
    couponDiscountJPY: booking.getCouponDiscountJPY() ?? null,
    discountedTotalJPY: booking.getDiscountedTotalJPY() ?? null,
    isRated,
    ratableUntil: ratableUntil?.toISOString() ?? null,
  };
}
