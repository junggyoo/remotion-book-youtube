/**
 * P2-5: ScenePromoter Observation
 *
 * Computes PromotionObservation metrics for each SynthesizedBlueprint.
 * Logs observations — does NOT auto-promote. Actual promotion is deferred
 * until 3+ books accumulate observations.
 */

import type {
  SceneBlueprint,
  SynthesizedBlueprint,
  Beat,
  BeatTimingResolution,
  ChannelKey,
} from "@/types";
import {
  getEffectivePolicy,
  getActiveChannelCap,
  CHANNEL_PRIORITY,
} from "@/design/tokens/emphasisPolicy";
import type { BookArtDirection } from "@/planning/types";

// ---------------------------------------------------------------------------
// Observation type
// ---------------------------------------------------------------------------

export interface PromotionObservation {
  blueprintId: string;
  sceneType: string;
  bookId: string;
  renderStable: boolean;
  /** beatTimingResolver VTT matching success rate (0~1) */
  timingCoherence: number;
  /** beat당 평균 activates 수의 역수 (1/avg). Higher = clearer focus */
  focusClarity: number;
  /** 동시 움직임 수 / simultaneousMotionCap (<=1 is within budget) */
  motionEntropy: number;
  /** worst case: 단일 beat 최대 activates 수 */
  maxActivatesPerBeat: number;
  /** worst case: 동시 반응 채널 최대 수 */
  maxConcurrentChannels: number;
  reuseCandidateTag?: string[];
}

// ---------------------------------------------------------------------------
// Promotion thresholds (reference only — not enforced)
// ---------------------------------------------------------------------------

export const PROMOTION_THRESHOLDS = {
  timingCoherence: 0.8,
  focusClarity: 0.5,
  motionEntropy: 1.0,
  maxActivatesPerBeat: 3,
  renderStable: true,
} as const;

// ---------------------------------------------------------------------------
// Core logic
// ---------------------------------------------------------------------------

/**
 * Compute timingCoherence: ratio of beats that were VTT-matched (not ratio-fallback).
 * A beat is VTT-matched if its resolved frames differ from ratio-based frames.
 */
function computeTimingCoherence(
  beats: Beat[],
  beatTimings: BeatTimingResolution[],
  sceneDurationFrames: number,
): number {
  if (beats.length === 0 || beatTimings.length === 0) return 1.0;

  let vttMatchedCount = 0;

  for (const bt of beatTimings) {
    const beat = beats.find((b) => b.id === bt.beatId);
    if (!beat) continue;

    const ratioStart = Math.round(beat.startRatio * sceneDurationFrames);
    const ratioEnd = Math.round(beat.endRatio * sceneDurationFrames);

    // If resolved frames differ from ratio-based, VTT matching succeeded
    const isVttMatched =
      bt.resolvedStartFrame !== ratioStart || bt.resolvedEndFrame !== ratioEnd;

    // Visual-only beats (no narrationText) always use ratio — count as matched
    const isVisualOnly =
      !beat.narrationText || beat.narrationText.trim() === "";

    if (isVttMatched || isVisualOnly) {
      vttMatchedCount++;
    }
  }

  return vttMatchedCount / beatTimings.length;
}

/**
 * Compute focusClarity: 1 / (average activates per beat).
 * Higher value = fewer simultaneous activations = clearer focus.
 */
function computeFocusClarity(beats: Beat[]): number {
  if (beats.length === 0) return 1.0;

  const totalActivates = beats.reduce(
    (sum, b) => sum + (b.activates?.length ?? 0),
    0,
  );
  const avgActivates = totalActivates / beats.length;

  if (avgActivates === 0) return 1.0;
  return 1 / avgActivates;
}

/**
 * Compute motionEntropy: max concurrent channels across beats / cap.
 */
