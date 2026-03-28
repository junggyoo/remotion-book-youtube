import { describe, it, expect } from "vitest";
import { shouldCompose, tryComposeScene } from "../compositionPathRouter";
import type { SceneSpec } from "@/direction/types";
import type { CompositionContext } from "../types";
import { getDirectionProfile } from "@/direction/profiles";
import { useTheme } from "@/design/themes/useTheme";

const testTheme = useTheme("dark", "psychology");

const testCtx: CompositionContext = {
  format: "longform",
  theme: testTheme,
  from: 0,
  durationFrames: 90,
  motionPreset: "smooth",
};

function makeSpec(
  overrides: Partial<SceneSpec> & { id: string; family: SceneSpec["family"] },
): SceneSpec {
  return {
    intent: "test intent",
    layout: "center-focus",
    elements: [],
    choreography: "reveal-sequence",
    direction: getDirectionProfile("analytical"),
    source: "composed",
    confidence: 1.0,
    narrationText: "테스트 나레이션 텍스트입니다.",
    content: {},
    ...overrides,
  };
}

describe("shouldCompose", () => {
  it("returns true for source:composed with registered recipe and confidence >= 0.6", () => {
    const spec = makeSpec({
      id: "ci-01",
      family: "concept-introduction",
      source: "composed",
      confidence: 0.8,
      content: { headline: "핵심 개념" },
    });
    expect(shouldCompose(spec)).toBe(true);
  });

  it("returns false for source:preset", () => {
    const spec = makeSpec({
      id: "ci-02",
      family: "concept-introduction",
      source: "preset",
      confidence: 1.0,
      content: { headline: "핵심 개념" },
    });
    expect(shouldCompose(spec)).toBe(false);
  });

  it("returns false for source:composed without registered recipe (opening-hook)", () => {
    const spec = makeSpec({
      id: "oh-01",
      family: "opening-hook",
      source: "composed",
      confidence: 1.0,
      content: { headline: "훅" },
    });
    expect(shouldCompose(spec)).toBe(false);
  });

  it("returns false when confidence < 0.6", () => {
    const spec = makeSpec({
      id: "ci-03",
      family: "concept-introduction",
      source: "composed",
      confidence: 0.5,
      content: { headline: "낮은 신뢰도" },
    });
    expect(shouldCompose(spec)).toBe(false);
  });

  it("returns true when confidence is exactly 0.6 (boundary)", () => {
    const spec = makeSpec({
      id: "ci-04",
      family: "concept-introduction",
      source: "composed",
      confidence: 0.6,
      content: { headline: "경계값" },
    });
    expect(shouldCompose(spec)).toBe(true);
  });

  it("returns true when confidence is undefined (defaults to 1.0)", () => {
    const spec = makeSpec({
      id: "ci-05",
      family: "concept-introduction",
      source: "composed",
      content: { headline: "신뢰도 없음" },
    });
    // confidence defaults to 1.0 in makeSpec, but test undefined behavior explicitly
    const specWithUndefined = { ...spec, confidence: undefined as any };
    expect(shouldCompose(specWithUndefined)).toBe(true);
  });
});

describe("tryComposeScene", () => {
  it("returns SceneBlueprint for composable scene (concept-introduction with headline+support)", () => {
    const spec = makeSpec({
      id: "ci-compose-01",
      family: "concept-introduction",
      source: "composed",
      confidence: 0.9,
      content: { headline: "핵심 개념", support: "지지 텍스트" },
    });

    const result = tryComposeScene(spec, testCtx);

    expect(result).not.toBeNull();
    expect(result!.id).toBe("ci-compose-01");
    expect(result!.origin).toBe("composed");
    expect(result!.elements.length).toBeGreaterThan(0);
    expect(result!.format).toBe("longform");
  });

  it("returns null for non-composable scene (preset source)", () => {
    const spec = makeSpec({
      id: "ci-preset-01",
      family: "concept-introduction",
      source: "preset",
      confidence: 1.0,
      content: { headline: "프리셋 씬" },
    });

    const result = tryComposeScene(spec, testCtx);

    expect(result).toBeNull();
  });

  it("returns null when content is insufficient (concept-introduction with empty content {})", () => {
    const spec = makeSpec({
      id: "ci-empty-01",
      family: "concept-introduction",
      source: "composed",
      confidence: 1.0,
      content: {}, // no headline → recipe returns []
    });

    const result = tryComposeScene(spec, testCtx);

    expect(result).toBeNull();
  });

  it("returns null for low confidence scene", () => {
    const spec = makeSpec({
      id: "ci-lowconf-01",
      family: "concept-introduction",
      source: "composed",
      confidence: 0.3,
      content: { headline: "낮은 신뢰도 씬" },
    });

    const result = tryComposeScene(spec, testCtx);

    expect(result).toBeNull();
  });

  it("returns null for family with no registered recipe", () => {
    const spec = makeSpec({
      id: "oh-compose-01",
      family: "opening-hook",
      source: "composed",
      confidence: 1.0,
      content: { headline: "훅 씬" },
    });

    const result = tryComposeScene(spec, testCtx);

    expect(result).toBeNull();
  });
});
