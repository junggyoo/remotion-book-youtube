// ============================================================
// VCL Choreography — wave-fill
// Wave-like sequential fill. Same row enters simultaneously;
// rows stagger with a larger gap. Good for grid layouts.
// ============================================================

import type { VCLElement, MotionPresetKey } from "@/types";
import { resolvePreset } from "@/design/tokens/motion";
import type { ChoreographyFunction, ChoreographyTiming } from "./types";

/** Stagger delays (in frames) per preset key — individual element stagger */
const PRESET_STAGGER: Record<string, number> = {
  gentle: 10,
  smooth: 8,
  snappy: 5,
  heavy: 7,
  dramatic: 9,
  wordReveal: 5,
  punchy: 4,
};

export const waveFill: ChoreographyFunction = (
  elements: VCLElement[],
  totalDuration: number,
  preset: MotionPresetKey,
  _config?: Record<string, unknown>,
): ChoreographyTiming[] => {
  if (elements.length === 0) return [];

  const resolved = resolvePreset(preset);
  const elementDuration = resolved.durationRange[1];
  const stagger = PRESET_STAGGER[preset as string] ?? 8;
  const rowGap = stagger * 2;

  // 7+ elements: 3 per row, otherwise 2 per row
  const perRow = elements.length >= 7 ? 3 : 2;

  return elements.map((_, i) => {
    const row = Math.floor(i / perRow);
    const delayFrames = row * rowGap;
    return { delayFrames, durationFrames: elementDuration };
  });
};

export default waveFill;
