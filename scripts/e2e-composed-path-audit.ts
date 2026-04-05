#!/usr/bin/env node
/**
 * E2E Composed Path Audit
 *
 * Loads 3 books, runs interpretation + composition on every scene,
 * and reports:
 *   - Composed path coverage (composed vs preset fallback)
 *   - Layout selection diversity
 *   - Family distribution
 *   - Content-aware layout selection decisions
 */

import "tsconfig-paths/register";
import { readFileSync } from "fs";
import path from "path";
import type { BookContent } from "../src/types";
import { interpretScene } from "../src/interpretation/interpretScene";
import type { InterpretationContext } from "../src/interpretation/types";
import type { SceneFamily } from "../src/direction/types";
import { getDirectionProfile } from "../src/direction/profiles";
import { adaptPresetToSceneSpec } from "../src/direction/presetAdapter";
import { tryComposeScene } from "../src/composition/compositionPathRouter";
import { recipeRegistry } from "../src/composition/familyRecipes";
import { useTheme } from "../src/design/themes/useTheme";
import type { CompositionContext } from "../src/composition/types";

// ─── Config ──────────────────────────────────────────────────
const BOOKS = [
  "content/books/miracle-morning.json",
  "content/books/purple-cow-2025.json",
  "content/books/tools-of-titans-2025.json",
];

const ALL_FAMILIES: SceneFamily[] = Object.keys(
  recipeRegistry,
) as SceneFamily[];

const GENRE_TO_DIRECTION: Record<string, string> = {
  selfHelp: "inspirational",
  business: "analytical",
  psychology: "contemplative",
  science: "systematic",
};

// ─── Types ───────────────────────────────────────────────────
interface SceneAuditResult {
  bookId: string;
  sceneId: string;
  sceneType: string;
  family: SceneFamily;
  familyConfidence: number;
  source: string;
  composedSuccess: boolean;
  layout: string;
  choreography: string;
  elementCount: number;
  layoutWasContentAware: boolean;
  layoutReason: string;
  alternativeChoices: Array<{
    family: string;
    score: number;
    shortReason: string;
  }>;
}

interface BookAuditSummary {
  bookId: string;
  genre: string;
  totalScenes: number;
  composedCount: number;
  presetFallbackCount: number;
  composedRate: string;
  layouts: Record<string, number>;
  families: Record<string, number>;
  choreographies: Record<string, number>;
  scenes: SceneAuditResult[];
}

