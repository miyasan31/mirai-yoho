import type { Client } from "@/domain/client/client";

export interface IClientRepository {
  findById(organizationId: string, clientId: string): Promise<Client | null>;
  findByIds(organizationId: string, clientIds: string[]): Promise<Client[]>;
  findByEmail(organizationId: string, email: string): Promise<Client | null>;
  findAll(organizationId: string): Promise<Client[]>;
  save(client: Client): Promise<void>;
}
