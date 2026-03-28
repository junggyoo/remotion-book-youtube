import { describe, it, expect } from "vitest";
import { compileBeatTimeline } from "../BeatTimelineCompiler";
import type { SemanticPlan, SemanticUnit } from "../BeatSemanticAnalyzer";
import type { ResolvedBeatProfile } from "../BeatProfileResolver";
import { DIRECTION_PROFILES } from "../../profiles";

// ─── Test helpers ──────────────────────────────────────────

function makeUnit(overrides: Partial<SemanticUnit> = {}): SemanticUnit {
  return {
    text: overrides.text ?? "기본 텍스트입니다.",
    sentences: overrides.sentences ?? [overrides.text ?? "기본 텍스트입니다."],
    boundaryBefore: overrides.boundaryBefore ?? null,
    inferredRole: overrides.inferredRole ?? "anchor",
    semanticWeight: overrides.semanticWeight ?? 0.25,
    emotionalIntensity: overrides.emotionalIntensity ?? 0.3,
  };
}

function makePlan(
  units: Partial<SemanticUnit>[],
  overrides: Partial<SemanticPlan> = {},
): SemanticPlan {
  return {
    units: units.map(makeUnit),
    dominantPattern: overrides.dominantPattern ?? "uniform",
    overallIntensity: overrides.overallIntensity ?? 0.3,
  };
}

function makeResolved(
  overrides: Partial<ResolvedBeatProfile> = {},
): ResolvedBeatProfile {
  const unitCount = overrides.mergeMap?.length ?? 3;
  return {
    timingIntent: overrides.timingIntent ?? "even",
    emphasisStrategy: overrides.emphasisStrategy ?? "distributed",
    targetSegmentCount: overrides.targetSegmentCount ?? unitCount,
    mergeMap: overrides.mergeMap ?? [[0], [1], [2]],
  };
}

const direction = DIRECTION_PROFILES.analytical;

// ─── Tests ─────────────────────────────────────────────────

