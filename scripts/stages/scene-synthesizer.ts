/**
 * SceneSynthesizer stage runner — DSGS Stage 6
 * Converts SceneGap[] into SynthesizedBlueprint[] via VCL engine.
 *
 * Input artifacts:
 *   - 00-fingerprint.json (BookFingerprint)
 *   - 04-gap-analysis.json (ScenePlan with gaps populated)
 *   - book content JSON (BookContent)
 *
 * Output artifacts:
 *   - 06-blueprints/{id}.blueprint.json (per blueprint)
 *   - 05-synthesis-summary.json (summary)
 */

import "tsconfig-paths/register";
import { readFileSync, existsSync } from "fs";
import path from "path";
import type {
  BookContent,
  BookFingerprint,
  ScenePlan,
  FormatKey,
} from "../../src/types";
import type {
  DsgsStage,
  DsgsContext,
  DsgsStageResult,
} from "../dsgs-orchestrate";
import {
  synthesizeGaps,
  type SynthesizerContext,
} from "../../src/planner/sceneSynthesizer";
import {
  saveBlueprintArtifact,
  savePlanArtifact,
} from "../../src/planning/loaders/save-book-plan";
import { resolveBaseTheme } from "../../src/design/themes/resolveBaseTheme";
import type { BookArtDirection } from "../../src/planning/types";

// ---------------------------------------------------------------------------
// Stage export
// ---------------------------------------------------------------------------

