import type { VCLElement, MotionPresetKey } from "@/types";
import { resolvePreset } from "@/design/tokens/motion";
import type { ChoreographyFunction, ChoreographyTiming } from "./types";

/** Stagger delays (in frames) per preset key */
const PRESET_STAGGER: Record<string, number> = {
  gentle: 8,
  smooth: 6,
  snappy: 4,
  heavy: 5,
  dramatic: 7,
  wordReveal: 4,
  punchy: 3,
};

/** Gap added between the two halves: midIndex * stagger + 12 */
const HALF_GAP_BASE = 12;

export const splitReveal: ChoreographyFunction = (
  elements: VCLElement[],
  totalDuration: number,
  preset: MotionPresetKey,
  _config?: Record<string, unknown>,
): ChoreographyTiming[] => {
  if (elements.length === 0) return [];

  const resolved = resolvePreset(preset);
  const elementDuration = resolved.durationRange[1];

  const stagger = PRESET_STAGGER[preset as string] ?? 6;

  const n = elements.length;
  const midIndex = Math.floor(n / 2);

  // Left half: indices 0 .. midIndex-1
  // Right half: indices midIndex .. n-1
  // Gap inserted between halves: midIndex * stagger + 12
  const halfGap = midIndex * stagger + HALF_GAP_BASE;

  return elements.map((_, i) => {
    let delayFrames: number;
    if (i < midIndex) {
      // Left half enters first
      delayFrames = i * stagger;
    } else {
      // Right half enters after gap
      const rightIdx = i - midIndex;
      delayFrames = halfGap + rightIdx * stagger;
    }
    return { delayFrames, durationFrames: elementDuration };
  });
};

export default splitReveal;
