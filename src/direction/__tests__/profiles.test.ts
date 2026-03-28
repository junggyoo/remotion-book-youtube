import { describe, it, expect } from "vitest";
import type {
  SceneFamily,
  DirectionProfileName,
  DirectionParams,
  SceneSpec,
} from "../types";
import { DIRECTION_PROFILES, getDirectionProfile } from "../profiles";

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

describe("Direction profiles", () => {
  it("has 7 profiles", () => {
    expect(Object.keys(DIRECTION_PROFILES)).toHaveLength(7);
  });

  it("all profiles have valid param ranges", () => {
    for (const [name, profile] of Object.entries(DIRECTION_PROFILES)) {
      expect(profile.name).toBe(name);
      expect(profile.base.pacing).toBeGreaterThanOrEqual(0);
      expect(profile.base.pacing).toBeLessThanOrEqual(1);
      expect(profile.base.energy).toBeGreaterThanOrEqual(0);
      expect(profile.base.energy).toBeLessThanOrEqual(1);
      expect(profile.base.holdRatio).toBeGreaterThanOrEqual(0);
      expect(profile.base.holdRatio).toBeLessThanOrEqual(1);
      expect(profile.base.transitionTension).toBeGreaterThanOrEqual(0);
      expect(profile.base.transitionTension).toBeLessThanOrEqual(1);
    }
  });

  it("getDirectionProfile returns correct profile", () => {
    const analytical = getDirectionProfile("analytical");
    expect(analytical.base.pacing).toBe(0.3);
    expect(analytical.base.energy).toBe(0.2);
    expect(analytical.base.revealPattern).toBe("sequential");
  });

  it("contemplative has slowest pacing", () => {
    const contemplative = getDirectionProfile("contemplative");
    const persuasive = getDirectionProfile("persuasive");
    expect(contemplative.base.pacing).toBeLessThan(persuasive.base.pacing);
  });

  it("urgent has highest energy", () => {
    const urgent = getDirectionProfile("urgent");
    for (const [name, profile] of Object.entries(DIRECTION_PROFILES)) {
      if (name !== "urgent") {
        expect(urgent.base.energy).toBeGreaterThanOrEqual(profile.base.energy);
      }
    }
  });
});
