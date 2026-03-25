import type { BlockedTime } from "@/domain/blocked-time/blocked-time";

export interface IBlockedTimeRepository {
  findByConsultantId(consultantId: string): Promise<BlockedTime[]>;
  save(blockedTime: BlockedTime): Promise<void>;
  delete(blockedTimeId: string): Promise<void>;
}
