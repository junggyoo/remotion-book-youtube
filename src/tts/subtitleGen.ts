import type { SubtitleEntry } from '@/types'

/** Canonical max chars per line (Spec §1: 28자) */
export const MAX_CHARS_PER_LINE = 28

/** Max subtitle lines */
export const MAX_LINES = 2

/** Subtitle lead frames — show subtitle 3 frames before VO starts (Spec §1) */
export const LEAD_FRAMES = 3

/**
 * Split text into lines of max MAX_CHARS_PER_LINE chars, max MAX_LINES lines.
 * Excess text beyond 2 lines is trimmed.
 */
export function splitToLines(text: string): string[] {
  const lines: string[] = []
  let remaining = text.trim()

  while (remaining.length > 0 && lines.length < MAX_LINES) {
    if (remaining.length <= MAX_CHARS_PER_LINE) {
      lines.push(remaining)
      remaining = ''
    } else {
      // Try to break at a space within the limit
      let breakIndex = remaining.lastIndexOf(' ', MAX_CHARS_PER_LINE)
      if (breakIndex <= 0) {
        // No space found — hard break at limit
        breakIndex = MAX_CHARS_PER_LINE
      }
      lines.push(remaining.substring(0, breakIndex).trimEnd())
      remaining = remaining.substring(breakIndex).trimStart()
    }
  }

  return lines
}

/**
 * Generate a SubtitleEntry for a scene.
 *
 * - startFrame is shifted earlier by LEAD_FRAMES (subtitle appears before VO)
 * - Lines are pre-split at 28 chars/line, max 2 lines
 */
export function generateSubtitles(
  sceneId: string,
  narrationText: string,
  startFrame: number,
  durationFrames: number,
): SubtitleEntry {
  const lines = splitToLines(narrationText)
  const text = lines.join('\n')

  const adjustedStart = Math.max(0, startFrame - LEAD_FRAMES)
  const endFrame = startFrame + durationFrames

  return {
    text,
    startFrame: adjustedStart,
    endFrame,
    lines,
  }
}
