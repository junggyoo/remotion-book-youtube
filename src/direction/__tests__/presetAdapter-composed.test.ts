import { describe, it, expect } from "vitest";
import { adaptPresetToSceneSpec } from "../presetAdapter";
import type { DirectionProfile, SceneFamily } from "../types";

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

describe("adaptPresetToSceneSpec — composed source", () => {
  it("marks concept-introduction as composed when in composedFamilies", () => {
    const composedFamilies: SceneFamily[] = ["concept-introduction"];
    const spec = adaptPresetToSceneSpec(
      {
        id: "ki-01",
        type: "keyInsight",
        narrationText:
          "습관의 복리 효과는 매일 1%씩 나아지면 1년 후 37배가 됩니다.",
        content: { headline: "복리 효과", supportText: "설명" },
      },
      analyticalDir,
      undefined,
      { composedFamilies },
    );
    expect(spec.source).toBe("composed");
    expect(spec.family).toBe("concept-introduction");
  });

  it("keeps preset source when composedFamilies is undefined", () => {
    const spec = adaptPresetToSceneSpec(
      {
        id: "ki-01",
        type: "keyInsight",
        narrationText: "테스트.",
        content: { headline: "테스트" },
      },
      analyticalDir,
    );
    expect(spec.source).toBe("preset");
  });

  it("keeps preset for families not in composedFamilies", () => {
    const composedFamilies: SceneFamily[] = ["concept-introduction"];
    const spec = adaptPresetToSceneSpec(
      {
        id: "cover-01",
        type: "cover",
        narrationText: "",
        content: { title: "책 제목" },
      },
      analyticalDir,
      undefined,
      { composedFamilies },
    );
    expect(spec.source).toBe("preset");
  });

  it("system-model (framework) gets composed when in list", () => {
    const composedFamilies: SceneFamily[] = [
      "concept-introduction",
      "system-model",
      "progression-journey",
    ];
    const spec = adaptPresetToSceneSpec(
      {
        id: "fw-01",
        type: "framework",
        narrationText: "테스트",
        content: { headline: "프레임워크" },
      },
      analyticalDir,
      "framework",
      { composedFamilies },
    );
    expect(spec.source).toBe("composed");
    expect(spec.family).toBe("system-model");
  });
});
