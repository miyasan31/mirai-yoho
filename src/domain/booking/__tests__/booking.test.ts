import { describe, expect, it } from "vitest";
import { Booking } from "@/domain/booking/booking";
import { BookingStatus } from "@/domain/booking/booking-status";
import { CancelDeadline } from "@/domain/booking/cancel-deadline";
import { ConsultantMemo } from "@/domain/booking/consultant-memo";
import { ZoomUrl } from "@/domain/booking/zoom-url";
import { DomainError } from "@/domain/shared/domain-error";

const futureDate = new Date("2026-05-01T10:00:00Z");
const ORGANIZATION_ID = "org-1";

function createPendingBooking() {
  return Booking.create({
    organizationId: ORGANIZATION_ID,
    bookingId: "booking-1",
    clientId: "client-1",
    consultantId: "consultant-1",
    slotId: "slot-1",
    startDatetime: futureDate,
    consultantMemo: ConsultantMemo.create(""),
  });
}

function createConfirmedBooking() {
  const booking = createPendingBooking();
  booking.confirm(ZoomUrl.create("https://zoom.us/j/123"));
  // イベントをクリア
  booking.pullDomainEvents();
  return booking;
}

describe("Booking", () => {
  describe("create", () => {
    it("ステータスが pending で作成される", () => {
      const booking = createPendingBooking();
      expect(booking.getStatus().getValue()).toBe("pending");
    });

    it("CancelDeadline が自動設定される", () => {
      const booking = createPendingBooking();
      const expectedDeadline = CancelDeadline.create(futureDate);
      expect(booking.getCancelDeadline().equals(expectedDeadline)).toBe(true);
    });

    it("zoomUrl は undefined", () => {
      const booking = createPendingBooking();
      expect(booking.getZoomUrl()).toBeUndefined();
    });
  });

  describe("confirm", () => {
    it("pending から confirmed に遷移する", () => {
      const booking = createPendingBooking();
      booking.confirm(ZoomUrl.create("https://zoom.us/j/123"));
      expect(booking.getStatus().getValue()).toBe("confirmed");
    });

    it("zoomUrl が設定される", () => {
      const booking = createPendingBooking();
      const zoomUrl = ZoomUrl.create("https://zoom.us/j/123");
      booking.confirm(zoomUrl);
      expect(booking.getZoomUrl()?.getValue()).toBe("https://zoom.us/j/123");
    });

    it("BookingConfirmedEvent が発行される", () => {
      const booking = createPendingBooking();
      booking.confirm(ZoomUrl.create("https://zoom.us/j/123"));
      const events = booking.pullDomainEvents();
      expect(events).toHaveLength(1);
      expect(events[0].eventName).toBe("BookingConfirmed");
    });

    it("pending 以外から confirm すると DomainError", () => {
      const booking = createConfirmedBooking();
      expect(() =>
        booking.confirm(ZoomUrl.create("https://zoom.us/j/456")),
      ).toThrow(DomainError);
    });
  });

  describe("cancel", () => {
    it("confirmed から cancelled に遷移する", () => {
      const booking = createConfirmedBooking();
      booking.cancel("admin");
      expect(booking.getStatus().getValue()).toBe("cancelled");
    });

    it("pending から cancelled に遷移する", () => {
      const booking = createPendingBooking();
      booking.cancel("admin");
      expect(booking.getStatus().getValue()).toBe("cancelled");
    });

    it("BookingCancelledEvent が発行される", () => {
      const booking = createConfirmedBooking();
      booking.cancel("admin");
      const events = booking.pullDomainEvents();
      expect(events).toHaveLength(1);
      expect(events[0].eventName).toBe("BookingCancelled");
    });

    it("admin はデッドライン後でもキャンセルできる", () => {
      const pastDate = new Date("2020-01-01T10:00:00Z");
      const booking = Booking.reconstruct({
        organizationId: ORGANIZATION_ID,
        bookingId: "booking-1",
        clientId: "client-1",
        consultantId: "consultant-1",
        slotId: "slot-1",
        startDatetime: pastDate,
        status: BookingStatus.reconstruct("confirmed"),
        cancelDeadline: CancelDeadline.create(pastDate),
        consultantMemo: ConsultantMemo.create(""),
      });
      expect(() => booking.cancel("admin")).not.toThrow();
    });

    it("client はデッドライン後にキャンセルすると DomainError", () => {
      const pastDate = new Date("2020-01-01T10:00:00Z");
      const booking = Booking.reconstruct({
        organizationId: ORGANIZATION_ID,
        bookingId: "booking-1",
        clientId: "client-1",
        consultantId: "consultant-1",
        slotId: "slot-1",
        startDatetime: pastDate,
        status: BookingStatus.reconstruct("confirmed"),
        cancelDeadline: CancelDeadline.create(pastDate),
        consultantMemo: ConsultantMemo.create(""),
      });
      expect(() => booking.cancel("client")).toThrow(DomainError);
    });

    it("completed からキャンセルすると DomainError", () => {
      const booking = createConfirmedBooking();
      booking.complete();
      expect(() => booking.cancel("admin")).toThrow(DomainError);
    });

    it("cancelled からキャンセルすると DomainError", () => {
      const booking = createConfirmedBooking();
      booking.cancel("admin");
      expect(() => booking.cancel("admin")).toThrow(DomainError);
    });
  });

  describe("complete", () => {
    it("confirmed から completed に遷移する", () => {
      const booking = createConfirmedBooking();
      booking.complete();
      expect(booking.getStatus().getValue()).toBe("completed");
    });

    it("confirmed 以外から complete すると DomainError", () => {
      const booking = createPendingBooking();
      expect(() => booking.complete()).toThrow(DomainError);
    });
  });

  describe("updateMemo", () => {
    it("メモを更新できる", () => {
      const booking = createPendingBooking();
      const newMemo = ConsultantMemo.create("updated memo");
      booking.updateMemo(newMemo);
      expect(booking.getConsultantMemo().getValue()).toBe("updated memo");
    });
  });
});
