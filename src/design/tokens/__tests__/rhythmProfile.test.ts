import { describe, it, expect } from "vitest";
import {
  getRhythmModifier,
  RHYTHM_PROFILES,
  type RhythmProfileType,
} from "../rhythmProfile";

describe("getRhythmModifier", () => {
  it("returns 1.0 for even profile at any position", () => {
    expect(getRhythmModifier("even", 0)).toBe(1.0);
    expect(getRhythmModifier("even", 0.5)).toBe(1.0);
    expect(getRhythmModifier("even", 1)).toBe(1.0);
  });

  it("returns > 1.0 at start for front-loaded", () => {
    const mod = getRhythmModifier("front-loaded", 0);
    expect(mod).toBeGreaterThan(1.0);
    expect(mod).toBeCloseTo(1.3);
  });

  it("returns < 1.0 at end for front-loaded", () => {
    const mod = getRhythmModifier("front-loaded", 1);
    expect(mod).toBeLessThan(1.0);
    expect(mod).toBeCloseTo(0.7);
  });

  it("returns < 1.0 at start for back-loaded", () => {
    const mod = getRhythmModifier("back-loaded", 0);
    expect(mod).toBeLessThan(1.0);
    expect(mod).toBeCloseTo(0.7);
  });

  it("returns > 1.0 at end for back-loaded", () => {
    const mod = getRhythmModifier("back-loaded", 1);
    expect(mod).toBeGreaterThan(1.0);
    expect(mod).toBeCloseTo(1.3);
  });

  it("clamps position to [0, 1]", () => {
    expect(getRhythmModifier("front-loaded", -0.5)).toBe(
      getRhythmModifier("front-loaded", 0),
    );
    expect(getRhythmModifier("front-loaded", 1.5)).toBe(
      getRhythmModifier("front-loaded", 1),
    );
  });

  it("front-loaded modifier decreases monotonically", () => {
    const positions = [0, 0.25, 0.5, 0.75, 1.0];
    const mods = positions.map((p) => getRhythmModifier("front-loaded", p));
    for (let i = 1; i < mods.length; i++) {
      expect(mods[i]).toBeLessThan(mods[i - 1]);
    }
  });

  it("back-loaded modifier increases monotonically", () => {
    const positions = [0, 0.25, 0.5, 0.75, 1.0];
    const mods = positions.map((p) => getRhythmModifier("back-loaded", p));
    for (let i = 1; i < mods.length; i++) {
      expect(mods[i]).toBeGreaterThan(mods[i - 1]);
    }
  });
});

describe("RHYTHM_PROFILES", () => {
  it("highlight defaults to front-loaded", () => {
    expect(RHYTHM_PROFILES.highlight).toBe("front-loaded");
  });

  it("closing defaults to back-loaded", () => {
    expect(RHYTHM_PROFILES.closing).toBe("back-loaded");
  });

  it("keyInsight defaults to front-loaded", () => {
    expect(RHYTHM_PROFILES.keyInsight).toBe("front-loaded");
  });

  it("quote defaults to back-loaded", () => {
    expect(RHYTHM_PROFILES.quote).toBe("back-loaded");
  });

  it("framework defaults to even", () => {
    expect(RHYTHM_PROFILES.framework).toBe("even");
  });

  it("covers all SceneType values", () => {
    const expectedTypes = [
      "cover",
      "chapterDivider",
      "keyInsight",
      "compareContrast",
      "quote",
      "framework",
      "application",
      "data",
      "closing",
      "timeline",
      "highlight",
      "transition",
      "listReveal",
      "splitQuote",
      "custom",
    ];
    for (const t of expectedTypes) {
      expect(RHYTHM_PROFILES[t as keyof typeof RHYTHM_PROFILES]).toBeDefined();
    }
  });
});
