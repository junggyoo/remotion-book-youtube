import { describe, it, expect } from "vitest";
import {
  observeBlueprint,
  checkPromotionEligibility,
  type PromotionObservation,
} from "../promotionObserver";
import type { SynthesizedBlueprint, Beat, BeatTimingResolution } from "@/types";
import { useTheme } from "@/design/themes/useTheme";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const testTheme = useTheme("dark", "selfHelp");

function makeBeat(
  id: string,
  startRatio: number,
  endRatio: number,
  activates: string[] = [],
  emphasisTargets?: string[],
  narrationText?: string,
): Beat {
  return {
    id,
    role: "reveal",
    startRatio,
    endRatio,
    activates,
    emphasisTargets,
    narrationText,
  };
}

function makeBeatTiming(
  beatId: string,
  resolvedStart: number,
  resolvedEnd: number,
  origStart: number,
  origEnd: number,
): BeatTimingResolution {
  return {
    beatId,
    resolvedStartFrame: resolvedStart,
    resolvedEndFrame: resolvedEnd,
    originalStartRatio: origStart,
    originalEndRatio: origEnd,
  };
}

function makeSynthBlueprint(
  id: string,
  durationFrames: number = 300,
): SynthesizedBlueprint {
  return {
    id,
    intent: "test",
    origin: "synthesized",
    layout: "center-focus",
    elements: [],
    choreography: "reveal-sequence",
    motionPreset: "heavy",
    format: "longform",
    theme: testTheme,
    from: 0,
    durationFrames,
    mediaPlan: {
      narrationText: "테스트",
      captionPlan: {
        mode: "sentence-by-sentence",
        maxCharsPerLine: 28,
        maxLines: 2,
        leadFrames: 3,
        trailFrames: 6,
        transitionStyle: "fade-slide",
      },
      audioPlan: { bgmTrack: null, sfxCues: [] },
      assetPlan: { required: [], optional: [] },
    },
    lifecycle: "candidate-promotable",
    fallbackPreset: "keyInsight",
    fallbackContent: {
      headline: "test",
      supportText: "test",
    } as any,
  };
}

// ---------------------------------------------------------------------------
// observeBlueprint
// ---------------------------------------------------------------------------

describe("observeBlueprint", () => {
  it("returns null for preset blueprints", () => {
    const bp = makeSynthBlueprint("test-01");
    (bp as any).origin = "preset";
    const result = observeBlueprint(bp, "book-01", [], []);
    expect(result).toBeNull();
  });

  it("returns observation for synthesized blueprints", () => {
    const bp = makeSynthBlueprint("test-01");
    const beats = [
      makeBeat("b1", 0, 0.5, ["headline"], ["핵심"], "핵심 내용"),
      makeBeat("b2", 0.5, 1, ["support"], undefined, "지원 내용"),
    ];
    const timings = [
      makeBeatTiming("b1", 0, 100, 0, 0.5),
      makeBeatTiming("b2", 100, 250, 0.5, 1),
    ];

    const obs = observeBlueprint(bp, "book-01", beats, timings);
    expect(obs).not.toBeNull();
    expect(obs!.blueprintId).toBe("test-01");
    expect(obs!.bookId).toBe("book-01");
    expect(obs!.renderStable).toBe(true);
  });

  it("computes focusClarity as 1/avgActivates", () => {
    const bp = makeSynthBlueprint("test-01");
    const beats = [
      makeBeat("b1", 0, 0.5, ["headline"]),
      makeBeat("b2", 0.5, 1, ["support"]),
    ];
    const obs = observeBlueprint(bp, "book-01", beats, []);
    expect(obs!.focusClarity).toBe(1.0);
  });

  it("computes focusClarity < 1 when avg activates > 1", () => {
    const bp = makeSynthBlueprint("test-01");
    const beats = [
      makeBeat("b1", 0, 0.5, ["a", "b", "c"]),
      makeBeat("b2", 0.5, 1, ["d"]),
    ];
    const obs = observeBlueprint(bp, "book-01", beats, []);
    expect(obs!.focusClarity).toBe(0.5);
  });

  it("computes maxActivatesPerBeat correctly", () => {
    const bp = makeSynthBlueprint("test-01");
    const beats = [
      makeBeat("b1", 0, 0.5, ["a", "b", "c", "d"]),
      makeBeat("b2", 0.5, 1, ["e"]),
    ];
    const obs = observeBlueprint(bp, "book-01", beats, []);
    expect(obs!.maxActivatesPerBeat).toBe(4);
  });

  it("computes timingCoherence=1 when all beats VTT-matched", () => {
    const bp = makeSynthBlueprint("test-01", 300);
    const beats = [
      makeBeat("b1", 0, 0.5, [], undefined, "나레이션"),
      makeBeat("b2", 0.5, 1, [], undefined, "두번째"),
    ];
    const timings = [
      makeBeatTiming("b1", 0, 120, 0, 0.5),
      makeBeatTiming("b2", 130, 280, 0.5, 1),
    ];
    const obs = observeBlueprint(bp, "book-01", beats, timings);
    expect(obs!.timingCoherence).toBe(1.0);
  });

  it("computes timingCoherence < 1 when some beats ratio-fallback", () => {
    const bp = makeSynthBlueprint("test-01", 300);
    const beats = [
      makeBeat("b1", 0, 0.5, [], undefined, "나레이션"),
      makeBeat("b2", 0.5, 1, [], undefined, "두번째"),
    ];
    const timings = [
      makeBeatTiming("b1", 0, 150, 0, 0.5),
      makeBeatTiming("b2", 160, 280, 0.5, 1),
    ];
    const obs = observeBlueprint(bp, "book-01", beats, timings);
    expect(obs!.timingCoherence).toBe(0.5);
  });

  it("includes reuseCandidateTag from fallbackPreset and layout", () => {
    const bp = makeSynthBlueprint("test-01");
    const obs = observeBlueprint(bp, "book-01", [], []);
    expect(obs!.reuseCandidateTag).toContain("preset:keyInsight");
    expect(obs!.reuseCandidateTag).toContain("layout:center-focus");
  });

  it("handles empty beats gracefully", () => {
    const bp = makeSynthBlueprint("test-01");
    const obs = observeBlueprint(bp, "book-01", [], []);
    expect(obs!.focusClarity).toBe(1.0);
    expect(obs!.maxActivatesPerBeat).toBe(0);
    expect(obs!.timingCoherence).toBe(1.0);
  });
});

