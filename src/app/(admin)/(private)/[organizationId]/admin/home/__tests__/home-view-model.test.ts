import type {
  BookingDetail,
  ClientDetail,
  PaymentDetail,
} from "@/generated/schemas";
import { buildAdminHomeViewModel } from "../home-view-model";

function createBooking(overrides: Partial<BookingDetail> = {}): BookingDetail {
  return {
    bookingId: overrides.bookingId ?? "booking-1",
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
  };
}

function createPayment(overrides: Partial<PaymentDetail> = {}): PaymentDetail {
  return {
    paymentId: overrides.paymentId ?? "payment-1",
    bookingId: overrides.bookingId ?? "booking-1",
    clientId: overrides.clientId ?? "client-1",
    paymentStrategy: overrides.paymentStrategy ?? "deferred",
    stripePaymentIntentId: overrides.stripePaymentIntentId ?? null,
    stripeSetupIntentId: overrides.stripeSetupIntentId ?? null,
    stripePaymentMethodId: overrides.stripePaymentMethodId ?? null,
    amountJPY: overrides.amountJPY ?? 5000,
    taxAmountJPY: overrides.taxAmountJPY ?? 500,
    totalJPY: overrides.totalJPY ?? 5500,
    status: overrides.status ?? "setup_complete",
    chargeMethod: overrides.chargeMethod ?? null,
    createdAt: overrides.createdAt ?? "2026-04-01T00:00:00+09:00",
    updatedAt: overrides.updatedAt ?? "2026-04-01T00:00:00+09:00",
  };
}

function createClient(overrides: Partial<ClientDetail> = {}): ClientDetail {
  return {
    clientId: overrides.clientId ?? "client-1",
    name: overrides.name ?? "山田 太郎",
    email: overrides.email ?? "taro@example.com",
    phone: overrides.phone ?? "090-0000-0000",
    memo: overrides.memo ?? null,
    createdAt: overrides.createdAt ?? "2026-04-01T00:00:00+09:00",
    updatedAt: overrides.updatedAt ?? "2026-04-01T00:00:00+09:00",
  };
}

describe("buildAdminHomeViewModel", () => {
  it("today + 24h の未対応予約件数を集計し、開始時刻順に並べる", () => {
    const now = new Date("2026-04-22T09:00:00+09:00");

    const viewModel = buildAdminHomeViewModel({
      bookings: [
        createBooking({
          bookingId: "in-window-late",
          startDatetime: "2026-04-22T23:00:00+09:00",
          status: "confirmed",
        }),
        createBooking({
          bookingId: "out-of-window",
          startDatetime: "2026-04-23T09:00:01+09:00",
          status: "pending",
        }),
        createBooking({
          bookingId: "in-window-early",
          startDatetime: "2026-04-22T10:00:00+09:00",
          status: "pending",
        }),
        createBooking({
          bookingId: "completed",
          startDatetime: "2026-04-22T11:00:00+09:00",
          status: "completed",
        }),
      ],
      payments: [],
      clients: [createClient()],
      now,
    });

    expect(viewModel.todo.upcomingUnprocessedCount).toBe(2);
    expect(
      viewModel.upcomingBookings.map((booking) => booking.bookingId),
    ).toEqual(["in-window-early", "in-window-late"]);
  });

  it("completed かつ当日メモ空白のみをメモ未入力として集計する", () => {
    const now = new Date("2026-04-22T09:00:00+09:00");

    const viewModel = buildAdminHomeViewModel({
      bookings: [
        createBooking({
          bookingId: "missing-today",
          status: "completed",
          consultantMemo: " ",
          startDatetime: "2026-04-22T10:00:00+09:00",
        }),
        createBooking({
          bookingId: "filled-today",
          status: "completed",
          consultantMemo: "対応済み",
          startDatetime: "2026-04-22T11:00:00+09:00",
        }),
        createBooking({
          bookingId: "missing-other-day",
          status: "completed",
          consultantMemo: "",
          startDatetime: "2026-04-23T10:00:00+09:00",
        }),
        createBooking({
          bookingId: "pending-no-memo",
          status: "pending",
          consultantMemo: "",
          startDatetime: "2026-04-22T12:00:00+09:00",
        }),
      ],
      payments: [],
      clients: [createClient()],
      now,
    });

    expect(viewModel.todo.memoMissingCount).toBe(1);
  });

  it("本決済待ち件数を chargeable で集計し、支払いステータスを紐付ける", () => {
    const now = new Date("2026-04-22T09:00:00+09:00");

    const viewModel = buildAdminHomeViewModel({
      bookings: [
        createBooking({
          bookingId: "chargeable-a",
          clientId: "client-a",
          chargeable: true,
          startDatetime: "2026-04-22T10:00:00+09:00",
        }),
        createBooking({
          bookingId: "not-chargeable",
          chargeable: false,
          startDatetime: "2026-04-22T11:00:00+09:00",
        }),
        createBooking({
          bookingId: "chargeable-b",
          clientId: "client-b",
          chargeable: true,
          startDatetime: "2026-04-22T09:30:00+09:00",
        }),
      ],
      payments: [
        createPayment({ bookingId: "chargeable-a", status: "setup_complete" }),
        createPayment({ bookingId: "chargeable-b", status: "failed" }),
      ],
      clients: [
        createClient({ clientId: "client-a", name: "田中 一郎" }),
        createClient({ clientId: "client-b", name: "鈴木 花" }),
      ],
      now,
      chargeableLimit: 1,
    });

    expect(viewModel.todo.chargePendingCount).toBe(2);
    expect(viewModel.chargeableBookings).toHaveLength(1);
    expect(viewModel.chargeableBookings[0]).toMatchObject({
      bookingId: "chargeable-b",
      clientName: "鈴木 花",
      paymentStatus: "failed",
    });
  });
});
