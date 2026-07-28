import { describe, expect, it } from "vitest";
import {
  formatAverageScore,
  toHalfStep,
  toScoreDistributionRows,
} from "../rating-view-model";

describe("formatAverageScore", () => {
  it.each([
    [null, "-"],
    [undefined, "-"],
    [4, "4.0"],
    [4.25, "4.3"],
    [4.67, "4.7"],
    [5, "5.0"],
  ])("%p → %s", (average, expected) => {
    expect(formatAverageScore(average)).toBe(expected);
  });
});

describe("toHalfStep", () => {
  it.each([
    [null, 0],
    [undefined, 0],
    [4.2, 4],
    [4.3, 4.5],
    [4.7, 4.5],
    [4.8, 5],
  ])("%p → %p", (average, expected) => {
    expect(toHalfStep(average)).toBe(expected);
  });
});

describe("toScoreDistributionRows", () => {
  it("必ず 5→1 の降順で 5 行返す", () => {
    const rows = toScoreDistributionRows([], 0);
    expect(rows.map((r) => r.score)).toEqual([5, 4, 3, 2, 1]);
  });

  it("API に欠けているスコアを count 0 で補完する", () => {
    const rows = toScoreDistributionRows([{ score: 5, count: 2 }], 2);
    const byScore = new Map(rows.map((r) => [r.score, r]));
    expect(byScore.get(5)?.count).toBe(2);
    expect(byScore.get(3)?.count).toBe(0);
    expect(byScore.get(3)?.percentage).toBe(0);
  });

  it("distribution が undefined でも 5 行返す", () => {
    expect(toScoreDistributionRows(undefined, 0)).toHaveLength(5);
  });

  it("総数 0 のとき percentage は全て 0（0 除算しない）", () => {
    const rows = toScoreDistributionRows(
      [
        { score: 1, count: 0 },
        { score: 5, count: 0 },
      ],
      0,
    );
    expect(rows.every((r) => r.percentage === 0)).toBe(true);
  });

  it("percentage を総数に対する割合で算出する", () => {
    const rows = toScoreDistributionRows(
      [
        { score: 5, count: 3 },
        { score: 4, count: 1 },
      ],
      4,
    );
    const byScore = new Map(rows.map((r) => [r.score, r]));
    expect(byScore.get(5)?.percentage).toBe(75);
    expect(byScore.get(4)?.percentage).toBe(25);
  });
});
