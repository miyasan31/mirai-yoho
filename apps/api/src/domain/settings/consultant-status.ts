import { DomainError } from "@mirai-yoho/shared/domain-error";

export interface ConsultantStatusProps {
  statusId: string;
  name: string;
  /** 精算時に借受金へ乗じるシステム利用料の料率（%） */
  settlementRatePercent: number;
}

/** 料率フィールド導入前に保存されたドキュメントも受け付けるための入力型 */
export type ConsultantStatusInput = Omit<
  ConsultantStatusProps,
  "settlementRatePercent"
> & {
  settlementRatePercent?: number;
};

export const DEFAULT_CONSULTANT_STATUS_ID = "standard";
export const MAX_CONSULTANT_STATUSES = 5;
export const DEFAULT_SETTLEMENT_RATE_PERCENT = 30;

export function createDefaultConsultantStatuses(): ConsultantStatusProps[] {
  return [
    {
      statusId: DEFAULT_CONSULTANT_STATUS_ID,
      name: "標準",
      settlementRatePercent: DEFAULT_SETTLEMENT_RATE_PERCENT,
    },
  ];
}

export function validateConsultantStatuses(
  statuses: ConsultantStatusInput[],
  defaultStatusId: string,
): ConsultantStatusProps[] {
  if (statuses.length < 1) {
    throw new DomainError(
      "INVALID_CONSULTANT_STATUSES",
      "At least one consultant status is required",
    );
  }
  if (statuses.length > MAX_CONSULTANT_STATUSES) {
    throw new DomainError(
      "INVALID_CONSULTANT_STATUSES",
      "Consultant statuses must be 5 or fewer",
    );
  }

  const seenStatusIds = new Set<string>();
  const normalizedStatuses = statuses.map((status) => {
    const statusId = status.statusId.trim();
    const name = status.name.trim();
    if (!statusId || !name) {
      throw new DomainError(
        "INVALID_CONSULTANT_STATUSES",
        "Consultant status id and name must not be empty",
      );
    }
    if (seenStatusIds.has(statusId)) {
      throw new DomainError(
        "INVALID_CONSULTANT_STATUSES",
        "Consultant status ids must be unique",
      );
    }
    // 料率を持たない移行前のドキュメントは既定値として扱う
    const settlementRatePercent =
      status.settlementRatePercent ?? DEFAULT_SETTLEMENT_RATE_PERCENT;
    if (!Number.isInteger(settlementRatePercent)) {
      throw new DomainError(
        "INVALID_CONSULTANT_STATUSES",
        "Consultant status settlement rate must be an integer",
      );
    }
    if (settlementRatePercent < 0 || settlementRatePercent > 100) {
      throw new DomainError(
        "INVALID_CONSULTANT_STATUSES",
        "Consultant status settlement rate must be between 0 and 100",
      );
    }
    seenStatusIds.add(statusId);
    return { statusId, name, settlementRatePercent };
  });

  if (!seenStatusIds.has(defaultStatusId)) {
    throw new DomainError(
      "INVALID_DEFAULT_CONSULTANT_STATUS",
      "Default consultant status must exist in statuses",
    );
  }

  if (!seenStatusIds.has(DEFAULT_CONSULTANT_STATUS_ID)) {
    throw new DomainError(
      "STANDARD_CONSULTANT_STATUS_REQUIRED",
      "Standard consultant status must not be removed",
    );
  }

  return normalizedStatuses;
}
