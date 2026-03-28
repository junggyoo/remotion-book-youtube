import { describe, it, expect } from "vitest";
import { resolveDirectionFromFingerprint } from "../interpretationBootstrap";
import { resolveMotionParams } from "../directionResolver";
import { adaptPresetToSceneSpec } from "../presetAdapter";
import { getDirectionProfile } from "../profiles";

describe("Direction integration", () => {
  const psychologyBook = {
    genre: "psychology" as const,
    structure: "framework",
    emotionalTone: ["disciplined"],
  };

  const selfHelpBook = {
    genre: "selfHelp" as const,
    structure: "framework",
    emotionalTone: ["uplifting"],
  };

  it("psychology and selfHelp books get different directions", () => {
    const psychDir = resolveDirectionFromFingerprint(psychologyBook);
    const helpDir = resolveDirectionFromFingerprint(selfHelpBook);
    expect(psychDir.name).toBe("analytical");
    expect(helpDir.name).toBe("persuasive");
    expect(psychDir.name).not.toBe(helpDir.name);
  });

  it("different directions produce different motion params", () => {
    const psychMotion = resolveMotionParams(
      getDirectionProfile("analytical").base,
      150,
    );
    const helpMotion = resolveMotionParams(
      getDirectionProfile("persuasive").base,
      150,
    );

    // Enter preset differs
    expect(psychMotion.enterPreset).not.toBe(helpMotion.enterPreset);
    // Stagger delay differs
    expect(psychMotion.staggerDelay).not.toBe(helpMotion.staggerDelay);
    // Hold frames differ
    expect(psychMotion.holdFrames).not.toBe(helpMotion.holdFrames);
  });

  it("same keyInsight scene gets different SceneSpecs for different books", () => {
    const scene = {
      id: "insight-01",
      type: "keyInsight" as const,
      narrationText: "동일한 나레이션 텍스트",
      content: { headline: "동일한 헤드라인", supportText: "동일한 서포트" },
    };

    const psychDir = resolveDirectionFromFingerprint(psychologyBook);
    const helpDir = resolveDirectionFromFingerprint(selfHelpBook);

    const psychSpec = adaptPresetToSceneSpec(scene, psychDir, "framework");
    const helpSpec = adaptPresetToSceneSpec(scene, helpDir, "framework");

    // Same family (both are keyInsight → concept-introduction)
    expect(psychSpec.family).toBe(helpSpec.family);
    // But different direction
    expect(psychSpec.direction.name).toBe("analytical");
    expect(helpSpec.direction.name).toBe("persuasive");
    // Which means different pacing
    expect(psychSpec.direction.base.pacing).toBeLessThan(
      helpSpec.direction.base.pacing,
    );
  });

  it("analytical has slower stagger than persuasive (the key visual difference)", () => {
    const analytical = resolveMotionParams(
      getDirectionProfile("analytical").base,
      150,
    );
    const persuasive = resolveMotionParams(
      getDirectionProfile("persuasive").base,
      150,
    );

    // analytical: methodical, slow → higher stagger delay
    expect(analytical.staggerDelay).toBeGreaterThan(persuasive.staggerDelay);
    // analytical: heavier enter → different preset
    expect(analytical.enterPreset).not.toBe(persuasive.enterPreset);
  });

  it("all 7 profiles produce valid and distinct motion params", () => {
    const profiles = [
      "analytical",
      "systematic",
      "contemplative",
      "persuasive",
      "urgent",
      "inspirational",
      "investigative",
    ] as const;
    const results = profiles.map((p) => ({
      name: p,
      motion: resolveMotionParams(getDirectionProfile(p).base, 150),
    }));

    // All have valid presets
    for (const r of results) {
      expect(r.motion.enterPreset).toBeTruthy();
      expect(r.motion.staggerDelay).toBeGreaterThan(0);
      expect(r.motion.holdFrames).toBeGreaterThanOrEqual(0);
    }

    // Not all identical
    const uniqueEnterPresets = new Set(
      results.map((r) => r.motion.enterPreset),
    );
    expect(uniqueEnterPresets.size).toBeGreaterThan(1);
  });
});
