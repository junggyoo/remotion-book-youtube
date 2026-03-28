import { describe, it, expect } from "vitest";
import type {
  ScoredFamily,
  InterpretationResult,
  InterpretationTrace,
  InterpretationContext,
  DirectionParamsDelta,
} from "../types";

describe("interpretation types", () => {
  it("ScoredFamily has required fields", () => {
    const sf: ScoredFamily = {
      family: "concept-introduction",
      score: 0.85,
      breakdown: {
        typeMatch: 0.3,
        segmentFit: 0.35,
        artDirectionFit: 0.1,
        varietyBonus: 0.1,
      },
      reason: "strong type match + segment fit",
    };
    expect(sf.score).toBe(0.85);
    expect(sf.breakdown.typeMatch).toBe(0.3);
  });

  it("InterpretationResult assembles correctly", () => {
    const result: InterpretationResult = {
      family: "tension-comparison",
      familyConfidence: 0.78,
      layoutHint: "split-compare",
      choreographyHint: "split-reveal",
      trace: {
        derivedFrom: ["segment:core-role", "artDirection:asymmetric-bias"],
        whyThisFamily: "compareContrast content with asymmetric art direction",
        alternativeChoices: [
          {
            family: "concept-introduction",
            score: 0.45,
            shortReason: "lower segment fit",
          },
        ],
        hintSources: ["layoutHint from artDirection.layoutBias"],
      },
    };
    expect(result.family).toBe("tension-comparison");
    expect(result.trace.alternativeChoices).toHaveLength(1);
  });

  it("InterpretationContext accepts partial data", () => {
    const ctx: InterpretationContext = {
      fingerprint: {
        genre: "psychology",
        structure: "framework",
        emotionalTone: ["reflective"],
      },
      usedFamilies: ["concept-introduction", "concept-introduction"],
    };
    expect(ctx.usedFamilies).toHaveLength(2);
    expect(ctx.segment).toBeUndefined();
  });

  it("DirectionParamsDelta is partial", () => {
    const delta: DirectionParamsDelta = { energy: 0.2, emphasisDensity: 0.15 };
    expect(delta.pacing).toBeUndefined();
    expect(delta.energy).toBe(0.2);
  });
});
