import { AggregateRoot } from "@/domain/shared/aggregate-root";

interface ClientCreateProps {
  organizationId: string;
  clientId: string;
  name: string;
  email: string;
  phone: string;
  birthdate: string;
  createdAt?: Date;
  updatedAt?: Date;
}

interface ClientProps
  extends Omit<ClientCreateProps, "birthdate" | "createdAt" | "updatedAt"> {
  birthdate?: string;
  memo?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export class Client extends AggregateRoot {
  private constructor(
    private readonly organizationId: string,
    private readonly clientId: string,
    private name: string,
    private email: string,
    private phone: string,
    private birthdate: string | undefined,
    private memo: string | undefined,
    private readonly createdAt: Date,
    private updatedAt: Date,
  ) {
    super();
  }

  static create(props: ClientCreateProps): Client {
    const now = new Date();
    return new Client(
      props.organizationId,
      props.clientId,
      props.name,
      props.email,
      props.phone,
      props.birthdate,
      undefined,
      props.createdAt ?? now,
      props.updatedAt ?? now,
    );
  }

  static reconstruct(props: ClientProps): Client {
    const createdAt = props.createdAt ?? new Date(0);
    return new Client(
      props.organizationId,
      props.clientId,
      props.name,
      props.email,
      props.phone,
      props.birthdate,
      props.memo,
      createdAt,
      props.updatedAt ?? createdAt,
    );
  }

  updateInfo(props: {
    name: string;
    email: string;
    phone: string;
    birthdate: string;
  }): void {
    this.name = props.name;
    this.email = props.email;
    this.phone = props.phone;
    this.birthdate = props.birthdate;
    this.updatedAt = new Date();
  }

  updateMemo(memo: string): void {
    this.memo = memo;
    this.updatedAt = new Date();
  }

  getClientId(): string {
    return this.clientId;
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

  getBirthdate(): string | undefined {
    return this.birthdate;
  }

  getMemo(): string | undefined {
    return this.memo;
  }

  getCreatedAt(): Date {
    return this.createdAt;
  }

  getUpdatedAt(): Date {
    return this.updatedAt;
  }
}
