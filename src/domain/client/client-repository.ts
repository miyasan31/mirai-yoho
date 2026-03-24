import type { Client } from "@/domain/client/client";

export interface IClientRepository {
  findById(clientId: string): Promise<Client | null>;
  findByEmail(email: string): Promise<Client | null>;
  findAll(): Promise<Client[]>;
  save(client: Client): Promise<void>;
}
