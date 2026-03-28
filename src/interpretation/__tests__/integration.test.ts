import { describe, it, expect } from "vitest";
import { interpretScene } from "../interpretScene";
import { adaptPresetToSceneSpec } from "@/direction/presetAdapter";
import type { InterpretationContext } from "../types";
import type { DirectionProfile, SceneFamily } from "@/direction/types";

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const analyticalDir: DirectionProfile = {
  name: "analytical",
  base: {
    pacing: 0.3,
    energy: 0.2,
    emphasisDensity: 0.4,
    holdRatio: 0.3,
    revealPattern: "sequential",
    transitionTension: 0.2,
    subtitleCadence: "steady",
  },
};

const composedFamilies: SceneFamily[] = [
  "concept-introduction",
  "system-model",
  "progression-journey",
  "closing-synthesis",
  "structural-bridge",
  "opening-hook",
  "reflective-anchor",
  "mechanism-explanation",
  "tension-comparison",
  "evidence-stack",
];

const minimalScene = (type: string, id = "scene-01") => ({
  id,
  type,
  narrationText: "이것은 테스트 나레이션 텍스트입니다.",
  content: {},
});

function baseContext(
  overrides: Partial<InterpretationContext> = {},
): InterpretationContext {
  return {
    fingerprint: {
      genre: "psychology",
      structure: "insight",
      emotionalTone: ["calm"],
    },
    usedFamilies: [],
    ...overrides,
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("A6 E2E integration — interpretScene + adaptPresetToSceneSpec", () => {
  it("1. psychology keyInsight → concept-introduction with analytical direction", () => {
    const context = baseContext();
    const interp = interpretScene("keyInsight", {}, context);

    expect(interp.family).toBe("concept-introduction");

    const spec = adaptPresetToSceneSpec(
      minimalScene("keyInsight"),
      analyticalDir,
      undefined,
      { composedFamilies, interpretation: interp },
    );

    expect(spec.family).toBe("concept-introduction");
    expect(spec.source).toBe("composed"); // concept-introduction is in composedFamilies
    expect(spec.interpretationMeta?.whyThisFamily).toContain(
      "concept-introduction",
    );
  });

  it("2. business keyInsight + snappy artDirection → pacing boost in directionOverrides", () => {
    const context = baseContext({
      fingerprint: {
        genre: "business",
        structure: "framework",
        emotionalTone: [],
      },
      artDirection: { motionCharacter: "snappy" },
    });
    const interp = interpretScene("keyInsight", {}, context);

    // snappy → pacing+0.15 delta
    expect(interp.directionOverrides?.pacing).toBeGreaterThan(0);

    const spec = adaptPresetToSceneSpec(
      minimalScene("keyInsight"),
      analyticalDir,
      undefined,
      { interpretation: interp },
    );
    // spec gets interpretation's family
    expect(spec.family).toBe(interp.family);
  });

  it("3. climax segment → energy/emphasis boost in directionOverrides", () => {
    const context = baseContext({
      segment: {
        role: "climax",
        durationRatio: 0.2,
        intent: "peak insight",
        requiredDelivery: ["insight"],
      },
    });
    const interp = interpretScene("keyInsight", {}, context);

    expect(interp.directionOverrides).toBeDefined();
    expect(interp.directionOverrides?.energy).toBeGreaterThan(0);
    expect(interp.directionOverrides?.emphasisDensity).toBeGreaterThan(0);
  });

  it("4. artDirection.layoutBias='asymmetric' → layout hint in SceneSpec", () => {
    const context = baseContext({
      artDirection: { layoutBias: "asymmetric" },
    });
    const interp = interpretScene("compareContrast", {}, context);

    // tension-comparison has no family-layout affinity, so artDirection bias applies
    // asymmetric → split-compare
    const spec = adaptPresetToSceneSpec(
      minimalScene("compareContrast"),
      analyticalDir,
      undefined,
      { interpretation: interp },
    );

    if (interp.layoutHint) {
      expect(spec.layout).toBe(interp.layoutHint);
      expect(spec.interpretationMeta?.derivedFrom).toContain(
        `layout:${interp.layoutHint}`,
      );
    } else {
      // No layout hint means preset layout used
      expect(spec.layout).toBe("split-compare");
    }
  });

  it("5. reflective-anchor gets quote-hold layout hint", () => {
    const context = baseContext();
    const interp = interpretScene("quote", {}, context);

    // quote → reflective-anchor → FAMILY_LAYOUT_AFFINITY → quote-hold
    expect(interp.family).toBe("reflective-anchor");
    expect(interp.layoutHint).toBe("quote-hold");

    const spec = adaptPresetToSceneSpec(
      minimalScene("quote"),
      analyticalDir,
      undefined,
      { interpretation: interp },
    );
    expect(spec.layout).toBe("quote-hold");
  });

  it("6. fallback case: unknown scene type with no context → valid family from bootstrap", () => {
    // With unknown type and heavy repetition, score may be >= or < threshold.
    // Either way, result must have a valid family and familyConfidence >= 0.
    const allFamilies = composedFamilies;
    const usedFamilies = [...allFamilies, ...allFamilies, ...allFamilies];
    const context = baseContext({ usedFamilies });
    const interp = interpretScene("completely-unknown-type", {}, context);

    expect(interp.family).toBeTruthy();
    expect(interp.familyConfidence).toBeGreaterThanOrEqual(0);

    // If it fell back, whyThisFamily explains
    if (interp.familyConfidence < 0.3) {
      expect(interp.trace.whyThisFamily).toContain("fallback to bootstrap");
    }
  });

  it("7. no interpretation provided → existing behavior unchanged (backward compat)", () => {
    const spec = adaptPresetToSceneSpec(
      minimalScene("keyInsight"),
      analyticalDir,
      undefined,
      undefined,
    );

    expect(spec.family).toBe("concept-introduction");
    expect(spec.layout).toBe("center-focus");
    expect(spec.choreography).toBe("reveal-sequence");
    expect(spec.source).toBe("preset");
    expect(spec.interpretationMeta?.derivedFrom).toContain("preset:keyInsight");
    expect(spec.interpretationMeta?.derivedFrom).toContain(
      "direction:analytical",
    );
  });

  it("8. interpretation + composedFamilies → source is 'composed'", () => {
    const context = baseContext();
    const interp = interpretScene("keyInsight", {}, context);
    // interp.family = concept-introduction, which is in composedFamilies

    const spec = adaptPresetToSceneSpec(
      minimalScene("keyInsight"),
      analyticalDir,
      undefined,
      { composedFamilies, interpretation: interp },
    );

    expect(spec.family).toBe(interp.family);
    expect(spec.source).toBe("composed");
  });

  it("8b. interpretation with family NOT in composedFamilies → source is 'preset'", () => {
    const context = baseContext({
      artDirection: { layoutBias: "flow" },
    });
    // transformation-shift is NOT in composedFamilies
    // We can't force a specific family easily, so just test the rule:
    // if interp.family is NOT in composedFamilies, source = preset
    const interp = interpretScene("keyInsight", {}, context);

    const smallComposedFamilies: SceneFamily[] = ["opening-hook"]; // concept-introduction NOT here
    const spec = adaptPresetToSceneSpec(
      minimalScene("keyInsight"),
      analyticalDir,
      undefined,
      { composedFamilies: smallComposedFamilies, interpretation: interp },
    );

    expect(spec.source).toBe("preset");
  });

  it("9. interpretationMeta.alternativeChoices populated", () => {
    const context = baseContext();
    const interp = interpretScene("keyInsight", {}, context);

    const spec = adaptPresetToSceneSpec(
      minimalScene("keyInsight"),
      analyticalDir,
      undefined,
      { interpretation: interp },
    );

    expect(spec.interpretationMeta?.alternativeChoices).toBeDefined();
    expect(spec.interpretationMeta!.alternativeChoices!.length).toBeGreaterThan(
      0,
    );

    const first = spec.interpretationMeta!.alternativeChoices![0];
    expect(first.family).toBeTruthy();
    expect(typeof first.score).toBe("number");
    expect(first.shortReason).toBeTruthy();
  });

  it("interpretationMeta.derivedFrom contains sceneType when interpretation provided", () => {
    const context = baseContext();
    const interp = interpretScene("keyInsight", {}, context);

    const spec = adaptPresetToSceneSpec(
      minimalScene("keyInsight"),
      analyticalDir,
      undefined,
      { interpretation: interp },
    );

    expect(spec.interpretationMeta?.derivedFrom).toContain(
      "sceneType:keyInsight",
    );
  });

  it("confidence reflects familyConfidence from interpretation", () => {
    const context = baseContext();
    const interp = interpretScene("keyInsight", {}, context);

    const spec = adaptPresetToSceneSpec(
      minimalScene("keyInsight"),
      analyticalDir,
      undefined,
      { interpretation: interp },
    );

    expect(spec.confidence).toBe(interp.familyConfidence);
  });

  it("without interpretation confidence is 1.0", () => {
    const spec = adaptPresetToSceneSpec(
      minimalScene("keyInsight"),
      analyticalDir,
    );
    expect(spec.confidence).toBe(1.0);
  });
});
