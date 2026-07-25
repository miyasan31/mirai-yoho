import { DomainError } from "@mirai-yoho/shared/domain-error";
import { AggregateRoot } from "@/domain/shared/aggregate-root";

interface CustomerCreateProps {
  organizationId: string;
  customerId: string;
  name: string;
  email: string;
  phone: string;
  birthDate: string;
  userId?: string;
  guardianName?: string;
  guardianConsentedAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

interface CustomerProps
  extends Omit<CustomerCreateProps, "birthDate" | "createdAt" | "updatedAt"> {
  birthDate?: string;
  note?: string;
  withdrawnAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

export class Customer extends AggregateRoot {
  private constructor(
    private readonly organizationId: string,
    private readonly customerId: string,
    private name: string,
    private email: string,
    private phone: string,
    private birthDate: string | undefined,
    private note: string | undefined,
    private userId: string | undefined,
    private guardianName: string | undefined,
    private guardianConsentedAt: Date | undefined,
    private withdrawnAt: Date | undefined,
    private readonly createdAt: Date,
    private updatedAt: Date,
  ) {
    super();
  }

  static create(props: CustomerCreateProps): Customer {
    const now = new Date();
    return new Customer(
      props.organizationId,
      props.customerId,
      props.name,
      props.email,
      props.phone,
      props.birthDate,
      undefined,
      props.userId,
      props.guardianName,
      props.guardianConsentedAt,
      undefined,
      props.createdAt ?? now,
      props.updatedAt ?? now,
    );
  }

  static reconstruct(props: CustomerProps): Customer {
    const createdAt = props.createdAt ?? new Date(0);
    return new Customer(
      props.organizationId,
      props.customerId,
      props.name,
      props.email,
      props.phone,
      props.birthDate,
      props.note,
      props.userId,
      props.guardianName,
      props.guardianConsentedAt,
      props.withdrawnAt,
      createdAt,
      props.updatedAt ?? createdAt,
    );
  }

  updateInfo(props: {
    name: string;
    email: string;
    phone: string;
    birthDate: string;
    guardianName?: string;
    guardianConsentedAt?: Date;
  }): void {
    this.name = props.name;
    this.email = props.email;
    this.phone = props.phone;
    this.birthDate = props.birthDate;
    if (props.guardianName !== undefined) {
      this.guardianName = props.guardianName;
    }
    if (props.guardianConsentedAt !== undefined) {
      this.guardianConsentedAt = props.guardianConsentedAt;
    }
    this.updatedAt = new Date();
  }

  updateNote(note: string): void {
    this.note = note;
    this.updatedAt = new Date();
  }

  linkUser(userId: string): void {
    if (this.userId && this.userId !== userId) {
      throw new DomainError(
        "CUSTOMER_USER_MISMATCH",
        "Customer is already linked to a different user",
      );
    }
    this.userId = userId;
    this.updatedAt = new Date();
  }

  mask(now: Date): void {
    this.name = "（退会済み）";
    this.email = "";
    this.phone = "";
    this.birthDate = undefined;
    this.note = undefined;
    this.guardianName = undefined;
    this.guardianConsentedAt = undefined;
    this.withdrawnAt = now;
    this.updatedAt = now;
  }

  isWithdrawn(): boolean {
    return this.withdrawnAt !== undefined;
  }

  getCustomerId(): string {
    return this.customerId;
  }

  getOrganizationId(): string {
    return this.organizationId;
  }

  getUserId(): string | undefined {
    return this.userId;
  }

  getName(): string {
    return this.name;
  }

  getEmail(): string {
    return this.email;
  }

  getPhone(): string {
    return this.phone;
  }

  getBirthDate(): string | undefined {
    return this.birthDate;
  }

  getNote(): string | undefined {
    return this.note;
  }

  getGuardianName(): string | undefined {
    return this.guardianName;
  }

  getGuardianConsentedAt(): Date | undefined {
    return this.guardianConsentedAt;
  }

  getWithdrawnAt(): Date | undefined {
    return this.withdrawnAt;
  }

  getCreatedAt(): Date {
    return this.createdAt;
  }

  getUpdatedAt(): Date {
    return this.updatedAt;
  }
}
