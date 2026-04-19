import { DomainError } from "@/domain/shared/domain-error";
import { Slot } from "@/domain/slot/slot";
import { TimeRange } from "@/domain/slot/time-range";

const futureStart = new Date("2026-05-01T10:00:00Z");
const futureEnd = new Date("2026-05-01T11:00:00Z");
const ORGANIZATION_ID = "org-1";

function createSlot() {
  const timeRange = TimeRange.reconstruct(futureStart, futureEnd);
  return Slot.create({
    organizationId: ORGANIZATION_ID,
    slotId: "slot-1",
    consultantId: "consultant-1",
    timeRange,
  });
}

describe("Slot", () => {
  describe("create", () => {
    it("未予約の状態で作成される", () => {
      const slot = createSlot();
      expect(slot.getIsReserved()).toBe(false);
      expect(slot.getBookingId()).toBeUndefined();
    });
  });

  describe("reserve", () => {
    it("予約すると isReserved が true になり bookingId が設定される", () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2026-04-01T00:00:00Z"));

      const slot = createSlot();
      slot.reserve("booking-1");

      expect(slot.getIsReserved()).toBe(true);
      expect(slot.getBookingId()).toBe("booking-1");

      vi.useRealTimers();
    });

    it("既に予約済みの枠を予約すると SLOT_ALREADY_RESERVED エラー", () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2026-04-01T00:00:00Z"));

      const slot = createSlot();
      slot.reserve("booking-1");

      expect(() => slot.reserve("booking-2")).toThrow(DomainError);
      expect(() => slot.reserve("booking-2")).toThrow("already reserved");

      vi.useRealTimers();
    });

    it("過去の枠を予約すると SLOT_IN_PAST エラー", () => {
      const pastTimeRange = TimeRange.reconstruct(
        new Date("2020-01-01T10:00:00Z"),
        new Date("2020-01-01T11:00:00Z"),
      );
      const slot = Slot.create({
        organizationId: ORGANIZATION_ID,
        slotId: "slot-2",
        consultantId: "consultant-1",
        timeRange: pastTimeRange,
      });

      expect(() => slot.reserve("booking-1")).toThrow(DomainError);
      expect(() => slot.reserve("booking-1")).toThrow("past");
    });
  });

  describe("release", () => {
    it("予約を解除すると isReserved が false になり bookingId が undefined になる", () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2026-04-01T00:00:00Z"));

      const slot = createSlot();
      slot.reserve("booking-1");
      slot.release();

      expect(slot.getIsReserved()).toBe(false);
      expect(slot.getBookingId()).toBeUndefined();

      vi.useRealTimers();
    });

    it("未予約の枠を解除すると SLOT_NOT_RESERVED エラー", () => {
      const slot = createSlot();
      expect(() => slot.release()).toThrow(DomainError);
      expect(() => slot.release()).toThrow("not reserved");
    });
  });
});

describe("TimeRange", () => {
  it("create() は有効な時間範囲を作成する", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-01T00:00:00Z"));

    const timeRange = TimeRange.create(futureStart, futureEnd);
    expect(timeRange.getStartAt().getTime()).toBe(futureStart.getTime());
    expect(timeRange.getEndAt().getTime()).toBe(futureEnd.getTime());

    vi.useRealTimers();
  });

  it("startAt >= endAt だと INVALID_TIME_RANGE エラー", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-01T00:00:00Z"));

    expect(() => TimeRange.create(futureEnd, futureStart)).toThrow(DomainError);

    vi.useRealTimers();
  });

  it("過去の startAt だと PAST_TIME_RANGE エラー", () => {
    const pastStart = new Date("2020-01-01T10:00:00Z");
    const pastEnd = new Date("2020-01-01T11:00:00Z");
    expect(() => TimeRange.create(pastStart, pastEnd)).toThrow(DomainError);
  });

  it("equals() は同じ範囲で true を返す", () => {
    const tr1 = TimeRange.reconstruct(futureStart, futureEnd);
    const tr2 = TimeRange.reconstruct(futureStart, futureEnd);
    expect(tr1.equals(tr2)).toBe(true);
  });
});
