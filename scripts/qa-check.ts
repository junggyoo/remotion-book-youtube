/**
 * QA checker for TTS pipeline assets.
 *
 * Usage:
 *   npx ts-node scripts/qa-check.ts              → full check (QA 1-15)
 *   npx ts-node scripts/qa-check.ts --pre-render → pre-render checks only
 *   npx ts-node scripts/qa-check.ts --pre-tts    → budget checks only (QA 13A/14/15, no manifest needed)
 */

import fs from "fs";
import path from "path";
import {
  calculateBudget,
  extractSceneComposition,
  getMinChars,
} from "../src/pipeline/durationBudget";

const PRE_RENDER_ONLY = process.argv.includes("--pre-render");
const PRE_TTS_ONLY = process.argv.includes("--pre-tts");
const ASSETS_TTS = path.resolve("assets/tts");
const MANIFEST_PATH = path.join(ASSETS_TTS, "manifest.json");
const FPS = 30;

const CONTENT_ARG_IDX = process.argv.findIndex((a) => a === "--content");
const CONTENT_PATH =
  CONTENT_ARG_IDX >= 0 ? process.argv[CONTENT_ARG_IDX + 1] : null;

let bookContent: any = {};
let bookScenes: any[] = [];
if (CONTENT_PATH && fs.existsSync(CONTENT_PATH)) {
  bookContent = JSON.parse(fs.readFileSync(CONTENT_PATH, "utf-8"));
  bookScenes = bookContent.scenes ?? [];
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

// =====================================================================
// Content-only checks (no manifest needed — run in --pre-tts mode too)
// =====================================================================

const targetDuration = bookContent.production?.targetDurationSeconds;
const ttsSpeed = bookContent.narration?.speed ?? 1;

// QA-13A: Pre-TTS budget check (char count estimate vs target ±25%)
if (bookScenes.length > 0 && targetDuration) {
  const composition = extractSceneComposition(bookScenes);
  const budget = calculateBudget(targetDuration, composition, {
    ttsSpeed,
  });
  const actualChars = bookScenes.reduce(
    (sum: number, s: any) => sum + (s.narrationText?.length ?? 0),
    0,
  );
  const deviation =
    Math.abs(actualChars - budget.estimatedNarrationChars) /
    budget.estimatedNarrationChars;
  check(
    deviation <= 0.25,
    `QA-13A: 총 narration ${actualChars}자 vs 예상 ${budget.estimatedNarrationChars}자 — 편차 ${(deviation * 100).toFixed(1)}% (허용: ±25%)`,
  );
  warnings.push(
    `📊 Budget: 실제 ${actualChars}자 / 예상 ${budget.estimatedNarrationChars}자 (CPS=${budget.koreanCPS}, target=${targetDuration}s)`,
  );

  // QA-13A 실패 시 씬별 부족분 + 액셔너블 수정 지시 출력
  if (deviation > 0.25) {
    const totalMin = Math.round(budget.estimatedNarrationChars * 0.75);
    const totalGap = totalMin - actualChars;

    console.log("\n📋 씬별 나레이션 분량 상세:");
    console.log(
      "  " +
        ["씬 ID", "타입", "실제", "최소", "권장", "상태"]
          .map((h, i) => (i < 2 ? h.padEnd(22) : h.padStart(6)))
          .join("  "),
    );

    const sceneShortfalls: { id: string; gap: number }[] = [];
    for (const sb of budget.scenes) {
      const scene = bookScenes.find((s: any) => s.id === sb.sceneId);
      const actual = scene?.narrationText?.length ?? 0;
      const gap = actual < sb.minChars ? sb.minChars - actual : 0;
      const marker = gap > 0 ? `⚠ -${gap}자` : actual === 0 ? "미작성" : "✅";

      if (gap > 0) sceneShortfalls.push({ id: sb.sceneId, gap });

      console.log(
        "  " +
          [
            sb.sceneId.padEnd(22),
            sb.type.padEnd(22),
            String(actual).padStart(6),
            String(sb.minChars).padStart(6),
            String(sb.recommendedChars).padStart(6),
            marker.padStart(6),
          ].join("  "),
      );
    }

    if (sceneShortfalls.length > 0) {
      console.log(
        `\n🔧 수정 필요 (${sceneShortfalls.length}개 씬, 총 ${totalGap}자 부족):`,
      );
      for (const sf of sceneShortfalls) {
        const sentences = Math.ceil(sf.gap / 25);
        console.log(`   ${sf.id}: ${sf.gap}자 추가 필요 (약 ${sentences}문장)`);
      }
    }
    console.log();
  }
}

// QA-14: Per-scene minimum narration check
if (bookScenes.length > 0) {
  for (const scene of bookScenes) {
    if (!scene.narrationText) continue;
    const itemCount =
      scene.content?.items?.length ??
      scene.content?.steps?.length ??
      scene.content?.events?.length ??
      0;
    const minChars = getMinChars(scene.type, itemCount);
    const actual = scene.narrationText.length;
    // closing scenes get a pass (CTA can be longer)
    const isWarningOnly = scene.type === "closing";
    check(
      actual >= minChars,
      `QA-14: scene ${scene.id} (${scene.type}): ${actual}자 < 최소 ${minChars}자`,
      isWarningOnly,
    );
  }
}

// QA-15: Beat-level narration coverage (framework/application items vs beats)
if (bookScenes.length > 0) {
  for (const scene of bookScenes) {
    if (!scene.beats || scene.beats.length === 0) continue;

    let expectedPrefix: string | null = null;
    let expectedCount = 0;

    if (scene.type === "framework" && scene.content?.items?.length) {
      expectedPrefix = "item";
      expectedCount = scene.content.items.length;
    } else if (scene.type === "application" && scene.content?.steps?.length) {
      expectedPrefix = "step";
      expectedCount = scene.content.steps.length;
    } else if (scene.type === "timeline" && scene.content?.events?.length) {
      expectedPrefix = "event";
      expectedCount = scene.content.events.length;
    } else if (scene.type === "listReveal" && scene.content?.items?.length) {
      expectedPrefix = "item";
      expectedCount = scene.content.items.length;
    }

    if (expectedPrefix && expectedCount > 0) {
      for (let i = 0; i < expectedCount; i++) {
        const key = `${expectedPrefix}-${i}`;
        const hasBeat = scene.beats.some(
          (b: any) => b.activates?.includes(key) && b.narrationText?.trim(),
        );
        check(
          hasBeat,
          `QA-15: scene ${scene.id}: ${key}에 대응하는 narration beat 없음`,
        );
      }
    }
  }
}

// In --pre-tts mode, skip all manifest-dependent checks
if (PRE_TTS_ONLY) {
  // fall through to results
} else {
  // =====================================================================
  // Manifest-dependent checks (QA 1-12 + QA-13B)
  // =====================================================================

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
      const totalFrames = manifest.reduce(
        (sum, e) => sum + e.durationFrames,
        0,
      );
      const totalSec = totalFrames / FPS;
      warnings.push(
        totalSec < 60
          ? `총 영상 길이 ${totalSec.toFixed(1)}s — 너무 짧을 수 있음`
          : `총 영상 길이 ${totalSec.toFixed(1)}s (${(totalSec / 60).toFixed(1)}분)`,
      );
    }

    // QA-13B: Post-TTS total duration check (actual TTS vs target ±15%)
    if (targetDuration) {
      const totalFrames = manifest.reduce(
        (sum, e) => sum + e.durationFrames,
        0,
      );
      const totalSec = totalFrames / FPS;
      const deviation = Math.abs(totalSec - targetDuration) / targetDuration;
      check(
        deviation <= 0.15,
        `QA-13B: TTS 총 ${totalSec.toFixed(1)}s vs 목표 ${targetDuration}s — 편차 ${(deviation * 100).toFixed(1)}% (허용: ±15%)`,
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
        "leftPanel",
        "rightLabel",
        "rightContent",
        "rightPanel",
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
