import { DomainError } from "@mirai-yoho/shared/domain-error";
import { AggregateRoot } from "@/domain/shared/aggregate-root";

export interface PricePlanProps {
  organizationId: string;
  consultantId: string;
  pricePlanId: string;
  name: string;
  totalJPY: number;
  createdAt?: Date;
  updatedAt?: Date;
  archivedAt?: Date;
}

interface PricePlanCreateProps {
  organizationId: string;
  consultantId: string;
  pricePlanId: string;
  name: string;
  totalJPY: number;
}

function normalizePlanName(name: string): string {
  return name.trim().replace(/\s+/g, " ").toLowerCase();
}

function validateName(name: string): string {
  const normalizedName = name.trim().replace(/\s+/g, " ");
  if (!normalizedName) {
    throw new DomainError("INVALID_PRICE_PLAN_NAME", "Plan name is required");
  }
  if (normalizedName.length > 80) {
    throw new DomainError(
      "INVALID_PRICE_PLAN_NAME",
      "Plan name must be 80 characters or less",
    );
  }
  return normalizedName;
}

function validateTotalJPY(totalJPY: number): void {
  if (!Number.isInteger(totalJPY) || totalJPY < 0) {
    throw new DomainError(
      "INVALID_PRICE_PLAN_AMOUNT",
      "Plan amount must be a non-negative integer",
    );
  }
}

export function getPricePlanSignature(params: {
  name: string;
  totalJPY: number;
}): string {
  return `${normalizePlanName(params.name)}:${params.totalJPY}`;
}

export function createPricePlanSelectionId(params: {
  name: string;
  totalJPY: number;
}): string {
  return `signature:${encodeURIComponent(normalizePlanName(params.name))}:${params.totalJPY}`;
}

export function parsePricePlanSelectionId(
  selectionId: string,
): { normalizedName: string; totalJPY: number } | null {
  const matched = /^signature:(.+):(\d+)$/.exec(selectionId);
  if (!matched) return null;
  const totalJPY = Number(matched[2]);
  if (!Number.isInteger(totalJPY)) return null;
  try {
    return {
      normalizedName: decodeURIComponent(matched[1]),
      totalJPY,
    };
  } catch {
    return null;
  }
}

export class PricePlan extends AggregateRoot {
  private constructor(
    private readonly organizationId: string,
    private readonly consultantId: string,
    private readonly pricePlanId: string,
    private name: string,
    private readonly totalJPY: number,
    private readonly createdAt: Date,
    private updatedAt: Date,
    private archivedAt: Date | undefined,
  ) {
    super();
  }

  static create(props: PricePlanCreateProps): PricePlan {
    const now = new Date();
    validateTotalJPY(props.totalJPY);
    return new PricePlan(
      props.organizationId,
      props.consultantId,
      props.pricePlanId,
      validateName(props.name),
      props.totalJPY,
      now,
      now,
      undefined,
    );
  }

  static reconstruct(props: PricePlanProps): PricePlan {
    const createdAt = props.createdAt ?? new Date(0);
    return new PricePlan(
      props.organizationId,
      props.consultantId,
      props.pricePlanId,
      props.name,
      props.totalJPY,
      createdAt,
      props.updatedAt ?? createdAt,
      props.archivedAt,
    );
  }

  rename(name: string): void {
    this.name = validateName(name);
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

  getOrganizationId(): string {
    return this.organizationId;
  }

  getConsultantId(): string {
    return this.consultantId;
  }

  getPricePlanId(): string {
    return this.pricePlanId;
  }

  getName(): string {
    return this.name;
  }

  getNormalizedName(): string {
    return normalizePlanName(this.name);
  }

  getTotalJPY(): number {
    return this.totalJPY;
  }

  getSignature(): string {
    return getPricePlanSignature({
      name: this.name,
      totalJPY: this.totalJPY,
    });
  }

  getSelectionId(): string {
    return createPricePlanSelectionId({
      name: this.name,
      totalJPY: this.totalJPY,
    });
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
}
