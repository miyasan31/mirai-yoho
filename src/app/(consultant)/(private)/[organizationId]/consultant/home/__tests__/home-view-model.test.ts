import type { ConsultantBookingDetail } from "@/generated/schemas";
import { buildConsultantHomeViewModel } from "../home-view-model";

function createBooking(
  overrides: Partial<ConsultantBookingDetail> = {},
): ConsultantBookingDetail {
  return {
    bookingId: overrides.bookingId ?? "b-1",
    clientId: overrides.clientId ?? "client-1",
    consultantId: overrides.consultantId ?? "consultant-1",
    slotId: overrides.slotId ?? "slot-1",
    startDatetime: overrides.startDatetime ?? "2026-04-22T10:00:00+09:00",
    status: overrides.status ?? "confirmed",
    zoomUrl: overrides.zoomUrl ?? null,
    consultantMemo: overrides.consultantMemo ?? "",
    consultationContent: overrides.consultationContent ?? null,
    chargeable: overrides.chargeable ?? false,
    chargeDisabledReason: overrides.chargeDisabledReason ?? null,
    createdAt: overrides.createdAt ?? "2026-04-01T00:00:00+09:00",
    updatedAt: overrides.updatedAt ?? "2026-04-01T00:00:00+09:00",
    client: overrides.client ?? {
      clientId: overrides.clientId ?? "client-1",
      name: "山田 太郎",
      email: "taro@example.com",
      phone: "090-0000-0000",
      memo: null,
      createdAt: "2026-04-01T00:00:00+09:00",
      updatedAt: "2026-04-01T00:00:00+09:00",
    },
  };
}

describe("buildConsultantHomeViewModel", () => {
  it("startDatetime 昇順で整列し、次予約は未対応ステータスから選ぶ", () => {
    const now = new Date("2026-04-22T09:00:00+09:00");
    const viewModel = buildConsultantHomeViewModel(
      [
        createBooking({
          bookingId: "completed-next",
          startDatetime: "2026-04-22T09:30:00+09:00",
          status: "completed",
        }),
        createBooking({
          bookingId: "confirmed-next",
          startDatetime: "2026-04-22T10:00:00+09:00",
          status: "confirmed",
        }),
        createBooking({
          bookingId: "pending-earlier",
          startDatetime: "2026-04-22T09:10:00+09:00",
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
          startDatetime: "2026-04-22T11:00:00+09:00",
        }),
        createBooking({
          bookingId: "tomorrow",
          status: "pending",
          startDatetime: "2026-04-23T10:00:00+09:00",
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
});
