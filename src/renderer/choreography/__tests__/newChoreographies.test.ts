import { describe, it, expect } from "vitest";
import type { VCLElement } from "@/types";
import { waveFill } from "../waveFill";
import { morphTransition } from "../morphTransition";
import { pulseEmphasis } from "../pulseEmphasis";

// ---------------------------------------------------------------------------
// Fixture
// ---------------------------------------------------------------------------

function makeElements(count: number): VCLElement[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `el-${i}`,
    type: "body-text" as const,
    props: { text: `Element ${i}`, role: `item-${i}` },
  }));
}

const TOTAL_DURATION = 120;

// ---------------------------------------------------------------------------
// waveFill
// ---------------------------------------------------------------------------

describe("waveFill choreography", () => {
  it("returns empty array for 0 elements", () => {
    expect(waveFill([], TOTAL_DURATION, "smooth")).toEqual([]);
  });

  it("returns correct number of timings", () => {
    const result = waveFill(makeElements(4), TOTAL_DURATION, "smooth");
    expect(result).toHaveLength(4);
  });

  it("single element has 0 delay", () => {
    const result = waveFill(makeElements(1), TOTAL_DURATION, "smooth");
    expect(result).toHaveLength(1);
    expect(result[0].delayFrames).toBe(0);
    expect(result[0].durationFrames).toBeGreaterThan(0);
  });

  it("elements in the same row have the same delayFrames", () => {
    // 4 elements, perRow=2 (count < 7): row0=[0,1], row1=[2,3]
    const result = waveFill(makeElements(4), TOTAL_DURATION, "smooth");
    expect(result[0].delayFrames).toBe(result[1].delayFrames);
    expect(result[2].delayFrames).toBe(result[3].delayFrames);
  });

  it("rows have strictly increasing delay", () => {
    // smooth stagger=8, rowGap=16
    const result = waveFill(makeElements(4), TOTAL_DURATION, "smooth");
    expect(result[2].delayFrames).toBeGreaterThan(result[0].delayFrames);
  });

  it("row delay equals rowGap * rowIndex (smooth: rowGap=16)", () => {
    const result = waveFill(makeElements(4), TOTAL_DURATION, "smooth");
    // row 0 delay = 0
    expect(result[0].delayFrames).toBe(0);
    // row 1 delay = 16
    expect(result[2].delayFrames).toBe(16);
  });

  it("7+ elements uses 3 per row", () => {
    // 7 elements, perRow=3: row0=[0,1,2], row1=[3,4,5], row2=[6]
    const result = waveFill(makeElements(7), TOTAL_DURATION, "smooth");
    expect(result[0].delayFrames).toBe(result[1].delayFrames);
    expect(result[1].delayFrames).toBe(result[2].delayFrames);
    // row1 has higher delay than row0
    expect(result[3].delayFrames).toBeGreaterThan(result[0].delayFrames);
  });

  it("all timings have positive durationFrames", () => {
    const result = waveFill(makeElements(5), TOTAL_DURATION, "smooth");
    for (const t of result) {
      expect(t.durationFrames).toBeGreaterThan(0);
    }
  });

  it("uses preset-specific stagger (snappy: stagger=5, rowGap=10)", () => {
    const result = waveFill(makeElements(4), TOTAL_DURATION, "snappy");
    // row 0 delay = 0, row 1 delay = 10
    expect(result[0].delayFrames).toBe(0);
    expect(result[2].delayFrames).toBe(10);
  });
});

// ---------------------------------------------------------------------------
// morphTransition
// ---------------------------------------------------------------------------

