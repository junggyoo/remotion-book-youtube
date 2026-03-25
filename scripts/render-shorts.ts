/**
 * Render shorts composition to MP4.
 *
 * Usage: npx ts-node scripts/render-shorts.ts --book test-book
 *
 * Maps book name to Remotion composition ID:
 *   test-book → ShortsPreview
 */

import { execFileSync } from "child_process";
import fs from "fs";
import path from "path";

const COMPOSITION_MAP: Record<string, string> = {
  "test-book": "ShortsPreview",
};

function main() {
  const bookIdx = process.argv.indexOf("--book");
  const bookName = bookIdx !== -1 ? process.argv[bookIdx + 1] : undefined;

  if (!bookName) {
    console.error(
      "Usage: npx ts-node scripts/render-shorts.ts --book <book-name>",
    );
    process.exit(1);
  }

  const compositionId = COMPOSITION_MAP[bookName];
  if (!compositionId) {
    console.error(
      `Unknown book: "${bookName}". Known books: ${Object.keys(COMPOSITION_MAP).join(", ")}`,
    );
    console.error(
      "Add a mapping in scripts/render-shorts.ts or register the composition in src/Root.tsx",
    );
    process.exit(1);
  }

  const outputDir = path.resolve("output");
  fs.mkdirSync(outputDir, { recursive: true });
  const outputPath = path.join(outputDir, `${bookName}-shorts.mp4`);

  console.log(`\n=== Render Shorts ===`);
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
