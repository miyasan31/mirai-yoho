import type { Client } from "@/domain/client/client";
import type { IClientRepository } from "@/domain/client/iClientRepository";

export class FirestoreClientRepository implements IClientRepository {
  async findById(_clientId: string): Promise<Client | null> {
    throw new Error("Not implemented");
  }

  async save(_client: Client): Promise<void> {
    throw new Error("Not implemented");
  }
}
