import type { VCLElement, MotionPresetKey } from "@/types";
import type { ChoreographyFunction, ChoreographyTiming } from "./types";
import { revealSequence } from "./revealSequence";
import { staggerClockwise } from "./staggerClockwise";
import { pathTrace } from "./pathTrace";
import { splitReveal } from "./splitReveal";
import { countUp } from "./countUp";
import { stackBuild } from "./stackBuild";
import { zoomFocus } from "./zoomFocus";

export type { ChoreographyFunction, ChoreographyTiming };
export {
  revealSequence,
  staggerClockwise,
  pathTrace,
  splitReveal,
  countUp,
  stackBuild,
  zoomFocus,
};

export const choreographyRegistry: Record<string, ChoreographyFunction> = {
  "reveal-sequence": revealSequence,
  "stagger-clockwise": staggerClockwise,
  "path-trace": pathTrace,
  "split-reveal": splitReveal,
  "count-up": countUp,
  "stack-build": stackBuild,
  "zoom-focus": zoomFocus,
};

export function useChoreography(
  choreography: string,
  motionPreset: MotionPresetKey,
): {
  plan(elements: VCLElement[], durationFrames: number): ChoreographyTiming[];
} {
  const fn = choreographyRegistry[choreography];

  if (!fn) {
    console.warn(
      `[choreography] Unknown choreography type "${choreography}". Falling back to reveal-sequence.`,
    );
  }

  const resolvedFn = fn ?? revealSequence;

  return {
    plan(elements: VCLElement[], durationFrames: number): ChoreographyTiming[] {
      return resolvedFn(elements, durationFrames, motionPreset);
    },
  };
}
