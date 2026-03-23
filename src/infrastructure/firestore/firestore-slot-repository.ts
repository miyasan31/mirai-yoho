import type { Slot } from "@/domain/slot/slot";
import type { ISlotRepository } from "@/domain/slot/slot-repository";

export class FirestoreSlotRepository implements ISlotRepository {
  async findById(_slotId: string): Promise<Slot | null> {
    throw new Error("Not implemented");
  }

  async save(_slot: Slot): Promise<void> {
    throw new Error("Not implemented");
  }
}
