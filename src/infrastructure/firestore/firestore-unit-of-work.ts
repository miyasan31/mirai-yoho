import type { IUnitOfWork } from "@/application/shared/iUnitOfWork";

export class FirestoreUnitOfWork implements IUnitOfWork {
  async runInTransaction(_fn: () => Promise<void>): Promise<void> {
    throw new Error("Not implemented");
  }
}
