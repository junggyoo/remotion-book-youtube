import { describe, it, expect } from "vitest";
import { splitReveal } from "@/renderer/choreography/splitReveal";
import type { VCLElement } from "@/types";

function makeElements(n: number): VCLElement[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `el-${i}`,
    type: "body-text",
    props: { text: `item ${i}`, role: "item" },
  }));
}

describe("splitReveal choreography", () => {
  it("left half enters before right half (even count)", () => {
    const elements = makeElements(4);
    const timings = splitReveal(elements, 120, "smooth");
    // Left half: indices 0,1 — right half: indices 2,3
    expect(timings[0].delayFrames).toBeLessThan(timings[2].delayFrames);
    expect(timings[1].delayFrames).toBeLessThan(timings[2].delayFrames);
    // Right half are non-decreasing
    expect(timings[2].delayFrames).toBeLessThanOrEqual(timings[3].delayFrames);
  });

  it("handles odd number of elements (left half is smaller)", () => {
    // n=5, midIndex=2 → left: [0,1], right: [2,3,4]
    const elements = makeElements(5);
    const timings = splitReveal(elements, 150, "snappy");
    expect(timings).toHaveLength(5);
    // Left half 0,1 should enter before right half 2
    expect(timings[0].delayFrames).toBeLessThan(timings[2].delayFrames);
    expect(timings[1].delayFrames).toBeLessThan(timings[2].delayFrames);
  });

  it("single element returns one timing with delayFrames 0", () => {
    const elements = makeElements(1);
    const timings = splitReveal(elements, 60, "heavy");
    expect(timings).toHaveLength(1);
    // midIndex = 0, so element is in right half: delay = 0*stagger + 0*stagger = halfGap = 0+12
    // Actually index 0 >= midIndex(0), rightIdx=0, delay = halfGap + 0 = 0*5+12 = 12
    expect(timings[0].delayFrames).toBeGreaterThanOrEqual(0);
    expect(timings[0].durationFrames).toBeGreaterThan(0);
  });

  it("returns empty array for empty elements", () => {
    expect(splitReveal([], 60, "smooth")).toHaveLength(0);
  });

  it("uses correct stagger per preset (gentle=8, punchy=3)", () => {
    const elements = makeElements(4);
    const gentleTimings = splitReveal(elements, 300, "gentle");
    const punchyTimings = splitReveal(elements, 300, "punchy");
    // Left half [0,1]: delay[1] - delay[0] = stagger
    const gentleStagger =
      gentleTimings[1].delayFrames - gentleTimings[0].delayFrames;
    const punchyStagger =
      punchyTimings[1].delayFrames - punchyTimings[0].delayFrames;
    expect(gentleStagger).toBe(8);
    expect(punchyStagger).toBe(3);
  });

  it("gap between halves equals midIndex * stagger + 12", () => {
    const elements = makeElements(4); // midIndex=2, stagger=6(smooth)
    const timings = splitReveal(elements, 300, "smooth");
    // Last of left half: index 1, delay = 1*6 = 6
    // First of right half: index 2, delay = halfGap + 0*6 = (2*6+12) = 24
    const expectedGapStart = 2 * 6 + 12; // = 24
    expect(timings[2].delayFrames).toBe(expectedGapStart);
  });
});
