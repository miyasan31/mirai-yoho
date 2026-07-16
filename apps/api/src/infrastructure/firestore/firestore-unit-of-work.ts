import type { IUnitOfWork } from "@/application/shared/unit-of-work";
import type { TransactionScope } from "@/domain/shared/transaction-scope";
import { db } from "@/infrastructure/firestore/firestore-customer";
import { FirestoreTransactionScope } from "@/infrastructure/firestore/firestore-transaction-scope";

export class FirestoreUnitOfWork implements IUnitOfWork {
  async runInTransaction<T>(
    fn: (tx: TransactionScope) => Promise<T>,
  ): Promise<T> {
    return await db.runTransaction(
      async (transaction) => fn(new FirestoreTransactionScope(transaction)),
      { maxAttempts: 1 },
    );
  }
}
