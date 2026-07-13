import { DomainError } from "@mirai-yoho/shared/domain-error";

export interface ConsultantStatusProps {
  statusId: string;
  name: string;
}

export const DEFAULT_CONSULTANT_STATUS_ID = "standard";
export const MAX_CONSULTANT_STATUSES = 5;

export function createDefaultConsultantStatuses(): ConsultantStatusProps[] {
  return [{ statusId: DEFAULT_CONSULTANT_STATUS_ID, name: "標準" }];
}

export function validateConsultantStatuses(
  statuses: ConsultantStatusProps[],
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
    seenStatusIds.add(statusId);
    return { statusId, name };
  });

  if (!seenStatusIds.has(defaultStatusId)) {
    throw new DomainError(
      "INVALID_DEFAULT_CONSULTANT_STATUS",
      "Default consultant status must exist in statuses",
    );
  }

  return normalizedStatuses;
}
