// ============================================================
// VCL Choreography — countUp
// Data-oriented hold extension: elements with type "number-display" get
// 1.5x hold duration; others get standard timing.
// ============================================================

import type { VCLElement, MotionPresetKey } from "@/types";
import type { ChoreographyFunction, ChoreographyTiming } from "./types";

const STAGGER_MAP: Record<string, number> = {
  gentle: 8,
  smooth: 6,
  snappy: 4,
  heavy: 5,
  dramatic: 7,
  wordReveal: 4,
  punchy: 3,
};

const DEFAULT_STAGGER = 6;
const BASE_DURATION = 30;
const NUMBER_DISPLAY_MULTIPLIER = 1.5;

export const countUp: ChoreographyFunction = (
  elements: VCLElement[],
  totalDuration: number,
  preset: MotionPresetKey,
  _config?: Record<string, unknown>,
): ChoreographyTiming[] => {
  if (elements.length === 0) return [];

  const stagger = STAGGER_MAP[preset as string] ?? DEFAULT_STAGGER;

  return elements.map((el, i) => {
    const isNumberDisplay = el.type === "number-display";
    const durationFrames = isNumberDisplay
      ? Math.round(BASE_DURATION * NUMBER_DISPLAY_MULTIPLIER)
      : BASE_DURATION;
    return {
      delayFrames: i * stagger,
      durationFrames,
    };
  });
};
