// ============================================================
// VCL Choreography — morph-transition
// Two-phase reveal: group 1 staggers in, pause, group 2 staggers in.
// Groups split by role ("before"/"left" vs "after"/"right") or by midpoint.
// Pairs with compare-contrast and split layouts.
// ============================================================

import type { VCLElement, MotionPresetKey } from "@/types";
import { resolvePreset } from "@/design/tokens/motion";
import type { ChoreographyFunction, ChoreographyTiming } from "./types";

/** Stagger delays (in frames) per preset key */
const PRESET_STAGGER: Record<string, number> = {
  gentle: 8,
  smooth: 6,
  snappy: 4,
  heavy: 6,
  dramatic: 8,
  wordReveal: 4,
  punchy: 3,
};

/** Pause frames between the two groups */
const GROUP_PAUSE = 15;

export const morphTransition: ChoreographyFunction = (
  elements: VCLElement[],
  totalDuration: number,
  preset: MotionPresetKey,
  _config?: Record<string, unknown>,
): ChoreographyTiming[] => {
  if (elements.length === 0) return [];

  const resolved = resolvePreset(preset);
  const elementDuration = resolved.durationRange[1];
  const stagger = PRESET_STAGGER[preset as string] ?? 6;
  const midpoint = Math.ceil(elements.length / 2);

  // Partition into two groups based on role or index
  const group1Indices: number[] = [];
  const group2Indices: number[] = [];

  elements.forEach((el, i) => {
    const role = ((el.props.role as string) ?? "").toLowerCase();
    if (role.includes("before") || role.includes("left")) {
      group1Indices.push(i);
    } else if (role.includes("after") || role.includes("right")) {
      group2Indices.push(i);
    } else if (i < midpoint) {
      group1Indices.push(i);
    } else {
      group2Indices.push(i);
    }
  });

  // Calculate group1 finish time: last element delay + its duration
  const group1Finish =
    group1Indices.length > 0
      ? (group1Indices.length - 1) * stagger + elementDuration
      : 0;

  // Group 2 starts after group 1 finishes + pause
  const group2Start = group1Finish + GROUP_PAUSE;

  const timings: ChoreographyTiming[] = new Array(elements.length);

  group1Indices.forEach((elIndex, groupPos) => {
    timings[elIndex] = {
      delayFrames: groupPos * stagger,
      durationFrames: elementDuration,
    };
  });

  group2Indices.forEach((elIndex, groupPos) => {
    timings[elIndex] = {
      delayFrames: group2Start + groupPos * stagger,
      durationFrames: elementDuration,
    };
  });

  return timings;
};

export default morphTransition;
