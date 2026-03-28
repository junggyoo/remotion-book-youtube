import { describe, it, expect } from "vitest";
import { scoreAllFamilies, scoreFamilies } from "../familyScorer";
import type { ScorerInput } from "../familyScorer";
import type { SceneFamily } from "@/direction/types";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function baseInput(overrides: Partial<ScorerInput> = {}): ScorerInput {
  return {
    sceneType: "keyInsight",
    usedFamilies: [],
    ...overrides,
  };
}

// ─── typeMatch ────────────────────────────────────────────────────────────────

describe("calcTypeMatch — via scoreAllFamilies", () => {
  it("1. keyInsight → concept-introduction gets highest typeMatch (1.0)", () => {
    const results = scoreAllFamilies(baseInput({ sceneType: "keyInsight" }));
    const ci = results.find((r) => r.family === "concept-introduction")!;
    expect(ci.breakdown.typeMatch).toBe(1.0);
  });

  it("keyInsight: all other families have typeMatch = 0", () => {
    const results = scoreAllFamilies(baseInput({ sceneType: "keyInsight" }));
    const others = results.filter((r) => r.family !== "concept-introduction");
    others.forEach((r) => expect(r.breakdown.typeMatch).toBe(0.0));
  });

  it("2. framework without bookStructure → mechanism-explanation gets typeMatch 1.0", () => {
    const results = scoreAllFamilies(baseInput({ sceneType: "framework" }));
    const me = results.find((r) => r.family === "mechanism-explanation")!;
    expect(me.breakdown.typeMatch).toBe(1.0);
  });

  it("2b. framework without bookStructure → system-model has typeMatch 0.0", () => {
    const results = scoreAllFamilies(baseInput({ sceneType: "framework" }));
    const sm = results.find((r) => r.family === "system-model")!;
    expect(sm.breakdown.typeMatch).toBe(0.0);
  });

  it("3. framework with bookStructure='framework' → system-model gets typeMatch 1.0", () => {
    const results = scoreAllFamilies(
      baseInput({ sceneType: "framework", bookStructure: "framework" }),
    );
    const sm = results.find((r) => r.family === "system-model")!;
    expect(sm.breakdown.typeMatch).toBe(1.0);
  });

  it("3b. framework with bookStructure='framework' → mechanism-explanation has typeMatch 0.0", () => {
    const results = scoreAllFamilies(
      baseInput({ sceneType: "framework", bookStructure: "framework" }),
    );
    const me = results.find((r) => r.family === "mechanism-explanation")!;
    expect(me.breakdown.typeMatch).toBe(0.0);
  });

  it("known scene types map correctly (cover → opening-hook)", () => {
    const results = scoreAllFamilies(baseInput({ sceneType: "cover" }));
    const oh = results.find((r) => r.family === "opening-hook")!;
    expect(oh.breakdown.typeMatch).toBe(1.0);
  });

  it("compareContrast → tension-comparison typeMatch 1.0", () => {
    const results = scoreAllFamilies(
      baseInput({ sceneType: "compareContrast" }),
    );
    const tc = results.find((r) => r.family === "tension-comparison")!;
    expect(tc.breakdown.typeMatch).toBe(1.0);
  });

  it("closing → closing-synthesis typeMatch 1.0", () => {
    const results = scoreAllFamilies(baseInput({ sceneType: "closing" }));
    const cs = results.find((r) => r.family === "closing-synthesis")!;
    expect(cs.breakdown.typeMatch).toBe(1.0);
  });
});

// ─── segmentFit ───────────────────────────────────────────────────────────────

