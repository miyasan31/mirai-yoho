import type { IUnitOfWork } from "@/application/shared/unit-of-work";
import { db } from "@/infrastructure/firestore/firestore-client";

export class FirestoreUnitOfWork implements IUnitOfWork {
  async runInTransaction(fn: () => Promise<void>): Promise<void> {
    await db.runTransaction(async () => {
      await fn();
    });
  }
}
