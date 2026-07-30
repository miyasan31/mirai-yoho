import type { ConsultantRatingSummaryDistributionItem } from "@mirai-yoho/api-client/schemas";

export const RATING_SCORES = [5, 4, 3, 2, 1] as const;
export type RatingScore = (typeof RATING_SCORES)[number];

export function formatAverageScore(average: number | null | undefined): string {
  return average == null ? "-" : average.toFixed(1);
}

/** allowHalf の星表示は 0.5 刻みなので丸める */
export function toHalfStep(average: number | null | undefined): number {
  return average == null ? 0 : Math.round(average * 2) / 2;
}

export interface ScoreDistributionRow {
  score: RatingScore;
  count: number;
  /** 0〜100。総数 0 のときは 0 */
  percentage: number;
}

/**
 * スコア分布を 5→1 の降順に正規化する。
 * API に欠けているスコアは count 0 で補完し、総数 0 でも 0 除算しない。
 */
export function toScoreDistributionRows(
  distribution: ConsultantRatingSummaryDistributionItem[] | undefined,
  totalCount: number,
): ScoreDistributionRow[] {
  const countByScore = new Map(
    (distribution ?? []).map((row) => [row.score, row.count]),
  );

  return RATING_SCORES.map((score) => {
    const count = countByScore.get(score) ?? 0;
    return {
      score,
      count,
      percentage: totalCount === 0 ? 0 : (count / totalCount) * 100,
    };
  });
}
