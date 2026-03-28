import { describe, it, expect } from "vitest";
import { resolveBeatProfile } from "../BeatProfileResolver";
import type { ResolvedBeatProfile } from "../BeatProfileResolver";
import type { SemanticPlan, SemanticUnit } from "../BeatSemanticAnalyzer";
import type { DirectionProfile } from "../../types";
import { DIRECTION_PROFILES } from "../../profiles";

// ─── Helpers ────────────────────────────────────────────────

function makeUnit(overrides: Partial<SemanticUnit> = {}): SemanticUnit {
  return {
    text: "테스트 문장입니다.",
    sentences: ["테스트 문장입니다."],
    boundaryBefore: null,
    inferredRole: "anchor",
    semanticWeight: 0.25,
    emotionalIntensity: 0.3,
    ...overrides,
  };
}

function makePlan(
  unitCount: number,
  pattern: SemanticPlan["dominantPattern"] = "uniform",
  boundaries: SemanticUnit["boundaryBefore"][] = [],
): SemanticPlan {
  const units: SemanticUnit[] = [];
  for (let i = 0; i < unitCount; i++) {
    units.push(
      makeUnit({
        boundaryBefore: i === 0 ? null : (boundaries[i - 1] ?? "medium"),
        semanticWeight: 1 / unitCount,
      }),
    );
  }
  return {
    units,
    dominantPattern: pattern,
    overallIntensity: 0.4,
  };
}

function unknownDirection(): DirectionProfile {
  return {
    name: "unknown-style" as any,
    base: {
      pacing: 0.5,
      energy: 0.5,
      emphasisDensity: 0.5,
      holdRatio: 0.25,
      revealPattern: "sequential",
      transitionTension: 0.3,
      subtitleCadence: "steady",
    },
  };
}

// ─── Tests ──────────────────────────────────────────────────

