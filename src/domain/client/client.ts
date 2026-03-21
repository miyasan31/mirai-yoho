import { AggregateRoot } from "@/domain/shared/aggregateRoot";

interface ClientCreateProps {
  clientId: string;
  name: string;
  email: string;
  phone: string;
}

interface ClientProps extends ClientCreateProps {
  memo?: string;
}

export class Client extends AggregateRoot {
  private constructor(
    private readonly clientId: string,
    private name: string,
    private email: string,
    private phone: string,
    private memo: string | undefined,
  ) {
    super();
  }

  static create(props: ClientCreateProps): Client {
    return new Client(props.clientId, props.name, props.email, props.phone, undefined);
  }

  static reconstruct(props: ClientProps): Client {
    return new Client(props.clientId, props.name, props.email, props.phone, props.memo);
  }

  updateInfo(props: { name: string; email: string; phone: string }): void {
    this.name = props.name;
    this.email = props.email;
    this.phone = props.phone;
  }

  updateMemo(memo: string): void {
    this.memo = memo;
  }

  getClientId(): string {
    return this.clientId;
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

  getMemo(): string | undefined {
    return this.memo;
  }
}
