import type { TransactionScope } from "@/domain/shared/transaction-scope";
import type { Slot } from "@/domain/slot/slot";

export interface ISlotRepository {
  findById(organizationId: string, slotId: string): Promise<Slot | null>;
  findByIdsInTx(
    organizationId: string,
    slotIds: readonly string[],
    tx: TransactionScope,
  ): Promise<Slot[]>;
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
  findAvailableChainByConsultant(
    organizationId: string,
    consultantId: string,
    startsAt: Date,
    requiredCount: number,
  ): Promise<Slot[] | null>;
  delete(organizationId: string, slotId: string): Promise<void>;
  save(slot: Slot): Promise<void>;
  saveInTx(slot: Slot, tx: TransactionScope): Promise<void>;
}
