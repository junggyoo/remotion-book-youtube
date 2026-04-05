import { describe, it, expect } from "vitest";
import type { VCLElement, FormatConfig } from "@/types";
import { orbit } from "../orbit";
import { scatteredCards } from "../scatteredCards";
import { comparisonBar } from "../comparisonBar";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const longformConfig: FormatConfig = {
  width: 1920,
  height: 1080,
  safeArea: { outerMarginX: 96, outerMarginY: 54 },
  gutter: 24,
  typeScale: {
    headlineL: 56,
    headlineM: 44,
    headlineS: 36,
    bodyL: 28,
    bodyM: 24,
    bodyS: 20,
    captionL: 18,
    captionM: 16,
    captionS: 14,
  },
};

function makeElements(count: number): VCLElement[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `el-${i}`,
    type: "body-text" as const,
    props: { text: `Element ${i}`, role: `item-${i}` },
  }));
}

// ---------------------------------------------------------------------------
// orbit
// ---------------------------------------------------------------------------

describe("orbit layout", () => {
  it("returns empty array for 0 elements", () => {
    expect(orbit([], longformConfig)).toEqual([]);
  });

  it("returns correct number of positions", () => {
    const result = orbit(makeElements(5), longformConfig);
    expect(result).toHaveLength(5);
  });

  it("single element works", () => {
    const result = orbit(makeElements(1), longformConfig);
    expect(result).toHaveLength(1);
    expect(result[0].width).toBeGreaterThan(0);
    expect(result[0].height).toBeGreaterThan(0);
  });

  it("all positions are within safe area bounds (with element size margin)", () => {
    const fmt = longformConfig;
    const safeLeft = fmt.safeArea.outerMarginX;
    const safeTop = fmt.safeArea.outerMarginY;
    const safeRight = fmt.width - fmt.safeArea.outerMarginX;
    const safeBottom = fmt.height - fmt.safeArea.outerMarginY;

    const result = orbit(makeElements(6), fmt);
    for (const pos of result) {
      // Center of element must be within safe area
      const cx = pos.left + pos.width / 2;
      const cy = pos.top + pos.height / 2;
      expect(cx).toBeGreaterThanOrEqual(safeLeft);
      expect(cx).toBeLessThanOrEqual(safeRight);
      expect(cy).toBeGreaterThanOrEqual(safeTop);
      expect(cy).toBeLessThanOrEqual(safeBottom);
    }
  });

  it("elements are distributed in ellipse pattern (positions are not all the same)", () => {
    const result = orbit(makeElements(4), longformConfig);
    const centers = result.map((p) => ({
      x: p.left + p.width / 2,
      y: p.top + p.height / 2,
    }));
    // All centers should be unique
    for (let i = 0; i < centers.length; i++) {
      for (let j = i + 1; j < centers.length; j++) {
        const dx = centers[i].x - centers[j].x;
        const dy = centers[i].y - centers[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        expect(dist).toBeGreaterThan(1);
      }
    }
  });

  it("elements span both x and y axes (ellipse, not a line)", () => {
    const result = orbit(makeElements(4), longformConfig);
    const xs = result.map((p) => p.left + p.width / 2);
    const ys = result.map((p) => p.top + p.height / 2);
    const xSpread = Math.max(...xs) - Math.min(...xs);
    const ySpread = Math.max(...ys) - Math.min(...ys);
    expect(xSpread).toBeGreaterThan(50);
    expect(ySpread).toBeGreaterThan(50);
  });

  it("all positions have positive width and height", () => {
    const result = orbit(makeElements(3), longformConfig);
    for (const pos of result) {
      expect(pos.width).toBeGreaterThan(0);
      expect(pos.height).toBeGreaterThan(0);
    }
  });
});

// ---------------------------------------------------------------------------
// scatteredCards
// ---------------------------------------------------------------------------

describe("scatteredCards layout", () => {
  it("returns empty array for 0 elements", () => {
    expect(scatteredCards([], longformConfig)).toEqual([]);
  });

  it("returns correct number of positions", () => {
    const result = scatteredCards(makeElements(4), longformConfig);
    expect(result).toHaveLength(4);
  });

  it("single element works", () => {
    const result = scatteredCards(makeElements(1), longformConfig);
    expect(result).toHaveLength(1);
    expect(result[0].width).toBeGreaterThan(0);
    expect(result[0].height).toBeGreaterThan(0);
  });

  it("positions are deterministic (same input = same output)", () => {
    const elements = makeElements(4);
    const result1 = scatteredCards(elements, longformConfig);
    const result2 = scatteredCards(elements, longformConfig);
    expect(result1).toEqual(result2);
  });

  it("all positions within reasonable bounds (near safe area)", () => {
    const fmt = longformConfig;
    // Allow a small margin beyond safe area for pseudo-random offsets (maxOffsetRatio=0.03)
    const margin = fmt.width * 0.05;
    const result = scatteredCards(makeElements(6), fmt);
    for (const pos of result) {
      expect(pos.left).toBeGreaterThanOrEqual(
        fmt.safeArea.outerMarginX - margin,
      );
      expect(pos.top).toBeGreaterThanOrEqual(
        fmt.safeArea.outerMarginY - margin,
      );
      expect(pos.left + pos.width).toBeLessThanOrEqual(
        fmt.width - fmt.safeArea.outerMarginX + margin,
      );
      expect(pos.top + pos.height).toBeLessThanOrEqual(
        fmt.height - fmt.safeArea.outerMarginY + margin,
      );
    }
  });

  it("cards have positive dimensions", () => {
    const result = scatteredCards(makeElements(3), longformConfig);
    for (const pos of result) {
      expect(pos.width).toBeGreaterThan(0);
      expect(pos.height).toBeGreaterThan(0);
    }
  });

  it("5+ elements uses 3 columns (cards are narrower)", () => {
    const fmt = longformConfig;
    const result5 = scatteredCards(makeElements(5), fmt);
    const result3 = scatteredCards(makeElements(3), fmt);
    // 3-col cards are narrower than 2-col cards (ignoring offsets, compare base widths)
    expect(result5[0].width).toBeLessThan(result3[0].width);
  });
});

// ---------------------------------------------------------------------------
// comparisonBar
// ---------------------------------------------------------------------------

describe("comparisonBar layout", () => {
  it("returns empty array for 0 elements", () => {
    expect(comparisonBar([], longformConfig)).toEqual([]);
  });

  it("returns correct number of positions", () => {
    const result = comparisonBar(makeElements(4), longformConfig);
    expect(result).toHaveLength(4);
  });

  it("single element (just headline) works", () => {
    const result = comparisonBar(makeElements(1), longformConfig);
    expect(result).toHaveLength(1);
    expect(result[0].width).toBeGreaterThan(0);
    expect(result[0].height).toBeGreaterThan(0);
  });

  it("first element (headline) is at top of safe area", () => {
    const result = comparisonBar(makeElements(3), longformConfig);
    expect(result[0].top).toBe(longformConfig.safeArea.outerMarginY);
  });

  it("headline spans full safe width", () => {
    const fmt = longformConfig;
    const safeWidth = fmt.width - fmt.safeArea.outerMarginX * 2;
    const result = comparisonBar(makeElements(3), fmt);
    expect(result[0].width).toBeCloseTo(safeWidth, 1);
  });

  it("bar elements are positioned below headline", () => {
    const result = comparisonBar(makeElements(3), longformConfig);
    // bars start at 25% offset from safe top
    const safeTop = longformConfig.safeArea.outerMarginY;
    const safeHeight =
      longformConfig.height - longformConfig.safeArea.outerMarginY * 2;
    const barsTop = safeTop + safeHeight * 0.25;
    expect(result[1].top).toBeCloseTo(barsTop, 1);
  });

  it("bar elements are stacked vertically", () => {
    const result = comparisonBar(makeElements(4), longformConfig);
    expect(result[2].top).toBeGreaterThan(result[1].top);
    expect(result[3].top).toBeGreaterThan(result[2].top);
  });

  it("bars are narrower than headline (barMaxWidthRatio=0.85)", () => {
    const result = comparisonBar(makeElements(3), longformConfig);
    expect(result[1].width).toBeLessThan(result[0].width);
  });

  it("custom barMaxWidthRatio is respected", () => {
    const result = comparisonBar(makeElements(3), longformConfig, {
      barMaxWidthRatio: 0.5,
    });
    const safeWidth =
      longformConfig.width - longformConfig.safeArea.outerMarginX * 2;
    expect(result[1].width).toBeCloseTo(safeWidth * 0.5, 1);
  });

  it("all positions have positive dimensions", () => {
    const result = comparisonBar(makeElements(3), longformConfig);
    for (const pos of result) {
      expect(pos.width).toBeGreaterThan(0);
      expect(pos.height).toBeGreaterThan(0);
    }
  });
});
