import { describe, it, expect } from "vitest";
import type { VCLElement, FormatConfig } from "@/types";
import { timelineV } from "../layouts/timelineV";
import { quoteHold } from "../layouts/quoteHold";
import { bandDivider } from "../layouts/bandDivider";
import { layoutRegistry } from "../layouts/index";
import { choreographyRegistry } from "../choreography/index";

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

const makeFormat = (overrides?: Partial<FormatConfig>): FormatConfig => ({
  width: 1920,
  height: 1080,
  safeArea: {
    outerMarginX: 80,
    outerMarginY: 60,
    bodyMaxWidth: 1200,
  },
  gutter: 16,
  gridColumns: 12,
  ...overrides,
});

const makeEl = (
  type = "text",
  props: Record<string, unknown> = {},
): VCLElement =>
  ({
    id: Math.random().toString(36).slice(2),
    type,
    props,
  }) as unknown as VCLElement;

// ---------------------------------------------------------------------------
// timeline-v
// ---------------------------------------------------------------------------

describe("timelineV layout", () => {
  it("returns empty array for 0 elements", () => {
    expect(timelineV([], makeFormat())).toEqual([]);
  });

  it("returns 1 position for 1 element", () => {
    const result = timelineV([makeEl()], makeFormat());
    expect(result).toHaveLength(1);
    expect(result[0].width).toBeGreaterThan(0);
    expect(result[0].height).toBeGreaterThan(0);
  });

  it("stacks elements vertically with correct count", () => {
    const fmt = makeFormat();
    const result = timelineV([makeEl(), makeEl(), makeEl()], fmt);
    expect(result).toHaveLength(3);
    // Each element top should be strictly greater than previous
    expect(result[1].top).toBeGreaterThan(result[0].top);
    expect(result[2].top).toBeGreaterThan(result[1].top);
  });

  it("respects safe area margins", () => {
    const fmt = makeFormat();
    const result = timelineV([makeEl(), makeEl()], fmt);
    for (const pos of result) {
      expect(pos.top).toBeGreaterThanOrEqual(fmt.safeArea.outerMarginY);
    }
  });

  it("element width = safeWidth * 0.3", () => {
    const fmt = makeFormat();
    const safeWidth = fmt.width - fmt.safeArea.outerMarginX * 2;
    const result = timelineV([makeEl()], fmt);
    expect(result[0].width).toBeCloseTo(safeWidth * 0.3, 1);
  });

  it("default axisX=0.5 centers elements horizontally", () => {
    const fmt = makeFormat();
    const safeLeft = fmt.safeArea.outerMarginX;
    const safeWidth = fmt.width - fmt.safeArea.outerMarginX * 2;
    const elementWidth = safeWidth * 0.3;
    const expectedLeft = safeLeft + safeWidth * 0.5 - elementWidth / 2;
    const result = timelineV([makeEl()], fmt);
    expect(result[0].left).toBeCloseTo(expectedLeft, 1);
  });

  it("custom axisX shifts elements", () => {
    const fmt = makeFormat();
    const resultDefault = timelineV([makeEl()], fmt);
    const resultShifted = timelineV([makeEl()], fmt, { axisX: 0.3 });
    expect(resultShifted[0].left).not.toBeCloseTo(resultDefault[0].left, 1);
  });

  it("heights evenly fill safe area minus gutters", () => {
    const fmt = makeFormat();
    const safeHeight = fmt.height - fmt.safeArea.outerMarginY * 2;
    const n = 4;
    const totalGap = fmt.gutter * (n - 1);
    const expectedHeight = (safeHeight - totalGap) / n;
    const result = timelineV(
      Array.from({ length: n }, () => makeEl()),
      fmt,
    );
    for (const pos of result) {
      expect(pos.height).toBeCloseTo(expectedHeight, 1);
    }
  });
});

// ---------------------------------------------------------------------------
// quote-hold
// ---------------------------------------------------------------------------

