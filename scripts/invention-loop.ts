#!/usr/bin/env node
/**
 * Standalone Invention Loop CLI
 *
 * Runs the gap → invention → validation → promotion loop
 * on a book's generated artifacts.
 *
 * Usage:
 *   npx ts-node scripts/invention-loop.ts content/books/miracle-morning.json [--dry-run]
 */

import "tsconfig-paths/register";
import { existsSync, readFileSync, readdirSync } from "fs";
import path from "path";
import type {
  BookContent,
  SceneGap,
  SynthesizedBlueprint,
  SceneBlueprint,
} from "../src/types";
import { runInventionLoop } from "../src/registry/inventionLoop";

// ---------------------------------------------------------------------------
// Parse args
// ---------------------------------------------------------------------------

const args = process.argv.slice(2);
const bookJsonPath = args.find((a) => !a.startsWith("--"));
const dryRun = args.includes("--dry-run");

if (!bookJsonPath) {
  console.error(
    "Usage: npx ts-node scripts/invention-loop.ts <book.json> [--dry-run]",
  );
  process.exit(1);
}

const resolvedPath = path.resolve(bookJsonPath);
if (!existsSync(resolvedPath)) {
  console.error(`Book file not found: ${resolvedPath}`);
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Load book + artifacts
// ---------------------------------------------------------------------------

const bookContent: BookContent = JSON.parse(
  readFileSync(resolvedPath, "utf-8"),
);
const bookId = bookContent.id ?? path.basename(resolvedPath, ".json");

// Find plan directory
const planDir = path.join("generated/books", bookId);

// Load gaps from 05-gaps.json if available
let gaps: SceneGap[] = [];
const gapsPath = path.join(planDir, "05-gaps.json");
if (existsSync(gapsPath)) {
  try {
    gaps = JSON.parse(readFileSync(gapsPath, "utf-8"));
  } catch {
    console.warn(`  Warning: Could not parse ${gapsPath}`);
  }
}

// Load synthesized blueprints from 06-blueprints/
const synthesized: SynthesizedBlueprint[] = [];
const bpDir = path.join(planDir, "06-blueprints");
if (existsSync(bpDir)) {
  const bpFiles = readdirSync(bpDir).filter((f: string) =>
    f.endsWith(".blueprint.json"),
  );
  for (const file of bpFiles) {
    try {
      const bp = JSON.parse(
        readFileSync(path.join(bpDir, file), "utf-8"),
      ) as SceneBlueprint;
      if (bp.origin === "synthesized") {
        synthesized.push(bp as SynthesizedBlueprint);
      }
    } catch {
      // skip malformed
    }
  }
}

// ---------------------------------------------------------------------------
// Run
// ---------------------------------------------------------------------------

console.log(`\n  Invention Loop — ${bookId}`);
console.log(
  `  Gaps: ${gaps.length} | Synthesized blueprints: ${synthesized.length}`,
);
if (dryRun) console.log("  [DRY RUN — registry will not be saved]");
console.log();

const result = runInventionLoop(bookId, gaps, synthesized, { dryRun });

console.log("  Results:");
console.log(`    Gaps detected:          ${result.gapsDetected}`);
console.log(`    With existing recipe:   ${result.gapsWithExistingRecipe}`);
console.log(`    Inventions created:     ${result.inventionsCreated}`);
console.log(`    Validations passed:     ${result.validationsPassed}`);
console.log(`    Validations failed:     ${result.validationsFailed}`);
console.log(`    Promotions evaluated:   ${result.promotionsEvaluated}`);
console.log(`    Promotions applied:     ${result.promotionsApplied}`);
console.log(`    Demotions applied:      ${result.demotionsApplied}`);
console.log(`    Expired inventions:     ${result.expiredInventions}`);
console.log();
