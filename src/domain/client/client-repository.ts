import type { Client } from "@/domain/client/client";

export interface IClientRepository {
  findById(organizationId: string, clientId: string): Promise<Client | null>;
  findByEmail(organizationId: string, email: string): Promise<Client | null>;
  findAll(organizationId: string): Promise<Client[]>;
  save(client: Client): Promise<void>;
}
