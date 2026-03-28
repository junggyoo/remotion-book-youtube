import { describe, it, expect } from "vitest";
import { DIRECTION_PROFILES } from "../../profiles";
import { analyzeNarrationSemantics } from "../BeatSemanticAnalyzer";
import { resolveBeatProfile } from "../BeatProfileResolver";
import { compileBeatTimeline } from "../BeatTimelineCompiler";
import { generateBeatDebugReport } from "../BeatDebugView";

const SAMPLE_NARRATION = `핵심 습관의 원리는 복리 효과입니다. 매일 1%씩 개선하면 1년 후 37배가 됩니다! 하지만 대부분의 사람들은 이걸 과소평가합니다. 연구에 따르면 습관 형성에는 평균 66일이 걸립니다. 결국 중요한 건 시스템입니다.`;

describe("Phase 1 Integration: 같은 내용, 다른 호흡", () => {
  const plan = analyzeNarrationSemantics(SAMPLE_NARRATION);

  it("same narration produces different timingIntent for analytical vs persuasive", () => {
    const analytical = resolveBeatProfile(plan, DIRECTION_PROFILES.analytical);
    const persuasive = resolveBeatProfile(plan, DIRECTION_PROFILES.persuasive);
    expect(analytical.timingIntent).not.toBe(persuasive.timingIntent);
  });

  it("same narration produces different emphasisStrategy for analytical vs persuasive", () => {
    const analytical = resolveBeatProfile(plan, DIRECTION_PROFILES.analytical);
    const persuasive = resolveBeatProfile(plan, DIRECTION_PROFILES.persuasive);
    expect(analytical.emphasisStrategy).not.toBe(persuasive.emphasisStrategy);
  });

  it("compiled beat ratios differ between analytical and persuasive", () => {
    const analyticalResolved = resolveBeatProfile(
      plan,
      DIRECTION_PROFILES.analytical,
    );
    const persuasiveResolved = resolveBeatProfile(
      plan,
      DIRECTION_PROFILES.persuasive,
    );

    const analyticalProfile = compileBeatTimeline(
      plan,
      analyticalResolved,
      DIRECTION_PROFILES.analytical,
    );
    const persuasiveProfile = compileBeatTimeline(
      plan,
      persuasiveResolved,
      DIRECTION_PROFILES.persuasive,
    );

    // Both should have valid ratios
    expect(analyticalProfile.segments.length).toBeGreaterThan(0);
    expect(persuasiveProfile.segments.length).toBeGreaterThan(0);

    // At least one segment should have different ratios
    const analyticalRatios = analyticalProfile.segments.map(
      (s) => s.endRatio - s.startRatio,
    );
    const persuasiveRatios = persuasiveProfile.segments.map(
      (s) => s.endRatio - s.startRatio,
    );

    const ratiosDiffer =
      analyticalRatios.some((r, i) => {
        if (i >= persuasiveRatios.length) return true;
        return Math.abs(r - persuasiveRatios[i]) > 0.01;
      }) || analyticalRatios.length !== persuasiveRatios.length;

    expect(ratiosDiffer).toBe(true);
  });

  it("all 7 direction profiles produce valid BeatProfiles", () => {
    for (const [name, profile] of Object.entries(DIRECTION_PROFILES)) {
      const resolved = resolveBeatProfile(plan, profile);
      const beatProfile = compileBeatTimeline(plan, resolved, profile);

      expect(beatProfile.segments.length).toBeGreaterThan(0);
      expect(beatProfile.timingIntent).toBeTruthy();
      expect(beatProfile.emphasisStrategy).toBeTruthy();

      // Ratios valid
      const lastSeg = beatProfile.segments[beatProfile.segments.length - 1];
      expect(lastSeg.endRatio).toBeCloseTo(1.0, 2);
      expect(beatProfile.segments[0].startRatio).toBe(0);

      // No segment below minimum
      for (const seg of beatProfile.segments) {
        expect(seg.endRatio - seg.startRatio).toBeGreaterThanOrEqual(0.119);
      }
    }
  });

  it("debug report generates without error", () => {
    const resolved = resolveBeatProfile(plan, DIRECTION_PROFILES.analytical);
    const beatProfile = compileBeatTimeline(
      plan,
      resolved,
      DIRECTION_PROFILES.analytical,
    );
    const report = generateBeatDebugReport(
      "test-scene",
      plan,
      resolved,
      beatProfile,
      "analytical",
    );

    expect(report.sceneId).toBe("test-scene");
    expect(report.direction).toBe("analytical");
    expect(report.segments.length).toBe(beatProfile.segments.length);
  });

  it("presetAdapter populates beatProfile in SceneSpec", async () => {
    const { adaptPresetToSceneSpec } = await import("../../presetAdapter");
    const scene = {
      id: "test-01",
      type: "keyInsight" as const,
      narrationText: SAMPLE_NARRATION,
      content: { headline: "테스트" },
    };
    const spec = adaptPresetToSceneSpec(scene, DIRECTION_PROFILES.analytical);
    expect(spec.beatProfile).toBeDefined();
    expect(spec.beatProfile!.segments.length).toBeGreaterThan(0);
  });
});
