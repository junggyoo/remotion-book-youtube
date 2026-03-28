import { describe, it, expect } from "vitest";
import { composeBlueprint } from "../CompositionFactory";
import type { CompositionContext } from "../types";
import type { SceneSpec } from "@/direction/types";
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
    confidence: 1,
    narrationText: "테스트 나레이션 텍스트입니다.",
    content: {},
    ...overrides,
  };
}

describe("composeBlueprint", () => {
  it("creates valid SceneBlueprint from concept-introduction SceneSpec", () => {
    const spec = makeSpec({
      id: "ki-01",
      family: "concept-introduction",
      content: { headline: "핵심 개념" },
    });

    const blueprint = composeBlueprint(spec, testCtx);

    expect(blueprint).not.toBeNull();
    expect(blueprint!.id).toBe("ki-01");
    expect(blueprint!.origin).toBe("composed");
    expect(blueprint!.elements.length).toBeGreaterThan(0);
    expect(blueprint!.format).toBe("longform");
    expect(blueprint!.durationFrames).toBe(90);
    expect(blueprint!.motionPreset).toBe("smooth");
    expect(blueprint!.theme).toBe(testCtx.theme);
  });

  it("spec.layout overrides recipe default when interpretationMeta marks it explicit", () => {
    const spec = makeSpec({
      id: "ki-02",
      family: "concept-introduction",
      layout: "split-two",
      content: { headline: "오버라이드 테스트" },
      interpretationMeta: {
        derivedFrom: ["layout:split-two"],
      },
    });

    const blueprint = composeBlueprint(spec, testCtx);

    expect(blueprint).not.toBeNull();
    expect(blueprint!.layout).toBe("split-two");
  });

  it("falls back to recipe default layout when spec has no explicit interpretation", () => {
    const spec = makeSpec({
      id: "sys-01",
      family: "system-model",
      layout: "center-focus", // spec has non-default layout, but no interpretationMeta
      content: {
        headline: "시스템 모델",
        items: [{ title: "항목 A", description: "설명 A" }],
      },
    });

    const blueprint = composeBlueprint(spec, testCtx);

    expect(blueprint).not.toBeNull();
    // recipe default for system-model is grid-expand
    expect(blueprint!.layout).toBe("grid-expand");
    // recipe default choreography for system-model is stagger-clockwise
    expect(blueprint!.choreography).toBe("stagger-clockwise");
  });

  it("returns null for families without registered recipes (opening-hook)", () => {
    const spec = makeSpec({
      id: "oh-01",
      family: "opening-hook",
      content: { headline: "훅 씬" },
    });

    const blueprint = composeBlueprint(spec, testCtx);

    expect(blueprint).toBeNull();
  });

  it("returns null when recipe produces no elements (concept-introduction with empty content)", () => {
    const spec = makeSpec({
      id: "empty-01",
      family: "concept-introduction",
      content: {}, // no headline → recipe returns []
    });

    const blueprint = composeBlueprint(spec, testCtx);

    expect(blueprint).toBeNull();
  });

  it("element IDs contain scene ID for namespacing", () => {
    const spec = makeSpec({
      id: "ns-scene-42",
      family: "concept-introduction",
      content: { headline: "네임스페이스 테스트" },
    });

    const blueprint = composeBlueprint(spec, testCtx);

    expect(blueprint).not.toBeNull();
    blueprint!.elements.forEach((el) => {
      expect(el.id).toContain("ns-scene-42");
    });
  });

  it("mediaPlan.narrationText matches spec.narrationText with no TTS engine hardcoded in content", () => {
    const narrationText = "이것은 나레이션 텍스트입니다.";
    const spec = makeSpec({
      id: "media-01",
      family: "concept-introduction",
      narrationText,
      content: { headline: "미디어 플랜 테스트" },
    });

    const blueprint = composeBlueprint(spec, testCtx);

    expect(blueprint).not.toBeNull();
    expect(blueprint!.mediaPlan.narrationText).toBe(narrationText);
    // ttsEngine should be a valid TTSEngineKey — just confirm it's a known value
    expect([
      "edge-tts",
      "qwen3-tts",
      "chatterbox",
      "fish-audio-s2",
      "elevenlabs",
    ]).toContain(blueprint!.mediaPlan.audioPlan.ttsEngine);
  });
});
