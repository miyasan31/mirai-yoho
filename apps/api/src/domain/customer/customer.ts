import { AggregateRoot } from "@/domain/shared/aggregate-root";

interface CustomerCreateProps {
  organizationId: string;
  customerId: string;
  name: string;
  email: string;
  phone: string;
  birthDate: string;
  createdAt?: Date;
  updatedAt?: Date;
}

interface CustomerProps
  extends Omit<CustomerCreateProps, "birthDate" | "createdAt" | "updatedAt"> {
  birthDate?: string;
  note?: string;
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
      createdAt,
      props.updatedAt ?? createdAt,
    );
  }

  updateInfo(props: {
    name: string;
    email: string;
    phone: string;
    birthDate: string;
  }): void {
    this.name = props.name;
    this.email = props.email;
    this.phone = props.phone;
    this.birthDate = props.birthDate;
    this.updatedAt = new Date();
  }

  updateNote(note: string): void {
    this.note = note;
    this.updatedAt = new Date();
  }

  getCustomerId(): string {
    return this.customerId;
  }

  getOrganizationId(): string {
    return this.organizationId;
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

  getCreatedAt(): Date {
    return this.createdAt;
  }

  getUpdatedAt(): Date {
    return this.updatedAt;
  }
}
