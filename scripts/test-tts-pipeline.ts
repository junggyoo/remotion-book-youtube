/**
 * Test TTS + subtitle pipeline on miracle morning scenes.
 *
 * Usage: npx ts-node --project tsconfig.json scripts/test-tts-pipeline.ts
 *
 * Tests:
 * 1. TTS generation with edge-tts (or fallback if not installed)
 * 2. Sentence-level subtitle generation
 * 3. Subtitle line-length compliance (28 chars, 2 lines)
 * 4. Duration sync logic
 */

import fs from "fs";
import path from "path";
import { generateTTSWithCaptions, generateTTS } from "../src/tts/ttsClient";
import {
  generateSentenceSubtitles,
  generateSubtitles,
  splitKoreanSentences,
  MAX_CHARS_PER_LINE,
  MAX_LINES,
} from "../src/tts/subtitleGen";
import { syncDuration } from "../src/tts/durationSync";
import type { NarrationConfig, TTSResult, TypedScene } from "../src/types";

interface BookContent {
  scenes: Array<{
    id: string;
    type: string;
    narrationText?: string;
    content: Record<string, unknown>;
  }>;
  narration: {
    voice: string;
    ttsEngine?: string;
    speed?: number;
    pitch?: string;
  };
}

const FPS = 30;
const OUTPUT_DIR = path.resolve(process.cwd(), "assets/tts");
const BOOK_PATH = path.resolve(
  process.cwd(),
  "content/books/miracle-morning.json",
);

interface TestResult {
  sceneId: string;
  ttsSuccess: boolean;
  durationMs: number;
  subtitleCount: number;
  linesOk: boolean;
  error?: string;
}

async function testScene(
  scene: { id: string; type: string; narrationText?: string },
  config: NarrationConfig,
  sceneIndex: number,
): Promise<TestResult> {
  const result: TestResult = {
    sceneId: scene.id,
    ttsSuccess: false,
    durationMs: 0,
    subtitleCount: 0,
    linesOk: true,
  };

  if (!scene.narrationText) {
    result.error = "No narrationText";
    return result;
  }

  // Test Korean sentence splitting
  const sentences = splitKoreanSentences(scene.narrationText);
  console.log(`  Sentences (${sentences.length}):`);
  sentences.forEach((s, i) => console.log(`    [${i}] "${s}"`));

  // Attempt TTS generation
  const ttsResult = await generateTTSWithCaptions(
    scene.id,
    scene.narrationText,
    config,
    OUTPUT_DIR,
  );

  if (ttsResult) {
    result.ttsSuccess = true;
    result.durationMs = ttsResult.durationMs;

    console.log(
      `  TTS: ${ttsResult.durationMs}ms (${ttsResult.durationFrames}f), ${ttsResult.captions.length} caption words`,
    );

    // Generate sentence-level subtitles
    const startFrame = sceneIndex * 300; // mock scene start frames
    const subtitles = generateSentenceSubtitles(
      scene.narrationText,
      ttsResult.captions,
      startFrame,
      FPS,
    );

    result.subtitleCount = subtitles.length;
    console.log(`  Subtitles (${subtitles.length}):`);

    // Validate each subtitle
    for (const sub of subtitles) {
      console.log(
        `    [${sub.startFrame}f-${sub.endFrame}f] ${sub.lines.join(" | ")}`,
      );

      // Check line length compliance
      for (const line of sub.lines) {
        if (line.length > MAX_CHARS_PER_LINE) {
          console.log(
            `    Warning: Line exceeds ${MAX_CHARS_PER_LINE} chars: "${line}" (${line.length})`,
          );
          result.linesOk = false;
        }
      }
      if (sub.lines.length > MAX_LINES) {
        console.log(
          `    Warning: Too many lines: ${sub.lines.length} > ${MAX_LINES}`,
        );
        result.linesOk = false;
      }
    }

    // Assert audio file exists
    if (!fs.existsSync(ttsResult.audioFilePath)) {
      result.error = "Audio file not found";
    }
  } else {
    console.log(
      "  TTS: FAILED (edge-tts not available?) — testing fallback...",
    );

    // Test fallback path
    const startFrame = sceneIndex * 300;
    const durationFrames = 150; // mock catalog default
    const fallback = generateSubtitles(
      scene.id,
      scene.narrationText,
      startFrame,
      durationFrames,
    );

    result.subtitleCount = 1;
    console.log(
      `  Fallback subtitle: [${fallback.startFrame}f-${fallback.endFrame}f] ${fallback.lines.join(" | ")}`,
    );

    for (const line of fallback.lines) {
      if (line.length > MAX_CHARS_PER_LINE) {
        result.linesOk = false;
      }
    }
  }

  return result;
}

