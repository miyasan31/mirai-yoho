import { AggregateRoot } from "@/domain/shared/aggregate-root";

interface OrganizationCreateProps {
  organizationId: string;
  name: string;
}

interface OrganizationReconstructProps {
  organizationId: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}

export class Organization extends AggregateRoot {
  private constructor(
    private readonly organizationId: string,
    private name: string,
    private readonly createdAt: Date,
    private updatedAt: Date,
  ) {
    super();
  }

  static create(props: OrganizationCreateProps): Organization {
    const now = new Date();
    return new Organization(props.organizationId, props.name, now, now);
  }

  static reconstruct(props: OrganizationReconstructProps): Organization {
    return new Organization(
      props.organizationId,
      props.name,
      props.createdAt,
      props.updatedAt,
    );
  }

  rename(name: string): void {
    this.name = name;
    this.updatedAt = new Date();
  }

  getOrganizationId(): string {
    return this.organizationId;
  }

  getName(): string {
    return this.name;
  }

  getCreatedAt(): Date {
    return this.createdAt;
  }

  getUpdatedAt(): Date {
    return this.updatedAt;
  }
}
