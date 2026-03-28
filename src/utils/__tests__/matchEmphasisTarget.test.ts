import { describe, it, expect } from "vitest";
import {
  matchEmphasisTarget,
  matchEmphasisTargetInChunk,
} from "../matchEmphasisTarget";

describe("matchEmphasisTarget (existing)", () => {
  it("matches substring for 2+ char target", () => {
    expect(matchEmphasisTarget("정체성은", ["정체성"])).toBe("정체성");
  });

  it("returns null for no match", () => {
    expect(matchEmphasisTarget("날씨", ["습관"])).toBeNull();
  });

  it("matches via normalized exact match", () => {
    expect(matchEmphasisTarget("습관을", ["습관"])).toBe("습관");
  });
});

describe("matchEmphasisTargetInChunk", () => {
  it("matches target within VTT chunk", () => {
    const result = matchEmphasisTargetInChunk("습관의 힘을 깨달았습니다", [
      "습관",
    ]);
    expect(result).not.toBeNull();
    expect(result?.matchedTarget).toBe("습관");
    expect(result?.spanStart).toBeDefined();
  });

  it("returns null when no target matches chunk", () => {
    const result = matchEmphasisTargetInChunk("오늘 날씨가 좋습니다", ["습관"]);
    expect(result).toBeNull();
  });

  it("matches with Korean particle variations", () => {
    // "습관은" contains "습관" as substring
    const result = matchEmphasisTargetInChunk("좋은 습관은 중요합니다", [
      "습관",
    ]);
    expect(result).not.toBeNull();
  });

  it("returns first match when multiple targets match", () => {
    const result = matchEmphasisTargetInChunk("습관과 정체성의 관계", [
      "습관",
      "정체성",
    ]);
    expect(result).not.toBeNull();
    expect(result?.matchedTarget).toBe("습관");
  });

  it("uses substring matching for 2+ char targets", () => {
    const result = matchEmphasisTargetInChunk("정체성을 바꾸세요", ["정체성"]);
    expect(result).not.toBeNull();
    expect(result?.spanStart).toBe(0);
    expect(result?.spanEnd).toBe(3);
  });

  it("returns correct span positions", () => {
    const result = matchEmphasisTargetInChunk("좋은 습관의 힘", ["습관"]);
    expect(result).not.toBeNull();
    expect(result?.spanStart).toBe(3);
    expect(result?.spanEnd).toBe(5);
  });

  it("returns null for empty chunk", () => {
    expect(matchEmphasisTargetInChunk("", ["습관"])).toBeNull();
  });

  it("returns null for empty targets", () => {
    expect(matchEmphasisTargetInChunk("습관의 힘", [])).toBeNull();
  });

  it("returns null for whitespace-only chunk", () => {
    expect(matchEmphasisTargetInChunk("   ", ["습관"])).toBeNull();
  });

  it("falls back to normalized token match when target has particle", () => {
    // Target "변화를" won't be a substring of chunk token "변화"
    // but normalizeToken("변화를") === normalizeToken("변화") === "변화"
    const result = matchEmphasisTargetInChunk("큰 변화 가져오다", ["변화를"]);
    expect(result).not.toBeNull();
    expect(result?.matchedTarget).toBe("변화를");
    expect(result?.spanStart).toBe(2); // "큰 " = 2 chars
    expect(result?.spanEnd).toBe(4); // "변화".length = 2, so 2+2=4
  });

  it("does not match 1-char target via substring (avoids false positives)", () => {
    // 1-char targets skip substring strategy; only exact normalized match works
    const result = matchEmphasisTargetInChunk("힘들다", ["힘"]);
    expect(result).toBeNull();
  });

  it("prioritizes target order, not position in chunk", () => {
    // "정체성" appears later in text, but is first in targets array
    const result = matchEmphasisTargetInChunk("습관과 정체성", [
      "정체성",
      "습관",
    ]);
    expect(result?.matchedTarget).toBe("정체성");
  });
});
