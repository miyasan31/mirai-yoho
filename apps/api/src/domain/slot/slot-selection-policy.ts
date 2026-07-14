import type { PricePlan } from "@/domain/price-plan/price-plan";
import type { Slot } from "@/domain/slot/slot";

export interface SlotCandidate {
  slot: Slot;
  pricePlan: PricePlan;
}

export const SlotSelectionPolicy = {
  selectByConsultantAvailability(
    candidates: readonly SlotCandidate[],
    dailySlotsPerConsultant: ReadonlyMap<string, number>,
  ): SlotCandidate | undefined {
    if (candidates.length === 0) {
      return undefined;
    }
    return [...candidates].sort((left, right) => {
      const leftCount =
        dailySlotsPerConsultant.get(left.slot.getConsultantId()) ??
        Number.MAX_SAFE_INTEGER;
      const rightCount =
        dailySlotsPerConsultant.get(right.slot.getConsultantId()) ??
        Number.MAX_SAFE_INTEGER;

      if (leftCount !== rightCount) {
        return leftCount - rightCount;
      }

      return left.slot
        .getConsultantId()
        .localeCompare(right.slot.getConsultantId());
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
