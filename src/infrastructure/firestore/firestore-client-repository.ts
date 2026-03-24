import type { Client } from "@/domain/client/client";
import { Client as ClientEntity } from "@/domain/client/client";
import type { IClientRepository } from "@/domain/client/client-repository";
import { db } from "@/infrastructure/firestore/firestore-client";

const COLLECTION = "clients";

interface ClientDoc {
  clientId: string;
  name: string;
  email: string;
  phone: string;
  memo?: string;
}

function toDomain(doc: ClientDoc): Client {
  return ClientEntity.reconstruct({
    clientId: doc.clientId,
    name: doc.name,
    email: doc.email,
    phone: doc.phone,
    memo: doc.memo,
  });
}

function toFirestore(client: Client): ClientDoc {
  return {
    clientId: client.getClientId(),
    name: client.getName(),
    email: client.getEmail(),
    phone: client.getPhone(),
    memo: client.getMemo(),
  };
}

export class FirestoreClientRepository implements IClientRepository {
  async findById(clientId: string): Promise<Client | null> {
    const doc = await db.collection(COLLECTION).doc(clientId).get();
    if (!doc.exists) return null;
    return toDomain(doc.data() as ClientDoc);
  }

  async findByEmail(email: string): Promise<Client | null> {
    const snapshot = await db
      .collection(COLLECTION)
      .where("email", "==", email)
      .limit(1)
      .get();
    if (snapshot.empty) return null;
    return toDomain(snapshot.docs[0].data() as ClientDoc);
  }

  async findAll(): Promise<Client[]> {
    const snapshot = await db.collection(COLLECTION).get();
    return snapshot.docs.map((doc) => toDomain(doc.data() as ClientDoc));
  }

  async save(client: Client): Promise<void> {
    await db
      .collection(COLLECTION)
      .doc(client.getClientId())
      .set(toFirestore(client));
  }
}
