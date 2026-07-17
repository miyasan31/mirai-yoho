const SLOT_UNIT_MINUTES = 15;
const SLOT_UNIT_MS = SLOT_UNIT_MINUTES * 60 * 1000;
const BOOKING_CUTOFF_MINUTES = 15;
const BOOKING_CUTOFF_MS = BOOKING_CUTOFF_MINUTES * 60 * 1000;
const BOOKING_BUFFER_MINUTES = 15;
const BUFFER_SLOT_COUNT = 1;

export const SUPPORTED_DURATION_MINUTES = [30, 60, 90, 120] as const;
export type SupportedDurationMinutes =
  (typeof SUPPORTED_DURATION_MINUTES)[number];

export function getSlotUnitMinutes(): number {
  return SLOT_UNIT_MINUTES;
}

export function getSlotUnitMs(): number {
  return SLOT_UNIT_MS;
}

export function getBookingCutoffMinutes(): number {
  return BOOKING_CUTOFF_MINUTES;
}

export function getBookingCutoffMs(): number {
  return BOOKING_CUTOFF_MS;
}

export function getBookingBufferMinutes(): number {
  return BOOKING_BUFFER_MINUTES;
}

export function getBufferSlotCount(): number {
  return BUFFER_SLOT_COUNT;
}

export function getBookingDeadline(startsAt: Date): Date {
  return new Date(startsAt.getTime() - BOOKING_CUTOFF_MS);
}

export function isBeforeBookingDeadline(
  startsAt: Date,
  now: Date = new Date(),
): boolean {
  return now.getTime() < getBookingDeadline(startsAt).getTime();
}

export function isAlignedToSlotBoundary(date: Date): boolean {
  return date.getUTCMinutes() % SLOT_UNIT_MINUTES === 0;
}

export function isSupportedDuration(
  minutes: number,
): minutes is SupportedDurationMinutes {
  return (SUPPORTED_DURATION_MINUTES as readonly number[]).includes(minutes);
}

export function getUsageSlotCount(durationMinutes: number): number {
  return durationMinutes / SLOT_UNIT_MINUTES;
}

export function isValidMinimalSlotRange(start: Date, end: Date): boolean {
  return (
    isAlignedToSlotBoundary(start) &&
    isAlignedToSlotBoundary(end) &&
    end.getTime() - start.getTime() === SLOT_UNIT_MS
  );
}

export function isValidBookingRange(
  start: Date,
  durationMinutes: number,
): boolean {
  return isAlignedToSlotBoundary(start) && isSupportedDuration(durationMinutes);
}

export function splitIntoSlotRanges(
  start: Date,
  end: Date,
): Array<{ start: Date; end: Date }> {
  const ranges: Array<{ start: Date; end: Date }> = [];

  for (
    let current = start.getTime();
    current < end.getTime();
    current += SLOT_UNIT_MS
  ) {
    ranges.push({
      start: new Date(current),
      end: new Date(current + SLOT_UNIT_MS),
    });
  }

  return ranges;
}