function computeMotionEntropy(
  beats: Beat[],
  sceneType: string,
  artDirection?: BookArtDirection,
): { motionEntropy: number; maxConcurrentChannels: number } {
  const emphasisStyle = artDirection?.emphasisStyle ?? "balanced";
  const cap = getActiveChannelCap(
    artDirection?.simultaneousMotionCap ?? 2,
    "longform",
  );

  let maxConcurrentChannels = 0;

  for (const beat of beats) {
    if (!beat.emphasisTargets || beat.emphasisTargets.length === 0) continue;

    // Count how many channels would activate for this beat
    const policy = getEffectivePolicy(sceneType as any, emphasisStyle);
    let activeCount = 0;
    for (const ch of CHANNEL_PRIORITY) {
      if (policy[ch]) activeCount++;
    }

    maxConcurrentChannels = Math.max(maxConcurrentChannels, activeCount);
  }

  if (cap === 0) return { motionEntropy: 0, maxConcurrentChannels };
  return {
    motionEntropy: maxConcurrentChannels / cap,
    maxConcurrentChannels,
  };
}

function computeMaxActivatesPerBeat(beats: Beat[]): number {
  if (beats.length === 0) return 0;
  return Math.max(...beats.map((b) => b.activates?.length ?? 0));
}

function inferReuseCandidateTags(blueprint: SynthesizedBlueprint): string[] {
  const tags: string[] = [];
  if (blueprint.fallbackPreset) {
    tags.push(`preset:${blueprint.fallbackPreset}`);
  }
  if (blueprint.layout) {
    tags.push(`layout:${blueprint.layout}`);
  }
  return tags;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function observeBlueprint(
  blueprint: SceneBlueprint,
  bookId: string,
  beats: Beat[],
  beatTimings: BeatTimingResolution[],
  artDirection?: BookArtDirection,
): PromotionObservation | null {
  // Only observe synthesized blueprints
  if (blueprint.origin !== "synthesized") return null;

  const synth = blueprint as SynthesizedBlueprint;
  const sceneType =
    (synth as any).sceneType ?? synth.fallbackPreset ?? "custom";

  const timingCoherence = computeTimingCoherence(
    beats,
    beatTimings,
    synth.durationFrames,
  );
  const focusClarity = computeFocusClarity(beats);
  const maxActivatesPerBeat = computeMaxActivatesPerBeat(beats);
  const { motionEntropy, maxConcurrentChannels } = computeMotionEntropy(
    beats,
    sceneType,
    artDirection,
  );

  return {
    blueprintId: synth.id,
    sceneType,
    bookId,
    renderStable: true, // placeholder — actual render stability from Stage 8
    timingCoherence,
    focusClarity,
    motionEntropy,
    maxActivatesPerBeat,
    maxConcurrentChannels,
    reuseCandidateTag: inferReuseCandidateTags(synth),
  };
}

/**
 * Check if an observation meets all promotion thresholds.
 * Returns { eligible, failures }.
 */
export function checkPromotionEligibility(obs: PromotionObservation): {
  eligible: boolean;
  failures: string[];
} {
  const failures: string[] = [];

  if (!obs.renderStable) {
    failures.push("renderStable is false");
  }
  if (obs.timingCoherence < PROMOTION_THRESHOLDS.timingCoherence) {
    failures.push(
      `timingCoherence ${obs.timingCoherence.toFixed(2)} < ${PROMOTION_THRESHOLDS.timingCoherence}`,
    );
  }
  if (obs.focusClarity < PROMOTION_THRESHOLDS.focusClarity) {
    failures.push(
      `focusClarity ${obs.focusClarity.toFixed(2)} < ${PROMOTION_THRESHOLDS.focusClarity}`,
    );
  }
  if (obs.motionEntropy > PROMOTION_THRESHOLDS.motionEntropy) {
    failures.push(
      `motionEntropy ${obs.motionEntropy.toFixed(2)} > ${PROMOTION_THRESHOLDS.motionEntropy}`,
    );
  }
  if (obs.maxActivatesPerBeat > PROMOTION_THRESHOLDS.maxActivatesPerBeat) {
    failures.push(
      `maxActivatesPerBeat ${obs.maxActivatesPerBeat} > ${PROMOTION_THRESHOLDS.maxActivatesPerBeat}`,
    );
  }

  return { eligible: failures.length === 0, failures };
}
