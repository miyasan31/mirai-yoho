import { DomainError } from "@mirai-yoho/shared/domain-error";
import { Booking } from "@/domain/booking/booking";
import { BookingStatus } from "@/domain/booking/booking-status";
import { CancelDeadline } from "@/domain/booking/cancel-deadline";
import { ConsultantMemo } from "@/domain/booking/consultant-memo";
import { ZoomUrl } from "@/domain/booking/zoom-url";

const futureDate = new Date("2026-05-01T10:00:00Z");
const ORGANIZATION_ID = "org-1";

function createPendingBooking() {
  return Booking.create({
    organizationId: ORGANIZATION_ID,
    bookingId: "booking-1",
    customerId: "customer-1",
    consultantId: "consultant-1",
    usageSlotIds: ["slot-1", "slot-2"],
    bufferSlotIds: ["slot-3"],
    startsAt: futureDate,
    endsAt: new Date(futureDate.getTime() + 30 * 60 * 1000),
    durationMinutes: 30,
    consultantMemo: ConsultantMemo.empty(),
    pricePlanId: "plan-1",
    pricePlanName: "通常鑑定",
    pricePlanTotalJPY: 5500,
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
      expect(booking.getCancelDeadlineAt().equals(expectedDeadline)).toBe(true);
    });

    it("joinUrl は undefined", () => {
      const booking = createPendingBooking();
      expect(booking.getJoinUrl()).toBeUndefined();
    });

    it("consultationReminderEmailSentAt は undefined", () => {
      const booking = createPendingBooking();
      expect(booking.getConsultationReminderEmailSentAt()).toBeUndefined();
    });
  });

  describe("reconstruct", () => {
    it("consultationReminderEmailSentAt を復元できる", () => {
      const sentAt = new Date("2026-05-01T09:45:00Z");
      const booking = Booking.reconstruct({
        organizationId: ORGANIZATION_ID,
        bookingId: "booking-1",
        customerId: "customer-1",
        consultantId: "consultant-1",
        usageSlotIds: ["slot-1", "slot-2"],
        bufferSlotIds: ["slot-3"],
        startsAt: futureDate,
        endsAt: new Date(futureDate.getTime() + 30 * 60 * 1000),
        durationMinutes: 30,
        status: BookingStatus.reconstruct("confirmed"),
        cancelDeadlineAt: CancelDeadline.create(futureDate),
        consultationReminderEmailSentAt: sentAt,
        consultantMemo: ConsultantMemo.empty(),
      });

      expect(booking.getConsultationReminderEmailSentAt()).toEqual(sentAt);
    });
  });

  describe("confirm", () => {
    it("pending から confirmed に遷移する", () => {
      const booking = createPendingBooking();
      booking.confirm(ZoomUrl.create("https://zoom.us/j/123"));
      expect(booking.getStatus().getValue()).toBe("confirmed");
    });

    it("joinUrl が設定される", () => {
      const booking = createPendingBooking();
      const joinUrl = ZoomUrl.create("https://zoom.us/j/123");
      booking.confirm(joinUrl);
      expect(booking.getJoinUrl()?.getValue()).toBe("https://zoom.us/j/123");
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
        customerId: "customer-1",
        consultantId: "consultant-1",
        usageSlotIds: ["slot-1", "slot-2"],
        bufferSlotIds: ["slot-3"],
        startsAt: pastDate,
        endsAt: new Date(pastDate.getTime() + 30 * 60 * 1000),
        durationMinutes: 30,
        status: BookingStatus.reconstruct("confirmed"),
        cancelDeadlineAt: CancelDeadline.create(pastDate),
        consultantMemo: ConsultantMemo.empty(),
      });
      expect(() => booking.cancel("admin")).not.toThrow();
    });

    it("customer はデッドライン後にキャンセルすると DomainError", () => {
      const pastDate = new Date("2020-01-01T10:00:00Z");
      const booking = Booking.reconstruct({
        organizationId: ORGANIZATION_ID,
        bookingId: "booking-1",
        customerId: "customer-1",
        consultantId: "consultant-1",
        usageSlotIds: ["slot-1", "slot-2"],
        bufferSlotIds: ["slot-3"],
        startsAt: pastDate,
        endsAt: new Date(pastDate.getTime() + 30 * 60 * 1000),
        durationMinutes: 30,
        status: BookingStatus.reconstruct("confirmed"),
        cancelDeadlineAt: CancelDeadline.create(pastDate),
        consultantMemo: ConsultantMemo.empty(),
      });
      expect(() => booking.cancel("customer")).toThrow(DomainError);
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
      const newMemo = ConsultantMemo.create({
        customerName: "山田 花子",
        birthDate: "1990-01-01",
        appraisalDate: "2026-05-01",
        freeMemo: "updated memo",
      });
      booking.updateMemo(newMemo);
      expect(booking.getConsultantMemo().getFreeMemo()).toBe("updated memo");
      expect(booking.getConsultantMemo().getCustomerName()).toBe("山田 花子");
      expect(booking.getConsultantMemo().getBirthDate()).toBe("1990-01-01");
      expect(booking.getConsultantMemo().getAppraisalDate()).toBe("2026-05-01");
    });
  });

  describe("markConsultantJoined", () => {
    it("開始15分前ちょうどから記録できる", () => {
      const booking = createPendingBooking();
      const joinedAt = new Date("2026-05-01T09:45:00Z");

      booking.markConsultantJoined(joinedAt);

      expect(booking.getConsultantJoinedAt()).toEqual(joinedAt);
      expect(booking.getUpdatedAt()).toEqual(joinedAt);
    });

    it("15分より前は記録できない", () => {
      const booking = createPendingBooking();

      expect(() =>
        booking.markConsultantJoined(new Date("2026-05-01T09:44:59Z")),
      ).toThrow(DomainError);
    });

    it("開始後も記録できる", () => {
      const booking = createPendingBooking();
      const joinedAt = new Date("2026-05-01T10:05:00Z");

      booking.markConsultantJoined(joinedAt);

      expect(booking.getConsultantJoinedAt()).toEqual(joinedAt);
    });

    it("completed は記録できない", () => {
      const booking = createConfirmedBooking();
      booking.complete();

      expect(() =>
        booking.markConsultantJoined(new Date("2026-05-01T10:05:00Z")),
      ).toThrow(DomainError);
    });

    it("cancelled は記録できない", () => {
      const booking = createConfirmedBooking();
      booking.cancel("admin");

      expect(() =>
        booking.markConsultantJoined(new Date("2026-05-01T10:05:00Z")),
      ).toThrow(DomainError);
    });

    it("二重に記録できない", () => {
      const booking = createPendingBooking();
      booking.markConsultantJoined(new Date("2026-05-01T09:45:00Z"));

      expect(() =>
        booking.markConsultantJoined(new Date("2026-05-01T09:46:00Z")),
      ).toThrow(DomainError);
    });
  });

  describe("markConsultationReminderEmailSent", () => {
    it("送信済み時刻を記録できる", () => {
      const booking = createConfirmedBooking();
      const sentAt = new Date("2026-05-01T09:45:00Z");

      booking.markConsultationReminderEmailSent(sentAt);

      expect(booking.getConsultationReminderEmailSentAt()).toEqual(sentAt);
      expect(booking.getUpdatedAt()).toEqual(sentAt);
    });

    it("二重に記録できない", () => {
      const booking = createConfirmedBooking();
      booking.markConsultationReminderEmailSent(
        new Date("2026-05-01T09:45:00Z"),
      );

      expect(() =>
        booking.markConsultationReminderEmailSent(
          new Date("2026-05-01T09:46:00Z"),
        ),
      ).toThrow(DomainError);
    });
  });

  describe("markLateArrivalAlertSent", () => {
    it("遅刻アラート通知済み時刻を記録する", () => {
      const booking = createConfirmedBooking();
      const sentAt = new Date("2026-05-01T10:30:00Z");

      booking.markLateArrivalAlertSent(sentAt);

      expect(booking.getLateArrivalAlertSentAt()).toEqual(sentAt);
      expect(booking.getUpdatedAt()).toEqual(sentAt);
    });

    it("遅刻アラート通知済みの予約を再度記録するとエラー", () => {
      const booking = createConfirmedBooking();
      booking.markLateArrivalAlertSent(new Date("2026-05-01T10:30:00Z"));

      expect(() =>
        booking.markLateArrivalAlertSent(new Date("2026-05-01T11:00:00Z")),
      ).toThrow(DomainError);
    });
  });
});