function testSyncDuration(): boolean {
  console.log("\n--- syncDuration tests ---");
  let passed = 0;
  const total = 3;

  // Mock scene
  const mockScene = { id: "test", type: "cover" } as TypedScene;

  // Case 1: No TTS -> catalog default
  try {
    const dur = syncDuration(mockScene);
    console.log(`  [1] No TTS -> ${dur}f (catalog default)`);
    if (dur > 0) passed++;
  } catch (e) {
    console.log(`  [1] FAIL: ${e}`);
  }

  // Case 2: TTS within range -> TTS + 15
  try {
    const catalogDefault = 150; // cover default
    const mockTts: TTSResult = {
      sceneId: "test",
      audioFilePath: "/tmp/test.mp3",
      durationFrames: catalogDefault + 30, // within limit
      durationMs: 6000,
    };
    const dur = syncDuration(mockScene, mockTts);
    console.log(
      `  [2] TTS within range -> ${dur}f (expected ${mockTts.durationFrames + 15})`,
    );
    if (dur === mockTts.durationFrames + 15) passed++;
  } catch (e) {
    console.log(`  [2] FAIL: ${e}`);
  }

  // Case 3: TTS too long -> throws
  try {
    const mockTts: TTSResult = {
      sceneId: "test",
      audioFilePath: "/tmp/test.mp3",
      durationFrames: 9999, // way over limit
      durationMs: 333000,
    };
    syncDuration(mockScene, mockTts);
    console.log("  [3] FAIL: should have thrown");
  } catch (e) {
    console.log(`  [3] TTS too long -> threw error (expected)`);
    passed++;
  }

  console.log(`  syncDuration: ${passed}/${total} passed`);
  return passed === total;
}

async function main() {
  console.log("=== TTS Pipeline Test: Miracle Morning ===\n");

  // Read book content
  if (!fs.existsSync(BOOK_PATH)) {
    console.error(`Book file not found: ${BOOK_PATH}`);
    process.exit(1);
  }

  const book: BookContent = JSON.parse(fs.readFileSync(BOOK_PATH, "utf-8"));

  // Ensure output dir exists
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  // Build NarrationConfig
  const config: NarrationConfig = {
    voice: book.narration.voice,
    ttsEngine:
      (book.narration.ttsEngine as NarrationConfig["ttsEngine"]) ?? "edge-tts",
    speed: book.narration.speed ?? 1.0,
    pitch: book.narration.pitch ?? "+0Hz",
  };

  // Test first 3 scenes
  const scenesToTest = book.scenes.slice(0, 3);
  const results: TestResult[] = [];

  for (let i = 0; i < scenesToTest.length; i++) {
    const scene = scenesToTest[i];
    console.log(`\n--- Scene: ${scene.id} (${scene.type}) ---`);
    const result = await testScene(scene, config, i);
    results.push(result);
  }

  // syncDuration tests
  const syncOk = testSyncDuration();

  // Summary
  console.log("\n=== SUMMARY ===");
  for (const r of results) {
    const status = r.error ? "FAIL" : r.ttsSuccess ? "PASS" : "WARN";
    const ttsInfo = r.ttsSuccess
      ? `audio=${r.durationMs}ms`
      : "no-tts(fallback)";
    console.log(
      `[${status}] ${r.sceneId}: ${ttsInfo}, subtitles=${r.subtitleCount}, lines_ok=${r.linesOk}`,
    );
  }
  console.log(`[${syncOk ? "PASS" : "FAIL"}] syncDuration: 3/3 cases`);

  const allPass = results.every((r) => !r.error) && syncOk;
  console.log(`\nOverall: ${allPass ? "ALL PASS" : "SOME FAILURES"}`);
  process.exit(allPass ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
