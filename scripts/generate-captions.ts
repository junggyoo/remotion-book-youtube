/**
 * Generate TTS audio + captions JSON for all scenes in a book.
 *
 * Usage: npx ts-node scripts/generate-captions.ts content/books/test-book.json
 *
 * Output:
 *   assets/tts/{sceneId}.mp3       — audio file
 *   assets/tts/{sceneId}.json      — Caption[] JSON (compatible with @remotion/captions)
 *   assets/tts/manifest.json       — all scene TTS results
 */

import { execFileSync } from "child_process";
import fs from "fs";
import path from "path";
import type { Caption } from "@remotion/captions";
import { vttToCaptions } from "../src/tts/vttParser";

interface BookContent {
  scenes: Array<{
    id: string;
    type: string;
    narrationText?: string;
  }>;
  narration: {
    voice: string;
    speed?: number;
    pitch?: string;
  };
}

interface TTSManifestEntry {
  sceneId: string;
  audioFile: string;
  captionsFile: string;
  durationMs: number;
  durationFrames: number;
}

const FPS = 30;
const OUTPUT_DIR = path.resolve(process.cwd(), "assets/tts");

function getAudioDurationMs(filePath: string): number {
  try {
    const result = execFileSync(
      "ffprobe",
      [
        "-v",
        "error",
        "-show_entries",
        "format=duration",
        "-of",
        "csv=p=0",
        filePath,
      ],
      { encoding: "utf-8", timeout: 10000 },
    ).trim();
    const seconds = parseFloat(result);
    if (!isNaN(seconds)) return Math.round(seconds * 1000);
  } catch {
    // fallback
  }
  // Estimate from file size (~16kbps MP3)
  try {
    const stats = fs.statSync(filePath);
    return Math.round((stats.size / 2000) * 1000);
  } catch {
    return 0;
  }
}

async function main() {
  const bookPath = process.argv[2];
  if (!bookPath) {
    console.error(
      "Usage: npx ts-node scripts/generate-captions.ts <book.json>",
    );
    process.exit(1);
  }

  const bookRaw = fs.readFileSync(
    path.resolve(process.cwd(), bookPath),
    "utf-8",
  );
  const book: BookContent = JSON.parse(bookRaw);

  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const manifest: TTSManifestEntry[] = [];

  for (const scene of book.scenes) {
    if (!scene.narrationText || scene.narrationText.trim().length === 0) {
      console.log(`[SKIP] ${scene.id} — no narrationText`);
      continue;
    }

    const audioFile = `${scene.id}.mp3`;
    const vttFile = `${scene.id}.vtt`;
    const captionsFile = `${scene.id}.json`;
    const audioPath = path.join(OUTPUT_DIR, audioFile);
    const vttPath = path.join(OUTPUT_DIR, vttFile);
    const captionsPath = path.join(OUTPUT_DIR, captionsFile);

    console.log(`[TTS] ${scene.id}: "${scene.narrationText.slice(0, 40)}..."`);

    // Generate with edge-tts
    const args: string[] = ["--voice", book.narration.voice];

    if (book.narration.speed && book.narration.speed !== 1.0) {
      const pct = Math.round((book.narration.speed - 1) * 100);
      args.push("--rate", `${pct > 0 ? "+" : ""}${pct}%`);
    }
    if (book.narration.pitch && book.narration.pitch !== "+0Hz") {
      args.push("--pitch", book.narration.pitch);
    }

    args.push("--text", scene.narrationText);
    args.push("--write-media", audioPath);
    args.push("--write-subtitles", vttPath);

    try {
      execFileSync("edge-tts", args, { encoding: "utf-8", timeout: 30000 });
    } catch (err) {
      console.error(`[FAIL] ${scene.id}:`, err);
      continue;
    }

    // Parse VTT → Caption[]
    const vttContent = fs.readFileSync(vttPath, "utf-8");
    const captions = vttToCaptions(vttContent);
    fs.writeFileSync(captionsPath, JSON.stringify(captions, null, 2));

    // Get duration
    const durationMs = getAudioDurationMs(audioPath);
    const durationFrames = Math.ceil((durationMs / 1000) * FPS);

    manifest.push({
      sceneId: scene.id,
      audioFile,
      captionsFile,
      durationMs,
      durationFrames,
    });

    console.log(
      `  ✓ ${durationMs}ms (${durationFrames}f), ${captions.length} words`,
    );

    // Clean up VTT (we have JSON now)
    fs.unlinkSync(vttPath);
  }

  // Write manifest
  const manifestPath = path.join(OUTPUT_DIR, "manifest.json");
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  console.log(`\n[DONE] ${manifest.length} scenes → ${manifestPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
