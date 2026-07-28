import { DomainError } from "@mirai-yoho/shared/domain-error";

/** JST の UTC からのオフセット（時間） */
const JST_OFFSET_HOURS = 9;

const MONTH_PATTERN = /^(\d{4})-(\d{2})$/;

export interface SettlementPeriod {
  /** 対象月（YYYY-MM） */
  month: string;
  /** JST の月初 00:00 に対応する UTC 時刻（含む） */
  startsAt: Date;
  /** JST の翌月初 00:00 に対応する UTC 時刻（含まない） */
  endsAt: Date;
}

/**
 * "YYYY-MM" を JST 基準の月初〜翌月初の期間に変換する。
 * サーバーのタイムゾーンに依存しないよう UTC の絶対時刻で組み立てる。
 */
export function resolveSettlementPeriod(month: string): SettlementPeriod {
  const matched = MONTH_PATTERN.exec(month);
  if (!matched) {
    throw new DomainError(
      "INVALID_SETTLEMENT_MONTH",
      "Settlement month must be in YYYY-MM format",
    );
  }

  const year = Number(matched[1]);
  const monthNumber = Number(matched[2]);
  if (monthNumber < 1 || monthNumber > 12) {
    throw new DomainError(
      "INVALID_SETTLEMENT_MONTH",
      "Settlement month must be between 01 and 12",
    );
  }

  const startsAt = new Date(
    Date.UTC(year, monthNumber - 1, 1, -JST_OFFSET_HOURS, 0, 0, 0),
  );
  const endsAt = new Date(
    Date.UTC(year, monthNumber, 1, -JST_OFFSET_HOURS, 0, 0, 0),
  );

  return { month, startsAt, endsAt };
}

/** 指定日時が期間内（startsAt 以上 endsAt 未満）かどうか */
export function isWithinSettlementPeriod(
  period: SettlementPeriod,
  target: Date,
): boolean {
  const time = target.getTime();
  return time >= period.startsAt.getTime() && time < period.endsAt.getTime();
}