describe("BeatTimelineCompiler", () => {
  it("ratios sum to 1.0", () => {
    const plan = makePlan([
      { text: "첫 번째 문장입니다." },
      { text: "두 번째 문장입니다. 조금 더 길게 작성합니다." },
      { text: "세 번째 문장." },
    ]);
    const resolved = makeResolved({ mergeMap: [[0], [1], [2]] });

    const result = compileBeatTimeline(plan, resolved, direction);

    const ratioSum = result.segments.reduce(
      (s, seg) => s + (seg.endRatio - seg.startRatio),
      0,
    );
    expect(ratioSum).toBeCloseTo(1.0, 2);
  });

  it("minimum ratio enforced (no segment < 0.12)", () => {
    // One very short unit, two very long
    const plan = makePlan([
      { text: "짧다." },
      {
        text: "매우 긴 문장입니다. 이 문장은 정말로 아주아주아주아주아주 길게 작성되었습니다. 계속해서 더 길어질 수 있죠.",
      },
      {
        text: "또 다른 긴 문장입니다. 이것도 상당히 길게 작성되어 있어서 비율이 높을 것입니다.",
      },
    ]);
    const resolved = makeResolved({ mergeMap: [[0], [1], [2]] });

    const result = compileBeatTimeline(plan, resolved, direction);

    for (const seg of result.segments) {
      const ratio = seg.endRatio - seg.startRatio;
      expect(ratio).toBeGreaterThanOrEqual(0.12 - 0.001);
    }
  });

  it("maximum ratio enforced (no segment > 0.6)", () => {
    // One huge unit, two tiny
    const plan = makePlan([
      {
        text: "이 문장은 매우매우매우 길어서 전체의 대부분을 차지합니다. 정말로 긴 나레이션으로 여러 줄에 걸쳐 설명합니다. 추가 설명을 더 넣겠습니다.",
      },
      { text: "짧." },
      { text: "짧." },
    ]);
    const resolved = makeResolved({ mergeMap: [[0], [1], [2]] });

    const result = compileBeatTimeline(plan, resolved, direction);

    for (const seg of result.segments) {
      const ratio = seg.endRatio - seg.startRatio;
      expect(ratio).toBeLessThanOrEqual(0.6 + 0.001);
    }
  });

  it("startRatio/endRatio sequential: first=0, last=1, no gaps", () => {
    const plan = makePlan([
      { text: "첫 번째 유닛입니다." },
      { text: "두 번째 유닛입니다." },
      { text: "세 번째 유닛입니다." },
      { text: "네 번째 유닛입니다." },
    ]);
    const resolved = makeResolved({ mergeMap: [[0], [1], [2], [3]] });

    const result = compileBeatTimeline(plan, resolved, direction);
    const segs = result.segments;

    expect(segs[0].startRatio).toBeCloseTo(0.0, 5);
    expect(segs[segs.length - 1].endRatio).toBeCloseTo(1.0, 5);

    for (let i = 1; i < segs.length; i++) {
      expect(segs[i].startRatio).toBeCloseTo(segs[i - 1].endRatio, 5);
    }
  });

  it("front-loaded timing: first segment gets more time than proportional", () => {
    const plan = makePlan([
      { text: "동일한 길이의 문장입니다." },
      { text: "동일한 길이의 문장입니다." },
      { text: "동일한 길이의 문장입니다." },
    ]);
    const resolved = makeResolved({
      timingIntent: "front-loaded",
      mergeMap: [[0], [1], [2]],
    });

    const result = compileBeatTimeline(plan, resolved, direction);
    const firstRatio =
      result.segments[0].endRatio - result.segments[0].startRatio;
    const lastRatio =
      result.segments[2].endRatio - result.segments[2].startRatio;

    // First segment should be larger than last (equal text -> front-loaded bias)
    expect(firstRatio).toBeGreaterThan(lastRatio);
  });

  it("back-loaded timing: last segment gets more time than proportional", () => {
    const plan = makePlan([
      { text: "동일한 길이의 문장입니다." },
      { text: "동일한 길이의 문장입니다." },
      { text: "동일한 길이의 문장입니다." },
    ]);
    const resolved = makeResolved({
      timingIntent: "back-loaded",
      mergeMap: [[0], [1], [2]],
    });

    const result = compileBeatTimeline(plan, resolved, direction);
    const firstRatio =
      result.segments[0].endRatio - result.segments[0].startRatio;
    const lastRatio =
      result.segments[2].endRatio - result.segments[2].startRatio;

    expect(lastRatio).toBeGreaterThan(firstRatio);
  });

  it("climactic timing: highest-intensity segment gets more time", () => {
    const plan = makePlan([
      { text: "평범한 문장입니다.", emotionalIntensity: 0.2 },
      { text: "매우 강렬한 문장!", emotionalIntensity: 0.9 },
      { text: "또 평범합니다.", emotionalIntensity: 0.2 },
    ]);
    const resolved = makeResolved({
      timingIntent: "climactic",
      mergeMap: [[0], [1], [2]],
    });

    const result = compileBeatTimeline(plan, resolved, direction);
    const ratios = result.segments.map((s) => s.endRatio - s.startRatio);

    // Segment 1 (highest intensity) should have the largest ratio
    expect(ratios[1]).toBeGreaterThan(ratios[0]);
    expect(ratios[1]).toBeGreaterThan(ratios[2]);
  });

  it("single segment: returns one segment covering 0.0 to 1.0", () => {
    const plan = makePlan([{ text: "유일한 문장입니다." }]);
    const resolved = makeResolved({
      mergeMap: [[0]],
      targetSegmentCount: 1,
    });

    const result = compileBeatTimeline(plan, resolved, direction);

    expect(result.segments).toHaveLength(1);
    expect(result.segments[0].startRatio).toBeCloseTo(0.0, 5);
    expect(result.segments[0].endRatio).toBeCloseTo(1.0, 5);
  });

  it("emphasis targets extracted for text with numbers/English", () => {
    const plan = makePlan([
      { text: "무려 37배의 성과를 달성한 Atomic Habits 방법론입니다!" },
      { text: "두 번째 문장입니다." },
    ]);
    const resolved = makeResolved({ mergeMap: [[0], [1]] });

    const result = compileBeatTimeline(plan, resolved, direction);

    // First segment has "37배" and "Atomic", "Habits"
    expect(result.segments[0].emphasisTargets.length).toBeGreaterThan(0);
  });

  it("mergeMap applied correctly: 5 units with [[0,1],[2],[3,4]] produces 3 segments", () => {
    const plan = makePlan([
      { text: "첫 번째.", semanticWeight: 0.15 },
      { text: "두 번째.", semanticWeight: 0.15 },
      { text: "세 번째.", semanticWeight: 0.3 },
      { text: "네 번째.", semanticWeight: 0.2 },
      { text: "다섯 번째.", semanticWeight: 0.2 },
    ]);
    const resolved = makeResolved({
      mergeMap: [[0, 1], [2], [3, 4]],
      targetSegmentCount: 3,
    });

    const result = compileBeatTimeline(plan, resolved, direction);

    expect(result.segments).toHaveLength(3);
    // First segment should have merged text
    expect(result.segments[0].narrationText).toContain("첫 번째.");
    expect(result.segments[0].narrationText).toContain("두 번째.");
    // Ratios still sum to 1.0
    const ratioSum = result.segments.reduce(
      (s, seg) => s + (seg.endRatio - seg.startRatio),
      0,
    );
    expect(ratioSum).toBeCloseTo(1.0, 2);
  });
});
