import { describe, it, expect } from "vitest";
import {
  splitKoreanSentences,
  gradeBoundary,
  extractEmphasisTargets,
} from "../koreanTextUtils";

describe("splitKoreanSentences", () => {
  it("splits basic Korean sentences by ending markers", () => {
    const text =
      "습관은 정체성에서 시작됩니다. 행동이 아니라 믿음이 먼저입니다.";
    const result = splitKoreanSentences(text);
    expect(result).toHaveLength(2);
    expect(result[0]).toBe("습관은 정체성에서 시작됩니다.");
    expect(result[1]).toBe("행동이 아니라 믿음이 먼저입니다.");
  });

  it("returns [text] for a single sentence without split points", () => {
    const text = "단일문장";
    const result = splitKoreanSentences(text);
    expect(result).toEqual(["단일문장"]);
  });

  it("splits on question marks", () => {
    const text = "왜 그럴까요? 이유를 알아봅시다.";
    const result = splitKoreanSentences(text);
    expect(result).toHaveLength(2);
  });

  it("handles empty string gracefully", () => {
    const result = splitKoreanSentences("");
    expect(result).toEqual([""]);
  });
});

describe("gradeBoundary", () => {
  it("identifies strong boundaries", () => {
    expect(gradeBoundary("하지만 실제로는 다릅니다")).toBe("strong");
    expect(gradeBoundary("결국 핵심은 이것입니다")).toBe("strong");
    expect(gradeBoundary("연구에 따르면 효과가 있습니다")).toBe("strong");
  });

  it("identifies medium boundaries", () => {
    expect(gradeBoundary("예를 들어 이런 경우가 있습니다")).toBe("medium");
    expect(gradeBoundary("특히 중요한 점은")).toBe("medium");
    expect(gradeBoundary("반대로 생각해보면")).toBe("medium");
  });

  it("identifies weak boundaries for unmarked sentences", () => {
    expect(gradeBoundary("이것은 일반적인 문장입니다")).toBe("weak");
    expect(gradeBoundary("습관의 힘은 강력합니다")).toBe("weak");
  });

  it("handles leading whitespace", () => {
    expect(gradeBoundary("  하지만 그렇지 않습니다")).toBe("strong");
  });
});

describe("extractEmphasisTargets", () => {
  it("finds numbers with units", () => {
    const targets = extractEmphasisTargets("무려 37배의 차이가 있습니다");
    expect(targets).toContain("37배");
  });

  it("finds English terms (capitalized)", () => {
    const targets = extractEmphasisTargets(
      "James Clear가 제안한 Atomic Habits 방법론",
    );
    expect(targets).toContain("James");
    expect(targets).toContain("Clear");
    expect(targets).toContain("Atomic");
  });

  it("finds quoted strings", () => {
    const targets = extractEmphasisTargets(
      "그는 '변화는 정체성에서 시작된다'고 말했습니다",
    );
    expect(targets).toContain("변화는 정체성에서 시작된다");
  });

  it("respects maxCount limit", () => {
    const targets = extractEmphasisTargets(
      "100%, 200배, 300개, Four, Five, Six",
      2,
    );
    expect(targets.length).toBeLessThanOrEqual(2);
  });

  it("deduplicates targets", () => {
    const targets = extractEmphasisTargets("37배와 37배를 비교하면");
    const unique = new Set(targets);
    expect(targets.length).toBe(unique.size);
  });
});
