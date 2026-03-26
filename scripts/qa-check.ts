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

const CONTENT_ARG_IDX = process.argv.findIndex((a) => a === "--content");
const CONTENT_PATH =
  CONTENT_ARG_IDX >= 0 ? process.argv[CONTENT_ARG_IDX + 1] : null;

let bookScenes: any[] = [];
if (CONTENT_PATH && fs.existsSync(CONTENT_PATH)) {
  const book = JSON.parse(fs.readFileSync(CONTENT_PATH, "utf-8"));
  bookScenes = book.scenes ?? [];
}

interface ManifestEntry {
  sceneId: string;
  audioFile: string;
  captionsFile: string;
  durationMs: number;
  durationFrames: number;
  beatTimings?: {
    beatId: string;
    resolvedStartFrame: number;
    resolvedEndFrame: number;
  }[];
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

  // === Content-aware checks (require --content <path>) ===

  // QA-8: Duration mismatch (narration 씬에서 TTS와 명시된 scene duration 차이 > 60f)
  if (bookScenes.length > 0) {
    for (const entry of manifest) {
      const scene = bookScenes.find((s: any) => s.id === entry.sceneId);
      if (scene?.narrationText && scene?.durationFrames) {
        const diff = Math.abs(scene.durationFrames - entry.durationFrames);
        check(
          diff <= 60,
          `Duration 불일치: scene ${entry.sceneId} — JSON=${scene.durationFrames}f, TTS=${entry.durationFrames}f, diff=${diff}f (>60f 허용치 초과)`,
        );
      }
    }
  }

  // QA-9: Beat range overflow (resolvedEndFrame > sceneDurationFrames)
  for (const entry of manifest) {
    if (entry.beatTimings) {
      for (const bt of entry.beatTimings) {
        check(
          bt.resolvedEndFrame <= entry.durationFrames + 5,
          `Beat overflow: scene ${entry.sceneId} beat ${bt.beatId} — endFrame=${bt.resolvedEndFrame} > TTS duration=${entry.durationFrames}`,
        );
      }
    }
  }

  // QA-10: Invalid activates key
  const SCENE_ELEMENT_KEYS: Record<string, string[]> = {
    cover: ["coverImage", "title", "subtitle", "author", "brandLabel"],
    highlight: ["mainText", "subText", "signalBar", "pulse"],
    keyInsight: ["signalBar", "headline", "supportText", "evidenceCard"],
    chapterDivider: ["chapterNumber", "chapterTitle", "chapterSubtitle"],
    compareContrast: [
      "leftLabel",
      "leftContent",
      "rightLabel",
      "rightContent",
      "connector",
    ],
    quote: ["quoteMark", "quoteText", "attribution", "accentDivider"],
    data: [
      "dataLabel",
      "chart",
      "chartContainer",
      "annotation",
      "sourceCredit",
    ],
    closing: ["recapStatement", "ctaText", "brandLabel"],
    timeline: ["timelineBar"],
    listReveal: ["listLabel"],
    splitQuote: ["leftQuote", "rightQuote", "vsLabel"],
    transition: ["labelContainer", "label", "brandMark"],
  };

  if (bookScenes.length > 0) {
    for (const scene of bookScenes) {
      if (!scene.beats) continue;
      const staticKeys = SCENE_ELEMENT_KEYS[scene.type] ?? [];
      const itemCount =
        scene.content?.items?.length ??
        scene.content?.steps?.length ??
        scene.content?.events?.length ??
        0;

      for (const beat of scene.beats) {
        for (const key of beat.activates ?? []) {
          if (key === "*") continue;
          const dynamicMatch = key.match(/^(item|step|event)-(\d+)$/);
          if (dynamicMatch) {
            const idx = parseInt(dynamicMatch[2], 10);
            check(
              idx < itemCount,
              `Invalid activates key: scene ${scene.id} beat ${beat.id} — '${key}' 참조하지만 items/steps 개수는 ${itemCount}개 (0-indexed 최대: ${itemCount - 1})`,
            );
          } else {
            check(
              staticKeys.length === 0 || staticKeys.includes(key),
              `Invalid activates key: scene ${scene.id} beat ${beat.id} — '${key}'는 ${scene.type} 씬의 유효한 element key가 아님`,
            );
          }
        }
      }
    }
  }

  // QA-11: Empty scene (narration도 beats도 없음)
  if (bookScenes.length > 0) {
    for (const scene of bookScenes) {
      check(
        !!scene.narrationText?.trim() ||
          (scene.beats && scene.beats.length > 0),
        `빈 씬: scene ${scene.id} — narration도 beats도 없음`,
      );
    }
  }

  // QA-12: Cover asset existence
  if (bookScenes.length > 0) {
    for (const scene of bookScenes) {
      if (scene.type === "cover" && scene.content?.coverImageUrl) {
        const coverPath = path.resolve("assets", scene.content.coverImageUrl);
        check(
          fs.existsSync(coverPath),
          `커버 이미지 없음: ${coverPath} (sceneId: ${scene.id}) — fallback 동작하지만 품질 저하`,
          true,
        );
      }
    }
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