describe("calcSegmentFit — via scoreAllFamilies", () => {
  it("4. requiredDelivery=['contrast', 'before-after'] → tension-comparison gets high segmentFit", () => {
    const results = scoreAllFamilies(
      baseInput({
        sceneType: "compareContrast",
        segment: {
          role: "core",
          durationRatio: 0.2,
          intent: "show contrast",
          requiredDelivery: ["contrast", "before-after"],
        },
      }),
    );
    const tc = results.find((r) => r.family === "tension-comparison")!;
    expect(tc.breakdown.segmentFit).toBe(1.0);
  });

  it("requiredDelivery=['framework', 'model'] → system-model gets high segmentFit", () => {
    const results = scoreAllFamilies(
      baseInput({
        sceneType: "keyInsight",
        segment: {
          role: "core",
          durationRatio: 0.2,
          intent: "explain framework",
          requiredDelivery: ["framework", "model"],
        },
      }),
    );
    const sm = results.find((r) => r.family === "system-model")!;
    expect(sm.breakdown.segmentFit).toBe(1.0);
  });

  it("8. no segment → all families get neutral segmentFit (0.5)", () => {
    const results = scoreAllFamilies(
      baseInput({ sceneType: "keyInsight", segment: undefined }),
    );
    results.forEach((r) => expect(r.breakdown.segmentFit).toBe(0.5));
  });

  it("partial delivery match → fractional segmentFit", () => {
    // tension-comparison capabilities: contrast, comparison, before-after, versus, transformation
    // requiredDelivery has 1 of 3 matching → 1/3
    const results = scoreAllFamilies(
      baseInput({
        sceneType: "compareContrast",
        segment: {
          role: "core",
          durationRatio: 0.2,
          intent: "compare",
          requiredDelivery: ["contrast", "insight", "summary"],
        },
      }),
    );
    const tc = results.find((r) => r.family === "tension-comparison")!;
    expect(tc.breakdown.segmentFit).toBeCloseTo(1 / 3, 5);
  });

  it("empty requiredDelivery → neutral segmentFit (0.5)", () => {
    const results = scoreAllFamilies(
      baseInput({
        sceneType: "keyInsight",
        segment: {
          role: "core",
          durationRatio: 0.2,
          intent: "explain",
          requiredDelivery: [],
        },
      }),
    );
    results.forEach((r) => expect(r.breakdown.segmentFit).toBe(0.5));
  });
});

// ─── artDirectionFit ──────────────────────────────────────────────────────────

describe("calcArtDirectionFit — via scoreAllFamilies", () => {
  it("5. layoutBias='asymmetric' → tension-comparison gets 0.8 artDirectionFit", () => {
    const results = scoreAllFamilies(
      baseInput({
        sceneType: "compareContrast",
        artDirection: { layoutBias: "asymmetric" },
      }),
    );
    const tc = results.find((r) => r.family === "tension-comparison")!;
    expect(tc.breakdown.artDirectionFit).toBe(0.8);
  });

  it("layoutBias='grid-heavy' → system-model and evidence-stack both get 0.8", () => {
    const results = scoreAllFamilies(
      baseInput({
        sceneType: "framework",
        artDirection: { layoutBias: "grid-heavy" },
      }),
    );
    const sm = results.find((r) => r.family === "system-model")!;
    const es = results.find((r) => r.family === "evidence-stack")!;
    expect(sm.breakdown.artDirectionFit).toBe(0.8);
    expect(es.breakdown.artDirectionFit).toBe(0.8);
  });

  it("layoutBias='flow' → progression-journey and mechanism-explanation get 0.8", () => {
    const results = scoreAllFamilies(
      baseInput({
        sceneType: "application",
        artDirection: { layoutBias: "flow" },
      }),
    );
    const pj = results.find((r) => r.family === "progression-journey")!;
    const me = results.find((r) => r.family === "mechanism-explanation")!;
    expect(pj.breakdown.artDirectionFit).toBe(0.8);
    expect(me.breakdown.artDirectionFit).toBe(0.8);
  });

  it("layoutBias='centered' → concept-introduction, reflective-anchor, closing-synthesis get 0.8", () => {
    const results = scoreAllFamilies(
      baseInput({
        sceneType: "keyInsight",
        artDirection: { layoutBias: "centered" },
      }),
    );
    const ci = results.find((r) => r.family === "concept-introduction")!;
    const ra = results.find((r) => r.family === "reflective-anchor")!;
    const cls = results.find((r) => r.family === "closing-synthesis")!;
    expect(ci.breakdown.artDirectionFit).toBe(0.8);
    expect(ra.breakdown.artDirectionFit).toBe(0.8);
    expect(cls.breakdown.artDirectionFit).toBe(0.8);
  });

  it("layoutBias='asymmetric' → non-boosted families get 0.4", () => {
    const results = scoreAllFamilies(
      baseInput({
        sceneType: "keyInsight",
        artDirection: { layoutBias: "asymmetric" },
      }),
    );
    const ci = results.find((r) => r.family === "concept-introduction")!;
    expect(ci.breakdown.artDirectionFit).toBe(0.4);
  });

  it("8. no artDirection → all families get neutral artDirectionFit (0.5)", () => {
    const results = scoreAllFamilies(
      baseInput({ sceneType: "keyInsight", artDirection: undefined }),
    );
    results.forEach((r) => expect(r.breakdown.artDirectionFit).toBe(0.5));
  });

  it("artDirection with no layoutBias → neutral (0.5)", () => {
    const results = scoreAllFamilies(
      baseInput({
        sceneType: "keyInsight",
        artDirection: { motionCharacter: "kinetic" },
      }),
    );
    results.forEach((r) => expect(r.breakdown.artDirectionFit).toBe(0.5));
  });
});

