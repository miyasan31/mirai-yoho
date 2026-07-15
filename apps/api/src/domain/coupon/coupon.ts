import { DomainError } from "@mirai-yoho/shared/domain-error";
import { AggregateRoot } from "@/domain/shared/aggregate-root";

export type CouponType = "welcome" | "birthday";

const COUPON_TYPES: readonly CouponType[] = ["welcome", "birthday"] as const;

const NAME_MAX_LENGTH = 80;
const DAY_IN_MS = 24 * 60 * 60 * 1000;

export interface CouponCreateProps {
  organizationId: string;
  couponId: string;
  type: CouponType;
  name: string;
  amountJPY: number;
  distributionCount: number;
  expiresInDays: number;
}

export interface CouponReconstructProps extends CouponCreateProps {
  createdAt: Date;
  updatedAt: Date;
  archivedAt?: Date;
}

function validateName(name: string): string {
  const normalized = name.trim().replace(/\s+/g, " ");
  if (!normalized) {
    throw new DomainError("INVALID_COUPON_NAME", "Coupon name is required");
  }
  if (normalized.length > NAME_MAX_LENGTH) {
    throw new DomainError(
      "INVALID_COUPON_NAME",
      `Coupon name must be ${NAME_MAX_LENGTH} characters or less`,
    );
  }
  return normalized;
}

function validateAmountJPY(amountJPY: number): void {
  if (!Number.isInteger(amountJPY) || amountJPY <= 0) {
    throw new DomainError(
      "INVALID_COUPON_AMOUNT",
      "Coupon amount must be a positive integer",
    );
  }
}

function validateDistributionCount(count: number): void {
  if (!Number.isInteger(count) || count <= 0) {
    throw new DomainError(
      "INVALID_COUPON_DISTRIBUTION_COUNT",
      "Distribution count must be a positive integer",
    );
  }
}

function validateExpiresInDays(days: number): void {
  if (!Number.isInteger(days) || days <= 0) {
    throw new DomainError(
      "INVALID_COUPON_EXPIRY",
      "expiresInDays must be a positive integer",
    );
  }
}

function validateType(type: string): CouponType {
  if (!COUPON_TYPES.includes(type as CouponType)) {
    throw new DomainError("INVALID_COUPON_TYPE", "Unknown coupon type");
  }
  return type as CouponType;
}

export class Coupon extends AggregateRoot {
  private constructor(
    private readonly organizationId: string,
    private readonly couponId: string,
    private readonly type: CouponType,
    private name: string,
    private amountJPY: number,
    private distributionCount: number,
    private readonly expiresInDays: number,
    private readonly createdAt: Date,
    private updatedAt: Date,
    private archivedAt: Date | undefined,
  ) {
    super();
  }

  static create(props: CouponCreateProps): Coupon {
    const now = new Date();
    const type = validateType(props.type);
    const name = validateName(props.name);
    validateAmountJPY(props.amountJPY);
    validateDistributionCount(props.distributionCount);
    validateExpiresInDays(props.expiresInDays);
    return new Coupon(
      props.organizationId,
      props.couponId,
      type,
      name,
      props.amountJPY,
      props.distributionCount,
      props.expiresInDays,
      now,
      now,
      undefined,
    );
  }

  static reconstruct(props: CouponReconstructProps): Coupon {
    return new Coupon(
      props.organizationId,
      props.couponId,
      validateType(props.type),
      props.name,
      props.amountJPY,
      props.distributionCount,
      props.expiresInDays,
      props.createdAt,
      props.updatedAt,
      props.archivedAt,
    );
  }

  rename(name: string): void {
    this.name = validateName(name);
    this.updatedAt = new Date();
  }

  updateAmount(amountJPY: number): void {
    validateAmountJPY(amountJPY);
    this.amountJPY = amountJPY;
    this.updatedAt = new Date();
  }

  updateDistributionCount(count: number): void {
    validateDistributionCount(count);
    this.distributionCount = count;
    this.updatedAt = new Date();
  }

  archive(): void {
    if (this.archivedAt) return;
    const now = new Date();
    this.archivedAt = now;
    this.updatedAt = now;
  }

  unarchive(): void {
    if (!this.archivedAt) return;
    this.archivedAt = undefined;
    this.updatedAt = new Date();
  }

  isActive(): boolean {
    return this.archivedAt === undefined;
  }

  calcExpiresAtFor(receivedAt: Date): Date {
    return new Date(receivedAt.getTime() + this.expiresInDays * DAY_IN_MS);
  }

  getOrganizationId(): string {
    return this.organizationId;
  }

  getCouponId(): string {
    return this.couponId;
  }

  getType(): CouponType {
    return this.type;
  }

  getName(): string {
    return this.name;
  }

  getAmountJPY(): number {
    return this.amountJPY;
  }

  getDistributionCount(): number {
    return this.distributionCount;
  }

  getExpiresInDays(): number {
    return this.expiresInDays;
  }

  getCreatedAt(): Date {
    return this.createdAt;
  }

  getUpdatedAt(): Date {
    return this.updatedAt;
  }

  getArchivedAt(): Date | undefined {
    return this.archivedAt;
  }

  isArchived(): boolean {
    return this.archivedAt !== undefined;
  }
}
