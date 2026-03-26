/**
 * C.1: CLI to capture still frames at key moments in each scene.
 *
 * Usage:
 *   npx ts-node scripts/visual-qa/capture-stills.ts --book atomic-habits
 *   npx ts-node scripts/visual-qa/capture-stills.ts --book atomic-habits --scenes hook-01,cover-01
 *
 * Output: generated/books/{bookId}/.visual-qa/stills/{sceneId}-{pct}.png
 */

import fs from "fs";
import path from "path";

import "tsconfig-paths/register";

import { checkDependencies, renderStillForScene } from "./render-still-setup";
import type { BookContent, TypedScene } from "../../src/types/index";

// ---------------------------------------------------------------------------
// CLI argument parsing
// ---------------------------------------------------------------------------

function parseArgs(): { bookId: string; sceneFilter: string[] | null } {
  const args = process.argv.slice(2);
  let bookId = "";
  let sceneFilter: string[] | null = null;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--book" && args[i + 1]) {
      bookId = args[i + 1];
      i++;
    } else if (args[i] === "--scenes" && args[i + 1]) {
      sceneFilter = args[i + 1].split(",").map((s) => s.trim());
      i++;
    }
  }

  if (!bookId) {
    console.error(
      "Usage: npx ts-node scripts/visual-qa/capture-stills.ts --book <bookId> [--scenes id1,id2]",
    );
    process.exit(1);
  }

  return { bookId, sceneFilter };
}

// ---------------------------------------------------------------------------
// Capture ratios
// ---------------------------------------------------------------------------

/** Capture at 10%, 50%, 90% of scene duration */
const CAPTURE_RATIOS = [0.1, 0.5, 0.9];

function ratioToLabel(ratio: number): string {
  return `${Math.round(ratio * 100)}pct`;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const { bookId, sceneFilter } = parseArgs();

  // Check dependencies first
  const deps = checkDependencies();
  if (!deps.ok) {
    console.error(
      `[capture-stills] Missing dependencies: ${deps.missing.join(", ")}`,
    );
    console.error(
      `Install with: npm install --save-dev ${deps.missing.join(" ")}`,
    );
    process.exit(1);
  }

  // Load book content
  const bookPath = path.resolve(
    process.cwd(),
    "content",
    "books",
    `${bookId}.json`,
  );

  if (!fs.existsSync(bookPath)) {
    console.error(`[capture-stills] Book not found: ${bookPath}`);
    process.exit(1);
  }

  const bookContent: BookContent = JSON.parse(
    fs.readFileSync(bookPath, "utf-8"),
  );

  // Filter scenes
  let scenes: TypedScene[] = bookContent.scenes;
  if (sceneFilter) {
    scenes = scenes.filter((s) => sceneFilter.includes(s.id));
    if (scenes.length === 0) {
      console.error(
        `[capture-stills] No scenes matched filter: ${sceneFilter.join(", ")}`,
      );
      process.exit(1);
    }
  }

  // Output directory
  const outputBase = path.resolve(
    process.cwd(),
    "generated",
    "books",
    bookContent.metadata.id,
    ".visual-qa",
    "stills",
  );

  if (!fs.existsSync(outputBase)) {
    fs.mkdirSync(outputBase, { recursive: true });
  }

  console.log(
    `[capture-stills] Capturing ${scenes.length} scene(s) x ${CAPTURE_RATIOS.length} ratios`,
  );
  console.log(`[capture-stills] Output: ${outputBase}`);

  let captured = 0;
  let failed = 0;

  for (const scene of scenes) {
    for (const ratio of CAPTURE_RATIOS) {
      const label = ratioToLabel(ratio);
      const outputPath = path.join(outputBase, `${scene.id}-${label}.png`);

      try {
        await renderStillForScene({
          bookId,
          sceneId: scene.id,
          frameRatio: ratio,
          outputPath,
        });
        captured++;
        console.log(`  [OK] ${scene.id} @ ${label}`);
      } catch (err) {
        failed++;
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`  [FAIL] ${scene.id} @ ${label}: ${msg}`);
      }
    }
  }

  console.log(
    `\n[capture-stills] Done: ${captured} captured, ${failed} failed`,
  );

  if (failed > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
