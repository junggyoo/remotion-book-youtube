import type { VCLElement, MotionPresetKey } from "@/types";

export interface ChoreographyTiming {
  delayFrames: number;
  durationFrames: number;
}

export type ChoreographyFunction = (
  elements: VCLElement[],
  totalDuration: number,
  preset: MotionPresetKey,
  config?: Record<string, unknown>,
) => ChoreographyTiming[];