// ─── Main ────────────────────────────────────────────────────
function auditBook(bookPath: string): BookAuditSummary {
  const fullPath = path.resolve(bookPath);
  const book = JSON.parse(readFileSync(fullPath, "utf-8")) as BookContent;
  const bookId = book.metadata.id;
  const genre = book.metadata.genre || "selfHelp";
  const directionName = GENRE_TO_DIRECTION[genre] ?? "analytical";
  const direction = getDirectionProfile(directionName as any);
  const theme = useTheme("dark", genre as any);

  const ctx: CompositionContext = {
    format: "longform",
    theme,
    from: 0,
    durationFrames: 750,
    motionPreset: "heavy",
  };

  const interpretationCtx: InterpretationContext = {
    fingerprint: {
      genre,
      structure: "framework",
      emotionalTone: ["informative"],
    },
    usedFamilies: [],
    bookStructure: "framework",
  };

  const scenes: SceneAuditResult[] = [];
  const layouts: Record<string, number> = {};
  const families: Record<string, number> = {};
  const choreographies: Record<string, number> = {};
  let composedCount = 0;
  let presetFallbackCount = 0;

  for (const scene of book.scenes) {
    // 1. Run interpretation
    const interpretation = interpretScene(
      scene.type,
      (scene.content ?? {}) as Record<string, unknown>,
      interpretationCtx,
    );

    // Track used families for variety penalty
    interpretationCtx.usedFamilies.push(interpretation.family);

    // 2. Adapt to SceneSpec
    const spec = adaptPresetToSceneSpec(
      {
        id: scene.id,
        type: scene.type,
        narrationText: scene.narrationText || "",
        content: (scene.content ?? {}) as Record<string, unknown>,
      },
      direction,
      "framework",
      {
        composedFamilies: ALL_FAMILIES,
        interpretation,
      },
    );

    // 3. Try composed path
    const blueprint = tryComposeScene(spec, ctx);
    const composedSuccess = blueprint !== null;

    if (composedSuccess) {
      composedCount++;
    } else {
      presetFallbackCount++;
    }

    // 4. Determine layout source
    const finalLayout = blueprint?.layout ?? spec.layout;
    const finalChoreography = blueprint?.choreography ?? spec.choreography;
    const elementCount = blueprint?.elements.length ?? 0;

    // Check if layout was content-aware (not just default)
    const layoutWasContentAware =
      interpretation.trace.hintSources?.some(
        (s) => s.includes("family-layout") || s.includes("artDirection"),
      ) ?? false;

    const layoutReason =
      interpretation.trace.hintSources?.join("; ") || "preset default";

    // Track stats
    layouts[finalLayout] = (layouts[finalLayout] ?? 0) + 1;
    families[interpretation.family] =
      (families[interpretation.family] ?? 0) + 1;
    choreographies[finalChoreography] =
      (choreographies[finalChoreography] ?? 0) + 1;

    scenes.push({
      bookId,
      sceneId: scene.id,
      sceneType: scene.type,
      family: interpretation.family,
      familyConfidence: interpretation.familyConfidence,
      source: spec.source,
      composedSuccess,
      layout: finalLayout,
      choreography: finalChoreography,
      elementCount,
      layoutWasContentAware,
      layoutReason,
      alternativeChoices: interpretation.trace.alternativeChoices ?? [],
    });
  }

  return {
    bookId,
    genre,
    totalScenes: book.scenes.length,
    composedCount,
    presetFallbackCount,
    composedRate: `${((composedCount / book.scenes.length) * 100).toFixed(1)}%`,
    layouts,
    families,
    choreographies,
    scenes,
  };
}

