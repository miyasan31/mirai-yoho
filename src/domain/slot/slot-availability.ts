const SLOT_UNIT_MINUTES = 30;
const SLOT_UNIT_MS = SLOT_UNIT_MINUTES * 60 * 1000;
const BOOKING_CUTOFF_MINUTES = 15;
const BOOKING_CUTOFF_MS = BOOKING_CUTOFF_MINUTES * 60 * 1000;

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

export function isValidSlotRange(start: Date, end: Date): boolean {
  return (
    isAlignedToSlotBoundary(start) &&
    isAlignedToSlotBoundary(end) &&
    end.getTime() - start.getTime() === SLOT_UNIT_MS
  );
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
