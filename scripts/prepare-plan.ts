/**
 * Pre-resolve planning data and write to assets/planning/{bookId}.plan.json
 * for consumption by Remotion's calculateMetadata via staticFile().
 *
 * Usage: npx ts-node scripts/prepare-plan.ts content/books/atomic-habits.json
 *
 * This script runs in Node.js (not webpack), so fs/path are available.
 * The output is a lean JSON that calculateMetadata can fetch via staticFile().
 */

import "tsconfig-paths/register";
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import path from "path";
import type { BookContent, SceneBlueprint, Theme } from "../src/types";
import type { StoryboardScene } from "../src/planning/types";
import { resolvePlanBridge } from "../src/planning/plan-bridge";

/** Lean serialization format for staticFile consumption */
interface PlanData {
  hasPlan: boolean;
  bookId: string;
  theme: Theme;
  /** sceneId → SceneBlueprint for blueprint-mode scenes only */
  blueprintScenes: Record<string, SceneBlueprint>;
  /** sceneId → StoryboardScene for transition intent */
  storyboardScenes: Record<string, StoryboardScene>;
  /** Art direction texture mood */
  textureMood?: "grain" | "clean" | "paper" | "noise" | "none";
}

function main() {
  const bookPath = process.argv[2];
  if (!bookPath || !existsSync(bookPath)) {
    console.error(
      "Usage: npx ts-node scripts/prepare-plan.ts <content/books/book.json>",
    );
    process.exit(1);
  }

  const book = JSON.parse(readFileSync(bookPath, "utf-8")) as BookContent;
  const bookId = book.metadata.id;

  const planResult = resolvePlanBridge(book, "longform");

  // Build lean plan data
  const blueprintScenes: Record<string, SceneBlueprint> = {};
  const storyboardScenes: Record<string, StoryboardScene> = {};
  if (planResult.hasPlan) {
    for (const scene of planResult.resolvedScenes) {
      if (scene.renderMode === "blueprint" && scene.blueprint) {
        blueprintScenes[scene.sceneId] = scene.blueprint;
      }
      if (scene.storyboardEntry) {
        storyboardScenes[scene.sceneId] = scene.storyboardEntry;
      }
    }
  }

  const planData: PlanData = {
    hasPlan: planResult.hasPlan,
    bookId,
    theme: planResult.theme,
    blueprintScenes,
    storyboardScenes,
    textureMood: planResult.artInfluence?.textureMood,
  };

  // Write to assets/planning/
  const outDir = path.resolve("assets/planning");
  mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, `${bookId}.plan.json`);
  writeFileSync(outPath, JSON.stringify(planData, null, 2), "utf-8");

  // Log summary
  const bpCount = Object.keys(blueprintScenes).length;
  const sbCount = Object.keys(storyboardScenes).length;
  console.log(`  Planning: hasPlan=${planResult.hasPlan}`);
  if (planResult.hasPlan) {
    console.log(
      `  Theme override: signal=${planResult.theme.signal}, accent=${planResult.theme.accent}`,
    );
    console.log(
      `  Blueprint scenes: ${bpCount} (${Object.keys(blueprintScenes).join(", ") || "none"})`,
    );
    console.log(
      `  Storyboard scenes: ${sbCount}, textureMood=${planData.textureMood ?? "none"}`,
    );
  }
  console.log(`  Written: ${outPath}`);
}

main();
