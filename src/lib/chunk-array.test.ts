import { describe, expect, it } from "vitest";
import { chunkArray } from "@/lib/chunk-array";

describe("chunkArray", () => {
  it("splits an array by the given size", () => {
    expect(chunkArray([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
  });

  it("returns an empty array for empty input", () => {
    expect(chunkArray([], 3)).toEqual([]);
  });

  it("throws when size is invalid", () => {
    expect(() => chunkArray([1, 2], 0)).toThrow(
      "size must be a positive integer",
    );
    expect(() => chunkArray([1, 2], -1)).toThrow(
      "size must be a positive integer",
    );
  });
});
