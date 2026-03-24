/**
 * Generate TTS audio + captions JSON for all scenes in a book.
 *
 * Usage: npx ts-node scripts/generate-captions.ts content/books/test-book.json
 *
 * Output:
 *   public/tts/{sceneId}.mp3       — audio file
 *   public/tts/{sceneId}.json      — Caption[] JSON (compatible with @remotion/captions)
 *   public/tts/manifest.json       — all scene TTS results
 */

import { execFileSync } from 'child_process'
import fs from 'fs'
import path from 'path'

interface BookContent {
  scenes: Array<{
    id: string
    type: string
    narrationText?: string
  }>
  narration: {
    voice: string
    speed?: number
    pitch?: string
  }
}

interface Caption {
  text: string
  startMs: number
  endMs: number
  timestampMs: number | null
  confidence: number | null
}

interface TTSManifestEntry {
  sceneId: string
  audioFile: string
  captionsFile: string
  durationMs: number
  durationFrames: number
}

const FPS = 30
const OUTPUT_DIR = path.resolve(process.cwd(), 'public/tts')

function parseVttTimestamp(ts: string): number {
  // "00:00:04,500" → 4500 ms
  const parts = ts.split(':')
  const hours = parseInt(parts[0], 10)
  const minutes = parseInt(parts[1], 10)
  const secMs = parts[2].split(',')
  const seconds = parseInt(secMs[0], 10)
  const ms = parseInt(secMs[1], 10)
  return hours * 3600000 + minutes * 60000 + seconds * 1000 + ms
}

function vttToCaptions(vttContent: string): Caption[] {
  const captions: Caption[] = []
  const lines = vttContent.trim().split('\n')
  let i = 0

  while (i < lines.length) {
    const line = lines[i].trim()

    // Look for timestamp line: "00:00:00,100 --> 00:00:04,500"
    if (line.includes('-->')) {
      const [startStr, endStr] = line.split('-->').map((s) => s.trim())
      const startMs = parseVttTimestamp(startStr)
      const endMs = parseVttTimestamp(endStr)

      // Collect text lines until empty line or end
      i++
      const textLines: string[] = []
      while (i < lines.length && lines[i].trim() !== '') {
        // Skip numeric cue IDs
        if (!/^\d+$/.test(lines[i].trim())) {
          textLines.push(lines[i].trim())
        }
        i++
      }

      const fullText = textLines.join(' ')
      if (fullText.length === 0) continue

      // Split into word-level captions with estimated timing
      const words = fullText.split(/\s+/)
      const totalDuration = endMs - startMs
      const wordDuration = totalDuration / words.length

      words.forEach((word, wi) => {
        const wordStart = startMs + wi * wordDuration
        const wordEnd = startMs + (wi + 1) * wordDuration

        captions.push({
          text: (wi > 0 ? ' ' : '') + word,
          startMs: Math.round(wordStart),
          endMs: Math.round(wordEnd),
          timestampMs: Math.round(wordStart),
          confidence: null,
        })
      })
    }

    i++
  }

  return captions
}

function getAudioDurationMs(filePath: string): number {
  try {
    const result = execFileSync(
      'ffprobe',
      ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', filePath],
      { encoding: 'utf-8', timeout: 10000 },
    ).trim()
    const seconds = parseFloat(result)
    if (!isNaN(seconds)) return Math.round(seconds * 1000)
  } catch {
    // fallback
  }
  // Estimate from file size (~16kbps MP3)
  try {
    const stats = fs.statSync(filePath)
    return Math.round((stats.size / 2000) * 1000)
  } catch {
    return 0
  }
}

async function main() {
  const bookPath = process.argv[2]
  if (!bookPath) {
    console.error('Usage: npx ts-node scripts/generate-captions.ts <book.json>')
    process.exit(1)
  }

  const bookRaw = fs.readFileSync(path.resolve(process.cwd(), bookPath), 'utf-8')
  const book: BookContent = JSON.parse(bookRaw)

  fs.mkdirSync(OUTPUT_DIR, { recursive: true })

  const manifest: TTSManifestEntry[] = []

  for (const scene of book.scenes) {
    if (!scene.narrationText || scene.narrationText.trim().length === 0) {
      console.log(`[SKIP] ${scene.id} — no narrationText`)
      continue
    }

    const audioFile = `${scene.id}.mp3`
    const vttFile = `${scene.id}.vtt`
    const captionsFile = `${scene.id}.json`
    const audioPath = path.join(OUTPUT_DIR, audioFile)
    const vttPath = path.join(OUTPUT_DIR, vttFile)
    const captionsPath = path.join(OUTPUT_DIR, captionsFile)

    console.log(`[TTS] ${scene.id}: "${scene.narrationText.slice(0, 40)}..."`)

    // Generate with edge-tts
    const args: string[] = ['--voice', book.narration.voice]

    if (book.narration.speed && book.narration.speed !== 1.0) {
      const pct = Math.round((book.narration.speed - 1) * 100)
      args.push('--rate', `${pct > 0 ? '+' : ''}${pct}%`)
    }
    if (book.narration.pitch && book.narration.pitch !== '+0Hz') {
      args.push('--pitch', book.narration.pitch)
    }

    args.push('--text', scene.narrationText)
    args.push('--write-media', audioPath)
    args.push('--write-subtitles', vttPath)

    try {
      execFileSync('edge-tts', args, { encoding: 'utf-8', timeout: 30000 })
    } catch (err) {
      console.error(`[FAIL] ${scene.id}:`, err)
      continue
    }

    // Parse VTT → Caption[]
    const vttContent = fs.readFileSync(vttPath, 'utf-8')
    const captions = vttToCaptions(vttContent)
    fs.writeFileSync(captionsPath, JSON.stringify(captions, null, 2))

    // Get duration
    const durationMs = getAudioDurationMs(audioPath)
    const durationFrames = Math.ceil((durationMs / 1000) * FPS)

    manifest.push({
      sceneId: scene.id,
      audioFile,
      captionsFile,
      durationMs,
      durationFrames,
    })

    console.log(`  ✓ ${durationMs}ms (${durationFrames}f), ${captions.length} words`)

    // Clean up VTT (we have JSON now)
    fs.unlinkSync(vttPath)
  }

  // Write manifest
  const manifestPath = path.join(OUTPUT_DIR, 'manifest.json')
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2))
  console.log(`\n[DONE] ${manifest.length} scenes → ${manifestPath}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
