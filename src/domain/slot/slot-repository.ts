import type { Slot } from "@/domain/slot/slot";

export interface ISlotRepository {
  findById(slotId: string): Promise<Slot | null>;
  findAllAvailable(): Promise<Slot[]>;
  findByConsultantId(consultantId: string): Promise<Slot[]>;
  findAvailableByConsultantId(consultantId: string): Promise<Slot[]>;
  findAvailableByTimeRange(startAt: Date, endAt: Date): Promise<Slot[]>;
  findAvailableByDate(date: Date): Promise<Slot[]>;
  delete(slotId: string): Promise<void>;
  save(slot: Slot): Promise<void>;
}
