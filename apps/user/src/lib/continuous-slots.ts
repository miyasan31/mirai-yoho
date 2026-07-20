import {
  getBufferSlotCount,
  getSlotUnitMs,
  getUsageSlotCount,
} from "@mirai-yoho/shared/slot-availability";

export interface RawSlot {
  slotId?: string;
  startsAt: string;
  endsAt: string;
}

export interface StartCandidate {
  startsAt: string;
  minimumEndsAt: string;
}

export function collectBookableStartTimesForDuration(
  slots: readonly RawSlot[],
  durationMinutes: number,
): StartCandidate[] {
  if (slots.length === 0) return [];
  const slotUnitMs = getSlotUnitMs();
  const sorted = [...slots].sort(
    (a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime(),
  );
  const requiredSlotCount =
    getUsageSlotCount(durationMinutes) + getBufferSlotCount();
  const startTimes = sorted.map((s) => new Date(s.startsAt).getTime());
  const candidates: StartCandidate[] = [];

  for (let i = 0; i < sorted.length; i++) {
    let ok = true;
    for (let j = 0; j < requiredSlotCount; j++) {
      if (i + j >= sorted.length) {
        ok = false;
        break;
      }
      const expected = startTimes[i] + j * slotUnitMs;
      if (startTimes[i + j] !== expected) {
        ok = false;
        break;
      }
    }
    if (ok) {
      candidates.push({
        startsAt: sorted[i].startsAt,
        minimumEndsAt: new Date(
          startTimes[i] + durationMinutes * 60 * 1000,
        ).toISOString(),
      });
    }
  }

  return candidates;
}

export function isDurationAvailable(
  slots: readonly RawSlot[],
  startsAt: string,
  durationMinutes: number,
): boolean {
  const slotUnitMs = getSlotUnitMs();
  const requiredSlotCount =
    getUsageSlotCount(durationMinutes) + getBufferSlotCount();
  const sorted = [...slots].sort(
    (a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime(),
  );
  const startMs = new Date(startsAt).getTime();
  const startIndex = sorted.findIndex(
    (s) => new Date(s.startsAt).getTime() === startMs,
  );
  if (startIndex < 0) return false;
  for (let j = 0; j < requiredSlotCount; j++) {
    const expected = startMs + j * slotUnitMs;
    const slot = sorted[startIndex + j];
    if (!slot) return false;
    if (new Date(slot.startsAt).getTime() !== expected) return false;
  }
  return true;
}
