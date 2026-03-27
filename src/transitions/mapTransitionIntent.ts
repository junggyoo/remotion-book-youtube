import { linearTiming } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { slide } from "@remotion/transitions/slide";
import { wipe } from "@remotion/transitions/wipe";
import type { TransitionPresentation } from "@remotion/transitions";

export type TransitionIntent = "cut" | "fade" | "directional" | "morph";

export interface TransitionMapping {
  presentation: TransitionPresentation<Record<string, unknown>>;
  timing: ReturnType<typeof linearTiming>;
  durationInFrames: number;
}

/**
 * Maps a storyboard transitionIntent to a Remotion transition presentation + timing.
 * Returns null for "cut" (hard cut, no transition element).
 *
 * Note: "morph" maps to wipe() as a 1st approximation.
 * A true morph transition would require custom implementation.
 */
export function mapTransitionIntent(
  intent: TransitionIntent,
): TransitionMapping | null {
  switch (intent) {
    case "cut":
      return null;

    case "fade":
      return {
        presentation: fade(),
        timing: linearTiming({ durationInFrames: 15 }),
        durationInFrames: 15,
      };

    case "directional":
      return {
        presentation: slide({ direction: "from-right" }),
        timing: linearTiming({ durationInFrames: 20 }),
        durationInFrames: 20,
      };

    case "morph":
      // 1st approximation: wipe() as morph stand-in.
      // TODO(P2): Replace with a true morph/crossfade-with-motion effect.
      return {
        presentation: wipe(),
        timing: linearTiming({ durationInFrames: 20 }),
        durationInFrames: 20,
      };

    default:
      return null;
  }
}

/**
 * Calculate total overlap frames from an array of transitionIntents.
 * Used by buildProps to compute overlap-aware totalDurationFrames.
 */
export function calculateTransitionOverlap(
  intents: (TransitionIntent | undefined)[],
): number {
  return intents.reduce((total, intent) => {
    if (!intent) return total;
    const mapping = mapTransitionIntent(intent);
    return total + (mapping?.durationInFrames ?? 0);
  }, 0);
}
