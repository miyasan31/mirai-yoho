import type { IUnitOfWork } from "@/application/shared/unit-of-work";

export class FirestoreUnitOfWork implements IUnitOfWork {
  async runInTransaction(_fn: () => Promise<void>): Promise<void> {
    throw new Error("Not implemented");
  }
}
