import type { Timestamp } from "firebase-admin/firestore";
import { getAccountDocId } from "@/infrastructure/auth/load-auth-context";
import { FIRESTORE_COLLECTIONS } from "@/infrastructure/firestore/firestore-collections";
import { db } from "@/infrastructure/firestore/firestore-customer";

export const ACCOUNT_COLLECTION = FIRESTORE_COLLECTIONS.accounts;

export async function listAccounts(organizationId: string) {
  const snapshot = await db
    .collection(ACCOUNT_COLLECTION)
    .where("organizationId", "==", organizationId)
    .get();

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...(doc.data() as {
      authUid: string;
      organizationId: string;
      role: string;
      status: string;
      name?: string;
      createdAt?: Timestamp;
      updatedAt?: Timestamp;
    }),
  }));
}

export async function getAccount(
  organizationId: string,
  authUid: string,
): Promise<{
  authUid: string;
  organizationId: string;
  role: string;
  status: string;
} | null> {
  const docId = getAccountDocId(organizationId, authUid);
  const doc = await db.collection(ACCOUNT_COLLECTION).doc(docId).get();
  if (!doc.exists) return null;
  return doc.data() as {
    authUid: string;
    organizationId: string;
    role: string;
    status: string;
  };
}

export function isAdminPanelUserRole(role: unknown): role is string {
  return typeof role === "string" && role !== "consultant";
}
