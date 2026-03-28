// ============================================================
// Unit tests for QA Auto-fix (P2-6b)
// ============================================================

import { describe, it, expect } from "vitest";
import { autoFixBlueprint, autoFixWithRetry } from "../autoFix";
import { runRenderQA, RenderFailureCode } from "../renderFailureCodes";
import { mockTheme } from "../../renderer/__tests__/testHelpers";
import type { SceneBlueprint, VCLElement } from "@/types";

// --- Helpers ---

function makeBlueprint(
  overrides: Partial<SceneBlueprint> & { elements?: VCLElement[] } = {},
): SceneBlueprint {
  return {
    id: "test-scene",
    intent: "test",
    origin: "synthesized",
    layout: "stack-center",
    elements: [],
    choreography: "stagger-children",
    motionPreset: "smooth",
    format: "longform",
    theme: mockTheme,
    from: 0,
    durationFrames: 150,
    mediaPlan: {
      narrationText: "Test narration",
      captionPlan: { maxCharsPerLine: 28, maxLines: 2, style: "bottom-center" },
      audioPlan: { bgm: null, sfx: [] },
      assetPlan: { images: [], icons: [] },
    },
    ...overrides,
  } as SceneBlueprint;
}

function makeHeadlineElement(
  text: string,
  tokenRef: string,
  id: string = "headline-1",
): VCLElement {
  return {
    id,
    type: "headline",
    props: { text, tokenRef },
    position: { x: 0, y: 0 },
    size: { width: "auto", height: "auto" },
  } as VCLElement;
}

// --- LAYOUT_WRAP_FAIL tests ---

describe("autoFix: LAYOUT_WRAP_FAIL", () => {
  it("steps down headline tokenRef when text exceeds contentColumnWidth", () => {
    // contentColumnWidth for longform = 760px
    // headlineL = 56px, Korean char = 56*0.85 = 47.6px per char
    // 760 / 47.6 ~ 16 chars to overflow
    const longKoreanText = "가나다라마바사아자차카타파하갈날달랄말발";
    const bp = makeBlueprint({
      elements: [makeHeadlineElement(longKoreanText, "typeScale.headlineL")],
    });

    const qa = runRenderQA(bp, "longform");
    const failCheck = qa.checks.find(
      (c) => c.code === RenderFailureCode.LAYOUT_WRAP_FAIL,
    );
    expect(failCheck?.passed).toBe(false);

    const result = autoFixBlueprint(bp, qa);
    expect(result.fixed).toBe(true);
    expect(result.appliedFixes.length).toBeGreaterThan(0);
    expect(result.appliedFixes[0]).toContain("LAYOUT_WRAP_FAIL");
    expect(result.appliedFixes[0]).toContain("typeScale.headlineM");

    // Verify the element was actually changed
    const fixedEl = result.blueprint.elements[0];
    expect(fixedEl.props.tokenRef).toBe("typeScale.headlineM");
  });

  it("steps down multiple levels if needed", () => {
    // Very long text that needs headlineS
    const veryLongKorean = "가".repeat(30);
    const bp = makeBlueprint({
      elements: [makeHeadlineElement(veryLongKorean, "typeScale.headlineXL")],
    });

    const qa = runRenderQA(bp, "longform");
    const result = autoFixBlueprint(bp, qa);

    expect(result.fixed).toBe(true);
    // Should have stepped down from XL
    const fixedRef = result.blueprint.elements[0].props.tokenRef;
    expect(fixedRef).not.toBe("typeScale.headlineXL");
  });

  it("does not modify headlines that already fit", () => {
    const shortText = "짧은 제목";
    const bp = makeBlueprint({
      elements: [makeHeadlineElement(shortText, "typeScale.headlineL")],
    });

    const qa = runRenderQA(bp, "longform");
    const result = autoFixBlueprint(bp, qa);

    expect(result.fixed).toBe(false);
    expect(result.appliedFixes).toHaveLength(0);
  });

  it("does not mutate the original blueprint", () => {
    const longKoreanText = "가나다라마바사아자차카타파하갈날달랄말발";
    const bp = makeBlueprint({
      elements: [makeHeadlineElement(longKoreanText, "typeScale.headlineL")],
    });

    const qa = runRenderQA(bp, "longform");
    autoFixBlueprint(bp, qa);

    // Original should be unchanged
    expect(bp.elements[0].props.tokenRef).toBe("typeScale.headlineL");
  });
});

// --- TRANSITION_TOO_LONG_WARN tests ---

