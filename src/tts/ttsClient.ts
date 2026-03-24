import { execFileSync } from 'child_process'
import fs from 'fs'
import path from 'path'
import type { TTSResult, NarrationConfig } from '@/types'

const DEFAULT_FPS = 30

/**
 * Attempt to get audio duration using ffprobe.
 * Falls back to a file-size-based estimate if ffprobe is unavailable.
 */
function getAudioDurationMs(filePath: string): number {
  // Try ffprobe first (uses execFileSync — no shell injection risk)
  try {
    const result = execFileSync(
      'ffprobe',
      ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', filePath],
      { encoding: 'utf-8', timeout: 10000 },
    ).trim()
    const seconds = parseFloat(result)
    if (!isNaN(seconds)) {
      return Math.round(seconds * 1000)
    }
  } catch {
    // ffprobe not available, fall through
  }

  // Fallback: estimate from file size
  // edge-tts produces roughly 16kbps MP3 audio
  // 16kbps = 2000 bytes/sec
  try {
    const stats = fs.statSync(filePath)
    const estimatedSeconds = stats.size / 2000
    return Math.round(estimatedSeconds * 1000)
  } catch {
    return 0
  }
}

/**
 * Generate TTS audio for a scene using edge-tts CLI.
 *
 * On failure: console.error, return undefined (pipeline falls back to catalog default).
 */
export async function generateTTS(
  sceneId: string,
  text: string,
  config: NarrationConfig,
  outputDir: string,
): Promise<TTSResult | undefined> {
  if (!text || text.trim().length === 0) {
    return undefined
  }

  const fps = DEFAULT_FPS
  const outputFileName = `${sceneId}.mp3`
  const outputPath = path.join(outputDir, outputFileName)

  // Ensure output directory exists
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true })
  }

  try {
    // Build edge-tts arguments (execFileSync — no shell, safe from injection)
    const args: string[] = ['--voice', config.voice]

    if (config.speed && config.speed !== 1.0) {
      const pct = Math.round((config.speed - 1) * 100)
      args.push('--rate', `${pct > 0 ? '+' : ''}${pct}%`)
    }

    if (config.pitch && config.pitch !== '+0Hz') {
      args.push('--pitch', config.pitch)
    }

    args.push('--text', text)
    args.push('--write-media', outputPath)

    execFileSync('edge-tts', args, { encoding: 'utf-8', timeout: 30000 })

    // Verify output file was created
    if (!fs.existsSync(outputPath)) {
      console.error(`[TTS] Output file not created for scene ${sceneId}`)
      return undefined
    }

    // Get audio duration
    const durationMs = getAudioDurationMs(outputPath)
    if (durationMs <= 0) {
      console.error(`[TTS] Could not determine audio duration for scene ${sceneId}`)
      return undefined
    }

    const durationFrames = Math.ceil((durationMs / 1000) * fps)

    return {
      sceneId,
      audioFilePath: outputPath,
      durationFrames,
      durationMs,
    }
  } catch (err) {
    console.error(`[TTS] Failed to generate audio for scene ${sceneId}:`, err)
    return undefined
  }
}
