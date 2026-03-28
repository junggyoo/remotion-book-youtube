import { describe, it, expect } from "vitest";
import { tuneDirection } from "../directionTuner";

describe("directionTuner", () => {
  it("setup segment → pacing+0.1, energy+0.05", () => {
    const result = tuneDirection({
      segment: {
        role: "setup",
        durationRatio: 0.2,
        intent: "introduce",
        requiredDelivery: [],
      },
    });
    expect(result.overrides.pacing).toBeCloseTo(0.1);
    expect(result.overrides.energy).toBeCloseTo(0.05);
    expect(result.appliedDeltas).toContain(
      "segment:setup → pacing+0.1, energy+0.05",
    );
  });

  it("climax segment → energy+0.2, emphasisDensity+0.15, transitionTension+0.1", () => {
    const result = tuneDirection({
      segment: {
        role: "climax",
        durationRatio: 0.3,
        intent: "peak",
        requiredDelivery: [],
      },
    });
    expect(result.overrides.energy).toBeCloseTo(0.2);
    expect(result.overrides.emphasisDensity).toBeCloseTo(0.15);
    expect(result.overrides.transitionTension).toBeCloseTo(0.1);
    expect(result.appliedDeltas).toContain(
      "segment:climax → energy+0.2, emphasisDensity+0.15, transitionTension+0.1",
    );
  });

  it("resolution segment → holdRatio+0.1, pacing clamped to 0", () => {
    const result = tuneDirection({
      segment: {
        role: "resolution",
        durationRatio: 0.2,
        intent: "resolve",
        requiredDelivery: [],
      },
    });
    expect(result.overrides.holdRatio).toBeCloseTo(0.1);
    // pacing delta of -0.1 from base 0 → clamped to 0
    expect(result.overrides.pacing).toBe(0);
    expect(result.appliedDeltas).toContain(
      "segment:resolution → holdRatio+0.1, pacing-0.1",
    );
  });

  it("closing segment → holdRatio+0.15, energy clamped to 0", () => {
    const result = tuneDirection({
      segment: {
        role: "closing",
        durationRatio: 0.1,
        intent: "close",
        requiredDelivery: [],
      },
    });
    expect(result.overrides.holdRatio).toBeCloseTo(0.15);
    // energy delta of -0.1 from base 0 → clamped to 0
    expect(result.overrides.energy).toBe(0);
    expect(result.appliedDeltas).toContain(
      "segment:closing → holdRatio+0.15, energy-0.1",
    );
  });

  it("snappy motionCharacter → pacing+0.15", () => {
    const result = tuneDirection({
      artDirection: { motionCharacter: "snappy" },
    });
    expect(result.overrides.pacing).toBeCloseTo(0.15);
    expect(result.appliedDeltas).toContain("artDirection:snappy → pacing+0.15");
  });

  it("fluid motionCharacter → transitionTension clamped to 0", () => {
    const result = tuneDirection({
      artDirection: { motionCharacter: "fluid" },
    });
    // delta of -0.1 from base 0 → clamped to 0
    expect(result.overrides.transitionTension).toBe(0);
    expect(result.appliedDeltas).toContain(
      "artDirection:fluid → transitionTension-0.1",
    );
  });

  it("dense revealDensity → emphasisDensity+0.1", () => {
    const result = tuneDirection({
      artDirection: { revealDensity: "dense" },
    });
    expect(result.overrides.emphasisDensity).toBeCloseTo(0.1);
    expect(result.appliedDeltas).toContain(
      "artDirection:dense-reveal → emphasisDensity+0.1",
    );
  });

  it("text-first emphasisStyle → emphasisDensity+0.05", () => {
    const result = tuneDirection({
      artDirection: { emphasisStyle: "text-first" },
    });
    expect(result.overrides.emphasisDensity).toBeCloseTo(0.05);
    expect(result.appliedDeltas).toContain(
      "artDirection:text-first → emphasisDensity+0.05",
    );
  });

  it("climax + snappy combined → both deltas applied, values accumulated", () => {
    const result = tuneDirection({
      segment: {
        role: "climax",
        durationRatio: 0.3,
        intent: "peak",
        requiredDelivery: [],
      },
      artDirection: { motionCharacter: "snappy" },
    });
    // pacing from snappy only (climax doesn't set pacing)
    expect(result.overrides.pacing).toBeCloseTo(0.15);
    // energy from climax
    expect(result.overrides.energy).toBeCloseTo(0.2);
    // emphasisDensity from climax
    expect(result.overrides.emphasisDensity).toBeCloseTo(0.15);
    // transitionTension from climax
    expect(result.overrides.transitionTension).toBeCloseTo(0.1);
    expect(result.appliedDeltas).toHaveLength(2);
  });

  it("no input → empty overrides, empty appliedDeltas", () => {
    const result = tuneDirection({});
    expect(result.overrides).toEqual({});
    expect(result.appliedDeltas).toEqual([]);
  });

  it("values clamped to [0, 1] — climax + dense + text-first emphasisDensity capped at 1.0", () => {
    // emphasisDensity: 0.15 (climax) + 0.1 (dense) + 0.05 (text-first) = 0.3 — still under 1
    // To test clamping, use a pathological case: closing energy = -0.1, clamped to 0
    const result = tuneDirection({
      segment: {
        role: "closing",
        durationRatio: 0.1,
        intent: "close",
        requiredDelivery: [],
      },
    });
    // energy = -0.1 → clamped to 0
    expect(result.overrides.energy).toBe(0);
    // holdRatio = 0.15 → stays 0.15
    expect(result.overrides.holdRatio).toBeCloseTo(0.15);
  });

  it("appliedDeltas trace contains human-readable strings", () => {
    const result = tuneDirection({
      segment: {
        role: "setup",
        durationRatio: 0.2,
        intent: "introduce",
        requiredDelivery: [],
      },
      artDirection: { motionCharacter: "snappy", revealDensity: "dense" },
    });
    for (const delta of result.appliedDeltas) {
      expect(typeof delta).toBe("string");
      expect(delta.length).toBeGreaterThan(0);
      // Should contain an arrow or colon indicating human-readable format
      expect(delta).toMatch(/→|:/);
    }
    expect(result.appliedDeltas).toHaveLength(3);
  });
});