// ─── Report ──────────────────────────────────────────────────
function printReport(summaries: BookAuditSummary[]): void {
  console.log("\n" + "=".repeat(80));
  console.log("  E2E COMPOSED PATH AUDIT REPORT");
  console.log("=".repeat(80));

  // Global stats
  const totalScenes = summaries.reduce((s, b) => s + b.totalScenes, 0);
  const totalComposed = summaries.reduce((s, b) => s + b.composedCount, 0);
  const totalPreset = summaries.reduce((s, b) => s + b.presetFallbackCount, 0);

  console.log(
    `\n📊 Global Summary (${summaries.length} books, ${totalScenes} scenes)`,
  );
  console.log(
    `   Composed:  ${totalComposed}/${totalScenes} (${((totalComposed / totalScenes) * 100).toFixed(1)}%)`,
  );
  console.log(
    `   Preset FB: ${totalPreset}/${totalScenes} (${((totalPreset / totalScenes) * 100).toFixed(1)}%)`,
  );

  // Global layout distribution
  const globalLayouts: Record<string, number> = {};
  const globalFamilies: Record<string, number> = {};
  const globalChoreographies: Record<string, number> = {};
  for (const s of summaries) {
    for (const [k, v] of Object.entries(s.layouts))
      globalLayouts[k] = (globalLayouts[k] ?? 0) + v;
    for (const [k, v] of Object.entries(s.families))
      globalFamilies[k] = (globalFamilies[k] ?? 0) + v;
    for (const [k, v] of Object.entries(s.choreographies))
      globalChoreographies[k] = (globalChoreographies[k] ?? 0) + v;
  }

  console.log(`\n📐 Layout Distribution:`);
  for (const [layout, count] of Object.entries(globalLayouts).sort(
    (a, b) => b[1] - a[1],
  )) {
    const bar = "█".repeat(Math.ceil(count * 2));
    console.log(`   ${layout.padEnd(20)} ${String(count).padStart(3)} ${bar}`);
  }

  console.log(`\n🧬 Family Distribution:`);
  for (const [family, count] of Object.entries(globalFamilies).sort(
    (a, b) => b[1] - a[1],
  )) {
    const bar = "█".repeat(Math.ceil(count * 2));
    console.log(`   ${family.padEnd(25)} ${String(count).padStart(3)} ${bar}`);
  }

  console.log(`\n💃 Choreography Distribution:`);
  for (const [choreo, count] of Object.entries(globalChoreographies).sort(
    (a, b) => b[1] - a[1],
  )) {
    const bar = "█".repeat(Math.ceil(count * 2));
    console.log(`   ${choreo.padEnd(20)} ${String(count).padStart(3)} ${bar}`);
  }

  // Per-book detail
  for (const summary of summaries) {
    console.log(`\n${"─".repeat(80)}`);
    console.log(
      `📖 ${summary.bookId} (${summary.genre}) — ${summary.composedRate} composed`,
    );
    console.log(
      `   ${summary.composedCount} composed / ${summary.presetFallbackCount} preset / ${summary.totalScenes} total`,
    );

    console.log(
      `\n   ${"Scene".padEnd(25)} ${"Type".padEnd(18)} ${"Family".padEnd(25)} ${"Conf".padEnd(6)} ${"Path".padEnd(10)} ${"Layout".padEnd(18)} ${"Elems".padEnd(6)} Layout Reason`,
    );
    console.log(`   ${"─".repeat(130)}`);

    for (const scene of summary.scenes) {
      const pathIcon = scene.composedSuccess ? "✅" : "⚠️ ";
      const confStr = scene.familyConfidence.toFixed(2);
      console.log(
        `   ${scene.sceneId.padEnd(25)} ${scene.sceneType.padEnd(18)} ${scene.family.padEnd(25)} ${confStr.padEnd(6)} ${pathIcon.padEnd(10)} ${scene.layout.padEnd(18)} ${String(scene.elementCount).padEnd(6)} ${scene.layoutReason.slice(0, 50)}`,
      );
    }
  }

  // Content-aware layout selection analysis
  console.log(`\n${"─".repeat(80)}`);
  console.log("🎯 Content-Aware Layout Selection Analysis:");
  const allScenes = summaries.flatMap((s) => s.scenes);
  const contentAwareCount = allScenes.filter(
    (s) => s.layoutWasContentAware,
  ).length;
  console.log(
    `   Content-aware decisions: ${contentAwareCount}/${totalScenes} (${((contentAwareCount / totalScenes) * 100).toFixed(1)}%)`,
  );
  console.log(
    `   Default fallback:        ${totalScenes - contentAwareCount}/${totalScenes}`,
  );

  // Failed compositions
  const failed = allScenes.filter(
    (s) => s.source === "composed" && !s.composedSuccess,
  );
  if (failed.length > 0) {
    console.log(
      `\n⚠️  Failed Compositions (source=composed but blueprint=null):`,
    );
    for (const f of failed) {
      console.log(`   ${f.bookId}/${f.sceneId} (${f.sceneType} → ${f.family})`);
    }
  }

  // Low confidence scenes
  const lowConf = allScenes.filter((s) => s.familyConfidence < 0.5);
  if (lowConf.length > 0) {
    console.log(`\n🔍 Low Confidence Scenes (< 0.5):`);
    for (const s of lowConf) {
      console.log(
        `   ${s.bookId}/${s.sceneId}: ${s.family} (${s.familyConfidence.toFixed(2)})`,
      );
      for (const alt of s.alternativeChoices.slice(0, 3)) {
        console.log(
          `     alt: ${alt.family} (${alt.score.toFixed(2)}) — ${alt.shortReason}`,
        );
      }
    }
  }

  // Diversity check
  const uniqueLayouts = Object.keys(globalLayouts).length;
  const uniqueFamilies = Object.keys(globalFamilies).length;
  const uniqueChoreographies = Object.keys(globalChoreographies).length;
  console.log(`\n📈 Diversity Metrics:`);
  console.log(
    `   Unique layouts:        ${uniqueLayouts} / ${Object.keys(globalLayouts).length}`,
  );
  console.log(`   Unique families:       ${uniqueFamilies} / 11 registered`);
  console.log(`   Unique choreographies: ${uniqueChoreographies}`);
  console.log(
    `   Recipe registry size:  ${Object.keys(recipeRegistry).length}`,
  );

  console.log("\n" + "=".repeat(80));
}

// ─── Run ─────────────────────────────────────────────────────
const summaries = BOOKS.map(auditBook);
printReport(summaries);
