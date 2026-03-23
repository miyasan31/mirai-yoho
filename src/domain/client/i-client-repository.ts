import type { Client } from "@/domain/client/client";

export interface IClientRepository {
  findById(clientId: string): Promise<Client | null>;
  save(client: Client): Promise<void>;
}
