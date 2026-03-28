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

import "dotenv/config";
import { execFileSync } from "child_process";
import fs from "fs";
import path from "path";
import type { Caption } from "@remotion/captions";
import { vttToCaptions } from "../src/tts/vttParser";
import type { Beat, BeatTimingResolution } from "../src/types";
import { resolveBeatNarration } from "../src/tts/beatNarrationResolver";
import { resolveBeatTimings } from "../src/tts/beatTimingResolver";
// Lazy-loaded to avoid ESM crash when fish-audio module isn't compatible
type FishAudioEngine = typeof import("../src/tts/fish-audio-engine");
let _fishEngine: FishAudioEngine | null = null;
async function loadFishEngine(): Promise<FishAudioEngine | null> {
  if (_fishEngine) return _fishEngine;
  try {
    _fishEngine = await import("../src/tts/fish-audio-engine");
    return _fishEngine;
  } catch {
    console.warn("[WARN] fish-audio engine unavailable (ESM compat issue)");
    return null;
  }
}
type FishAudioConfig = { apiKey: string; voiceModelId: string };

interface BookContent {
  scenes: Array<{
    id: string;
    type: string;
    narrationText?: string;
    beats?: Beat[];
  }>;
  narration: {
    voice: string;
    ttsEngine?: string;
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
  beatTimings?: BeatTimingResolution[];
}

const FPS = 30;
const OUTPUT_DIR = path.resolve(process.cwd(), "assets/tts");
const QWEN3_SERVER_URL = "http://localhost:9876";

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

async function generateViaEdgeTTS(
  text: string,
  narration: BookContent["narration"],
  audioPath: string,
  vttPath: string,
): Promise<boolean> {
  const args: string[] = ["--voice", narration.voice];

  if (narration.speed && narration.speed !== 1.0) {
    const pct = Math.round((narration.speed - 1) * 100);
    args.push("--rate", `${pct > 0 ? "+" : ""}${pct}%`);
  }
  if (narration.pitch && narration.pitch !== "+0Hz") {
    args.push("--pitch", narration.pitch);
  }

  args.push("--text", text);
  args.push("--write-media", audioPath);
  args.push("--write-subtitles", vttPath);

  try {
    execFileSync("edge-tts", args, { encoding: "utf-8", timeout: 30000 });
    return true;
  } catch (err) {
    console.error(`[FAIL] edge-tts:`, err);
    return false;
  }
}

function curlRequest(
  url: string,
  options: { method?: string; body?: string; timeout?: number } = {},
): { status: number; body: string } {
  const timeoutSec = Math.ceil((options.timeout ?? 30000) / 1000);
  const args = ["-s", "-w", "\n%{http_code}", "--max-time", String(timeoutSec)];
  if (options.method === "POST") {
    args.push("-X", "POST", "-H", "Content-Type: application/json");
    if (options.body) args.push("-d", "@-");
  }
  args.push(url);
  try {
    const raw = execFileSync("curl", args, {
      encoding: "utf-8",
      timeout: (timeoutSec + 5) * 1000,
      input: options.body ?? undefined,
    });
    const lines = raw.trimEnd().split("\n");
    const statusCode = parseInt(lines.pop() ?? "0", 10);
    const body = lines.join("\n");
    return { status: statusCode, body };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[DEBUG] curlRequest error: ${msg}`);
    return { status: 0, body: "" };
  }
}

async function generateViaQwen3(
  text: string,
  audioPath: string,
  vttPath: string,
  speed: number = 1.0,
): Promise<boolean> {
  try {
    const resp = curlRequest(`${QWEN3_SERVER_URL}/generate`, {
      method: "POST",
      body: JSON.stringify({
        text,
        outputPath: path.resolve(audioPath),
        whisperVtt: true,
        speed,
      }),
      timeout: 300000,
    });

    if (resp.status !== 200) {
      console.error(`[FAIL] qwen3-tts server ${resp.status}: ${resp.body}`);
      return false;
    }

    const result = JSON.parse(resp.body) as {
      audioPath: string;
      vttPath: string | null;
    };

    // Copy VTT to expected path if server wrote it elsewhere
    if (
      result.vttPath &&
      result.vttPath !== vttPath &&
      fs.existsSync(result.vttPath)
    ) {
      fs.copyFileSync(result.vttPath, vttPath);
    }

    return fs.existsSync(audioPath);
  } catch (err) {
    console.error(`[FAIL] qwen3-tts:`, err);
    return false;
  }
}

async function generateViaFishAudio(
  text: string,
  audioPath: string,
  config: FishAudioConfig,
  sceneType: string,
  speed?: number,
): Promise<{ success: boolean; durationMs: number }> {
  try {
    const engine = await loadFishEngine();
    if (!engine) return { success: false, durationMs: 0 };
    const configWithParams = {
      ...config,
      temperature: engine.getTemperatureForScene(sceneType),
      speed: speed ?? 1.0,
    };
    const textWithEmotion = engine.addEmotionTag(text, sceneType);
    const durationMs = await engine.generateFishAudio(
      textWithEmotion,
      audioPath,
      configWithParams,
    );
    return { success: fs.existsSync(audioPath) && durationMs > 0, durationMs };
  } catch (err) {
    console.error(`[FAIL] fish-audio:`, err);
    return { success: false, durationMs: 0 };
  }
}

async function waitForQwen3Server(): Promise<boolean> {
  try {
    const resp = curlRequest(`${QWEN3_SERVER_URL}/health`, {
      timeout: 10000,
    });
    if (resp.status === 200) {
      const data = JSON.parse(resp.body) as { status: string };
      return data.status === "ready";
    }
  } catch {}
  return false;
}

/**
 * Resolve which TTS engine to use.
 * Priority: TTS_ENGINE env > content JSON ttsEngine > auto-detect (fish-audio if available).
 */
function resolveEngine(
  bookEngine?: string,
): "fish-audio" | "qwen3-tts" | "edge-tts" {
  const envEngine = process.env.TTS_ENGINE;
  if (
    envEngine === "fish-audio" ||
    envEngine === "qwen3-tts" ||
    envEngine === "edge-tts"
  ) {
    return envEngine;
  }
  if (bookEngine === "fish-audio") return "fish-audio";
  if (bookEngine === "qwen3-tts") return "qwen3-tts";
  // Auto-detect: prefer fish-audio if API key is configured (env-only check, no SDK)
  if (process.env.FISH_API_KEY && process.env.FISH_VOICE_MODEL_ID)
    return "fish-audio";
  return "edge-tts";
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

  const engine = resolveEngine(book.narration.ttsEngine);
  const fishEngine = engine === "fish-audio" ? await loadFishEngine() : null;
  const fishConfig = fishEngine ? fishEngine.getFishAudioConfig() : undefined;

  if (engine === "fish-audio" && fishConfig) {
    console.log("[INFO] Using fish-audio engine");
  } else if (engine === "qwen3-tts") {
    console.log("[INFO] Using qwen3-tts engine");
    const ready = await waitForQwen3Server();
    if (!ready) {
      console.error(
        "[ERROR] qwen3-tts server not running. Start it first:\n" +
          "  uv run --with qwen-tts --with faster-whisper scripts/qwen3-tts-server.py \\\n" +
          '    --ref-audio assets/voice/myvoice.m4a --ref-text "..."',
      );
      process.exit(1);
    }
  } else {
    console.log("[INFO] Using edge-tts engine");
  }

  const manifest: TTSManifestEntry[] = [];

  for (const scene of book.scenes) {
    const text = scene.beats?.length
      ? resolveBeatNarration(scene)
      : scene.narrationText;

    if (!text || text.trim().length === 0) {
      console.log(`[SKIP] ${scene.id} — no narrationText`);
      continue;
    }

    const audioFile = `${scene.id}.mp3`;
    const vttFile = `${scene.id}.vtt`;
    const captionsFile = `${scene.id}.json`;
    const audioPath = path.join(OUTPUT_DIR, audioFile);
    const vttPath = path.join(OUTPUT_DIR, vttFile);
    const captionsPath = path.join(OUTPUT_DIR, captionsFile);

    console.log(`[TTS] ${scene.id}: "${text.slice(0, 40)}..."`);

    let success = false;
    let fishDurationMs = 0;
    let usedFishAudio = false;

    // 1) Fish Audio (if selected)
    if (engine === "fish-audio" && fishConfig) {
      const fishResult = await generateViaFishAudio(
        text,
        audioPath,
        fishConfig,
        scene.type,
        book.narration.speed,
      );
      success = fishResult.success;
      fishDurationMs = fishResult.durationMs;
      usedFishAudio = success;
      if (!success) {
        console.warn(`[WARN] fish-audio failed, falling back to edge-tts`);
      }
    }

    // 2) Qwen3 (if selected or fish-audio failed)
    if (
      !success &&
      (engine === "qwen3-tts" || (engine === "fish-audio" && !usedFishAudio))
    ) {
      if (engine === "qwen3-tts") {
        success = await generateViaQwen3(
          text,
          audioPath,
          vttPath,
          book.narration.speed ?? 1.0,
        );
        if (!success) {
          console.warn(`[WARN] qwen3-tts failed, falling back to edge-tts`);
        }
      }
    }

    // 3) edge-tts (final fallback)
    if (!success) {
      success = await generateViaEdgeTTS(
        text,
        book.narration,
        audioPath,
        vttPath,
      );
    }

    if (!success) {
      console.error(`[FAIL] ${scene.id}: TTS generation failed`);
      continue;
    }

    // Get duration (Fish Audio already measured it; otherwise use ffprobe)
    const durationMs =
      usedFishAudio && fishDurationMs > 0
        ? fishDurationMs
        : getAudioDurationMs(audioPath);
    const durationFrames = Math.ceil((durationMs / 1000) * FPS);

    // Generate captions:
    // - Fish Audio: proportional character-based (no VTT)
    // - Qwen3/edge-tts: parse VTT file
    let captions: Caption[] = [];
    if (usedFishAudio) {
      const fe = await loadFishEngine();
      if (fe && fishConfig) {
        // STT for accurate timestamps, proportional fallback on failure
        const sttResult = await fe.transcribeWithFishSTT(
          audioPath,
          fishConfig.apiKey,
        );
        if (sttResult?.segments?.length) {
          captions = fe.sttSegmentsToCaptions(sttResult.segments);
          console.log(
            `  📝 STT captions: ${captions.length} words from ${sttResult.segments.length} segments`,
          );
        } else {
          console.log(`  📝 STT unavailable, using proportional fallback`);
          captions = fe.generateCaptionsFromText(text, durationMs);
        }
      } else {
        captions = [];
      }
    } else if (fs.existsSync(vttPath)) {
      const vttContent = fs.readFileSync(vttPath, "utf-8");
      captions = vttToCaptions(vttContent);
    }

    // Align last caption endMs to audio duration (fixes tail gap)
    if (captions.length > 0 && durationMs > 0) {
      const lastCap = captions[captions.length - 1];
      if (lastCap.endMs < durationMs - 50) {
        captions[captions.length - 1] = { ...lastCap, endMs: durationMs };
      }
    }

    fs.writeFileSync(captionsPath, JSON.stringify(captions, null, 2));

    const entry: TTSManifestEntry = {
      sceneId: scene.id,
      audioFile,
      captionsFile,
      durationMs,
      durationFrames,
    };

    if (scene.beats?.length) {
      entry.beatTimings = resolveBeatTimings(
        scene.beats,
        captions,
        durationFrames,
        FPS,
      );
      console.log(`  🎵 ${entry.beatTimings.length} beat timings resolved`);
    }

    manifest.push(entry);

    console.log(
      `  ✓ ${durationMs}ms (${durationFrames}f), ${captions.length} words`,
    );

    // Clean up VTT (we have JSON now)
    if (fs.existsSync(vttPath)) {
      fs.unlinkSync(vttPath);
    }
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
