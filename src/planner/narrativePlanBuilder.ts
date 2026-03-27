/**
 * Shared narrative plan + policy builders.
 * Extracted from scene-planner stage to be reused by gap-detector stage.
 */

import type {
  BookContent,
  FormatKey,
  NarrativeSegment,
  PlanningPolicy,
  VideoNarrativePlan,
} from "@/types";
import type { EditorialOutline } from "../planning/types";

// ---------------------------------------------------------------------------
// Segment delivery terms (English, matching PRESET_CAPABILITIES)
// ---------------------------------------------------------------------------

const SEGMENT_DELIVERY: Record<string, string[]> = {
  setup: ["attention-grab", "book-intro", "context-setting"],
  core: ["key-concepts", "framework", "step-by-step", "evidence"],
  climax: ["peak-insight", "emotional-peak", "evidence"],
  resolution: ["application", "real-life-example", "how-to"],
  closing: ["recap", "cta", "summary"],
};

// ---------------------------------------------------------------------------
// buildNarrativePlan
// ---------------------------------------------------------------------------

export function buildNarrativePlan(
  outline: EditorialOutline,
  book: BookContent,
): VideoNarrativePlan {
  const totalDurationSec = outline.targetDurationSeconds;

  // Enrich core segment delivery based on actual book scene types
  const coreDelivery = [...SEGMENT_DELIVERY.core];
  for (const scene of book.scenes) {
    if (scene.type === "compareContrast")
      coreDelivery.push("comparison", "contrast");
    if (scene.type === "quote") coreDelivery.push("authority");
    if (scene.type === "data") coreDelivery.push("statistics", "quantitative");
  }

  const segments: NarrativeSegment[] = [
    {
      role: "setup",
      durationRatio: 0.12,
      intent: outline.hookAngle,
      requiredDelivery: SEGMENT_DELIVERY.setup,
    },
    {
      role: "core",
      durationRatio: 0.55,
      intent: outline.coreMessages.slice(0, 3).join("; "),
      requiredDelivery: [...new Set(coreDelivery)],
    },
    {
      role: "climax",
      durationRatio: 0.15,
      intent:
        outline.coreMessages[outline.coreMessages.length - 1] ??
        "핵심 인사이트",
      requiredDelivery: SEGMENT_DELIVERY.climax,
    },
    {
      role: "resolution",
      durationRatio: 0.1,
      intent: "실천 적용",
      requiredDelivery: SEGMENT_DELIVERY.resolution,
    },
    {
      role: "closing",
      durationRatio: 0.08,
      intent: "요약 및 CTA",
      requiredDelivery: SEGMENT_DELIVERY.closing,
    },
  ];

  const emotionalCurve = [
    { timestamp: 0, intensity: 0.7, label: "hook" },
    { timestamp: 0.12, intensity: 0.5, label: "setup" },
    { timestamp: 0.45, intensity: 0.75, label: "core-peak" },
    { timestamp: 0.82, intensity: 0.9, label: "climax" },
    { timestamp: 1.0, intensity: 0.6, label: "closing" },
  ];

  return { totalDurationSec, segments, emotionalCurve };
}

// ---------------------------------------------------------------------------
// buildDefaultPolicy
// ---------------------------------------------------------------------------

export function buildDefaultPolicy(format: FormatKey): PlanningPolicy {
  const formatPolicy =
    format === "shorts"
      ? {
          format: "shorts" as const,
          maxElementsPerScene: 4,
          captionDensity: "high" as const,
          openingDurationSecRange: [5, 10] as [number, number],
          sceneCountRange: [3, 6] as [number, number],
        }
      : {
          format: "longform" as const,
          maxElementsPerScene: 6,
          captionDensity: "medium" as const,
          openingDurationSecRange: [20, 35] as [number, number],
          sceneCountRange: [8, 18] as [number, number],
        };

  return {
    presetConfidenceThreshold: 0.7,
    minSignatureScenes: 2,
    maxSynthesizedScenes: 5,
    openingMustBeDynamic: true,
    formatPolicy,
  };
}