export const synthesizeGapsStage: DsgsStage = {
  id: "6-synthesizer",
  name: "SceneSynthesizer",
  checkpoint: "B",
  artifactFile: "05-synthesis-summary.json",
  async run(ctx: DsgsContext): Promise<DsgsStageResult> {
    const start = Date.now();
    const summaryPath = path.join(ctx.planDir, "05-synthesis-summary.json");

    // Skip if summary already exists
    if (existsSync(summaryPath)) {
      return {
        stageId: "6-synthesizer",
        status: "skipped",
        artifacts: [summaryPath],
        durationMs: Date.now() - start,
        message: "Artifact exists: 05-synthesis-summary.json",
      };
    }

    // 1. Read gap analysis (prerequisite: Stage 5)
    const gapPath =
      ctx.artifacts.get("5-gap-detector") ??
      path.join(ctx.planDir, "04-gap-analysis.json");
    let scenePlan: ScenePlan;
    try {
      scenePlan = JSON.parse(readFileSync(gapPath, "utf-8")) as ScenePlan;
    } catch {
      return {
        stageId: "6-synthesizer",
        status: "halted",
        artifacts: [],
        durationMs: Date.now() - start,
        message: `Cannot read gap analysis at ${gapPath}. Run stage 5-gap-detector first.`,
      };
    }

    // 2. Read fingerprint (prerequisite: Stage 1)
    const fpPath =
      ctx.artifacts.get("1-analyzer") ??
      path.join(ctx.planDir, "00-fingerprint.json");
    let fingerprint: BookFingerprint;
    try {
      fingerprint = JSON.parse(
        readFileSync(fpPath, "utf-8"),
      ) as BookFingerprint;
    } catch {
      return {
        stageId: "6-synthesizer",
        status: "halted",
        artifacts: [],
        durationMs: Date.now() - start,
        message: `Cannot read fingerprint at ${fpPath}. Run stage 1-analyzer first.`,
      };
    }

    // 3. Read book content
    let book: BookContent;
    try {
      book = JSON.parse(readFileSync(ctx.bookPath, "utf-8")) as BookContent;
    } catch {
      return {
        stageId: "6-synthesizer",
        status: "halted",
        artifacts: [],
        durationMs: Date.now() - start,
        message: `Cannot read book content at ${ctx.bookPath}.`,
      };
    }

    // 4. Normalize fingerprint.emotionalTone (same pattern as gap-detector)
    if (typeof fingerprint.emotionalTone === "string") {
      fingerprint.emotionalTone = [
        fingerprint.emotionalTone,
      ] as unknown as typeof fingerprint.emotionalTone;
    }
    if (!Array.isArray(fingerprint.emotionalTone)) {
      fingerprint.emotionalTone = [];
    }

    // 5. Extract gaps
    const gaps = scenePlan.gaps;
    if (gaps.length === 0) {
      // No gaps — save empty summary and succeed
      const summary = {
        blueprintCount: 0,
        blueprintIds: [],
        validationPassed: true,
        durationMs: Date.now() - start,
      };
      savePlanArtifact(ctx.bookId, "05-synthesis-summary", summary, true);
      return {
        stageId: "6-synthesizer",
        status: "success",
        artifacts: [summaryPath],
        durationMs: Date.now() - start,
        message: "No gaps detected — 0 blueprints synthesized.",
      };
    }

    // 6. Narrow format: ResolveContext.format requires 'longform' | 'shorts', NOT 'both'
    const resolvedFormat: "longform" | "shorts" =
      ctx.format === "both"
        ? "longform"
        : (ctx.format as "longform" | "shorts");

    // 6.5. Read art direction (optional — synthesis works without it)
    const artDirPath =
      ctx.artifacts.get("3-opening-composer") ??
      path.join(ctx.planDir, "02-art-direction.json");
    let artDirection: BookArtDirection | undefined;
    try {
      artDirection = JSON.parse(
        readFileSync(artDirPath, "utf-8"),
      ) as BookArtDirection;
    } catch {
      // Art direction is optional — proceed without it
    }

    // 7. Construct SynthesizerContext
    const theme = resolveBaseTheme(
      book.production?.themeMode ?? "dark",
      fingerprint.genre,
    );
    // TODO: Per-gap from/durationFrames should be derived from scene plan positions.
    // Currently uses placeholders — downstream composition assembly recalculates these.
    const synthCtx: SynthesizerContext = {
      format: resolvedFormat,
      theme,
      from: 0,
      durationFrames: 180, // DEFAULT_SYNTH_DURATION_FRAMES (6s @30fps)
      narrationText: "",
      emotionalTones: fingerprint.emotionalTone as string[],
      artDirection,
    };

    // 8. Run synthesis
    const blueprints = synthesizeGaps(gaps, synthCtx);

    // 9. Save each blueprint individually (blueprints BEFORE summary for idempotency)
    const blueprintIds: string[] = [];
    const artifactPaths: string[] = [];
    for (const bp of blueprints) {
      saveBlueprintArtifact(ctx.bookId, bp.id, bp);
      blueprintIds.push(bp.id);
      artifactPaths.push(
        path.join(ctx.planDir, "06-blueprints", `${bp.id}.blueprint.json`),
      );
    }

    // 10. Post-save validation
    const validationErrors: string[] = [];
    for (const bp of blueprints) {
      if (!bp.elements || bp.elements.length === 0) {
        validationErrors.push(`Blueprint ${bp.id}: elements[] is empty`);
      }
      if (!bp.fallbackPreset) {
        validationErrors.push(`Blueprint ${bp.id}: missing fallbackPreset`);
      }
      if (!bp.fallbackContent) {
        validationErrors.push(`Blueprint ${bp.id}: missing fallbackContent`);
      }
    }

    if (validationErrors.length > 0) {
      console.warn(
        `\n  Synthesis Validation Warnings:\n${validationErrors.map((e) => `    - ${e}`).join("\n")}`,
      );
    }

    // 11. Save summary LAST (preserves skip-if-exists contract)
    const summary = {
      blueprintCount: blueprints.length,
      blueprintIds,
      validationPassed: validationErrors.length === 0,
      validationErrors:
        validationErrors.length > 0 ? validationErrors : undefined,
      gapCount: gaps.length,
      format: resolvedFormat,
      durationMs: Date.now() - start,
    };
    savePlanArtifact(ctx.bookId, "05-synthesis-summary", summary, true);
    artifactPaths.push(summaryPath);

    // 12. Build log message
    const lifecycleCounts = blueprints.reduce(
      (acc, bp) => {
        acc[bp.lifecycle] = (acc[bp.lifecycle] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );
    const lcSummary = Object.entries(lifecycleCounts)
      .map(([k, v]) => `${v} ${k}`)
      .join(", ");

    console.log(`\n  Synthesis Summary:`);
    console.log(
      `  ${blueprints.length} blueprints synthesized from ${gaps.length} gaps`,
    );
    console.log(`  Lifecycle: ${lcSummary}`);
    if (validationErrors.length > 0) {
      console.log(`  ${validationErrors.length} validation warnings`);
    }

    return {
      stageId: "6-synthesizer",
      status: "success",
      artifacts: artifactPaths,
      durationMs: Date.now() - start,
      message: `Synthesized ${blueprints.length} blueprints (${lcSummary}). Validation: ${validationErrors.length === 0 ? "passed" : `${validationErrors.length} warnings`}`,
    };
  },
};

// ---------------------------------------------------------------------------
// Standalone execution
// ---------------------------------------------------------------------------

if (require.main === module) {
  const bookPath = process.argv[2];
  if (!bookPath) {
    console.error(
      "Usage: npx ts-node scripts/stages/scene-synthesizer.ts <book.json> [--format longform|shorts]",
    );
    process.exit(1);
  }

  const resolved = path.resolve(bookPath);
  if (!existsSync(resolved)) {
    console.error(`Book not found: ${resolved}`);
    process.exit(1);
  }

  const book = JSON.parse(readFileSync(resolved, "utf-8")) as BookContent;
  const bookId = book.metadata.id;

  const formatIdx = process.argv.indexOf("--format");
  const format: FormatKey =
    formatIdx >= 0 ? (process.argv[formatIdx + 1] as FormatKey) : "longform";

  const ctx: DsgsContext = {
    bookPath: resolved,
    bookId,
    format,
    mode: "auto",
    fps: book.production?.fps ?? 30,
    planDir: path.resolve(`generated/books/${bookId}`),
    artifacts: new Map(),
  };

  synthesizeGapsStage
    .run(ctx)
    .then((result) => {
      console.log(`\n[SceneSynthesizer] ${result.status}: ${result.message}`);
      if (result.status === "halted") process.exit(1);
    })
    .catch((err) => {
      console.error("Fatal:", err);
      process.exit(1);
    });
}
