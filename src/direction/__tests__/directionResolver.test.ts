import { describe, it, expect } from "vitest";
import { resolveMotionParams } from "../directionResolver";
import { getDirectionProfile } from "../profiles";
import type { MotionPresetKey } from "@/types";

describe("directionResolver", () => {
  it("analytical → heavy enter, smooth emphasis", () => {
    const resolved = resolveMotionParams(
      getDirectionProfile("analytical").base,
    );
    expect(resolved.enterPreset).toBe("heavy");
    expect(resolved.emphasisPreset).toBe("smooth");
  });

  it("persuasive → snappy enter, punchy emphasis", () => {
    const resolved = resolveMotionParams(
      getDirectionProfile("persuasive").base,
    );
    expect(resolved.enterPreset).toBe("snappy");
    expect(resolved.emphasisPreset).toBe("punchy");
  });

  it("contemplative → dramatic enter, gentle emphasis", () => {
    const resolved = resolveMotionParams(
      getDirectionProfile("contemplative").base,
    );
    expect(resolved.enterPreset).toBe("dramatic");
    expect(resolved.emphasisPreset).toBe("gentle");
  });

  it("all presets are valid MotionPresetKeys", () => {
    const valid: MotionPresetKey[] = [
      "gentle",
      "smooth",
      "snappy",
      "heavy",
      "dramatic",
      "wordReveal",
      "punchy",
    ];
    for (const name of [
      "analytical",
      "systematic",
      "contemplative",
      "persuasive",
      "urgent",
      "inspirational",
      "investigative",
    ] as const) {
      const resolved = resolveMotionParams(getDirectionProfile(name).base);
      expect(valid).toContain(resolved.enterPreset);
      expect(valid).toContain(resolved.emphasisPreset);
    }
  });

  it("holdFrames scales with holdRatio", () => {
    const analytical = resolveMotionParams(
      getDirectionProfile("analytical").base,
      150,
    );
    const urgent = resolveMotionParams(getDirectionProfile("urgent").base, 150);
    expect(analytical.holdFrames).toBeGreaterThan(urgent.holdFrames);
  });

  it("overrides merge into base", () => {
    const base = getDirectionProfile("analytical").base;
    const resolved = resolveMotionParams(base, 150, { energy: 0.9 });
    const resolvedBase = resolveMotionParams(base, 150);
    expect(resolved.enterPreset).not.toBe(resolvedBase.enterPreset);
  });

  it("staggerDelay decreases with higher pacing", () => {
    const slow = resolveMotionParams(getDirectionProfile("contemplative").base);
    const fast = resolveMotionParams(getDirectionProfile("urgent").base);
    expect(slow.staggerDelay).toBeGreaterThan(fast.staggerDelay);
  });
});
