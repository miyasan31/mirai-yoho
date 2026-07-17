import type { TransactionScope } from "@/domain/shared/transaction-scope";

export interface IUnitOfWork {
  runInTransaction<T>(fn: (tx: TransactionScope) => Promise<T>): Promise<T>;
}
