/**
 * QA checker for TTS pipeline assets.
 *
 * Usage:
 *   npx ts-node scripts/qa-check.ts              → full check
 *   npx ts-node scripts/qa-check.ts --pre-render → pre-render checks only
 */

import fs from "fs";
import path from "path";

const PRE_RENDER_ONLY = process.argv.includes("--pre-render");
const ASSETS_TTS = path.resolve("assets/tts");
const MANIFEST_PATH = path.join(ASSETS_TTS, "manifest.json");
const FPS = 30;

interface ManifestEntry {
  sceneId: string;
  audioFile: string;
  captionsFile: string;
  durationMs: number;
  durationFrames: number;
}

const errors: string[] = [];
const warnings: string[] = [];

function check(condition: boolean, errorMsg: string, isWarning = false) {
  if (!condition) {
    if (isWarning) warnings.push(`⚠️  ${errorMsg}`);
    else errors.push(`❌ ${errorMsg}`);
  }
}

// QA-1: manifest existence
check(
  fs.existsSync(MANIFEST_PATH),
  `manifest.json 없음: ${MANIFEST_PATH} — 'npm run tts <book.json>'을 먼저 실행하세요`,
);

if (fs.existsSync(MANIFEST_PATH)) {
  const manifest: ManifestEntry[] = JSON.parse(
    fs.readFileSync(MANIFEST_PATH, "utf-8"),
  );

  for (const entry of manifest) {
    // QA-2: audio file existence
    const audioPath = path.join(ASSETS_TTS, entry.audioFile);
    check(
      fs.existsSync(audioPath),
      `오디오 파일 없음: ${audioPath} (sceneId: ${entry.sceneId})`,
    );

    // QA-3: captionsFile must be .json (not .vtt)
    check(
      entry.captionsFile.endsWith(".json"),
      `captionsFile 확장자 오류: ${entry.captionsFile} (sceneId: ${entry.sceneId}) — .json이어야 함`,
    );

    // QA-4: captions JSON file existence
    const captionsPath = path.join(ASSETS_TTS, entry.captionsFile);
    check(
      fs.existsSync(captionsPath),
      `자막 파일 없음: ${captionsPath} (sceneId: ${entry.sceneId})`,
    );

    // QA-5: path policy — no "public/tts" references
    check(
      !entry.audioFile.includes("public/tts") &&
        !entry.captionsFile.includes("public/tts"),
      `path policy 위반: 'public/tts' 참조 발견 (sceneId: ${entry.sceneId}) — 'assets/tts/' 기준으로 통일 필요`,
    );

    // QA-6: durationFrames sanity (warning only)
    check(
      entry.durationFrames > 0 && entry.durationFrames < FPS * 120,
      `비정상 durationFrames: ${entry.durationFrames} (sceneId: ${entry.sceneId})`,
      true,
    );
  }

  // QA-7: total duration summary (post-render only)
  if (!PRE_RENDER_ONLY) {
    const totalFrames = manifest.reduce((sum, e) => sum + e.durationFrames, 0);
    const totalSec = totalFrames / FPS;
    warnings.push(
      totalSec < 60
        ? `총 영상 길이 ${totalSec.toFixed(1)}s — 너무 짧을 수 있음`
        : `총 영상 길이 ${totalSec.toFixed(1)}s (${(totalSec / 60).toFixed(1)}분)`,
    );
  }
}

// Results
console.log("\n=== QA Check ===");
if (warnings.length > 0) {
  warnings.forEach((w) => console.log(w));
}
if (errors.length > 0) {
  errors.forEach((e) => console.error(e));
  console.error(`\n❌ QA 실패: ${errors.length}개 오류. 렌더를 중단합니다.`);
  process.exit(1);
} else {
  console.log(`✅ QA 통과 (경고 ${warnings.length}개)`);
}
