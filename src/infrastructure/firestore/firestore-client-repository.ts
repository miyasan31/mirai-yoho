import { FieldPath } from "firebase-admin/firestore";
import type { Client } from "@/domain/client/client";
import { Client as ClientEntity } from "@/domain/client/client";
import type { IClientRepository } from "@/domain/client/client-repository";
import { db } from "@/infrastructure/firestore/firestore-client";
import { FIRESTORE_COLLECTIONS } from "@/infrastructure/firestore/firestore-collections";
import { chunkArray } from "@/lib/chunk-array";

const COLLECTION = FIRESTORE_COLLECTIONS.clients;
const FIRESTORE_IN_QUERY_CHUNK_SIZE = 10;

interface ClientDoc {
  organizationId: string;
  clientId: string;
  name: string;
  email: string;
  phone: string;
  memo?: string;
}

function toDomain(doc: ClientDoc): Client {
  return ClientEntity.reconstruct({
    organizationId: doc.organizationId,
    clientId: doc.clientId,
    name: doc.name,
    email: doc.email,
    phone: doc.phone,
    memo: doc.memo,
  });
}

function toFirestore(client: Client): ClientDoc {
  const memo = client.getMemo();
  return {
    organizationId: client.getOrganizationId(),
    clientId: client.getClientId(),
    name: client.getName(),
    email: client.getEmail(),
    phone: client.getPhone(),
    ...(memo !== undefined ? { memo } : {}),
  };
}

export class FirestoreClientRepository implements IClientRepository {
  async findById(
    organizationId: string,
    clientId: string,
  ): Promise<Client | null> {
    const doc = await db.collection(COLLECTION).doc(clientId).get();
    if (!doc.exists) return null;
    const client = toDomain(doc.data() as ClientDoc);
    return client.getOrganizationId() === organizationId ? client : null;
  }

  async findByEmail(
    organizationId: string,
    email: string,
  ): Promise<Client | null> {
    const snapshot = await db
      .collection(COLLECTION)
      .where("organizationId", "==", organizationId)
      .where("email", "==", email)
      .limit(1)
      .get();
    if (snapshot.empty) return null;
    return toDomain(snapshot.docs[0].data() as ClientDoc);
  }

  async findAll(organizationId: string): Promise<Client[]> {
    const snapshot = await db
      .collection(COLLECTION)
      .where("organizationId", "==", organizationId)
      .get();
    return snapshot.docs.map((doc) => toDomain(doc.data() as ClientDoc));
  }

  async save(client: Client): Promise<void> {
    await db
      .collection(COLLECTION)
      .doc(client.getClientId())
      .set(toFirestore(client));
  }

  async findByIds(
    organizationId: string,
    clientIds: string[],
  ): Promise<Client[]> {
    const uniqueClientIds = [...new Set(clientIds)];
    if (uniqueClientIds.length === 0) return [];

    const snapshots = await Promise.all(
      chunkArray(uniqueClientIds, FIRESTORE_IN_QUERY_CHUNK_SIZE).map((ids) =>
        db
          .collection(COLLECTION)
          .where(FieldPath.documentId(), "in", ids)
          .get(),
      ),
    );

    const clientById = new Map<string, Client>();
    for (const snapshot of snapshots) {
      for (const doc of snapshot.docs) {
        const client = toDomain(doc.data() as ClientDoc);
        if (client.getOrganizationId() !== organizationId) continue;
        clientById.set(client.getClientId(), client);
      }
    }

    return uniqueClientIds
      .map((clientId) => clientById.get(clientId))
      .filter((client): client is Client => client !== undefined);
  }
}