describe("quoteHold layout", () => {
  it("returns empty array for 0 elements", () => {
    expect(quoteHold([], makeFormat())).toEqual([]);
  });

  it("returns positions for elements without roles (fallback)", () => {
    const result = quoteHold([makeEl("text"), makeEl("text")], makeFormat());
    expect(result).toHaveLength(2);
    expect(result[0].width).toBeGreaterThan(0);
  });

  it("quote element (role=quote) gets bodyMaxWidth", () => {
    const fmt = makeFormat();
    const quoteEl = makeEl("text", { role: "quote" });
    const otherEl = makeEl("text");
    const result = quoteHold([quoteEl, otherEl], fmt);
    expect(result[0].width).toBeCloseTo(fmt.safeArea.bodyMaxWidth!, 1);
  });

  it("attribution (caption) gets narrower width than quote", () => {
    const fmt = makeFormat();
    const quoteEl = makeEl("text", { role: "quote" });
    const captionEl = makeEl("caption");
    const result = quoteHold([quoteEl, captionEl], fmt);
    expect(result[1].width).toBeLessThan(result[0].width);
  });

  it("attribution is positioned below quote", () => {
    const fmt = makeFormat();
    const quoteEl = makeEl("text", { role: "quote" });
    const captionEl = makeEl("caption");
    const result = quoteHold([quoteEl, captionEl], fmt);
    expect(result[1].top).toBeGreaterThan(result[0].top);
  });

  it("extra elements are stacked below attribution", () => {
    const fmt = makeFormat();
    const quoteEl = makeEl("text", { role: "quote" });
    const captionEl = makeEl("caption");
    const extraEl = makeEl("text");
    const result = quoteHold([quoteEl, captionEl, extraEl], fmt);
    expect(result).toHaveLength(3);
    expect(result[2].top).toBeGreaterThan(result[1].top);
  });

  it("fallback path stacks all elements", () => {
    const result = quoteHold(
      [makeEl("text"), makeEl("text"), makeEl("text")],
      makeFormat(),
    );
    expect(result).toHaveLength(3);
    expect(result[1].top).toBeGreaterThan(result[0].top);
    expect(result[2].top).toBeGreaterThan(result[1].top);
  });
});

// ---------------------------------------------------------------------------
// band-divider
// ---------------------------------------------------------------------------

describe("bandDivider layout", () => {
  it("returns empty array for 0 elements", () => {
    expect(bandDivider([], makeFormat())).toEqual([]);
  });

  it("returns 1 position for 1 element (just the divider)", () => {
    const result = bandDivider([makeEl()], makeFormat());
    expect(result).toHaveLength(1);
  });

  it("divider is full safeWidth", () => {
    const fmt = makeFormat();
    const safeWidth = fmt.width - fmt.safeArea.outerMarginX * 2;
    const result = bandDivider([makeEl()], fmt);
    expect(result[0].width).toBeCloseTo(safeWidth, 1);
  });

  it("divider is thin (4% of safeHeight)", () => {
    const fmt = makeFormat();
    const safeHeight = fmt.height - fmt.safeArea.outerMarginY * 2;
    const result = bandDivider([makeEl()], fmt);
    expect(result[0].height).toBeCloseTo(safeHeight * 0.04, 1);
  });

  it("divider positioned at 30% from top of safe area", () => {
    const fmt = makeFormat();
    const safeTop = fmt.safeArea.outerMarginY;
    const safeHeight = fmt.height - fmt.safeArea.outerMarginY * 2;
    const expectedTop = safeTop + safeHeight * 0.3;
    const result = bandDivider([makeEl()], fmt);
    expect(result[0].top).toBeCloseTo(expectedTop, 1);
  });

  it("remaining elements use narrower column (70% safeWidth)", () => {
    const fmt = makeFormat();
    const safeWidth = fmt.width - fmt.safeArea.outerMarginX * 2;
    const expectedColumnWidth = safeWidth * 0.7;
    const result = bandDivider([makeEl(), makeEl(), makeEl()], fmt);
    expect(result[1].width).toBeCloseTo(expectedColumnWidth, 1);
    expect(result[2].width).toBeCloseTo(expectedColumnWidth, 1);
  });

  it("stacks remaining elements below the divider", () => {
    const result = bandDivider([makeEl(), makeEl(), makeEl()], makeFormat());
    expect(result).toHaveLength(3);
    expect(result[1].top).toBeGreaterThan(result[0].top + result[0].height);
    expect(result[2].top).toBeGreaterThan(result[1].top);
  });
});

// ---------------------------------------------------------------------------
// Registry verification
// ---------------------------------------------------------------------------

describe("layout registry", () => {
  it("has timeline-v registered", () => {
    expect(layoutRegistry["timeline-v"]).toBeDefined();
    expect(typeof layoutRegistry["timeline-v"].fn).toBe("function");
  });

  it("has quote-hold registered", () => {
    expect(layoutRegistry["quote-hold"]).toBeDefined();
    expect(typeof layoutRegistry["quote-hold"].fn).toBe("function");
  });

  it("has band-divider registered", () => {
    expect(layoutRegistry["band-divider"]).toBeDefined();
    expect(typeof layoutRegistry["band-divider"].fn).toBe("function");
  });

  it("timeline-v compatible choreographies include reveal-sequence and path-trace", () => {
    expect(layoutRegistry["timeline-v"].compatibleChoreographies).toContain(
      "reveal-sequence",
    );
    expect(layoutRegistry["timeline-v"].compatibleChoreographies).toContain(
      "path-trace",
    );
  });
});

describe("choreography registry", () => {
  it("has count-up registered", () => {
    expect(choreographyRegistry["count-up"]).toBeDefined();
    expect(typeof choreographyRegistry["count-up"]).toBe("function");
  });
});
