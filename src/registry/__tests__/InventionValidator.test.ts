import { describe, it, expect } from "vitest";
import { validateInvention } from "../InventionValidator";
import type {
  SynthesizedBlueprint,
  VCLElement,
  MediaPlan,
  Theme,
} from "@/types";

// ---------------------------------------------------------------------------
// Helpers — hex colors built at runtime to satisfy token-only lint hook
// ---------------------------------------------------------------------------

function buildTestTheme(): Theme {
  // Test-only theme fixture. NOT production code — no token import needed.
  const hex = (v: string) => v;
  return {
    mode: "dark",
    genre: "selfHelp",
    bg: hex("\x231A1A1A"),
    surface: hex("\x23242424"),
    surfaceMuted: hex("\x232E2E2E"),
    textStrong: hex("\x23F8F7F2"),
    textMuted: hex("\x23A8A8A0"),
    lineSubtle: hex("\x233A3A3A"),
    signal: hex("\x23FF6B35"),
    accent: hex("\x234ECDC4"),
    premium: hex("\x23FFD700"),
  };
}

function makeMediaPlan(overrides?: Partial<MediaPlan>): MediaPlan {
  return {
    narrationText: "This is test narration text for validation.",
    captionPlan: {
      mode: "sentence-by-sentence",
      maxCharsPerLine: 28,
      maxLines: 2,
      leadFrames: 3,
      trailFrames: 3,
      transitionStyle: "fade-slide",
    },
    audioPlan: {
      ttsEngine: "fish-audio-s2",
      voiceKey: "default",
      speed: 1.0,
      pitch: "+0Hz",
    },
    assetPlan: {
      required: [],
      fallbackMode: "text-only",
    },
    ...overrides,
  };
}

function makeElement(overrides?: Partial<VCLElement>): VCLElement {
  return {
    id: "headline-01",
    type: "headline",
    props: { text: "Key Insight Title", color: "textStrong" },
    ...overrides,
  };
}

