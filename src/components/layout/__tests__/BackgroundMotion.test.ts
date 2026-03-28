import { describe, it, expect } from "vitest";
import { getNoiseStyle } from "../BackgroundMotion";

describe("BackgroundMotion", () => {
  it("exports a valid React component", async () => {
    const mod = await import("../BackgroundMotion");
    expect(mod.BackgroundMotion).toBeDefined();
    expect(typeof mod.BackgroundMotion).toBe("function");
  });

  it("defaults to mode=grain with opacity 0.03", () => {
    const style = getNoiseStyle("grain", 0);
    expect(style.opacity).toBe(0.03);
    expect(style.transform).toBeUndefined();
  });

  it("returns zero opacity for mode=none", () => {
    const style = getNoiseStyle("none", 0);
    expect(style.opacity).toBe(0);
    expect(style.transform).toBeUndefined();
  });

  it("subtle-drift returns non-zero transform", () => {
    const style = getNoiseStyle("subtle-drift", 100);
    expect(style.opacity).toBe(0.03);
    expect(style.transform).toBeDefined();
    expect(style.transform).toContain("translate(");
    // Verify the values are non-zero at frame 100
    const match = style.transform!.match(
      /translate\(([-\d.]+)px,\s*([-\d.]+)px\)/,
    );
    expect(match).not.toBeNull();
    const x = parseFloat(match![1]);
    const y = parseFloat(match![2]);
    expect(Math.abs(x) + Math.abs(y)).toBeGreaterThan(0);
  });

  it("grain returns same opacity regardless of frame", () => {
    const s0 = getNoiseStyle("grain", 0);
    const s100 = getNoiseStyle("grain", 100);
    expect(s0.opacity).toBe(s100.opacity);
  });

  it("subtle-drift transform changes over frames", () => {
    const s0 = getNoiseStyle("subtle-drift", 0);
    const s50 = getNoiseStyle("subtle-drift", 50);
    expect(s0.transform).not.toBe(s50.transform);
  });
});
