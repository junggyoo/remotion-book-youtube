import { describe, it, expect } from "vitest";
import { adviseLayout } from "../layoutAdvisor";

describe("layoutAdvisor", () => {
  it("reflective-anchor → quote-hold layout hint (family affinity)", () => {
    const result = adviseLayout({ family: "reflective-anchor" });
    expect(result.layoutHint).toBe("quote-hold");
    expect(result.sources.some((s) => s.includes("reflective-anchor"))).toBe(
      true,
    );
  });

  it("structural-bridge → band-divider layout hint (family affinity)", () => {
    const result = adviseLayout({ family: "structural-bridge" });
    expect(result.layoutHint).toBe("band-divider");
    expect(result.sources.some((s) => s.includes("structural-bridge"))).toBe(
      true,
    );
  });

  it("artDirection.layoutBias='grid-heavy' → grid-expand (when no family affinity)", () => {
    const result = adviseLayout({
      family: "closing-synthesis",
      artDirection: { layoutBias: "grid-heavy" },
    });
    expect(result.layoutHint).toBe("grid-expand");
    expect(result.sources.some((s) => s.includes("grid-heavy"))).toBe(true);
  });

  it("artDirection.layoutBias='asymmetric' → split-compare", () => {
    const result = adviseLayout({
      family: "closing-synthesis",
      artDirection: { layoutBias: "asymmetric" },
    });
    expect(result.layoutHint).toBe("split-compare");
    expect(result.sources.some((s) => s.includes("asymmetric"))).toBe(true);
  });

  it("family affinity overrides artDirection bias (reflective-anchor + grid-heavy → still quote-hold)", () => {
    const result = adviseLayout({
      family: "reflective-anchor",
      artDirection: { layoutBias: "grid-heavy" },
    });
    expect(result.layoutHint).toBe("quote-hold");
    // grid-heavy source should NOT appear because family affinity took over
    expect(result.sources.some((s) => s.includes("grid-heavy"))).toBe(false);
  });

  it("climax + tension-comparison → choreography split-reveal", () => {
    const result = adviseLayout({
      family: "tension-comparison",
      segment: {
        role: "climax",
        durationRatio: 0.3,
        intent: "peak",
        requiredDelivery: [],
      },
    });
    expect(result.choreographyHint).toBe("split-reveal");
    expect(result.sources.some((s) => s.includes("split-reveal"))).toBe(true);
  });

  it("concept-introduction → grid-n layout + stagger-clockwise choreography (family affinity)", () => {
    const result = adviseLayout({ family: "concept-introduction" });
    expect(result.layoutHint).toBe("grid-n");
    expect(result.choreographyHint).toBe("stagger-clockwise");
    expect(result.sources.some((s) => s.includes("concept-introduction"))).toBe(
      true,
    );
  });

  it("no artDirection, no affinity → undefined hints", () => {
    const result = adviseLayout({ family: "opening-hook" });
    expect(result.layoutHint).toBeUndefined();
    expect(result.choreographyHint).toBeUndefined();
    expect(result.sources).toHaveLength(0);
  });

  it("sources array has human-readable trace strings", () => {
    const result = adviseLayout({
      family: "reflective-anchor",
      segment: {
        role: "setup",
        durationRatio: 0.2,
        intent: "introduce",
        requiredDelivery: [],
      },
    });
    expect(result.sources.length).toBeGreaterThan(0);
    for (const s of result.sources) {
      expect(typeof s).toBe("string");
      expect(s.length).toBeGreaterThan(0);
      expect(s).toMatch(/→|:/);
    }
  });

  it("non-climax segment → family choreography affinity applied", () => {
    const result = adviseLayout({
      family: "tension-comparison",
      segment: {
        role: "setup",
        durationRatio: 0.2,
        intent: "introduce",
        requiredDelivery: [],
      },
    });
    // tension-comparison has family-choreography affinity → split-reveal
    expect(result.choreographyHint).toBe("split-reveal");
  });

  it("concept-introduction + centered bias → grid-n (family affinity overrides artDirection)", () => {
    const result = adviseLayout({
      family: "concept-introduction",
      artDirection: { layoutBias: "centered" },
    });
    expect(result.layoutHint).toBe("grid-n");
    // family affinity wins, centered source should NOT appear
    expect(result.sources.some((s) => s.includes("concept-introduction"))).toBe(
      true,
    );
    expect(result.sources.some((s) => s.includes("centered"))).toBe(false);
  });

  it("closing-synthesis (no affinity) + centered bias → center-focus", () => {
    const result = adviseLayout({
      family: "closing-synthesis",
      artDirection: { layoutBias: "centered" },
    });
    expect(result.layoutHint).toBe("center-focus");
    expect(result.sources.some((s) => s.includes("centered"))).toBe(true);
  });
});
