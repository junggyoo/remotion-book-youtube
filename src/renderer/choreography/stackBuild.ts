// ============================================================
// VCL Choreography — stack-build
// Elements build up from bottom to top with longer stagger.
// Pairs with pyramid and stacked-layers layouts.
// ============================================================

import type { VCLElement, MotionPresetKey } from "@/types";
import { resolvePreset } from "@/design/tokens/motion";
import type { ChoreographyFunction, ChoreographyTiming } from "./types";

/** Stagger delays (in frames) per preset key — longer than reveal-sequence */
const PRESET_STAGGER: Record<string, number> = {
  gentle: 12,
  smooth: 10,
  snappy: 6,
  heavy: 8,
  dramatic: 10,
  wordReveal: 6,
  punchy: 5,
};

export const stackBuild: ChoreographyFunction = (
  elements: VCLElement[],
  totalDuration: number,
  preset: MotionPresetKey,
  _config?: Record<string, unknown>,
): ChoreographyTiming[] => {
  if (elements.length === 0) return [];

  const resolved = resolvePreset(preset);
  const elementDuration = resolved.durationRange[1];
  const stagger = PRESET_STAGGER[preset as string] ?? 8;

  const n = elements.length;

  // Build from bottom: last element enters first, first element enters last
  return elements.map((_, i) => {
    const reverseIndex = n - 1 - i;
    const delayFrames = reverseIndex * stagger;
    return { delayFrames, durationFrames: elementDuration };
  });
};

export default stackBuild;