// ─── varietyBonus ─────────────────────────────────────────────────────────────

describe("calcVarietyBonus — via scoreAllFamilies", () => {
  it("unused family → varietyBonus 1.0", () => {
    const results = scoreAllFamilies(
      baseInput({ sceneType: "keyInsight", usedFamilies: [] }),
    );
    const ci = results.find((r) => r.family === "concept-introduction")!;
    expect(ci.breakdown.varietyBonus).toBe(1.0);
  });

  it("family used once → varietyBonus 0.9", () => {
    const results = scoreAllFamilies(
      baseInput({
        sceneType: "keyInsight",
        usedFamilies: ["concept-introduction"],
      }),
    );
    const ci = results.find((r) => r.family === "concept-introduction")!;
    expect(ci.breakdown.varietyBonus).toBe(0.9);
  });

  it("6. family used 2 times → soft penalty (varietyBonus 0.6)", () => {
    const results = scoreAllFamilies(
      baseInput({
        sceneType: "keyInsight",
        usedFamilies: ["concept-introduction", "concept-introduction"],
      }),
    );
    const ci = results.find((r) => r.family === "concept-introduction")!;
    expect(ci.breakdown.varietyBonus).toBe(0.6);
  });

  it("7. family used 3 times → strong penalty (varietyBonus 0.3)", () => {
    const results = scoreAllFamilies(
      baseInput({
        sceneType: "keyInsight",
        usedFamilies: [
          "concept-introduction",
          "concept-introduction",
          "concept-introduction",
        ],
      }),
    );
    const ci = results.find((r) => r.family === "concept-introduction")!;
    expect(ci.breakdown.varietyBonus).toBe(0.3);
  });

  it("7b. family used 4+ times → still strong penalty (varietyBonus 0.3)", () => {
    const results = scoreAllFamilies(
      baseInput({
        sceneType: "keyInsight",
        usedFamilies: [
          "concept-introduction",
          "concept-introduction",
          "concept-introduction",
          "concept-introduction",
        ],
      }),
    );
    const ci = results.find((r) => r.family === "concept-introduction")!;
    expect(ci.breakdown.varietyBonus).toBe(0.3);
  });

  it("variety penalty only affects the repeated family, not others", () => {
    const results = scoreAllFamilies(
      baseInput({
        sceneType: "keyInsight",
        usedFamilies: [
          "concept-introduction",
          "concept-introduction",
          "concept-introduction",
        ],
      }),
    );
    const tc = results.find((r) => r.family === "tension-comparison")!;
    expect(tc.breakdown.varietyBonus).toBe(1.0);
  });
});

// ─── scoreAllFamilies ─────────────────────────────────────────────────────────

