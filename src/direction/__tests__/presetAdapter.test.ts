import { describe, it, expect } from "vitest";
import { adaptPresetToSceneSpec } from "../presetAdapter";
import { getDirectionProfile } from "../profiles";

const mockDirection = getDirectionProfile("analytical");

describe("PresetAdapter", () => {
  it("converts keyInsight to SceneSpec", () => {
    const spec = adaptPresetToSceneSpec(
      {
        id: "insight-01",
        type: "keyInsight",
        narrationText: "테스트",
        content: { headline: "헤드라인" },
      },
      mockDirection,
      "framework",
    );
    expect(spec.id).toBe("insight-01");
    expect(spec.family).toBe("concept-introduction");
    expect(spec.source).toBe("preset");
    expect(spec.direction.name).toBe("analytical");
    expect(spec.layout).toBe("center-focus");
    expect(spec.confidence).toBe(1.0);
  });

  it("converts framework+framework to system-model", () => {
    const spec = adaptPresetToSceneSpec(
      {
        id: "fw-01",
        type: "framework",
        narrationText: "나레이션",
        content: { frameworkLabel: "FEED" },
      },
      mockDirection,
      "framework",
    );
    expect(spec.family).toBe("system-model");
  });

  it("preserves fallbackPreset as original type", () => {
    const spec = adaptPresetToSceneSpec(
      {
        id: "quote-01",
        type: "quote",
        narrationText: "인용",
        content: { quoteText: "테스트" },
      },
      mockDirection,
    );
    expect(spec.fallbackPreset).toBe("quote");
    expect(spec.family).toBe("reflective-anchor");
  });

  it("sets interpretationMeta with derivedFrom", () => {
    const spec = adaptPresetToSceneSpec(
      {
        id: "cover-01",
        type: "cover",
        narrationText: "커버",
        content: { title: "책" },
      },
      mockDirection,
    );
    expect(spec.interpretationMeta).toBeDefined();
    expect(spec.interpretationMeta!.derivedFrom).toContain("preset:cover");
  });

  it("tts-driven when narration exists", () => {
    const spec = adaptPresetToSceneSpec(
      { id: "i-01", type: "keyInsight", narrationText: "있음", content: {} },
      mockDirection,
    );
    expect(spec.durationStrategy?.mode).toBe("tts-driven");
  });

  it("fixed when no narration", () => {
    const spec = adaptPresetToSceneSpec(
      { id: "t-01", type: "transition", narrationText: "", content: {} },
      mockDirection,
    );
    expect(spec.durationStrategy?.mode).toBe("fixed");
  });
});
