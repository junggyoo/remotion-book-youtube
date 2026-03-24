import type {
  BookContent,
  TypedScene,
  TTSResult,
  Theme,
  FormatKey,
  FormatConfig,
  SubtitleEntry,
} from '@/types'
import { planScenes } from '@/pipeline/planScenes'
import { useTheme } from '@/design/themes/useTheme'
import { useFormat } from '@/design/themes/useFormat'

export type PlannedScene = TypedScene & {
  from: number
  resolvedDuration: number
  tts?: TTSResult
  subtitles?: SubtitleEntry[]
}

export interface CompositionProps {
  scenes: PlannedScene[]
  totalDurationFrames: number
  fps: number
  format: FormatKey
  theme: Theme
  width: number
  height: number
}

/**
 * Build full composition props from BookContent.
 * Orchestrates planScenes, theme, and format resolution.
 */
export function buildCompositionProps(
  book: BookContent,
  format: FormatKey,
  ttsResults?: Map<string, TTSResult>,
  subtitleMap?: Map<string, SubtitleEntry[]>,
): CompositionProps {
  const fps = book.production?.fps ?? 30
  const themeMode = book.production?.themeMode ?? 'dark'
  const genre = book.production?.genreOverride ?? book.metadata.genre

  const theme = useTheme(themeMode, genre)
  const formatConfig: FormatConfig = useFormat(format === 'both' ? 'longform' : format)

  const planned = planScenes(book.scenes, format, ttsResults)

  // Attach TTS and subtitle data to each planned scene
  const scenes: PlannedScene[] = planned.map((scene) => {
    const tts = ttsResults?.get(scene.id)
    const subtitles = subtitleMap?.get(scene.id)
    return {
      ...scene,
      tts,
      subtitles,
    }
  })

  const totalDurationFrames =
    scenes.length > 0
      ? scenes[scenes.length - 1].from + scenes[scenes.length - 1].resolvedDuration
      : 0

  return {
    scenes,
    totalDurationFrames,
    fps,
    format,
    theme,
    width: formatConfig.width,
    height: formatConfig.height,
  }
}