// ---------------------------------------------------------------------------
// checkPromotionEligibility
// ---------------------------------------------------------------------------

describe("checkPromotionEligibility", () => {
  const goodObs: PromotionObservation = {
    blueprintId: "test-01",
    sceneType: "keyInsight",
    bookId: "book-01",
    renderStable: true,
    timingCoherence: 0.9,
    focusClarity: 0.8,
    motionEntropy: 0.5,
    maxActivatesPerBeat: 2,
    maxConcurrentChannels: 2,
  };

  it("marks good observation as eligible", () => {
    const { eligible, failures } = checkPromotionEligibility(goodObs);
    expect(eligible).toBe(true);
    expect(failures).toHaveLength(0);
  });

  it("rejects when renderStable is false", () => {
    const { eligible } = checkPromotionEligibility({
      ...goodObs,
      renderStable: false,
    });
    expect(eligible).toBe(false);
  });

  it("rejects when timingCoherence below threshold", () => {
    const { eligible, failures } = checkPromotionEligibility({
      ...goodObs,
      timingCoherence: 0.5,
    });
    expect(eligible).toBe(false);
    expect(failures[0]).toContain("timingCoherence");
  });

  it("rejects when focusClarity below threshold", () => {
    const { eligible, failures } = checkPromotionEligibility({
      ...goodObs,
      focusClarity: 0.3,
    });
    expect(eligible).toBe(false);
    expect(failures[0]).toContain("focusClarity");
  });

  it("rejects when motionEntropy above threshold", () => {
    const { eligible, failures } = checkPromotionEligibility({
      ...goodObs,
      motionEntropy: 1.5,
    });
    expect(eligible).toBe(false);
    expect(failures[0]).toContain("motionEntropy");
  });

  it("rejects when maxActivatesPerBeat above threshold", () => {
    const { eligible, failures } = checkPromotionEligibility({
      ...goodObs,
      maxActivatesPerBeat: 5,
    });
    expect(eligible).toBe(false);
    expect(failures[0]).toContain("maxActivatesPerBeat");
  });

  it("accumulates multiple failures", () => {
    const { eligible, failures } = checkPromotionEligibility({
      ...goodObs,
      renderStable: false,
      timingCoherence: 0.1,
      focusClarity: 0.1,
    });
    expect(eligible).toBe(false);
    expect(failures.length).toBeGreaterThanOrEqual(3);
  });
});
