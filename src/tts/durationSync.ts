import type { TTSResult, TypedScene } from '@/types'
import sceneCatalog from '@/schema/scene-catalog.json'

type SceneCatalogEntry = {
  durationFramesDefault: number
  [key: string]: unknown
}

function getCatalogDefault(sceneType: string): number {
  const entry = (sceneCatalog.scenes as Record<string, SceneCatalogEntry>)[sceneType]
  if (!entry) {
    throw new Error(`Unknown scene type "${sceneType}" — not found in scene-catalog.json`)
  }
  return entry.durationFramesDefault
}

/**
 * Standalone duration sync utility (same logic as planScenes.resolveDuration).
 *
 * Duration decision tree (Spec §8):
 * 1. scene.durationFrames explicit → return it
 * 2. No TTS → return catalog durationFramesDefault
 * 3. TTS ≤ catalogDefault + 60 → return ttsResult.durationFrames + 15
 * 4. TTS > catalogDefault + 60 → throw Error (render stops)
 */
export function syncDuration(scene: TypedScene, ttsResult?: TTSResult): number {
  // 1. Explicit duration
  if (scene.durationFrames !== undefined) {
    return scene.durationFrames
  }

  const catalogDefault = getCatalogDefault(scene.type)

  // 2. No TTS result
  if (!ttsResult) {
    return catalogDefault
  }

  // 3 & 4. TTS-based duration
  const maxAllowed = catalogDefault + 60
  if (ttsResult.durationFrames > maxAllowed) {
    throw new Error(
      `Scene ${scene.id}: TTS ${ttsResult.durationFrames}f > max ${maxAllowed}f. Shorten narrationText.`,
    )
  }

  return ttsResult.durationFrames + 15
}

/**
 * Convert frames to milliseconds.
 */
export function framesToMs(frames: number, fps: number): number {
  return Math.round((frames / fps) * 1000)
}

/**
 * Convert milliseconds to frames.
 */
export function msToFrames(ms: number, fps: number): number {
  return Math.ceil((ms / 1000) * fps)
}
