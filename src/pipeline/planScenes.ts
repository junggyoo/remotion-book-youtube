import type { TypedScene, FormatKey, TTSResult } from '@/types'
import sceneCatalog from '@/schema/scene-catalog.json'

type SceneCatalogEntry = {
  durationFramesDefault: number
  [key: string]: unknown
}

/**
 * Fallback defaults for scene types not yet in scene-catalog.json.
 * These will be removed once a human adds them to the catalog.
 */
const EXTENDED_SCENE_DEFAULTS: Record<string, number> = {
  timeline: 240,
  highlight: 120,
  transition: 60,
  listReveal: 210,
  splitQuote: 180,
}

function getCatalogDefault(sceneType: string): number {
  const entry = (sceneCatalog.scenes as Record<string, SceneCatalogEntry>)[sceneType]
  if (entry) {
    return entry.durationFramesDefault
  }
  const fallback = EXTENDED_SCENE_DEFAULTS[sceneType]
  if (fallback !== undefined) {
    return fallback
  }
  throw new Error(`Unknown scene type "${sceneType}" — not found in scene-catalog.json`)
}

/**
 * Duration decision tree (Spec §8):
 * 1. scene.durationFrames explicit → return it
 * 2. No TTS → return catalog durationFramesDefault
 * 3. TTS ≤ catalogDefault + 60 → return ttsResult.durationFrames + 15
 * 4. TTS > catalogDefault + 60 → throw Error (render stops)
 */
export function resolveDuration(scene: TypedScene, ttsResult?: TTSResult): number {
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
 * Filter scenes for format:
 * - longform → return all
 * - shorts → filter out skipForShorts===true; if empty, fallback to all with warning
 */
export function getScenesForFormat(scenes: TypedScene[], format: FormatKey): TypedScene[] {
  if (format === 'longform' || format === 'both') {
    return scenes
  }

  // shorts
  const filtered = scenes.filter((s) => s.shorts?.skipForShorts !== true)
  if (filtered.length === 0) {
    console.warn(
      'All scenes have skipForShorts=true — falling back to all scenes for shorts format',
    )
    return scenes
  }
  return filtered
}

export type PlannedScene = TypedScene & {
  resolvedDuration: number
  from: number
}

/**
 * Plan scenes: resolve durations and calculate cumulative `from` offsets.
 */
export function planScenes(
  scenes: TypedScene[],
  format: FormatKey,
  ttsResults?: Map<string, TTSResult>,
): PlannedScene[] {
  const formatScenes = getScenesForFormat(scenes, format)
  const planned: PlannedScene[] = []
  let cumulativeFrom = 0

  for (const scene of formatScenes) {
    const ttsResult = ttsResults?.get(scene.id)
    const resolvedDuration = resolveDuration(scene, ttsResult)

    planned.push({
      ...scene,
      resolvedDuration,
      from: cumulativeFrom,
    })

    cumulativeFrom += resolvedDuration
  }

  return planned
}
