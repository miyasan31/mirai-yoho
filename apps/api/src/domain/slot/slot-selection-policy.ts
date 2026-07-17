import { getSlotUnitMs } from "@mirai-yoho/shared/slot-availability";
import type { PricePlan } from "@/domain/price-plan/price-plan";
import type { Slot } from "@/domain/slot/slot";

export interface ContinuousSlotsCandidate {
  consultantId: string;
  usageSlots: Slot[];
  bufferSlots: Slot[];
  pricePlan: PricePlan;
}

interface ContinuousChainInput {
  consultantId: string;
  availableSlots: readonly Slot[];
  pricePlan: PricePlan;
}

interface SelectContinuousParams {
  candidates: readonly ContinuousChainInput[];
  requestedStartsAt: Date;
  usageSlotCount: number;
  bufferSlotCount: number;
  dailySlotsPerConsultant: ReadonlyMap<string, number>;
}

function findChain(
  slots: readonly Slot[],
  startsAt: Date,
  requiredCount: number,
): Slot[] | undefined {
  const slotUnitMs = getSlotUnitMs();
  const sorted = [...slots].sort(
    (a, b) =>
      a.getTimeRange().getStartsAt().getTime() -
      b.getTimeRange().getStartsAt().getTime(),
  );
  const startIndex = sorted.findIndex(
    (slot) =>
      slot.getTimeRange().getStartsAt().getTime() === startsAt.getTime(),
  );
  if (startIndex < 0) return undefined;
  const chain: Slot[] = [];
  for (let i = 0; i < requiredCount; i++) {
    const expected = startsAt.getTime() + i * slotUnitMs;
    const slot = sorted[startIndex + i];
    if (!slot) return undefined;
    if (slot.getTimeRange().getStartsAt().getTime() !== expected)
      return undefined;
    if (!slot.getIsAvailable()) return undefined;
    chain.push(slot);
  }
  return chain;
}

export const SlotSelectionPolicy = {
  selectContinuousSlotsByConsultantAvailability(
    params: SelectContinuousParams,
  ): ContinuousSlotsCandidate | undefined {
    const totalRequired = params.usageSlotCount + params.bufferSlotCount;
    const eligible: ContinuousSlotsCandidate[] = [];
    for (const candidate of params.candidates) {
      const chain = findChain(
        candidate.availableSlots,
        params.requestedStartsAt,
        totalRequired,
      );
      if (!chain) continue;
      eligible.push({
        consultantId: candidate.consultantId,
        usageSlots: chain.slice(0, params.usageSlotCount),
        bufferSlots: chain.slice(params.usageSlotCount),
        pricePlan: candidate.pricePlan,
      });
    }
    if (eligible.length === 0) return undefined;
    return eligible.sort((left, right) => {
      const leftCount =
        params.dailySlotsPerConsultant.get(left.consultantId) ??
        Number.MAX_SAFE_INTEGER;
      const rightCount =
        params.dailySlotsPerConsultant.get(right.consultantId) ??
        Number.MAX_SAFE_INTEGER;
      if (leftCount !== rightCount) return leftCount - rightCount;
      return left.consultantId.localeCompare(right.consultantId);
    })[0];
  },

  countAvailableSlotsByConsultant(slots: readonly Slot[]): Map<string, number> {
    const counts = new Map<string, number>();
    for (const slot of slots) {
      const consultantId = slot.getConsultantId();
      counts.set(consultantId, (counts.get(consultantId) ?? 0) + 1);
    }
    return counts;
  },
};
