import type { ConsultantBookingDetail } from "@mirai-yoho/api-client/schemas";
import { buildConsultantHomeViewModel } from "../home-view-model";

function createBooking(
  overrides: Partial<ConsultantBookingDetail> = {},
): ConsultantBookingDetail {
  return {
    bookingId: overrides.bookingId ?? "b-1",
    customerId: overrides.customerId ?? "customer-1",
    consultantId: overrides.consultantId ?? "consultant-1",
    usageSlotIds: overrides.usageSlotIds ?? ["slot-1", "slot-2"],
    bufferSlotIds: overrides.bufferSlotIds ?? ["slot-3"],
    startsAt: overrides.startsAt ?? "2026-04-22T10:00:00+09:00",
    endsAt: overrides.endsAt ?? "2026-04-22T10:30:00+09:00",
    durationMinutes: overrides.durationMinutes ?? 30,
    status: overrides.status ?? "confirmed",
    joinUrl: overrides.joinUrl ?? null,
    consultantMemo: overrides.consultantMemo ?? "",
    consultationContent: overrides.consultationContent ?? null,
    chargeable: overrides.chargeable ?? false,
    chargeDisabledReason: overrides.chargeDisabledReason ?? null,
    createdAt: overrides.createdAt ?? "2026-04-01T00:00:00+09:00",
    updatedAt: overrides.updatedAt ?? "2026-04-01T00:00:00+09:00",
    customer: overrides.customer ?? {
      customerId: overrides.customerId ?? "customer-1",
      name: "山田 太郎",
      email: "taro@example.com",
      phone: "090-0000-0000",
      note: null,
      createdAt: "2026-04-01T00:00:00+09:00",
      updatedAt: "2026-04-01T00:00:00+09:00",
    },
  };
}

describe("buildConsultantHomeViewModel", () => {
  it("startsAt 昇順で整列し、次予約は未対応ステータスから選ぶ", () => {
    const now = new Date("2026-04-22T09:00:00+09:00");
    const viewModel = buildConsultantHomeViewModel(
      [
        createBooking({
          bookingId: "completed-next",
          startsAt: "2026-04-22T09:30:00+09:00",
          status: "completed",
        }),
        createBooking({
          bookingId: "confirmed-next",
          startsAt: "2026-04-22T10:00:00+09:00",
          status: "confirmed",
        }),
        createBooking({
          bookingId: "pending-earlier",
          startsAt: "2026-04-22T09:10:00+09:00",
          status: "pending",
        }),
      ],
      now,
    );

    expect(viewModel.nextBooking?.bookingId).toBe("pending-earlier");
    expect(viewModel.todayBookings.map((booking) => booking.bookingId)).toEqual(
      ["pending-earlier", "completed-next", "confirmed-next"],
    );
  });

  it("当日サマリを集計する", () => {
    const now = new Date("2026-04-22T09:00:00+09:00");
    const viewModel = buildConsultantHomeViewModel(
      [
        createBooking({ bookingId: "confirmed", status: "confirmed" }),
        createBooking({
          bookingId: "completed",
          status: "completed",
          consultantMemo: "済",
          startsAt: "2026-04-22T11:00:00+09:00",
        }),
        createBooking({
          bookingId: "tomorrow",
          status: "pending",
          startsAt: "2026-04-23T10:00:00+09:00",
        }),
      ],
      now,
    );

    expect(viewModel.summary).toEqual({
      todayTotal: 2,
      todayCompleted: 1,
      todayRemaining: 1,
      todayMemoMissing: 1,
    });
  });

  it("開始後でも当日の未対応予約は次予約に残す", () => {
    const now = new Date("2026-04-22T10:05:00+09:00");
    const viewModel = buildConsultantHomeViewModel(
      [
        createBooking({
          bookingId: "started",
          status: "confirmed",
          startsAt: "2026-04-22T10:00:00+09:00",
        }),
        createBooking({
          bookingId: "later",
          status: "confirmed",
          startsAt: "2026-04-22T14:00:00+09:00",
        }),
      ],
      now,
    );

    expect(viewModel.nextBooking?.bookingId).toBe("started");
  });
});
