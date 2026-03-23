import type { Slot } from "@/domain/slot/slot";

export interface ISlotRepository {
  findById(slotId: string): Promise<Slot | null>;
  save(slot: Slot): Promise<void>;
}
