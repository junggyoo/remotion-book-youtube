import fs from "fs";
import path from "path";
import type { BookContent, NarrationConfig, TTSResult } from "../src/types";
import { generateTTSWithCaptions } from "../src/tts/ttsClient";
import { generateSentenceSubtitles } from "../src/tts/subtitleGen";

const BOOK_PATH = process.argv[2] || "content/books/miracle-morning.json";
const OUTPUT_DIR = "output/tts/miracle-morning";
const FPS = 30;
const DURATION_PADDING_FRAMES = 15;

async function main() {
  const raw = JSON.parse(fs.readFileSync(path.resolve(BOOK_PATH), "utf-8"));
  const book = raw as BookContent;

  const config: NarrationConfig = book.narration;
  const results: Array<{
    sceneId: string;
    tts?: TTSResult;
    durationFrames: number;
    narrationLength: number;
  }> = [];

  console.log(`\n=== TTS Generation for ${book.metadata.title} ===`);
  console.log(`Scenes: ${book.scenes.length}`);
  console.log(`Voice: ${config.voice}\n`);

  let cumulativeFrom = 0;

  for (const scene of book.scenes) {
    const text = scene.narrationText;
    if (!text || text.trim().length === 0) {
      console.log(`[SKIP] ${scene.id}: no narration`);
      results.push({
        sceneId: scene.id,
        durationFrames: 90,
        narrationLength: 0,
      });
      cumulativeFrom += 90;
      continue;
    }

    console.log(
      `[TTS] ${scene.id}: "${text.substring(0, 40)}..." (${text.length}자)`,
    );

    const ttsResult = await generateTTSWithCaptions(
      scene.id,
      text,
      config,
      path.resolve(OUTPUT_DIR),
    );

    if (ttsResult) {
      const durationFrames = ttsResult.durationFrames + DURATION_PADDING_FRAMES;
      console.log(
        `  ✅ ${ttsResult.durationMs}ms → ${durationFrames} frames (${(durationFrames / FPS).toFixed(1)}s)`,
      );
      results.push({
        sceneId: scene.id,
        tts: ttsResult,
        durationFrames,
        narrationLength: text.length,
      });
      cumulativeFrom += durationFrames;
    } else {
      console.log(`  ⚠️  TTS failed, using fallback duration`);
      results.push({
        sceneId: scene.id,
        durationFrames: 150,
        narrationLength: text.length,
      });
      cumulativeFrom += 150;
    }
  }

  // Summary
  const totalFrames = results.reduce((sum, r) => sum + r.durationFrames, 0);
  const totalSeconds = totalFrames / FPS;
  const successCount = results.filter((r) => r.tts).length;

  console.log(`\n=== Summary ===`);
  console.log(`Total: ${results.length} scenes`);
  console.log(`TTS success: ${successCount}/${results.length}`);
  console.log(
    `Total duration: ${totalFrames} frames (${totalSeconds.toFixed(1)}s = ${(totalSeconds / 60).toFixed(1)}min)`,
  );
  console.log(`Target: 480s (8min)`);
  console.log(`Diff: ${(totalSeconds - 480).toFixed(1)}s`);

  // Write duration map
  const durationMap = results.map((r) => ({
    sceneId: r.sceneId,
    durationFrames: r.durationFrames,
    durationSec: +(r.durationFrames / FPS).toFixed(2),
    ttsSuccess: !!r.tts,
    audioPath: r.tts?.audioFilePath,
  }));

  const outputPath = path.resolve(
    "content/dsgs/miracle-morning/06-tts-duration-map.json",
  );
  fs.writeFileSync(
    outputPath,
    JSON.stringify(
      {
        _stage: "6.5-TTS",
        _generatedAt: new Date().toISOString().split("T")[0],
        totalFrames,
        totalSeconds: +totalSeconds.toFixed(1),
        targetSeconds: 480,
        scenes: durationMap,
      },
      null,
      2,
    ),
  );

  console.log(`\nDuration map saved: ${outputPath}`);
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
