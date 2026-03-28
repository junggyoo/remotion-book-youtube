/**
 * useNarrationSync — Semantic emphasis sync hook (P2-3).
 *
 * Matches currently-spoken VTT words against beat emphasisTargets.
 * Only emphasisTargets words trigger visual highlight — all other words
 * are displayed in subtitles only.
 *
 * Emphasis timing (onset/hold/decay) varies by scene type via syncPolicy tokens.
 */

import { useMemo } from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import type { Caption } from "@remotion/captions";
import type { SceneType, FormatKey, NarrationSyncState } from "@/types";
import { SYNC_POLICY, getEmphasisTiming } from "@/design/tokens/syncPolicy";
import { matchEmphasisTarget } from "@/utils/matchEmphasisTarget";

interface UseNarrationSyncOptions {
  /** Word-level captions from VTT parsing */
  captions: Caption[];
  /** Current beat's emphasisTargets */
  emphasisTargets: string[];
  /** Scene type for sync policy lookup */
  sceneType: SceneType;
  /** Format for timing adjustment */
  format?: FormatKey;
}

/**
 * Compute narration sync state for the current frame.
 *
 * Returns which word is being spoken, whether it's an emphasis word,
 * and the emphasis progress (0~1) based on onset/hold/decay timing.
 */
export function useNarrationSync({
  captions,
  emphasisTargets,
  sceneType,
  format = "longform",
}: UseNarrationSyncOptions): NarrationSyncState {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const syncPolicy = SYNC_POLICY[sceneType];
  const timing = useMemo(
    () => getEmphasisTiming(sceneType, format),
    [sceneType, format],
  );

  // No sync for this scene type → early return
  if (syncPolicy === "none") {
    return {
      currentWord: null,
      isEmphasisWord: false,
      activeEmphasisTargets: emphasisTargets,
      emphasisProgress: 0,
      matchedTarget: null,
    };
  }

  // Find the current word based on frame time
  const currentTimeMs = (frame / fps) * 1000;

  const currentCaption =
    captions.find(
      (c) => currentTimeMs >= c.startMs && currentTimeMs < c.endMs,
    ) ?? null;

  const currentWord = currentCaption?.text?.trim() ?? null;

  // Match against emphasis targets
  const matchedTarget = currentWord
    ? matchEmphasisTarget(currentWord, emphasisTargets)
    : null;

  const isEmphasisWord = matchedTarget !== null;

  // Compute emphasis progress based on onset/hold/decay timing
  let emphasisProgress = 0;

  if (isEmphasisWord && currentCaption) {
    const wordStartFrame = Math.round((currentCaption.startMs / 1000) * fps);
    const framesSinceWordStart = frame - wordStartFrame;

    const { onsetFrames, holdFrames, decayFrames } = timing;
    const totalDuration = onsetFrames + holdFrames + decayFrames;

    if (totalDuration > 0) {
      if (framesSinceWordStart < onsetFrames) {
        // Onset phase: ramp up 0→1
        emphasisProgress =
          onsetFrames > 0 ? framesSinceWordStart / onsetFrames : 1;
      } else if (framesSinceWordStart < onsetFrames + holdFrames) {
        // Hold phase: stay at 1
        emphasisProgress = 1;
      } else if (framesSinceWordStart < totalDuration) {
        // Decay phase: ramp down 1→0
        const decayElapsed = framesSinceWordStart - onsetFrames - holdFrames;
        emphasisProgress = decayFrames > 0 ? 1 - decayElapsed / decayFrames : 0;
      } else {
        emphasisProgress = 0;
      }
    }
  }

  return {
    currentWord,
    isEmphasisWord,
    activeEmphasisTargets: emphasisTargets,
    emphasisProgress: Math.max(0, Math.min(1, emphasisProgress)),
    matchedTarget,
  };
}
