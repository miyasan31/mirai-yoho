import { DomainError } from "@mirai-yoho/shared/domain-error";
import { AggregateRoot } from "@/domain/shared/aggregate-root";

export type CouponType = "welcome" | "birthday" | "general";

const COUPON_TYPES: readonly CouponType[] = [
  "welcome",
  "birthday",
  "general",
] as const;

const NAME_MAX_LENGTH = 80;
const DAY_IN_MS = 24 * 60 * 60 * 1000;

export interface CouponCreateProps {
  organizationId: string;
  couponId: string;
  type: CouponType;
  name: string;
  amountJPY: number;
  distributionCount: number;
  startsAt?: Date;
  expiresInDays?: number;
  expiresAt?: Date;
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

function validateType(type: string): CouponType {
  if (!COUPON_TYPES.includes(type as CouponType)) {
    throw new DomainError("INVALID_COUPON_TYPE", "Unknown coupon type");
  }
  return type as CouponType;
}

function validateExpirySettings(props: {
  type: CouponType;
  startsAt?: Date;
  expiresInDays?: number;
  expiresAt?: Date;
}): void {
  if (props.type === "welcome" || props.type === "birthday") {
    if (props.expiresInDays === undefined) {
      throw new DomainError(
        "INVALID_COUPON_EXPIRY",
        `${props.type} coupon requires expiresInDays`,
      );
    }
    if (!Number.isInteger(props.expiresInDays) || props.expiresInDays <= 0) {
      throw new DomainError(
        "INVALID_COUPON_EXPIRY",
        "expiresInDays must be a positive integer",
      );
    }
    if (props.expiresAt !== undefined) {
      throw new DomainError(
        "INVALID_COUPON_EXPIRY",
        `${props.type} coupon must not set expiresAt (use expiresInDays)`,
      );
    }
    if (props.startsAt !== undefined) {
      throw new DomainError(
        "INVALID_COUPON_EXPIRY",
        `${props.type} coupon must not set startsAt`,
      );
    }
    return;
  }
  if (props.expiresInDays !== undefined) {
    throw new DomainError(
      "INVALID_COUPON_EXPIRY",
      "general coupon must not set expiresInDays (use expiresAt)",
    );
  }
  if (
    props.startsAt &&
    props.expiresAt &&
    props.expiresAt.getTime() <= props.startsAt.getTime()
  ) {
    throw new DomainError(
      "INVALID_COUPON_EXPIRY",
      "expiresAt must be after startsAt",
    );
  }
}

export class Coupon extends AggregateRoot {
  private constructor(
    private readonly organizationId: string,
    private readonly couponId: string,
    private readonly type: CouponType,
    private name: string,
    private amountJPY: number,
    private distributionCount: number,
    private readonly startsAt: Date | undefined,
    private readonly expiresInDays: number | undefined,
    private readonly expiresAt: Date | undefined,
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
    validateExpirySettings({
      type,
      startsAt: props.startsAt,
      expiresInDays: props.expiresInDays,
      expiresAt: props.expiresAt,
    });
    return new Coupon(
      props.organizationId,
      props.couponId,
      type,
      name,
      props.amountJPY,
      props.distributionCount,
      props.startsAt,
      props.expiresInDays,
      props.expiresAt,
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
      props.startsAt,
      props.expiresInDays,
      props.expiresAt,
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

  isActive(now: Date): boolean {
    if (this.archivedAt) return false;
    if (this.startsAt && this.startsAt.getTime() > now.getTime()) return false;
    if (this.expiresAt && this.expiresAt.getTime() <= now.getTime())
      return false;
    return true;
  }

  calcExpiresAtFor(receivedAt: Date): Date | undefined {
    if (this.type === "welcome" || this.type === "birthday") {
      if (this.expiresInDays === undefined) return undefined;
      return new Date(receivedAt.getTime() + this.expiresInDays * DAY_IN_MS);
    }
    return this.expiresAt;
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

  getStartsAt(): Date | undefined {
    return this.startsAt;
  }

  getExpiresInDays(): number | undefined {
    return this.expiresInDays;
  }

  getExpiresAt(): Date | undefined {
    return this.expiresAt;
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
