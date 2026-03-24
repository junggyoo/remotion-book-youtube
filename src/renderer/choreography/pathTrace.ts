import type { VCLElement, MotionPresetKey } from "@/types";
import { resolvePreset } from "@/design/tokens/motion";
import type { ChoreographyFunction, ChoreographyTiming } from "./types";

export const pathTrace: ChoreographyFunction = (
  elements: VCLElement[],
  _totalDuration: number,
  preset: MotionPresetKey,
  config?: Record<string, unknown>,
): ChoreographyTiming[] => {
  if (elements.length === 0) return [];

  const resolved = resolvePreset(preset);
  const baseDuration = resolved.durationRange[1];
  const overlapRatio =
    typeof config?.overlapRatio === "number" ? config.overlapRatio : 0.3;

  const timings: ChoreographyTiming[] = [];

  // First element gets a longer hold (1.5x normal duration)
  const firstDuration = Math.round(baseDuration * 1.5);
  timings.push({ delayFrames: 0, durationFrames: firstDuration });

  // Each subsequent element's delay = previous delay + (previous duration * (1 - overlapRatio))
  for (let i = 1; i < elements.length; i++) {
    const prev = timings[i - 1];
    const delay =
      prev.delayFrames + Math.round(prev.durationFrames * (1 - overlapRatio));
    timings.push({ delayFrames: delay, durationFrames: baseDuration });
  }

  return timings;
};

export default pathTrace;
