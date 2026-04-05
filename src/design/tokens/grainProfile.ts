/**
 * Per-scene-type grain configuration (WP-3).
 *
 * Controls BackgroundMotion intensity and mode per scene type.
 * Literary/emotional scenes get stronger texture; structural/data scenes stay clean.
 */

import type { SceneType } from "@/types";
import type { NoiseMode } from "@/components/layout/BackgroundMotion";

export interface GrainConfig {
  /** 0~1 multiplier applied to BASE_OPACITY in BackgroundMotion */
  intensity: number;
  mode: NoiseMode;
}

export const GRAIN_PROFILE: Record<SceneType, GrainConfig> = {
  cover: { intensity: 0.7, mode: "subtle-drift" },
  chapterDivider: { intensity: 0.5, mode: "grain" },
  keyInsight: { intensity: 0.5, mode: "grain" },
  quote: { intensity: 0.8, mode: "subtle-drift" },
  framework: { intensity: 0.3, mode: "grain" },
  application: { intensity: 0.3, mode: "grain" },
  compareContrast: { intensity: 0.4, mode: "grain" },
  highlight: { intensity: 0.6, mode: "subtle-drift" },
  closing: { intensity: 0.7, mode: "subtle-drift" },
  data: { intensity: 0.2, mode: "grain" },
  timeline: { intensity: 0.3, mode: "grain" },
  transition: { intensity: 0.4, mode: "subtle-drift" },
  listReveal: { intensity: 0.3, mode: "grain" },
  splitQuote: { intensity: 0.7, mode: "subtle-drift" },
  custom: { intensity: 0.5, mode: "grain" },
};

export function getGrainConfig(sceneType: SceneType): GrainConfig {
  return GRAIN_PROFILE[sceneType] ?? GRAIN_PROFILE.custom;
}
