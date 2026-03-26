/**
 * End-to-end video generation pipeline.
 * Runs validate → TTS/captions → QA pre-render → render → QA post-render.
 *
 * Usage: npx ts-node scripts/make-video.ts content/books/miracle-morning.json [--format longform|shorts]
 */

import { execFileSync } from "child_process";
import fs from "fs";
import path from "path";

const BOOK_PATH = process.argv[2];
const FORMAT = process.argv.includes("--format")
  ? process.argv[process.argv.indexOf("--format") + 1]
  : "longform";

function step(name: string, fn: () => void) {
  console.log(`\n▶ ${name}`);
  try {
    fn();
    console.log(`  ✓ 완료`);
  } catch (err) {
    console.error(`  ✗ 실패:`, err);
    process.exit(1);
  }
}

function run(cmd: string, args: string[]) {
  execFileSync(cmd, args, { stdio: "inherit", encoding: "utf-8" });
}

function main() {
  if (!BOOK_PATH) {
    console.error(
      "Usage: npx ts-node scripts/make-video.ts <book.json> [--format longform|shorts]",
    );
    process.exit(1);
  }

  const bookPath = path.resolve(BOOK_PATH);
  if (!fs.existsSync(bookPath)) {
    console.error(`Book not found: ${bookPath}`);
    process.exit(1);
  }

  const bookName = path.basename(bookPath, ".json");

  console.log(`\n=== make:video ===`);
  console.log(`Book: ${bookPath}`);
  console.log(`Format: ${FORMAT}`);

  // Step 1: validate
  step("1/6 콘텐츠 JSON 검증", () => {
    run("npx", ["ts-node", "scripts/validate-content.ts", bookPath]);
  });

  // Step 2: duration budget check (pre-TTS)
  step("2/6 Duration budget 검사 (pre-TTS)", () => {
    run("npx", [
      "ts-node",
      "scripts/qa-check.ts",
      "--pre-tts",
      "--content",
      bookPath,
    ]);
  });

  // Step 3: generate TTS + captions + manifest
  step("3/6 TTS 생성 + 자막/manifest 생성", () => {
    run("npx", ["ts-node", "scripts/generate-captions.ts", bookPath]);
  });

  // Step 4: asset pre-render check
  step("4/6 Asset 존재 검사 (pre-render)", () => {
    run("npx", [
      "ts-node",
      "scripts/qa-check.ts",
      "--pre-render",
      "--content",
      bookPath,
    ]);
  });

  // Step 5: render
  const renderScript =
    FORMAT === "shorts"
      ? "scripts/render-shorts.ts"
      : "scripts/render-longform.ts";

  step(`5/6 렌더링 (${FORMAT})`, () => {
    run("npx", ["ts-node", renderScript, "--book", bookName]);
  });

  // Step 6: QA (post-render, includes QA-13B post-TTS duration check)
  step("6/6 QA 검사 (post-render)", () => {
    run("npx", ["ts-node", "scripts/qa-check.ts", "--content", bookPath]);
  });

  console.log("\n✅ 완료. output/ 디렉토리를 확인하세요.");
}

main();
