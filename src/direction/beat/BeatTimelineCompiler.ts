/**
 * BeatTimelineCompiler — Takes a SemanticPlan, ResolvedBeatProfile, and DirectionProfile,
 * then compiles final BeatProfile with concrete startRatio/endRatio values.
 *
 * Pipeline step 3 (final):
 * narrationText -> BeatSemanticAnalyzer -> SemanticPlan -> BeatProfileResolver -> ResolvedBeatProfile -> [HERE] BeatTimelineCompiler -> BeatProfile
 */

import type {
  BeatProfile,
  BeatSegment,
  BeatRole,
  DirectionProfile,
} from "../types";
import type { SemanticPlan, SemanticUnit } from "./BeatSemanticAnalyzer";
import type { ResolvedBeatProfile } from "./BeatProfileResolver";
import { extractEmphasisTargets } from "./koreanTextUtils";

// ─── Internal types ────────────────────────────────────────

interface MergedGroup {
  text: string;
  role: BeatRole;
  semanticWeight: number;
  emotionalIntensity: number;
}

// ─── Helpers ───────────────────────────────────────────────

/** Merge semantic units according to mergeMap indices. */
function mergeUnits(
  units: SemanticUnit[],
  mergeMap: number[][],
): MergedGroup[] {
  return mergeMap.map((indices) => {
    const grouped = indices.map((i) => units[i]);
    const text = grouped.map((u) => u.text).join(" ");

    // Role: pick the unit with the highest semanticWeight
    let bestUnit = grouped[0];
    for (let i = 1; i < grouped.length; i++) {
      if (grouped[i].semanticWeight > bestUnit.semanticWeight) {
        bestUnit = grouped[i];
      }
    }

    return {
      text,
      role: bestUnit.inferredRole,
      semanticWeight: grouped.reduce((s, u) => s + u.semanticWeight, 0),
      emotionalIntensity: Math.max(...grouped.map((u) => u.emotionalIntensity)),
    };
  });
}

/** Normalize an array of ratios so they sum to exactly 1.0. */
function normalize(ratios: number[]): number[] {
  const sum = ratios.reduce((s, r) => s + r, 0);
  if (sum === 0) return ratios.map(() => 1 / ratios.length);
  return ratios.map((r) => r / sum);
}

/** Apply timing intent adjustments to ratios. */
function applyTimingIntent(
  ratios: number[],
  timingIntent: ResolvedBeatProfile["timingIntent"],
  groups: MergedGroup[],
): number[] {
  if (ratios.length <= 1 || timingIntent === "even") return ratios;

  const adjusted = [...ratios];

  switch (timingIntent) {
    case "front-loaded":
      adjusted[0] *= 1.3;
      break;
    case "back-loaded":
      adjusted[adjusted.length - 1] *= 1.3;
      break;
    case "climactic": {
      let maxIdx = 0;
      let maxIntensity = groups[0].emotionalIntensity;
      for (let i = 1; i < groups.length; i++) {
        if (groups[i].emotionalIntensity > maxIntensity) {
          maxIntensity = groups[i].emotionalIntensity;
          maxIdx = i;
        }
      }
      adjusted[maxIdx] *= 1.4;
      break;
    }
  }

  return normalize(adjusted);
}

/** Apply emphasis strategy adjustments to ratios. */
function applyEmphasisStrategy(
  ratios: number[],
  emphasisStrategy: ResolvedBeatProfile["emphasisStrategy"],
  groups: MergedGroup[],
): number[] {
  if (ratios.length <= 1) return ratios;

  const adjusted = [...ratios];

  switch (emphasisStrategy) {
    case "single-peak": {
      let maxIdx = 0;
      let maxIntensity = groups[0].emotionalIntensity;
      for (let i = 1; i < groups.length; i++) {
        if (groups[i].emotionalIntensity > maxIntensity) {
          maxIntensity = groups[i].emotionalIntensity;
          maxIdx = i;
        }
      }
      adjusted[maxIdx] += 0.05;
      break;
    }
    case "distributed":
      for (let i = 0; i < adjusted.length; i++) {
        adjusted[i] += 0.02 * groups[i].emotionalIntensity;
      }
      break;
    case "escalating":
      for (let i = 0; i < adjusted.length; i++) {
        adjusted[i] += 0.01 * i;
      }
      break;
  }

  return normalize(adjusted);
}

