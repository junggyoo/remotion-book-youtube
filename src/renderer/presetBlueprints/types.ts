// ============================================================
// Preset Blueprint Types
// Types shared by all preset blueprint factories.
// ============================================================

import type { MediaPlan, SceneBlueprint, Theme, TTSEngineKey } from '@/types'

// --- ResolveContext ---

/**
 * Runtime context passed to every preset blueprint factory.
 * format MUST be 'longform' | 'shorts' — never 'both'.
 * The caller is responsible for splitting 'both' into two separate calls.
 */
export interface ResolveContext {
  /** Resolved format. 'both' is NOT accepted — throws at resolver level. */
  format: 'longform' | 'shorts'
  theme: Theme
  from: number
  durationFrames: number
  /** Narration text for this scene. Use '' (empty string) if none. */
  narrationText: string
  /** Book-level narration config (optional). */
  narrationConfig?: {
    /** Blueprint-level TTS engine key. */
    ttsEngine?: TTSEngineKey
    /** Maps from NarrationConfig.voice */
    voiceKey?: string
    speed?: number
    pitch?: string
  }
}

// --- PresetBlueprintFactory ---

/**
 * Generic factory type. Each preset blueprint factory is a pure function:
 * (content, ctx) => SceneBlueprint
 */
export type PresetBlueprintFactory<T> = (content: T, ctx: ResolveContext) => SceneBlueprint

// --- CoreSceneType ---

/**
 * The 9 scene types that have entries in scene-catalog.json and therefore
 * have preset blueprint factories. The 5 newer types (timeline, highlight,
 * transition, listReveal, splitQuote) are excluded until catalog entries exist.
 */
export type CoreSceneType =
  | 'cover'
  | 'chapterDivider'
  | 'keyInsight'
  | 'compareContrast'
  | 'quote'
  | 'framework'
  | 'application'
  | 'data'
  | 'closing'

// --- buildDefaultMediaPlan ---

/**
 * Builds a fully specified MediaPlan with sensible defaults.
 * When narrationText is '' (empty string), the downstream TTS stage
 * will detect it and skip TTS generation (silent scene, no captions).
 */
export function buildDefaultMediaPlan(
  narrationText: string,
  ctx: ResolveContext
): MediaPlan {
  return {
    narrationText,

    captionPlan: {
      mode: 'sentence-by-sentence',
      maxCharsPerLine: 28,
      maxLines: 2,
      leadFrames: 3,
      trailFrames: 6,
      transitionStyle: 'fade-slide',
    },

    audioPlan: {
      ttsEngine: ctx.narrationConfig?.ttsEngine ?? 'edge-tts',
      voiceKey: ctx.narrationConfig?.voiceKey ?? 'ko-KR-SunHiNeural',
      speed: ctx.narrationConfig?.speed ?? 1.0,
      pitch: ctx.narrationConfig?.pitch ?? '+0Hz',
    },

    assetPlan: {
      required: [],
      fallbackMode: 'text-only',
    },
  }
}
