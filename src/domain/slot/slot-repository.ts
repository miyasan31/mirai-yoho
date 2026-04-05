import type { Slot } from "@/domain/slot/slot";

export interface ISlotRepository {
  findById(slotId: string): Promise<Slot | null>;
  findByConsultantId(consultantId: string): Promise<Slot[]>;
  findAvailableByConsultantId(consultantId: string): Promise<Slot[]>;
  delete(slotId: string): Promise<void>;
  save(slot: Slot): Promise<void>;
}