describe("BeatProfileResolver", () => {
  describe("timingIntent matrix", () => {
    it("analytical + statement-evidence -> even", () => {
      const plan = makePlan(3, "statement-evidence");
      const result = resolveBeatProfile(plan, DIRECTION_PROFILES.analytical);
      expect(result.timingIntent).toBe("even");
    });

    it("persuasive + buildup-climax -> climactic", () => {
      const plan = makePlan(3, "buildup-climax");
      const result = resolveBeatProfile(plan, DIRECTION_PROFILES.persuasive);
      expect(result.timingIntent).toBe("climactic");
    });

    it("contemplative + contrast-resolve -> back-loaded", () => {
      const plan = makePlan(3, "contrast-resolve");
      const result = resolveBeatProfile(plan, DIRECTION_PROFILES.contemplative);
      expect(result.timingIntent).toBe("back-loaded");
    });

    it("urgent + uniform -> front-loaded", () => {
      const plan = makePlan(3, "uniform");
      const result = resolveBeatProfile(plan, DIRECTION_PROFILES.urgent);
      expect(result.timingIntent).toBe("front-loaded");
    });

    it("inspirational + buildup-climax -> climactic", () => {
      const plan = makePlan(3, "buildup-climax");
      const result = resolveBeatProfile(plan, DIRECTION_PROFILES.inspirational);
      expect(result.timingIntent).toBe("climactic");
    });

    it("investigative + question-answer -> back-loaded", () => {
      const plan = makePlan(3, "question-answer");
      const result = resolveBeatProfile(plan, DIRECTION_PROFILES.investigative);
      expect(result.timingIntent).toBe("back-loaded");
    });

    it("systematic + any pattern -> even", () => {
      const patterns: SemanticPlan["dominantPattern"][] = [
        "statement-evidence",
        "buildup-climax",
        "contrast-resolve",
        "question-answer",
        "uniform",
      ];
      for (const p of patterns) {
        const plan = makePlan(3, p);
        const result = resolveBeatProfile(plan, DIRECTION_PROFILES.systematic);
        expect(result.timingIntent).toBe("even");
      }
    });
  });

  describe("emphasisStrategy", () => {
    it("analytical -> single-peak", () => {
      const plan = makePlan(3);
      const result = resolveBeatProfile(plan, DIRECTION_PROFILES.analytical);
      expect(result.emphasisStrategy).toBe("single-peak");
    });

    it("persuasive -> escalating", () => {
      const plan = makePlan(3);
      const result = resolveBeatProfile(plan, DIRECTION_PROFILES.persuasive);
      expect(result.emphasisStrategy).toBe("escalating");
    });

    it("systematic -> distributed", () => {
      const plan = makePlan(3);
      const result = resolveBeatProfile(plan, DIRECTION_PROFILES.systematic);
      expect(result.emphasisStrategy).toBe("distributed");
    });

    it("contemplative -> single-peak", () => {
      const plan = makePlan(3);
      const result = resolveBeatProfile(plan, DIRECTION_PROFILES.contemplative);
      expect(result.emphasisStrategy).toBe("single-peak");
    });

    it("urgent -> escalating", () => {
      const plan = makePlan(3);
      const result = resolveBeatProfile(plan, DIRECTION_PROFILES.urgent);
      expect(result.emphasisStrategy).toBe("escalating");
    });
  });

  describe("targetSegmentCount", () => {
    it("contemplative with 5 units -> 3", () => {
      const plan = makePlan(5);
      const result = resolveBeatProfile(plan, DIRECTION_PROFILES.contemplative);
      expect(result.targetSegmentCount).toBe(3);
    });

    it("persuasive with 3 units -> 3 (not exceeding actual units)", () => {
      const plan = makePlan(3);
      const result = resolveBeatProfile(plan, DIRECTION_PROFILES.persuasive);
      expect(result.targetSegmentCount).toBe(3);
    });

    it("persuasive with 7 units -> 5 (capped)", () => {
      const plan = makePlan(7);
      const result = resolveBeatProfile(plan, DIRECTION_PROFILES.persuasive);
      expect(result.targetSegmentCount).toBe(5);
    });

    it("analytical with 2 units -> 2 (under cap)", () => {
      const plan = makePlan(2);
      const result = resolveBeatProfile(plan, DIRECTION_PROFILES.analytical);
      expect(result.targetSegmentCount).toBe(2);
    });

    it("analytical with 6 units -> 4 (capped)", () => {
      const plan = makePlan(6);
      const result = resolveBeatProfile(plan, DIRECTION_PROFILES.analytical);
      expect(result.targetSegmentCount).toBe(4);
    });
  });

  describe("mergeMap", () => {
    it("3 units, target 3 -> [[0],[1],[2]]", () => {
      const plan = makePlan(3);
      const result = resolveBeatProfile(plan, DIRECTION_PROFILES.persuasive);
      // persuasive max=5, 3 units -> target=3, no merging needed
      expect(result.mergeMap).toEqual([[0], [1], [2]]);
    });

    it("5 units, target 3 -> merges at weakest boundaries", () => {
      // boundaries: [strong, weak, strong, weak]
      const plan = makePlan(5, "uniform", ["strong", "weak", "strong", "weak"]);
      // contemplative max=3, so target=3
      const result = resolveBeatProfile(plan, DIRECTION_PROFILES.contemplative);
      expect(result.targetSegmentCount).toBe(3);
      expect(result.mergeMap.length).toBe(3);

      // Two weakest boundaries are at index 1 (weak) and index 3 (weak)
      // First merge: index 1 (weak, first found) -> units [1,2] merge
      // After: [[0], [1,2], [3], [4]], boundaries: [strong, strong, weak]
      // Second merge: index 2 (weak) -> units [3,4] merge
      // After: [[0], [1,2], [3,4]]
      expect(result.mergeMap).toEqual([[0], [1, 2], [3, 4]]);
    });

    it("4 units all medium boundaries, target 3 -> merges first weakest", () => {
      // All medium boundaries -> first one gets merged
      const plan = makePlan(4, "uniform", ["medium", "medium", "medium"]);
      const result = resolveBeatProfile(plan, DIRECTION_PROFILES.contemplative);
      expect(result.targetSegmentCount).toBe(3);
      expect(result.mergeMap.length).toBe(3);
      // All equal strength, first boundary gets merged
      expect(result.mergeMap).toEqual([[0, 1], [2], [3]]);
    });

    it("6 units with mixed boundaries, target 4", () => {
      // boundaries: [weak, strong, medium, weak, strong]
      const plan = makePlan(6, "uniform", [
        "weak",
        "strong",
        "medium",
        "weak",
        "strong",
      ]);
      const result = resolveBeatProfile(plan, DIRECTION_PROFILES.analytical);
      expect(result.targetSegmentCount).toBe(4);
      expect(result.mergeMap.length).toBe(4);
      // Two merges needed. Weakest boundaries: index 0 (weak) and index 3 (weak)
      // First merge at index 0: [[0,1], [2], [3], [4], [5]], boundaries: [strong, medium, weak, strong]
      // Second merge at index 2 (weak): [[0,1], [2], [3,4], [5]], boundaries: [strong, medium, strong]
      expect(result.mergeMap).toEqual([[0, 1], [2], [3, 4], [5]]);
    });
  });

  describe("single unit plan", () => {
    it("returns 1 segment with mergeMap [[0]]", () => {
      const plan = makePlan(1);
      const result = resolveBeatProfile(plan, DIRECTION_PROFILES.analytical);
      expect(result.targetSegmentCount).toBe(1);
      expect(result.mergeMap).toEqual([[0]]);
    });
  });

  describe("unknown direction fallback", () => {
    it("timingIntent defaults to even", () => {
      const plan = makePlan(3, "buildup-climax");
      const result = resolveBeatProfile(plan, unknownDirection());
      expect(result.timingIntent).toBe("even");
    });

    it("emphasisStrategy defaults to distributed", () => {
      const plan = makePlan(3);
      const result = resolveBeatProfile(plan, unknownDirection());
      expect(result.emphasisStrategy).toBe("distributed");
    });

    it("targetSegmentCount defaults to max 4", () => {
      const plan = makePlan(6);
      const result = resolveBeatProfile(plan, unknownDirection());
      expect(result.targetSegmentCount).toBe(4);
    });

    it("targetSegmentCount with 2 units -> 2 (under default cap)", () => {
      const plan = makePlan(2);
      const result = resolveBeatProfile(plan, unknownDirection());
      expect(result.targetSegmentCount).toBe(2);
    });
  });
});