describe("morphTransition choreography", () => {
  it("returns empty array for 0 elements", () => {
    expect(morphTransition([], TOTAL_DURATION, "smooth")).toEqual([]);
  });

  it("returns correct number of timings", () => {
    const result = morphTransition(makeElements(4), TOTAL_DURATION, "smooth");
    expect(result).toHaveLength(4);
  });

  it("single element works", () => {
    const result = morphTransition(makeElements(1), TOTAL_DURATION, "smooth");
    expect(result).toHaveLength(1);
    expect(result[0].durationFrames).toBeGreaterThan(0);
  });

  it("first group has earlier delays than second group", () => {
    // 4 elements: midpoint=2, group1=[0,1], group2=[2,3]
    const result = morphTransition(makeElements(4), TOTAL_DURATION, "smooth");
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

  it("pause gap exists between groups (GROUP_PAUSE=15 frames)", () => {
    // smooth: stagger=6, elementDuration=45
    // group1Finish = (2-1)*6 + 45 = 51, group2Start = 51 + 15 = 66
    // group2[0].delayFrames = 66
    const result = morphTransition(makeElements(4), TOTAL_DURATION, "smooth");
    const group1Finish =
      result[1].delayFrames -
      result[0].delayFrames +
      result[0].delayFrames +
      45;
    expect(result[2].delayFrames).toBeGreaterThanOrEqual(group1Finish + 15);
  });

  it("group1 elements stagger sequentially", () => {
    const result = morphTransition(makeElements(4), TOTAL_DURATION, "smooth");
    // group1: [0,1] — el[1] delay > el[0] delay
    expect(result[1].delayFrames).toBeGreaterThan(result[0].delayFrames);
  });

  it("group2 elements stagger sequentially", () => {
    const result = morphTransition(makeElements(4), TOTAL_DURATION, "smooth");
    // group2: [2,3] — el[3] delay > el[2] delay
    expect(result[3].delayFrames).toBeGreaterThan(result[2].delayFrames);
  });

  it("role-based partitioning: 'left'/'right' roles split correctly", () => {
    const elements: VCLElement[] = [
      {
        id: "a",
        type: "body-text" as const,
        props: { text: "A", role: "left" },
      },
      {
        id: "b",
        type: "body-text" as const,
        props: { text: "B", role: "left" },
      },
      {
        id: "c",
        type: "body-text" as const,
        props: { text: "C", role: "right" },
      },
      {
        id: "d",
        type: "body-text" as const,
        props: { text: "D", role: "right" },
      },
    ];
    const result = morphTransition(elements, TOTAL_DURATION, "smooth");
    // left elements (group1) should have smaller delays than right elements (group2)
    expect(result[0].delayFrames).toBeLessThan(result[2].delayFrames);
    expect(result[1].delayFrames).toBeLessThan(result[2].delayFrames);
  });

  it("all timings have positive durationFrames", () => {
    const result = morphTransition(makeElements(6), TOTAL_DURATION, "smooth");
    for (const t of result) {
      expect(t.durationFrames).toBeGreaterThan(0);
    }
  });
});

// ---------------------------------------------------------------------------
// pulseEmphasis
// ---------------------------------------------------------------------------

describe("pulseEmphasis choreography", () => {
  it("returns empty array for 0 elements", () => {
    expect(pulseEmphasis([], TOTAL_DURATION, "smooth")).toEqual([]);
  });

  it("returns correct number of timings", () => {
    const result = pulseEmphasis(makeElements(4), TOTAL_DURATION, "smooth");
    expect(result).toHaveLength(4);
  });

  it("single element works", () => {
    const result = pulseEmphasis(makeElements(1), TOTAL_DURATION, "smooth");
    expect(result).toHaveLength(1);
    expect(result[0].durationFrames).toBeGreaterThan(0);
  });

  it("last element has extended durationFrames (1.5x baseDuration)", () => {
    // smooth: durationRange[1]=45, emphasis durationFrames = round(45 * 1.5) = 68
    const result = pulseEmphasis(makeElements(4), TOTAL_DURATION, "smooth");
    const baseDuration = 45;
    const expectedEmphasisDuration = Math.round(baseDuration * 1.5);
    const lastIdx = result.length - 1;
    expect(result[lastIdx].durationFrames).toBe(expectedEmphasisDuration);
  });

  it("pre-emphasis elements have base durationFrames", () => {
    // smooth: baseDuration=45
    const result = pulseEmphasis(makeElements(4), TOTAL_DURATION, "smooth");
    expect(result[0].durationFrames).toBe(45);
    expect(result[1].durationFrames).toBe(45);
    expect(result[2].durationFrames).toBe(45);
  });

  it("delays are sequential for pre-emphasis elements (smooth: stagger=5)", () => {
    const result = pulseEmphasis(makeElements(4), TOTAL_DURATION, "smooth");
    expect(result[0].delayFrames).toBe(0);
    expect(result[1].delayFrames).toBe(5);
    expect(result[2].delayFrames).toBe(10);
  });

  it("emphasis element has extra gap beyond normal stagger (EMPHASIS_GAP=8)", () => {
    // smooth: stagger=5
    // 4 elements: emphasisIdx=3, prevDelay=(3-1)*5=10, emphasisDelay=10+5+8=23
    const result = pulseEmphasis(makeElements(4), TOTAL_DURATION, "smooth");
    const normalNextDelay = result[2].delayFrames + 5; // would be 15 without gap
    expect(result[3].delayFrames).toBeGreaterThan(normalNextDelay);
    expect(result[3].delayFrames).toBe(23);
  });

  it("explicit 'emphasis' role overrides last-element default", () => {
    const elements: VCLElement[] = [
      {
        id: "a",
        type: "body-text" as const,
        props: { text: "A", role: "item-0" },
      },
      {
        id: "b",
        type: "body-text" as const,
        props: { text: "B", role: "emphasis" },
      },
      {
        id: "c",
        type: "body-text" as const,
        props: { text: "C", role: "item-2" },
      },
    ];
    const result = pulseEmphasis(elements, TOTAL_DURATION, "smooth");
    // Element at index 1 (role=emphasis) gets extended duration
    const baseDuration = 45;
    expect(result[1].durationFrames).toBe(Math.round(baseDuration * 1.5));
    // Element after emphasis (index 2) gets base duration
    expect(result[2].durationFrames).toBe(baseDuration);
  });

  it("all timings have non-negative delayFrames", () => {
    const result = pulseEmphasis(makeElements(5), TOTAL_DURATION, "smooth");
    for (const t of result) {
      expect(t.delayFrames).toBeGreaterThanOrEqual(0);
    }
  });
});
