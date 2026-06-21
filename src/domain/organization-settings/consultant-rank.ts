import { DomainError } from "@/domain/shared/domain-error";

export interface ConsultantRankProps {
  rankId: string;
  name: string;
}

export const DEFAULT_CONSULTANT_RANK_ID = "standard";
export const MAX_CONSULTANT_RANKS = 5;

export function createDefaultConsultantRanks(): ConsultantRankProps[] {
  return [{ rankId: DEFAULT_CONSULTANT_RANK_ID, name: "標準" }];
}

export function validateConsultantRanks(
  ranks: ConsultantRankProps[],
  defaultRankId: string,
): ConsultantRankProps[] {
  if (ranks.length < 1) {
    throw new DomainError(
      "INVALID_CONSULTANT_RANKS",
      "At least one consultant rank is required",
    );
  }
  if (ranks.length > MAX_CONSULTANT_RANKS) {
    throw new DomainError(
      "INVALID_CONSULTANT_RANKS",
      "Consultant ranks must be 5 or fewer",
    );
  }

  const seenRankIds = new Set<string>();
  const normalizedRanks = ranks.map((rank) => {
    const rankId = rank.rankId.trim();
    const name = rank.name.trim();
    if (!rankId || !name) {
      throw new DomainError(
        "INVALID_CONSULTANT_RANKS",
        "Consultant rank id and name must not be empty",
      );
    }
    if (seenRankIds.has(rankId)) {
      throw new DomainError(
        "INVALID_CONSULTANT_RANKS",
        "Consultant rank ids must be unique",
      );
    }
    seenRankIds.add(rankId);
    return { rankId, name };
  });

  if (!seenRankIds.has(defaultRankId)) {
    throw new DomainError(
      "INVALID_DEFAULT_CONSULTANT_RANK",
      "Default consultant rank must exist in ranks",
    );
  }

  return normalizedRanks;
}
