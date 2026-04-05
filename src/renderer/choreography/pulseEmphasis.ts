// ============================================================
// VCL Choreography — pulse-emphasis
// All elements stagger normally; the last element (or element
// with role="emphasis"/"cta") gets an extra delay gap and
// extended hold (1.5x durationFrames).
// ============================================================

import type { VCLElement, MotionPresetKey } from "@/types";
import { resolvePreset } from "@/design/tokens/motion";
import type { ChoreographyFunction, ChoreographyTiming } from "./types";

/** Stagger delays (in frames) per preset key — faster than default */
const PRESET_STAGGER: Record<string, number> = {
  gentle: 7,
  smooth: 5,
  snappy: 3,
  heavy: 5,
  dramatic: 7,
  wordReveal: 4,
  punchy: 3,
};

/** Extra gap before the emphasis element enters */
const EMPHASIS_GAP = 8;

/** Hold multiplier for the emphasis element */
const EMPHASIS_HOLD_MULTIPLIER = 1.5;

export const pulseEmphasis: ChoreographyFunction = (
  elements: VCLElement[],
  totalDuration: number,
  preset: MotionPresetKey,
  _config?: Record<string, unknown>,
): ChoreographyTiming[] => {
  if (elements.length === 0) return [];

  const resolved = resolvePreset(preset);
  const baseDuration = resolved.durationRange[1];
  const stagger = PRESET_STAGGER[preset as string] ?? 5;

  // Find emphasis index: explicit role first, then last element
  const emphasisIndex = (() => {
    const roleMatch = elements.findIndex((el) => {
      const role = ((el.props.role as string) ?? "").toLowerCase();
      return role === "emphasis" || role === "cta";
    });
    return roleMatch !== -1 ? roleMatch : elements.length - 1;
  })();

  return elements.map((_, i) => {
    if (i < emphasisIndex) {
      // Normal stagger for pre-emphasis elements
      return { delayFrames: i * stagger, durationFrames: baseDuration };
    }

    if (i === emphasisIndex) {
      // Emphasis element: extra gap after previous element + extended hold
      const prevDelay = emphasisIndex > 0 ? (emphasisIndex - 1) * stagger : 0;
      const delayFrames = prevDelay + stagger + EMPHASIS_GAP;
      const durationFrames = Math.round(
        baseDuration * EMPHASIS_HOLD_MULTIPLIER,
      );
      return { delayFrames, durationFrames };
    }

    // Elements after emphasis (if any): continue staggering from emphasis
    const emphasisDelay =
      (emphasisIndex > 0 ? (emphasisIndex - 1) * stagger : 0) +
      stagger +
      EMPHASIS_GAP;
    const delayFrames = emphasisDelay + (i - emphasisIndex) * stagger;
    return { delayFrames, durationFrames: baseDuration };
  });
};

export default pulseEmphasis;
