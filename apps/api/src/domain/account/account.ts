import { DomainError } from "@mirai-yoho/shared/domain-error";
import type { AccountStatus } from "@/domain/account/account-status";
import { AggregateRoot } from "@/domain/shared/aggregate-root";

interface AccountInviteProps {
  organizationId: string;
  accountId: string;
  roleId: string;
  name: string | null;
}

interface AccountReconstructProps {
  organizationId: string;
  accountId: string;
  roleId: string;
  status: AccountStatus;
  name: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export class Account extends AggregateRoot {
  private constructor(
    private readonly organizationId: string,
    private readonly accountId: string,
    private roleId: string,
    private status: AccountStatus,
    private name: string | null,
    private readonly createdAt: Date,
    private updatedAt: Date,
  ) {
    super();
  }

  static invite(props: AccountInviteProps): Account {
    const now = new Date();
    return new Account(
      props.organizationId,
      props.accountId,
      props.roleId,
      "invited",
      normalizeName(props.name),
      now,
      now,
    );
  }

  static reconstruct(props: AccountReconstructProps): Account {
    return new Account(
      props.organizationId,
      props.accountId,
      props.roleId,
      props.status,
      normalizeName(props.name),
      props.createdAt,
      props.updatedAt,
    );
  }

  activate(): void {
    if (this.status === "active") {
      throw new DomainError("ALREADY_ACTIVE", "Account is already active");
    }
    this.status = "active";
    this.updatedAt = new Date();
  }

  changeRole(roleId: string): void {
    this.roleId = roleId;
    this.updatedAt = new Date();
  }

  updateName(name: string | null): void {
    this.name = normalizeName(name);
    this.updatedAt = new Date();
  }

  getOrganizationId(): string {
    return this.organizationId;
  }

  getAccountId(): string {
    return this.accountId;
  }

  getRoleId(): string {
    return this.roleId;
  }

  getStatus(): AccountStatus {
    return this.status;
  }

  getName(): string | null {
    return this.name;
  }

  getCreatedAt(): Date {
    return this.createdAt;
  }

  getUpdatedAt(): Date {
    return this.updatedAt;
  }
}

function normalizeName(name: string | null): string | null {
  if (name === null) return null;
  const trimmed = name.trim();
  return trimmed.length === 0 ? null : trimmed;
}
