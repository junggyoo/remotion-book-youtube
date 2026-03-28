/**
 * BeatProfileResolver — Takes a SemanticPlan + DirectionProfile and resolves
 * timingIntent, emphasisStrategy, target segment count, and merge map.
 *
 * Pipeline step 2:
 * narrationText -> BeatSemanticAnalyzer -> SemanticPlan -> [HERE] BeatProfileResolver -> BeatTimelineCompiler
 */

import type { DirectionProfile, DirectionProfileName } from "../types";
import type { SemanticPlan, NarrativePattern } from "./BeatSemanticAnalyzer";

// ─── Types ──────────────────────────────────────────────────

export interface ResolvedBeatProfile {
  timingIntent: "even" | "front-loaded" | "back-loaded" | "climactic";
  emphasisStrategy: "single-peak" | "distributed" | "escalating";
  targetSegmentCount: number;
  mergeMap: number[][]; // e.g. [[0,1], [2], [3,4]] — semantic unit indices -> beat groups
}

// ─── Lookup tables ──────────────────────────────────────────

type TimingIntent = ResolvedBeatProfile["timingIntent"];

const TIMING_MATRIX: Record<string, Record<NarrativePattern, TimingIntent>> = {
  analytical: {
    "statement-evidence": "even",
    "buildup-climax": "back-loaded",
    "contrast-resolve": "even",
    "question-answer": "even",
    uniform: "even",
  },
  systematic: {
    "statement-evidence": "even",
    "buildup-climax": "even",
    "contrast-resolve": "even",
    "question-answer": "even",
    uniform: "even",
  },
  contemplative: {
    "statement-evidence": "back-loaded",
    "buildup-climax": "back-loaded",
    "contrast-resolve": "back-loaded",
    "question-answer": "back-loaded",
    uniform: "even",
  },
  persuasive: {
    "statement-evidence": "front-loaded",
    "buildup-climax": "climactic",
    "contrast-resolve": "climactic",
    "question-answer": "front-loaded",
    uniform: "front-loaded",
  },
  urgent: {
    "statement-evidence": "front-loaded",
    "buildup-climax": "front-loaded",
    "contrast-resolve": "front-loaded",
    "question-answer": "front-loaded",
    uniform: "front-loaded",
  },
  inspirational: {
    "statement-evidence": "back-loaded",
    "buildup-climax": "climactic",
    "contrast-resolve": "back-loaded",
    "question-answer": "back-loaded",
    uniform: "even",
  },
  investigative: {
    "statement-evidence": "back-loaded",
    "buildup-climax": "climactic",
    "contrast-resolve": "back-loaded",
    "question-answer": "back-loaded",
    uniform: "even",
  },
};

const EMPHASIS_MAP: Record<
  string,
  "single-peak" | "distributed" | "escalating"
> = {
  analytical: "single-peak",
  systematic: "distributed",
  contemplative: "single-peak",
  persuasive: "escalating",
  urgent: "escalating",
  inspirational: "single-peak",
  investigative: "single-peak",
};

const MAX_SEGMENTS: Record<string, number> = {
  contemplative: 3,
  persuasive: 5,
  urgent: 5,
  analytical: 4,
  systematic: 4,
  inspirational: 4,
  investigative: 4,
};

const DEFAULT_MAX_SEGMENTS = 4;

// ─── Helpers ────────────────────────────────────────────────

function resolveTimingIntent(
  directionName: string,
  pattern: NarrativePattern,
): TimingIntent {
  const row = TIMING_MATRIX[directionName];
  if (!row) return "even";
  return row[pattern] ?? "even";
}

function resolveEmphasisStrategy(
  directionName: string,
): "single-peak" | "distributed" | "escalating" {
  return EMPHASIS_MAP[directionName] ?? "distributed";
}

function resolveTargetSegmentCount(
  directionName: string,
  unitCount: number,
): number {
  const max = MAX_SEGMENTS[directionName] ?? DEFAULT_MAX_SEGMENTS;
  return Math.max(1, Math.min(unitCount, max));
}

/**
 * Build a merge map by iteratively merging adjacent units at the weakest boundary
 * until the number of groups equals targetSegmentCount.
 */
function buildMergeMap(plan: SemanticPlan, target: number): number[][] {
  const unitCount = plan.units.length;

  // Start with each unit as its own group
  const groups: number[][] = plan.units.map((_, i) => [i]);

  if (unitCount <= target) {
    return groups;
  }

  // Build boundary strength scores between adjacent groups.
  // boundaryBefore of unit i (i>0) tells us the strength between unit i-1 and unit i.
  const STRENGTH_SCORE: Record<string, number> = {
    strong: 3,
    medium: 2,
    weak: 1,
  };

  // Boundary scores between adjacent groups (initially between adjacent units)
  const boundaryScores: number[] = [];
  for (let i = 1; i < unitCount; i++) {
    const strength = plan.units[i].boundaryBefore ?? "medium";
    boundaryScores.push(STRENGTH_SCORE[strength] ?? 2);
  }

  // Merge until we reach target count
  while (groups.length > target) {
    // Find the weakest boundary (lowest score; on tie, pick first)
    let minIdx = 0;
    let minScore = boundaryScores[0];
    for (let i = 1; i < boundaryScores.length; i++) {
      if (boundaryScores[i] < minScore) {
        minScore = boundaryScores[i];
        minIdx = i;
      }
    }

    // Merge group at minIdx and minIdx+1
    const merged = [...groups[minIdx], ...groups[minIdx + 1]];
    groups.splice(minIdx, 2, merged);

    // Remove the boundary at minIdx; if two boundaries collapse, keep the stronger
    if (boundaryScores.length > 1) {
      boundaryScores.splice(minIdx, 1);
    } else {
      boundaryScores.splice(minIdx, 1);
    }
  }

  return groups;
}

// ─── Core function ──────────────────────────────────────────

export function resolveBeatProfile(
  plan: SemanticPlan,
  direction: DirectionProfile,
): ResolvedBeatProfile {
  const dirName = direction.name;

  const timingIntent = resolveTimingIntent(dirName, plan.dominantPattern);
  const emphasisStrategy = resolveEmphasisStrategy(dirName);
  const targetSegmentCount = resolveTargetSegmentCount(
    dirName,
    plan.units.length,
  );
  const mergeMap = buildMergeMap(plan, targetSegmentCount);

  return {
    timingIntent,
    emphasisStrategy,
    targetSegmentCount,
    mergeMap,
  };
}
