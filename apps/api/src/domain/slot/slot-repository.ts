import type { Slot } from "@/domain/slot/slot";

export interface ISlotRepository {
  findById(organizationId: string, slotId: string): Promise<Slot | null>;
  findByOrganizationId(organizationId: string): Promise<Slot[]>;
  findAllAvailable(organizationId: string): Promise<Slot[]>;
  findByConsultantId(
    organizationId: string,
    consultantId: string,
  ): Promise<Slot[]>;
  findAvailableByConsultantId(
    organizationId: string,
    consultantId: string,
  ): Promise<Slot[]>;
  findAvailableByTimeRange(
    organizationId: string,
    startsAt: Date,
    endsAt: Date,
  ): Promise<Slot[]>;
  findAvailableByDate(organizationId: string, date: Date): Promise<Slot[]>;
  delete(organizationId: string, slotId: string): Promise<void>;
  save(slot: Slot): Promise<void>;
}
