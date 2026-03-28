/**
 * Budget CLI — Content Composer가 나레이션 작성 전에 씬별 목표 글자수를 확인한다.
 *
 * Usage:
 *   npm run budget content/books/brain-success-2025.json
 *
 * narrationText가 비어있어도 동작한다 (2-pass 워크플로우의 1단계에서 사용).
 */

import fs from "fs";
import path from "path";
import {
  calculateBudget,
  extractSceneComposition,
} from "../src/pipeline/durationBudget";

// ── Args ──
const bookPath = process.argv[2];
if (!bookPath || !fs.existsSync(bookPath)) {
  console.error("Usage: npm run budget <content/books/xxx.json>");
  process.exit(1);
}

const book = JSON.parse(fs.readFileSync(bookPath, "utf-8"));
const scenes = book.scenes ?? [];
const targetDuration = book.production?.targetDurationSeconds;
const ttsSpeed = book.narration?.speed ?? 1;

if (!targetDuration) {
  console.error("production.targetDurationSeconds 누락");
  process.exit(1);
}

if (scenes.length === 0) {
  console.error("scenes 배열이 비어있음");
  process.exit(1);
}

// ── Calculate ──
const composition = extractSceneComposition(scenes);
const plan = calculateBudget(targetDuration, composition, { ttsSpeed });

// ── Actual chars (if narrationText exists) ──
const actuals = new Map<string, number>();
for (const s of scenes) {
  actuals.set(s.id, s.narrationText?.length ?? 0);
}

// ── Format ──
const totalMin = Math.round(plan.estimatedNarrationChars * 0.75);
const totalMax = Math.round(plan.estimatedNarrationChars * 1.25);

console.log(`\nBudget Plan: ${path.basename(bookPath)}`);
console.log(
  `   Target: ${targetDuration}s | CPS: ${plan.koreanCPS} | Speed: ${ttsSpeed}`,
);
console.log(
  `   Total target: ${plan.estimatedNarrationChars}자 (+-25% = ${totalMin}~${totalMax}자)\n`,
);

// Table header
const COL = { id: 25, type: 16, num: 6, status: 10 };

const header = [
  "씬 ID".padEnd(COL.id),
  "타입".padEnd(COL.type),
  "최소".padStart(COL.num),
  "권장".padStart(COL.num),
  "최대".padStart(COL.num),
  "실제".padStart(COL.num),
  "상태".padStart(COL.status),
].join(" | ");

const sep = "-".repeat(header.length);
console.log(sep);
console.log(header);
console.log(sep);

let totalActual = 0;
const shortfalls: { id: string; gap: number }[] = [];

for (const sb of plan.scenes) {
  const actual = actuals.get(sb.sceneId) ?? 0;
  totalActual += actual;

  let status: string;
  if (actual === 0) {
    status = "미작성";
  } else if (actual < sb.minChars) {
    const gap = sb.minChars - actual;
    status = `! -${gap}자`;
    shortfalls.push({ id: sb.sceneId, gap });
  } else if (actual >= sb.recommendedChars) {
    status = "OK";
  } else {
    status = `+${sb.recommendedChars - actual}`;
  }

  const row = [
    sb.sceneId.padEnd(COL.id),
    sb.type.padEnd(COL.type),
    String(sb.minChars).padStart(COL.num),
    String(sb.recommendedChars).padStart(COL.num),
    String(sb.maxChars).padStart(COL.num),
    String(actual).padStart(COL.num),
    status.padStart(COL.status),
  ].join(" | ");
  console.log(row);
}

console.log(sep);

// Summary
const totalStatus =
  totalActual === 0
    ? "나레이션 미작성 -- 위 '권장' 컬럼을 목표로 작성하세요"
    : totalActual >= totalMin
      ? "PASS"
      : `FAIL (-${totalMin - totalActual}자 부족)`;

console.log(
  `합계: 실제 ${totalActual}자 / 목표 ${plan.estimatedNarrationChars}자 (최소 ${totalMin}자) -> ${totalStatus}`,
);

// 액셔너블 수정 지시
if (shortfalls.length > 0) {
  console.log(`\n수정 필요 (${shortfalls.length}개 씬):`);
  for (const sf of shortfalls) {
    const sentences = Math.ceil(sf.gap / 25);
    console.log(`   ${sf.id}: ${sf.gap}자 추가 필요 (약 ${sentences}문장)`);
  }
}

console.log();
