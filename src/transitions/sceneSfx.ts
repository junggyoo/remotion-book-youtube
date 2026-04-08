/**
 * Scene-type-based SFX defaults.
 *
 * Maps scene types to default SFX files for emphasis moments.
 * Used by the renderer to add scene-level audio cues.
 */

import { SFX_VOLUME } from "./transitionSfx";

/** Default SFX for scene types. null = no SFX. */
const SCENE_TYPE_SFX: Record<string, string | null> = {
  keyInsight: "shimmer.mp3",
  highlight: "shimmer.mp3",
  insight: "shimmer.mp3",
  chapterDivider: "whoosh.mp3",
  hook: "whoosh.mp3",
  cover: null,
  framework: null,
  compareContrast: null,
  application: null,
  quote: null,
  closing: null,
  data: "shimmer.mp3",
  timeline: null,
  listReveal: null,
};

export interface SceneSfxResult {
  file: string | null;
  volume: number;
}

/**
 * Resolve the default SFX for a given scene type.
 * Returns { file, volume } or { file: null, volume: 0 } for silent scenes.
 */
export function resolveSceneSfx(sceneType: string): SceneSfxResult {
  const file = SCENE_TYPE_SFX[sceneType] ?? null;
  return { file, volume: file ? SFX_VOLUME : 0 };
}
