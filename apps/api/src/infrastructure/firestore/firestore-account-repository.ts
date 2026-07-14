import type { Timestamp } from "firebase-admin/firestore";
import { Account } from "@/domain/account/account";
import type { IAccountRepository } from "@/domain/account/account-repository";
import {
  type AccountStatus,
  isAccountStatus,
} from "@/domain/account/account-status";
import { FIRESTORE_COLLECTIONS } from "@/infrastructure/firestore/firestore-collections";
import { db } from "@/infrastructure/firestore/firestore-customer";

const COLLECTION = FIRESTORE_COLLECTIONS.accounts;

interface AccountDoc {
  organizationId: string;
  accountId: string;
  roleId: string;
  status: AccountStatus;
  name?: string | null;
  createdAt?: Timestamp | Date;
  updatedAt?: Timestamp | Date;
}

function toDate(value?: Timestamp | Date): Date {
  if (!value) return new Date(0);
  if (value instanceof Date) return value;
  return value.toDate();
}

function toDomain(doc: AccountDoc): Account {
  const createdAt = toDate(doc.createdAt);
  return Account.reconstruct({
    organizationId: doc.organizationId,
    accountId: doc.accountId,
    roleId: doc.roleId,
    status: isAccountStatus(doc.status) ? doc.status : "invited",
    name: doc.name ?? null,
    createdAt,
    updatedAt: toDate(doc.updatedAt) || createdAt,
  });
}

function toFirestore(account: Account): AccountDoc {
  return {
    organizationId: account.getOrganizationId(),
    accountId: account.getAccountId(),
    roleId: account.getRoleId(),
    status: account.getStatus(),
    name: account.getName(),
    createdAt: account.getCreatedAt(),
    updatedAt: account.getUpdatedAt(),
  };
}

export function getAccountDocId(
  organizationId: string,
  accountId: string,
): string {
  return `${organizationId}_${accountId}`;
}

export class FirestoreAccountRepository implements IAccountRepository {
  async findById(
    organizationId: string,
    accountId: string,
  ): Promise<Account | null> {
    const doc = await db
      .collection(COLLECTION)
      .doc(getAccountDocId(organizationId, accountId))
      .get();
    if (!doc.exists) return null;
    return toDomain(doc.data() as AccountDoc);
  }

  async findByOrganizationId(organizationId: string): Promise<Account[]> {
    const snapshot = await db
      .collection(COLLECTION)
      .where("organizationId", "==", organizationId)
      .get();
    return snapshot.docs.map((doc) => toDomain(doc.data() as AccountDoc));
  }

  async findByAccountId(accountId: string): Promise<Account[]> {
    const snapshot = await db
      .collection(COLLECTION)
      .where("accountId", "==", accountId)
      .get();
    return snapshot.docs.map((doc) => toDomain(doc.data() as AccountDoc));
  }

  async countByAccountId(accountId: string): Promise<number> {
    const snapshot = await db
      .collection(COLLECTION)
      .where("accountId", "==", accountId)
      .count()
      .get();
    return snapshot.data().count;
  }

  async save(account: Account): Promise<void> {
    await db
      .collection(COLLECTION)
      .doc(getAccountDocId(account.getOrganizationId(), account.getAccountId()))
      .set(toFirestore(account), { merge: true });
  }

  async saveAll(accounts: Account[]): Promise<void> {
    if (accounts.length === 0) return;
    const batch = db.batch();
    for (const account of accounts) {
      const ref = db
        .collection(COLLECTION)
        .doc(
          getAccountDocId(account.getOrganizationId(), account.getAccountId()),
        );
      batch.set(ref, toFirestore(account), { merge: true });
    }
    await batch.commit();
  }

  async delete(organizationId: string, accountId: string): Promise<void> {
    await db
      .collection(COLLECTION)
      .doc(getAccountDocId(organizationId, accountId))
      .delete();
  }
}
