// ============================================================
// VCL Choreography — zoom-focus
// Primary element enters first with extended hold;
// secondary elements stagger in after primary settles.
// ============================================================

import type { VCLElement, MotionPresetKey } from "@/types";
import { resolvePreset } from "@/design/tokens/motion";
import type { ChoreographyFunction, ChoreographyTiming } from "./types";

/** Hold multiplier for the primary element */
const PRIMARY_HOLD_MULTIPLIER = 1.5;

/** Base delay before secondaries start (after primary settles) */
const SECONDARY_OFFSET_BASE = 18;

/** Stagger between secondary elements */
const SECONDARY_STAGGER: Record<string, number> = {
  gentle: 8,
  smooth: 5,
  snappy: 3,
  heavy: 6,
  dramatic: 8,
  wordReveal: 4,
  punchy: 3,
};

export const zoomFocus: ChoreographyFunction = (
  elements: VCLElement[],
  totalDuration: number,
  preset: MotionPresetKey,
  _config?: Record<string, unknown>,
): ChoreographyTiming[] => {
  if (elements.length === 0) return [];

  const resolved = resolvePreset(preset);
  const baseDuration = resolved.durationRange[1];
  const stagger = SECONDARY_STAGGER[preset as string] ?? 5;

  const primaryDuration = Math.round(baseDuration * PRIMARY_HOLD_MULTIPLIER);
  const secondaryStart = primaryDuration + SECONDARY_OFFSET_BASE;

  return elements.map((_, i) => {
    if (i === 0) {
      // Primary element: enters first with extended duration
      return { delayFrames: 0, durationFrames: primaryDuration };
    }
    // Secondary elements: stagger in after primary hold
    const secondaryDelay = secondaryStart + (i - 1) * stagger;
    return { delayFrames: secondaryDelay, durationFrames: baseDuration };
  });
};

export default zoomFocus;
