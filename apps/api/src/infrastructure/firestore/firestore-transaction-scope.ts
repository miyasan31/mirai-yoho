import type { Transaction } from "firebase-admin/firestore";
import type { TransactionScope } from "@/domain/shared/transaction-scope";

export class FirestoreTransactionScope implements TransactionScope {
  readonly __brand = "TransactionScope" as const;
  constructor(readonly transaction: Transaction) {}
}

export function toFirestoreTransaction(tx: TransactionScope): Transaction {
  const scope = tx as FirestoreTransactionScope;
  if (!scope.transaction) {
    throw new Error(
      "TransactionScope is not backed by a Firestore transaction",
    );
  }
  return scope.transaction;
}
