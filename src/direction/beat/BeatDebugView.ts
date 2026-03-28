/**
 * BeatDebugView — Diagnostic pure function for inspecting beat pipeline output.
 * No side effects, no render impact. Used for development and testing only.
 */

import type { BeatProfile } from "../types";
import type { SemanticPlan } from "./BeatSemanticAnalyzer";
import type { ResolvedBeatProfile } from "./BeatProfileResolver";

export interface BeatDebugReport {
  sceneId: string;
  direction: string;
  semanticPlan: {
    units: number;
    dominantPattern: string;
    overallIntensity: number;
  };
  resolved: {
    timingIntent: string;
    emphasisStrategy: string;
    segmentCount: number;
  };
  segments: Array<{
    id: string;
    role: string;
    ratio: string; // "0.00–0.35" format
    weight: number;
    intensity: number;
    textPreview: string; // first 20 chars
  }>;
}

export function generateBeatDebugReport(
  sceneId: string,
  plan: SemanticPlan,
  resolved: ResolvedBeatProfile,
  beatProfile: BeatProfile,
  directionName: string,
): BeatDebugReport {
  return {
    sceneId,
    direction: directionName,
    semanticPlan: {
      units: plan.units.length,
      dominantPattern: plan.dominantPattern,
      overallIntensity: Math.round(plan.overallIntensity * 100) / 100,
    },
    resolved: {
      timingIntent: resolved.timingIntent,
      emphasisStrategy: resolved.emphasisStrategy,
      segmentCount: resolved.targetSegmentCount,
    },
    segments: beatProfile.segments.map((seg) => ({
      id: seg.id,
      role: seg.role,
      ratio: `${seg.startRatio.toFixed(2)}\u2013${seg.endRatio.toFixed(2)}`,
      weight: Math.round(seg.semanticWeight * 100) / 100,
      intensity: Math.round(seg.emotionalIntensity * 100) / 100,
      textPreview:
        seg.narrationText.slice(0, 20) +
        (seg.narrationText.length > 20 ? "\u2026" : ""),
    })),
  };
}