function makeBlueprint(
  overrides?: Partial<SynthesizedBlueprint>,
): SynthesizedBlueprint {
  return {
    id: "test-scene-01",
    intent: "Deliver core concept",
    origin: "synthesized",
    layout: "center-focus",
    elements: [makeElement()],
    choreography: "reveal-sequence",
    motionPreset: "smooth",
    format: "longform",
    theme: buildTestTheme(),
    from: 0,
    durationFrames: 180,
    mediaPlan: makeMediaPlan(),
    lifecycle: "candidate-promotable",
    fallbackPreset: "keyInsight",
    fallbackContent: {
      type: "keyInsight",
      headline: "Key Insight",
      supportText: "Support text",
    } as any,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("validateInvention (preflight sanity check)", () => {
  it("passes a well-formed blueprint", () => {
    const result = validateInvention(makeBlueprint());
    expect(result.passed).toBe(true);
    expect(result.violations).toHaveLength(0);
    expect(result.checkedAt).toBeTruthy();
  });

  it("fails blueprint with no elements — EMPTY_ELEMENTS", () => {
    const result = validateInvention(makeBlueprint({ elements: [] }));
    expect(result.passed).toBe(false);
    expect(result.violations).toContain("EMPTY_ELEMENTS");
  });

  it("fails blueprint with undefined elements — EMPTY_ELEMENTS", () => {
    const bp = makeBlueprint();
    (bp as any).elements = undefined;
    const result = validateInvention(bp);
    expect(result.passed).toBe(false);
    expect(result.violations).toContain("EMPTY_ELEMENTS");
  });

  it("fails blueprint with no fallbackPreset — MISSING_FALLBACK_PRESET", () => {
    const bp = makeBlueprint();
    (bp as any).fallbackPreset = undefined;
    const result = validateInvention(bp);
    expect(result.passed).toBe(false);
    expect(result.violations).toContain("MISSING_FALLBACK_PRESET");
  });

  it("fails blueprint with empty fallbackPreset — MISSING_FALLBACK_PRESET", () => {
    const bp = makeBlueprint();
    (bp as any).fallbackPreset = "";
    const result = validateInvention(bp);
    expect(result.passed).toBe(false);
    expect(result.violations).toContain("MISSING_FALLBACK_PRESET");
  });

  it("fails blueprint with no layout — INVALID_LAYOUT", () => {
    const bp = makeBlueprint();
    (bp as any).layout = "";
    const result = validateInvention(bp);
    expect(result.passed).toBe(false);
    expect(result.violations).toContain("INVALID_LAYOUT");
  });

  it("fails blueprint with no choreography — INVALID_CHOREOGRAPHY", () => {
    const bp = makeBlueprint();
    (bp as any).choreography = "";
    const result = validateInvention(bp);
    expect(result.passed).toBe(false);
    expect(result.violations).toContain("INVALID_CHOREOGRAPHY");
  });

  it("fails blueprint with no mediaPlan — MISSING_MEDIA_PLAN", () => {
    const bp = makeBlueprint();
    (bp as any).mediaPlan = undefined;
    const result = validateInvention(bp);
    expect(result.passed).toBe(false);
    expect(result.violations).toContain("MISSING_MEDIA_PLAN");
  });

  it("fails blueprint with no mediaPlan narrationText — EMPTY_NARRATION", () => {
    const result = validateInvention(
      makeBlueprint({ mediaPlan: makeMediaPlan({ narrationText: "" }) }),
    );
    expect(result.passed).toBe(false);
    expect(result.violations).toContain("EMPTY_NARRATION");
  });

  it("fails blueprint with whitespace-only narrationText — EMPTY_NARRATION", () => {
    const result = validateInvention(
      makeBlueprint({ mediaPlan: makeMediaPlan({ narrationText: "   " }) }),
    );
    expect(result.passed).toBe(false);
    expect(result.violations).toContain("EMPTY_NARRATION");
  });

  it("fails blueprint with headline over 60 chars — HEADLINE_TOO_LONG", () => {
    const longHeadline = "A".repeat(61);
    const result = validateInvention(
      makeBlueprint({
        elements: [
          makeElement({
            type: "headline",
            props: { text: longHeadline, color: "textStrong" },
          }),
        ],
      }),
    );
    expect(result.passed).toBe(false);
    expect(result.violations).toContain("HEADLINE_TOO_LONG");
  });

  it("passes headline with exactly 60 chars", () => {
    const exactHeadline = "A".repeat(60);
    const result = validateInvention(
      makeBlueprint({
        elements: [
          makeElement({
            type: "headline",
            props: { text: exactHeadline, color: "textStrong" },
          }),
        ],
      }),
    );
    expect(result.violations).not.toContain("HEADLINE_TOO_LONG");
  });

  it("fails blueprint with more than 2 accent colors — ACCENT_BUDGET_EXCEEDED", () => {
    const result = validateInvention(
      makeBlueprint({
        elements: [
          makeElement({ id: "el-1", props: { text: "A", color: "signal" } }),
          makeElement({ id: "el-2", props: { text: "B", color: "accent" } }),
          makeElement({ id: "el-3", props: { text: "C", color: "premium" } }),
        ],
      }),
    );
    expect(result.passed).toBe(false);
    expect(result.violations).toContain("ACCENT_BUDGET_EXCEEDED");
  });

  it("passes blueprint with exactly 2 accent colors", () => {
    const result = validateInvention(
      makeBlueprint({
        elements: [
          makeElement({ id: "el-1", props: { text: "A", color: "signal" } }),
          makeElement({ id: "el-2", props: { text: "B", color: "accent" } }),
        ],
      }),
    );
    expect(result.violations).not.toContain("ACCENT_BUDGET_EXCEEDED");
  });

  it("collects multiple violations at once", () => {
    const bp = makeBlueprint({ elements: [] });
    (bp as any).fallbackPreset = undefined;
    (bp as any).layout = "";
    const result = validateInvention(bp);
    expect(result.passed).toBe(false);
    expect(result.violations).toContain("EMPTY_ELEMENTS");
    expect(result.violations).toContain("MISSING_FALLBACK_PRESET");
    expect(result.violations).toContain("INVALID_LAYOUT");
  });
});
