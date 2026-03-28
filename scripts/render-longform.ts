/**
 * Render longform composition to MP4.
 *
 * Usage: npx ts-node scripts/render-longform.ts --book miracle-morning
 *
 * Maps book name to Remotion composition ID:
 *   miracle-morning → MiracleMorning
 *   test-book       → LongformComposition
 */

import { execFileSync } from "child_process";
import fs from "fs";
import path from "path";

/**
 * Convert kebab-case book name to PascalCase composition ID.
 * e.g. "miracle-morning" → "MiracleMorning", "brain-success-2025" → "BrainSuccess2025"
 */
function bookNameToCompositionId(bookName: string): string {
  return bookName
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");
}

/**
 * Build composition map dynamically from content/books/*.json files.
 * Falls back to name convention if content dir is missing.
 */
function buildCompositionMap(): Record<string, string> {
  const booksDir = path.resolve("content/books");
  const map: Record<string, string> = {
    "test-book": "LongformComposition", // special case
  };

  if (fs.existsSync(booksDir)) {
    for (const file of fs.readdirSync(booksDir)) {
      if (!file.endsWith(".json")) continue;
      const bookName = file.replace(/\.json$/, "");
      map[bookName] = bookNameToCompositionId(bookName);
    }
  }

  return map;
}

const COMPOSITION_MAP = buildCompositionMap();

function main() {
  const bookIdx = process.argv.indexOf("--book");
  const bookName = bookIdx !== -1 ? process.argv[bookIdx + 1] : undefined;

  if (!bookName) {
    console.error(
      "Usage: npx ts-node scripts/render-longform.ts --book <book-name>",
    );
    console.error("  book-name: miracle-morning, test-book, etc.");
    process.exit(1);
  }

  const compositionId =
    COMPOSITION_MAP[bookName] ?? bookNameToCompositionId(bookName);
  if (!compositionId) {
    console.error(
      `Unknown book: "${bookName}". Known books: ${Object.keys(COMPOSITION_MAP).join(", ")}`,
    );
    process.exit(1);
  }

  const outputDir = path.resolve("output");
  fs.mkdirSync(outputDir, { recursive: true });
  const outputPath = path.join(outputDir, `${bookName}-longform.mp4`);

  console.log(`\n=== Render Longform ===`);
  console.log(`Composition: ${compositionId}`);
  console.log(`Output: ${outputPath}`);

  execFileSync(
    "npx",
    ["remotion", "render", compositionId, outputPath, "--codec", "h264"],
    { stdio: "inherit", encoding: "utf-8" },
  );

  console.log(`\n✅ Rendered: ${outputPath}`);
}

main();
