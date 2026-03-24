import type { Slot } from "@/domain/slot/slot";

export interface ISlotRepository {
  findById(slotId: string): Promise<Slot | null>;
  findAvailableByConsultantId(consultantId: string): Promise<Slot[]>;
  save(slot: Slot): Promise<void>;
}
