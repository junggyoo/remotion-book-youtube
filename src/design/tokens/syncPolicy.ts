/**
 * Narration sync policy tokens (P2-3).
 *
 * Defines per-scene-type sync behavior and emphasis timing.
 */

import type {
  EmphasisTimingPolicy,
  SyncPolicyMode,
  SceneType,
  FormatKey,
} from "@/types";

// ---------------------------------------------------------------------------
// Scene type → sync policy mode
// ---------------------------------------------------------------------------

export const SYNC_POLICY: Record<SceneType, SyncPolicyMode> = {
  highlight: "phrase",
  keyInsight: "concept",
  framework: "concept",
  quote: "phrase",
  compareContrast: "concept",
  application: "concept",
  cover: "none",
  closing: "none",
  chapterDivider: "none",
  data: "none",
  timeline: "none",
  transition: "none",
  listReveal: "concept",
  splitQuote: "phrase",
  custom: "none",
};

// ---------------------------------------------------------------------------
// Emphasis timing per policy mode
// ---------------------------------------------------------------------------

export const EMPHASIS_TIMING: Record<SyncPolicyMode, EmphasisTimingPolicy> = {
  concept: { onsetFrames: 3, holdFrames: 36, decayFrames: 12 },
  phrase: { onsetFrames: 0, holdFrames: 18, decayFrames: 6 },
  none: { onsetFrames: 0, holdFrames: 0, decayFrames: 0 },
};

/**
 * Get emphasis timing for a scene type and format.
 * Shorts format halves holdFrames for readability on small screens.
 */
export function getEmphasisTiming(
  sceneType: SceneType,
  format: FormatKey = "longform",
): EmphasisTimingPolicy {
  const policyMode = SYNC_POLICY[sceneType];
  const timing = EMPHASIS_TIMING[policyMode];

  if (format === "shorts") {
    return {
      ...timing,
      holdFrames: Math.round(timing.holdFrames * 0.5),
    };
  }

  return timing;
}
