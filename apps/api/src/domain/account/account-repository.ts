import type { Account } from "@/domain/account/account";

export interface IAccountRepository {
  findById(organizationId: string, accountId: string): Promise<Account | null>;
  findByOrganizationId(organizationId: string): Promise<Account[]>;
  findByAccountId(accountId: string): Promise<Account[]>;
  countByAccountId(accountId: string): Promise<number>;
  save(account: Account): Promise<void>;
  saveAll(accounts: Account[]): Promise<void>;
  delete(organizationId: string, accountId: string): Promise<void>;
}