describe("autoFix: TRANSITION_TOO_LONG_WARN", () => {
  it("swaps motionPreset when transition ratio exceeds threshold", () => {
    // dramatic preset maxDuration = 75f
    // With durationFrames = 200, ratio = 75/200 = 37.5% > 20%
    // 15% clamp = 30f -> snappy(24) fits
    const bp = makeBlueprint({
      motionPreset: "dramatic",
      durationFrames: 200,
    });

    const qa = runRenderQA(bp, "longform");
    const failCheck = qa.checks.find(
      (c) => c.code === RenderFailureCode.TRANSITION_TOO_LONG_WARN,
    );
    expect(failCheck?.passed).toBe(false);

    const result = autoFixBlueprint(bp, qa);
    expect(result.fixed).toBe(true);
    expect(result.appliedFixes[0]).toContain("TRANSITION_TOO_LONG_WARN");
    // Should switch to snappy (maxDuration=24, fits within 30f limit)
    expect(result.blueprint.motionPreset).toBe("snappy");
  });

  it("does not fix when no lighter preset fits", () => {
    // durationFrames = 50, 15% = 7.5f -> no preset has maxDuration <= 7
    const bp = makeBlueprint({
      motionPreset: "heavy",
      durationFrames: 50,
    });

    const qa = runRenderQA(bp, "longform");
    const result = autoFixBlueprint(bp, qa);

    // No preset fits within the clamp, so TRANSITION fix should not apply
    const transitionFix = result.appliedFixes.find((f) =>
      f.includes("TRANSITION_TOO_LONG_WARN"),
    );
    expect(transitionFix).toBeUndefined();
    expect(result.blueprint.motionPreset).toBe("heavy");
  });

  it("keeps gentle preset (interpolate) unchanged", () => {
    const bp = makeBlueprint({
      motionPreset: "gentle",
      durationFrames: 100,
    });

    const qa = runRenderQA(bp, "longform");
    const result = autoFixBlueprint(bp, qa);

    // gentle is interpolate type -- skipped by both check and fix
    const transitionFix = result.appliedFixes.find((f) =>
      f.includes("TRANSITION_TOO_LONG_WARN"),
    );
    expect(transitionFix).toBeUndefined();
  });
});

// --- Excluded codes ---

describe("autoFix: excluded codes", () => {
  it("does not attempt fix for TEXT_DENSITY_WARN", () => {
    // Create a blueprint with extremely dense text
    const denseElements: VCLElement[] = Array.from({ length: 20 }, (_, i) => ({
      id: `body-${i}`,
      type: "body-text" as const,
      props: {
        text: "가나다라마바사아자차카타파하갈날달랄말발살아잘찰칼탈팔할".repeat(
          3,
        ),
      },
      position: { x: 0, y: i * 40 },
      size: { width: "auto", height: "auto" },
    })) as VCLElement[];

    const bp = makeBlueprint({ elements: denseElements });
    const qa = runRenderQA(bp, "longform");

    const densityCheck = qa.checks.find(
      (c) => c.code === RenderFailureCode.TEXT_DENSITY_WARN,
    );
    // Only test auto-fix exclusion if the check actually fails
    if (densityCheck && !densityCheck.passed) {
      const result = autoFixBlueprint(bp, qa);
      expect(result.skippedCodes).toContain(
        RenderFailureCode.TEXT_DENSITY_WARN,
      );
      // No fixes should have been applied for TEXT_DENSITY_WARN
      const densityFix = result.appliedFixes.find((f) =>
        f.includes("TEXT_DENSITY"),
      );
      expect(densityFix).toBeUndefined();
    }
  });

  it("does not attempt fix for KINETIC_TEXT_OVERFLOW_FAIL", () => {
    const bp = makeBlueprint();
    const qa = runRenderQA(bp, "longform");

    // Manually inject a failing check
    qa.checks.push({
      code: RenderFailureCode.KINETIC_TEXT_OVERFLOW_FAIL,
      level: "BLOCKED",
      passed: false,
      message: "Simulated kinetic text overflow",
    });

    const result = autoFixBlueprint(bp, qa);
    expect(result.skippedCodes).toContain(
      RenderFailureCode.KINETIC_TEXT_OVERFLOW_FAIL,
    );
  });
});

// --- autoFixWithRetry ---

describe("autoFixWithRetry", () => {
  it("fixes LAYOUT_WRAP_FAIL in retry loop and passes re-validation", () => {
    const longKoreanText = "가나다라마바사아자차카타파하갈날달랄말발";
    const bp = makeBlueprint({
      elements: [makeHeadlineElement(longKoreanText, "typeScale.headlineL")],
    });

    const { blueprint, totalFixes, finalQA, attempts } = autoFixWithRetry(bp);

    expect(attempts).toBeGreaterThan(0);
    expect(totalFixes.length).toBeGreaterThan(0);
    // After fix, LAYOUT_WRAP_FAIL should pass
    const layoutCheck = finalQA.checks.find(
      (c) => c.code === RenderFailureCode.LAYOUT_WRAP_FAIL,
    );
    expect(layoutCheck?.passed).toBe(true);
    expect(blueprint.elements[0].props.tokenRef).not.toBe(
      "typeScale.headlineL",
    );
  });

  it("stops retrying when no more safe fixes are possible", () => {
    // Blueprint with only TEXT_DENSITY_WARN failure -- no safe fix
    const denseElements: VCLElement[] = Array.from({ length: 20 }, (_, i) => ({
      id: `body-${i}`,
      type: "body-text" as const,
      props: {
        text: "가나다라마바사아자차카타파하갈날달랄말발살아잘찰칼탈팔할".repeat(
          3,
        ),
      },
      position: { x: 0, y: i * 40 },
      size: { width: "auto", height: "auto" },
    })) as VCLElement[];

    const bp = makeBlueprint({ elements: denseElements });
    const { totalFixes, attempts } = autoFixWithRetry(bp);

    // Should not have applied any fixes
    expect(totalFixes).toHaveLength(0);
    expect(attempts).toBe(0);
  });
});