/** Clamp ratios to [0.12, 0.6] range, redistributing excess. */
function clampAndNormalize(ratios: number[]): number[] {
  if (ratios.length <= 1) return [1.0];

  const MIN_RATIO = 0.12;
  const MAX_RATIO = 0.6;
  const result = [...ratios];

  // Iteratively clamp until stable (max 10 iterations to prevent infinite loops)
  for (let iter = 0; iter < 10; iter++) {
    let changed = false;

    // Clamp minimums: steal from the largest segment
    for (let i = 0; i < result.length; i++) {
      if (result[i] < MIN_RATIO) {
        const deficit = MIN_RATIO - result[i];
        result[i] = MIN_RATIO;

        // Find the largest segment (that isn't this one)
        let largestIdx = -1;
        let largestVal = -1;
        for (let j = 0; j < result.length; j++) {
          if (j !== i && result[j] > largestVal) {
            largestVal = result[j];
            largestIdx = j;
          }
        }
        if (largestIdx >= 0) {
          result[largestIdx] -= deficit;
        }
        changed = true;
      }
    }

    // Clamp maximums: redistribute excess to others proportionally
    for (let i = 0; i < result.length; i++) {
      if (result[i] > MAX_RATIO) {
        const excess = result[i] - MAX_RATIO;
        result[i] = MAX_RATIO;

        // Distribute excess proportionally among other segments
        const othersSum = result.reduce((s, r, j) => (j !== i ? s + r : s), 0);
        if (othersSum > 0) {
          for (let j = 0; j < result.length; j++) {
            if (j !== i) {
              result[j] += excess * (result[j] / othersSum);
            }
          }
        }
        changed = true;
      }
    }

    if (!changed) break;
  }

  // Final renormalize to ensure sum = 1.0
  return normalize(result);
}

// ─── Core function ─────────────────────────────────────────

export function compileBeatTimeline(
  plan: SemanticPlan,
  resolved: ResolvedBeatProfile,
  direction: DirectionProfile,
): BeatProfile {
  // Step 1: Merge semantic units per mergeMap
  const groups = mergeUnits(plan.units, resolved.mergeMap);

  // Handle single/empty case
  if (groups.length === 0) {
    return {
      segments: [],
      timingIntent: resolved.timingIntent,
      emphasisStrategy: resolved.emphasisStrategy,
    };
  }

  // Step 2: Calculate base ratios (character-proportional)
  const totalTextLength = groups.reduce((s, g) => s + g.text.length, 0);
  let ratios =
    totalTextLength > 0
      ? groups.map((g) => g.text.length / totalTextLength)
      : groups.map(() => 1 / groups.length);

  // Step 3: Apply timingIntent adjustments
  ratios = applyTimingIntent(ratios, resolved.timingIntent, groups);

  // Step 4: Apply emphasis weighting
  ratios = applyEmphasisStrategy(ratios, resolved.emphasisStrategy, groups);

  // Step 5: Clamp and normalize
  ratios = clampAndNormalize(ratios);

  // Step 6: Build startRatio/endRatio
  const startEndPairs: { startRatio: number; endRatio: number }[] = [];
  let cursor = 0;
  for (let i = 0; i < ratios.length; i++) {
    const startRatio = cursor;
    const endRatio = i === ratios.length - 1 ? 1.0 : cursor + ratios[i];
    startEndPairs.push({ startRatio, endRatio });
    cursor = endRatio;
  }

  // Step 7: Build BeatSegment[]
  const segments: BeatSegment[] = groups.map((group, index) => ({
    id: `beat-${index}`,
    role: group.role,
    narrationText: group.text,
    semanticWeight: group.semanticWeight,
    emotionalIntensity: group.emotionalIntensity,
    startRatio: startEndPairs[index].startRatio,
    endRatio: startEndPairs[index].endRatio,
    activates: ["*"],
    emphasisTargets: extractEmphasisTargets(group.text, 3),
    transition: "enter" as const,
  }));

  // Step 8: Return BeatProfile
  return {
    segments,
    timingIntent: resolved.timingIntent,
    emphasisStrategy: resolved.emphasisStrategy,
  };
}
