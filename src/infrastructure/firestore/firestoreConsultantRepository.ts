import type { Consultant } from "@/domain/consultant/consultant";
import type { IConsultantRepository } from "@/domain/consultant/iConsultantRepository";

export class FirestoreConsultantRepository implements IConsultantRepository {
  async findById(_consultantId: string): Promise<Consultant | null> {
    throw new Error("Not implemented");
  }

  async save(_consultant: Consultant): Promise<void> {
    throw new Error("Not implemented");
  }
}
