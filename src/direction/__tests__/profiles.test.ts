import { describe, it, expect } from "vitest";
import type {
  SceneFamily,
  DirectionProfileName,
  DirectionParams,
  SceneSpec,
} from "../types";

describe("Direction types", () => {
  it("SceneFamily includes all 11 families", () => {
    const families: SceneFamily[] = [
      "opening-hook",
      "concept-introduction",
      "mechanism-explanation",
      "system-model",
      "tension-comparison",
      "progression-journey",
      "transformation-shift",
      "evidence-stack",
      "reflective-anchor",
      "structural-bridge",
      "closing-synthesis",
    ];
    expect(families).toHaveLength(11);
  });

  it("DirectionProfileName includes all 7 profiles", () => {
    const profiles: DirectionProfileName[] = [
      "analytical",
      "systematic",
      "contemplative",
      "persuasive",
      "urgent",
      "inspirational",
      "investigative",
    ];
    expect(profiles).toHaveLength(7);
  });

  it("DirectionParams has required numeric fields", () => {
    const params: DirectionParams = {
      pacing: 0.5,
      energy: 0.5,
      emphasisDensity: 0.5,
      holdRatio: 0.25,
      revealPattern: "sequential",
      transitionTension: 0.3,
      subtitleCadence: "steady",
    };
    expect(params.pacing).toBeGreaterThanOrEqual(0);
    expect(params.pacing).toBeLessThanOrEqual(1);
  });
});
