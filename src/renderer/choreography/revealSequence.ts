import type { VCLElement, MotionPresetKey } from "@/types";
import { resolvePreset } from "@/design/tokens/motion";
import motionPresetsData from "@/design/tokens/motion-presets.json";
import type { ChoreographyFunction, ChoreographyTiming } from "./types";

export const revealSequence: ChoreographyFunction = (
  elements: VCLElement[],
  totalDuration: number,
  preset: MotionPresetKey,
  _config?: Record<string, unknown>,
): ChoreographyTiming[] => {
  if (elements.length === 0) return [];

  const resolved = resolvePreset(preset);
  const elementDuration = resolved.durationRange[1];
  const baseStagger = motionPresetsData.defaults.staggerFrames;

  const n = elements.length;

  // If stagger * (N-1) + elementDuration > totalDuration, reduce stagger proportionally
  const naturalEnd = baseStagger * (n - 1) + elementDuration;
  const stagger =
    naturalEnd > totalDuration && n > 1
      ? Math.max(1, Math.floor((totalDuration - elementDuration) / (n - 1)))
      : baseStagger;

  return elements.map((_, i) => ({
    delayFrames: i * stagger,
    durationFrames: elementDuration,
  }));
};

export default revealSequence;
