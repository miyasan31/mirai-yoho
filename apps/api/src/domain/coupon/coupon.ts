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
  /** 1 度の取得で 1 ユーザーがもらう枚数 */
  batchSize: number;
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

function validatePositiveInteger(value: number, field: string): void {
  if (!Number.isInteger(value) || value <= 0) {
    throw new DomainError(
      "INVALID_COUPON_QUANTITY",
      `${field} must be a positive integer`,
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
    private batchSize: number,
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
    validatePositiveInteger(props.amountJPY, "amountJPY");
    validatePositiveInteger(props.batchSize, "batchSize");
    validatePositiveInteger(props.expiresInDays, "expiresInDays");
    return new Coupon(
      props.organizationId,
      props.couponId,
      type,
      name,
      props.amountJPY,
      props.batchSize,
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
      props.batchSize,
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
    validatePositiveInteger(amountJPY, "amountJPY");
    this.amountJPY = amountJPY;
    this.updatedAt = new Date();
  }

  updateBatchSize(size: number): void {
    validatePositiveInteger(size, "batchSize");
    this.batchSize = size;
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

  getBatchSize(): number {
    return this.batchSize;
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
