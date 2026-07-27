import { DomainError } from "@mirai-yoho/shared/domain-error";
import {
  type PolicyType,
  validatePolicyType,
} from "@/domain/policy/policy-type";
import { AggregateRoot } from "@/domain/shared/aggregate-root";

export type PolicyRevisionStatus = "draft" | "published" | "archived";

const VERSION_MAX_LENGTH = 40;
const TITLE_MAX_LENGTH = 120;
const BODY_MAX_LENGTH = 200_000;

export interface PolicyRevisionCreateProps {
  revisionId: string;
  organizationId: string;
  type: PolicyType | string;
  version: string;
  title: string;
  body: string;
  createdBy: string;
}

export interface PolicyRevisionReconstructProps {
  revisionId: string;
  organizationId: string;
  type: PolicyType | string;
  version: string;
  title: string;
  body: string;
  status: PolicyRevisionStatus;
  effectiveFrom: Date | null;
  publishedAt: Date | null;
  archivedAt: Date | null;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

function validateVersion(value: string): string {
  const normalized = value.trim();
  if (!normalized) {
    throw new DomainError(
      "INVALID_POLICY_VERSION",
      "Policy version is required",
    );
  }
  if (normalized.length > VERSION_MAX_LENGTH) {
    throw new DomainError(
      "INVALID_POLICY_VERSION",
      `Policy version must be ${VERSION_MAX_LENGTH} characters or less`,
    );
  }
  return normalized;
}

function validateTitle(value: string): string {
  const normalized = value.trim().replace(/\s+/g, " ");
  if (!normalized) {
    throw new DomainError("INVALID_POLICY_TITLE", "Policy title is required");
  }
  if (normalized.length > TITLE_MAX_LENGTH) {
    throw new DomainError(
      "INVALID_POLICY_TITLE",
      `Policy title must be ${TITLE_MAX_LENGTH} characters or less`,
    );
  }
  return normalized;
}

function validateBody(value: string): string {
  if (value.length > BODY_MAX_LENGTH) {
    throw new DomainError(
      "INVALID_POLICY_BODY",
      `Policy body must be ${BODY_MAX_LENGTH} characters or less`,
    );
  }
  return value;
}

function validateNonEmptyBody(value: string): string {
  const validated = validateBody(value);
  if (!validated.trim()) {
    throw new DomainError(
      "INVALID_POLICY_BODY",
      "Policy body is required for publishing",
    );
  }
  return validated;
}

function validateStatus(value: string): PolicyRevisionStatus {
  if (value !== "draft" && value !== "published" && value !== "archived") {
    throw new DomainError(
      "INVALID_POLICY_STATUS",
      `Unknown policy status: ${value}`,
    );
  }
  return value;
}

export class PolicyRevision extends AggregateRoot {
  private constructor(
    private readonly revisionId: string,
    private readonly organizationId: string,
    private readonly type: PolicyType,
    private version: string,
    private title: string,
    private body: string,
    private status: PolicyRevisionStatus,
    private effectiveFrom: Date | null,
    private publishedAt: Date | null,
    private archivedAt: Date | null,
    private readonly createdBy: string,
    private readonly createdAt: Date,
    private updatedAt: Date,
  ) {
    super();
  }

  static create(props: PolicyRevisionCreateProps): PolicyRevision {
    const now = new Date();
    return new PolicyRevision(
      props.revisionId,
      props.organizationId,
      validatePolicyType(props.type),
      validateVersion(props.version),
      validateTitle(props.title),
      validateBody(props.body),
      "draft",
      null,
      null,
      null,
      props.createdBy,
      now,
      now,
    );
  }

  static reconstruct(props: PolicyRevisionReconstructProps): PolicyRevision {
    return new PolicyRevision(
      props.revisionId,
      props.organizationId,
      validatePolicyType(props.type),
      validateVersion(props.version),
      validateTitle(props.title),
      validateBody(props.body),
      validateStatus(props.status),
      props.effectiveFrom,
      props.publishedAt,
      props.archivedAt,
      props.createdBy,
      props.createdAt,
      props.updatedAt,
    );
  }

  updateDraft(input: {
    version?: string;
    title?: string;
    body?: string;
  }): void {
    if (this.status !== "draft") {
      throw new DomainError(
        "POLICY_REVISION_NOT_DRAFT",
        "Only draft revisions can be updated",
      );
    }
    if (input.version !== undefined) {
      this.version = validateVersion(input.version);
    }
    if (input.title !== undefined) {
      this.title = validateTitle(input.title);
    }
    if (input.body !== undefined) {
      this.body = validateBody(input.body);
    }
    this.updatedAt = new Date();
  }

  publish(effectiveFrom: Date): void {
    if (this.status !== "draft") {
      throw new DomainError(
        "POLICY_REVISION_NOT_DRAFT",
        "Only draft revisions can be published",
      );
    }
    validateNonEmptyBody(this.body);
    const now = new Date();
    this.status = "published";
    this.effectiveFrom = effectiveFrom;
    this.publishedAt = now;
    this.updatedAt = now;
  }

  archive(): void {
    if (this.status === "archived") return;
    if (this.status === "draft") {
      throw new DomainError(
        "POLICY_REVISION_NOT_PUBLISHED",
        "Draft revisions cannot be archived; delete instead",
      );
    }
    const now = new Date();
    this.status = "archived";
    this.archivedAt = now;
    this.updatedAt = now;
  }

  isPublished(): boolean {
    return this.status === "published";
  }

  isEffectiveAt(when: Date): boolean {
    if (this.status !== "published") return false;
    if (!this.effectiveFrom) return false;
    return this.effectiveFrom.getTime() <= when.getTime();
  }

  getRevisionId(): string {
    return this.revisionId;
  }

  getOrganizationId(): string {
    return this.organizationId;
  }

  getType(): PolicyType {
    return this.type;
  }

  getVersion(): string {
    return this.version;
  }

  getTitle(): string {
    return this.title;
  }

  getBody(): string {
    return this.body;
  }

  getStatus(): PolicyRevisionStatus {
    return this.status;
  }

  getEffectiveFrom(): Date | null {
    return this.effectiveFrom;
  }

  getPublishedAt(): Date | null {
    return this.publishedAt;
  }

  getArchivedAt(): Date | null {
    return this.archivedAt;
  }

  getCreatedBy(): string {
    return this.createdBy;
  }

  getCreatedAt(): Date {
    return this.createdAt;
  }

  getUpdatedAt(): Date {
    return this.updatedAt;
  }
}