describe("scoreAllFamilies", () => {
  it("9. returns sorted array (descending by score)", () => {
    const results = scoreAllFamilies(baseInput({ sceneType: "keyInsight" }));
    for (let i = 0; i < results.length - 1; i++) {
      expect(results[i].score).toBeGreaterThanOrEqual(results[i + 1].score);
    }
  });

  it("returns all 11 families", () => {
    const results = scoreAllFamilies(baseInput({ sceneType: "keyInsight" }));
    expect(results).toHaveLength(11);
  });

  it("all scores are between 0 and 1", () => {
    const results = scoreAllFamilies(baseInput({ sceneType: "keyInsight" }));
    results.forEach((r) => {
      expect(r.score).toBeGreaterThanOrEqual(0);
      expect(r.score).toBeLessThanOrEqual(1);
    });
  });

  it("every result has a non-empty reason string", () => {
    const results = scoreAllFamilies(baseInput({ sceneType: "keyInsight" }));
    results.forEach((r) => {
      expect(typeof r.reason).toBe("string");
      expect(r.reason.length).toBeGreaterThan(0);
    });
  });

  it("every result has the correct breakdown shape", () => {
    const results = scoreAllFamilies(baseInput({ sceneType: "keyInsight" }));
    results.forEach((r) => {
      expect(r.breakdown).toHaveProperty("typeMatch");
      expect(r.breakdown).toHaveProperty("segmentFit");
      expect(r.breakdown).toHaveProperty("artDirectionFit");
      expect(r.breakdown).toHaveProperty("varietyBonus");
    });
  });

  it("concept-introduction is ranked first for keyInsight with no other signals", () => {
    const results = scoreAllFamilies(baseInput({ sceneType: "keyInsight" }));
    expect(results[0].family).toBe("concept-introduction");
  });

  it("11. unknown sceneType → all typeMatch = 0, segmentFit decides ranking", () => {
    const results = scoreAllFamilies(
      baseInput({
        sceneType: "unknownType",
        segment: {
          role: "core",
          durationRatio: 0.2,
          intent: "show data",
          requiredDelivery: ["data", "evidence", "proof"],
        },
      }),
    );
    // All typeMatch should be 0
    results.forEach((r) => expect(r.breakdown.typeMatch).toBe(0.0));
    // evidence-stack should rank highly due to segmentFit
    const es = results.find((r) => r.family === "evidence-stack")!;
    expect(es.breakdown.segmentFit).toBe(1.0);
    expect(results[0].family).toBe("evidence-stack");
  });
});

// ─── scoreFamilies ────────────────────────────────────────────────────────────

describe("scoreFamilies", () => {
  it("10. returns top + 3 alternatives", () => {
    const { top, alternatives } = scoreFamilies(
      baseInput({ sceneType: "keyInsight" }),
    );
    expect(top).toBeDefined();
    expect(top.family).toBe("concept-introduction");
    expect(alternatives).toHaveLength(3);
  });

  it("top is always the highest scoring family", () => {
    const all = scoreAllFamilies(baseInput({ sceneType: "closing" }));
    const { top } = scoreFamilies(baseInput({ sceneType: "closing" }));
    expect(top.family).toBe(all[0].family);
    expect(top.score).toBe(all[0].score);
  });

  it("alternatives do not include the top family", () => {
    const { top, alternatives } = scoreFamilies(
      baseInput({ sceneType: "keyInsight" }),
    );
    alternatives.forEach((alt) => expect(alt.family).not.toBe(top.family));
  });

  it("alternatives are in descending score order", () => {
    const { alternatives } = scoreFamilies(
      baseInput({ sceneType: "keyInsight" }),
    );
    for (let i = 0; i < alternatives.length - 1; i++) {
      expect(alternatives[i].score).toBeGreaterThanOrEqual(
        alternatives[i + 1].score,
      );
    }
  });
});

// ─── score calculation integration ───────────────────────────────────────────

describe("score calculation — weighted combination", () => {
  it("score = typeMatch*0.3 + segmentFit*0.35 + artDirectionFit*0.2 + varietyBonus*0.15", () => {
    const results = scoreAllFamilies(
      baseInput({
        sceneType: "keyInsight",
        segment: {
          role: "core",
          durationRatio: 0.2,
          intent: "explain",
          requiredDelivery: ["explanation", "insight"],
        },
        artDirection: { layoutBias: "centered" },
        usedFamilies: [],
      }),
    );
    const ci = results.find((r) => r.family === "concept-introduction")!;
    const expected = 1.0 * 0.3 + 1.0 * 0.35 + 0.8 * 0.2 + 1.0 * 0.15;
    expect(ci.score).toBeCloseTo(expected, 10);
  });

  it("max possible score (all dimensions 1.0) is capped at 1.0", () => {
    // typeMatch=1, segmentFit=1, artDirectionFit=0.8 (max from boost), varietyBonus=1
    // 0.3 + 0.35 + 0.16 + 0.15 = 0.96 — confirm no score exceeds 1
    const results = scoreAllFamilies(
      baseInput({
        sceneType: "keyInsight",
        segment: {
          role: "core",
          durationRatio: 0.2,
          intent: "explain",
          requiredDelivery: ["explanation"],
        },
        artDirection: { layoutBias: "centered" },
        usedFamilies: [],
      }),
    );
    results.forEach((r) => expect(r.score).toBeLessThanOrEqual(1.0));
  });
});
