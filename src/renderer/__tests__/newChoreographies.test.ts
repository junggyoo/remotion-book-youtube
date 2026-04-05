import { describe, it, expect } from "vitest";
import type { VCLElement } from "@/types";
import { waveFill } from "../choreography/waveFill";
import { morphTransition } from "../choreography/morphTransition";
import { pulseEmphasis } from "../choreography/pulseEmphasis";

const makeEl = (
  type = "text",
  props: Record<string, unknown> = {},
): VCLElement =>
  ({
    id: Math.random().toString(36).slice(2),
    type,
    props,
  }) as unknown as VCLElement;

const TOTAL = 120;

// ---------------------------------------------------------------------------
// wave-fill
// ---------------------------------------------------------------------------

describe("waveFill choreography", () => {
  it("returns empty array for 0 elements", () => {
    expect(waveFill([], TOTAL, "smooth")).toEqual([]);
  });

  it("returns 1 timing for 1 element", () => {
    const result = waveFill([makeEl()], TOTAL, "smooth");
    expect(result).toHaveLength(1);
    expect(result[0].delayFrames).toBe(0);
  });

  it("elements in same row have same delay", () => {
    const result = waveFill(
      [makeEl(), makeEl(), makeEl(), makeEl()],
      TOTAL,
      "smooth",
    );
    // 2 per row: [0,1] same, [2,3] same
    expect(result[0].delayFrames).toBe(result[1].delayFrames);
    expect(result[2].delayFrames).toBe(result[3].delayFrames);
  });

  it("rows have increasing delay", () => {
    const result = waveFill(
      [makeEl(), makeEl(), makeEl(), makeEl()],
      TOTAL,
      "smooth",
    );
    expect(result[2].delayFrames).toBeGreaterThan(result[0].delayFrames);
  });

  it("uses 3 per row for 7+ elements", () => {
    const els = Array.from({ length: 9 }, () => makeEl());
    const result = waveFill(els, TOTAL, "smooth");
    // Row 0: [0,1,2], Row 1: [3,4,5], Row 2: [6,7,8]
    expect(result[0].delayFrames).toBe(result[2].delayFrames);
    expect(result[3].delayFrames).toBe(result[5].delayFrames);
    expect(result[3].delayFrames).toBeGreaterThan(result[0].delayFrames);
  });
});

// ---------------------------------------------------------------------------
// morph-transition
// ---------------------------------------------------------------------------

describe("morphTransition choreography", () => {
  it("returns empty array for 0 elements", () => {
    expect(morphTransition([], TOTAL, "smooth")).toEqual([]);
  });

  it("returns 1 timing for 1 element", () => {
    const result = morphTransition([makeEl()], TOTAL, "smooth");
    expect(result).toHaveLength(1);
  });

  it("second group has later delay than first group", () => {
    const els = [makeEl(), makeEl(), makeEl(), makeEl()];
    const result = morphTransition(els, TOTAL, "smooth");
    // Group 1: [0,1], Group 2: [2,3]
    const maxGroup1Delay = Math.max(
      result[0].delayFrames,
      result[1].delayFrames,
    );
    const minGroup2Delay = Math.min(
      result[2].delayFrames,
      result[3].delayFrames,
    );
    expect(minGroup2Delay).toBeGreaterThan(maxGroup1Delay);
  });

  it("splits by role (before/after)", () => {
    const els = [
      makeEl("text", { role: "before-label" }),
      makeEl("text", { role: "before-content" }),
      makeEl("text", { role: "after-label" }),
      makeEl("text", { role: "after-content" }),
    ];
    const result = morphTransition(els, TOTAL, "smooth");
    // Before group should enter before after group
    expect(result[2].delayFrames).toBeGreaterThan(result[0].delayFrames);
    expect(result[3].delayFrames).toBeGreaterThan(result[1].delayFrames);
  });

  it("all timings have positive duration", () => {
    const result = morphTransition(
      [makeEl(), makeEl(), makeEl()],
      TOTAL,
      "smooth",
    );
    for (const t of result) {
      expect(t.durationFrames).toBeGreaterThan(0);
    }
  });
});

// ---------------------------------------------------------------------------
// pulse-emphasis
// ---------------------------------------------------------------------------

describe("pulseEmphasis choreography", () => {
  it("returns empty array for 0 elements", () => {
    expect(pulseEmphasis([], TOTAL, "smooth")).toEqual([]);
  });

  it("returns 1 timing for 1 element", () => {
    const result = pulseEmphasis([makeEl()], TOTAL, "smooth");
    expect(result).toHaveLength(1);
  });

  it("last element has longer duration than earlier elements", () => {
    const result = pulseEmphasis(
      [makeEl(), makeEl(), makeEl()],
      TOTAL,
      "smooth",
    );
    const lastDuration = result[2].durationFrames;
    const firstDuration = result[0].durationFrames;
    expect(lastDuration).toBeGreaterThan(firstDuration);
  });

  it("last element duration is ~1.5x base", () => {
    const result = pulseEmphasis(
      [makeEl(), makeEl(), makeEl()],
      TOTAL,
      "smooth",
    );
    const baseDuration = result[0].durationFrames;
    const lastDuration = result[2].durationFrames;
    expect(lastDuration).toBe(Math.round(baseDuration * 1.5));
  });

  it("delays are sequential", () => {
    const result = pulseEmphasis(
      [makeEl(), makeEl(), makeEl(), makeEl()],
      TOTAL,
      "smooth",
    );
    for (let i = 1; i < result.length; i++) {
      expect(result[i].delayFrames).toBeGreaterThan(result[i - 1].delayFrames);
    }
  });

  it("element with role=emphasis gets extended duration", () => {
    const els = [
      makeEl("text"),
      makeEl("text", { role: "emphasis" }),
      makeEl("text"),
    ];
    const result = pulseEmphasis(els, TOTAL, "smooth");
    // The emphasis element (index 1) should have extended duration
    expect(result[1].durationFrames).toBeGreaterThan(result[0].durationFrames);
  });
});
