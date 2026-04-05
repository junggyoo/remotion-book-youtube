#!/usr/bin/env node
/**
 * DSGS Orchestrator — chains all DSGS pipeline stages in sequence.
 *
 * Usage:
 *   npx ts-node scripts/dsgs-orchestrate.ts <book.json> [--mode auto|review] [--format longform|shorts] [--resume-from <stage-id>]
 *
 * Stages 1-6.5 are real pipeline stages.
 * Stages 7-9 call existing scripts (validate-plan, prepare-plan + make-video).
 *
 * Exit codes: 0=success, 1=failure, 42=halted (awaiting agent or review checkpoint)
 */

import "tsconfig-paths/register";
import { execFileSync } from "child_process";
import {
  existsSync,
  readFileSync,
  writeFileSync,
  mkdirSync,
  readdirSync,
} from "fs";
import path from "path";
import type {
  BookContent,
  FormatKey,
  SceneBlueprint,
  Beat,
  BeatTimingResolution,
} from "../src/types";
import { runRenderQA } from "../src/validator/renderFailureCodes";
import { autoFixBlueprint } from "../src/validator/autoFix";
import {
  observeBlueprint,
  checkPromotionEligibility,
  type PromotionObservation,
} from "../src/validator/promotionObserver";
import { SceneRegistry } from "../src/registry/SceneRegistry";
import { PromotionWorkflow } from "../src/registry/PromotionWorkflow";
import { accumulateObservations } from "../src/registry/observationAccumulator";
import type { PlanBridgeResult, BookArtDirection } from "../src/planning/types";
import type { BeatPlanEntry } from "../src/types";
import { analyzeBook } from "./stages/book-analyzer";
import { planNarrative } from "./stages/narrative-planner";
import { planAssets } from "./stages/asset-planner";
import { composeBeat } from "./stages/beat-composer";
import { planScenes } from "./stages/scene-planner";
import { detectGapsStage } from "./stages/gap-detector";
import { composeArtDirectionStage } from "./stages/opening-composer";
import { synthesizeGapsStage } from "./stages/scene-synthesizer";
import { registrySyncStage } from "./stages/scene-registry-sync";

// ============================================================
// Core Types
// ============================================================

export interface DsgsStage {
  id: string;
  name: string;
  checkpoint?: "A" | "B" | "C";
  artifactFile?: string; // Expected artifact path relative to planDir
  run(ctx: DsgsContext): Promise<DsgsStageResult>;
}

export interface DsgsContext {
  bookPath: string;
  bookId: string;
  format: FormatKey;
  mode: "auto" | "review";
  fps: number;
  planDir: string;
  artifacts: Map<string, string>;
  planBridgeResult?: PlanBridgeResult;
  lastCompletedStage?: string;
  renderResult?: { success: boolean };
}

export interface DsgsStageResult {
  stageId: string;
  status: "success" | "skipped" | "halted";
  artifacts: string[];
  durationMs: number;
  message?: string;
}

interface OrchestrationLog {
  bookId: string;
  mode: "auto" | "review";
  startedAt: string;
  lastCompletedStage?: string;
  stageResults: DsgsStageResult[];
}

// ============================================================
// Generation Stub Factory
// ============================================================

function createGenerationStub(
  id: string,
  name: string,
  artifactFile: string,
  agentHint: string,
  checkpoint?: "A" | "B" | "C",
): DsgsStage {
  return {
    id,
    name,
    checkpoint,
    artifactFile,
    async run(ctx: DsgsContext): Promise<DsgsStageResult> {
      const start = Date.now();
      const fullPath = path.join(ctx.planDir, artifactFile);

      if (existsSync(fullPath)) {
        return {
          stageId: id,
          status: "skipped",
          artifacts: [fullPath],
          durationMs: Date.now() - start,
          message: `Artifact exists: ${artifactFile}`,
        };
      }

      return {
        stageId: id,
        status: "halted",
        artifacts: [],
        durationMs: Date.now() - start,
        message: `Stage "${name}" requires Claude Code agent. Run: ${agentHint}`,
      };
    },
  };
}

// ============================================================
// Execution Stages (Real)
// ============================================================

/**
 * Run auto-fix on all blueprints in the book's 06-blueprints dir.
 * Returns count of fixed blueprints and applied fix descriptions.
 */
function runAutoFixOnBlueprints(planDir: string): {
  fixedCount: number;
  fixes: string[];
} {
  const bpDir = path.join(planDir, "06-blueprints");
  if (!existsSync(bpDir)) return { fixedCount: 0, fixes: [] };

  const bpFiles = readdirSync(bpDir).filter((f: string) =>
    f.endsWith(".blueprint.json"),
  );
  let fixedCount = 0;
  const fixes: string[] = [];

  for (const file of bpFiles) {
    const filePath = path.join(bpDir, file);
    let bp: SceneBlueprint;
    try {
      bp = JSON.parse(readFileSync(filePath, "utf-8")) as SceneBlueprint;
    } catch {
      continue;
    }

    const format = bp.format || "longform";
    const qa = runRenderQA(bp, format);
    if (qa.overallLevel === "PASS") continue;

    const result = autoFixBlueprint(bp, qa);
    if (result.fixed) {
      writeFileSync(
        filePath,
        JSON.stringify(result.blueprint, null, 2),
        "utf-8",
      );
      fixedCount++;
      fixes.push(...result.appliedFixes);
    }
  }

  return { fixedCount, fixes };
}

const MAX_AUTOFIX_ATTEMPTS = 2;

const validatePlanStage: DsgsStage = {
  id: "7-validate",
  name: "BlueprintValidator",
  async run(ctx: DsgsContext): Promise<DsgsStageResult> {
    const start = Date.now();
    const allFixes: string[] = [];

    for (let attempt = 0; attempt <= MAX_AUTOFIX_ATTEMPTS; attempt++) {
      try {
        execFileSync(
          "npx",
          ["ts-node", "scripts/validate-plan.ts", ctx.planDir],
          {
            stdio: "pipe",
            encoding: "utf-8",
          },
        );

        const msg =
          allFixes.length > 0
            ? `Passed after ${attempt} auto-fix round(s): ${allFixes.join("; ")}`
            : "완료";
        return {
          stageId: "7-validate",
          status: "success",
          artifacts: [path.join(ctx.planDir, ".validation")],
          durationMs: Date.now() - start,
          message: msg,
        };
      } catch (err: unknown) {
        if (attempt >= MAX_AUTOFIX_ATTEMPTS) {
          const msg = err instanceof Error ? err.message : String(err);
          return {
            stageId: "7-validate",
            status: "halted",
            artifacts: [],
            durationMs: Date.now() - start,
            message: `Validation failed after ${attempt} auto-fix attempt(s): ${msg.slice(0, 200)}`,
          };
        }

        // Attempt auto-fix on failing blueprints
        const { fixedCount, fixes } = runAutoFixOnBlueprints(ctx.planDir);
        if (fixedCount === 0) {
          const msg = err instanceof Error ? err.message : String(err);
          return {
            stageId: "7-validate",
            status: "halted",
            artifacts: [],
            durationMs: Date.now() - start,
            message: `Validation failed, no safe auto-fixes available: ${msg.slice(0, 200)}`,
          };
        }

        allFixes.push(...fixes);
        console.log(
          `  🔧 Auto-fix round ${attempt + 1}: ${fixedCount} blueprint(s) fixed`,
        );
        for (const f of fixes) console.log(`     ${f}`);
      }
    }

    // Unreachable, but TypeScript needs it
    return {
      stageId: "7-validate",
      status: "halted",
      artifacts: [],
      durationMs: Date.now() - start,
    };
  },
};

const renderStage: DsgsStage = {
  id: "8-render",
  name: "BlueprintRenderer (prepare + make-video)",
  checkpoint: "C",
  async run(ctx: DsgsContext): Promise<DsgsStageResult> {
    const start = Date.now();
    try {
      // prepare-plan.ts
      execFileSync(
        "npx",
        ["ts-node", "scripts/prepare-plan.ts", ctx.bookPath],
        {
          stdio: "pipe",
          encoding: "utf-8",
        },
      );

      // make-video.ts
      execFileSync(
        "npx",
        [
          "ts-node",
          "scripts/make-video.ts",
          ctx.bookPath,
          "--format",
          ctx.format,
        ],
        { stdio: "inherit", encoding: "utf-8" },
      );

      ctx.renderResult = { success: true };
      return {
        stageId: "8-render",
        status: "success",
        artifacts: [],
        durationMs: Date.now() - start,
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      ctx.renderResult = { success: false };
      return {
        stageId: "8-render",
        status: "halted",
        artifacts: [],
        durationMs: Date.now() - start,
        message: `Render failed: ${msg.slice(0, 200)}`,
      };
    }
  },
};

const promoteStage: DsgsStage = {
  id: "9-promote",
  name: "ScenePromoter",
  async run(ctx: DsgsContext): Promise<DsgsStageResult> {
    const start = Date.now();
    const observations: PromotionObservation[] = [];

    // 1. Load blueprints
    const bpDir = path.join(ctx.planDir, "06-blueprints");
    if (!existsSync(bpDir)) {
      return {
        stageId: "9-promote",
        status: "skipped",
        artifacts: [],
        durationMs: Date.now() - start,
        message: "No blueprints directory found",
      };
    }

    const bpFiles = readdirSync(bpDir).filter((f) =>
      f.endsWith(".blueprint.json"),
    );

    // 2. Load beat plan
    const beatPlanPath = path.join(ctx.planDir, "06.3-beat-plan.json");
    let beatPlanEntries: BeatPlanEntry[] = [];
    if (existsSync(beatPlanPath)) {
      try {
        const raw = JSON.parse(readFileSync(beatPlanPath, "utf-8"));
        beatPlanEntries = raw.entries ?? [];
      } catch {
        /* ignore parse error */
      }
    }

    // 3. Load TTS manifest for beatTimings
    const manifestPath = path.resolve("assets/tts/manifest.json");
    let manifestEntries: Array<{
      sceneId: string;
      beatTimings?: BeatTimingResolution[];
    }> = [];
    if (existsSync(manifestPath)) {
      try {
        manifestEntries = JSON.parse(readFileSync(manifestPath, "utf-8"));
      } catch {
        /* ignore parse error */
      }
    }

    // 4. Load art direction
    const artDirPath = path.join(ctx.planDir, "02-art-direction.json");
    let artDirection: BookArtDirection | undefined;
    if (existsSync(artDirPath)) {
      try {
        artDirection = JSON.parse(readFileSync(artDirPath, "utf-8"));
      } catch {
        /* ignore */
      }
    }

    // 5. Observe each blueprint
    for (const file of bpFiles) {
      try {
        const bp: SceneBlueprint = JSON.parse(
          readFileSync(path.join(bpDir, file), "utf-8"),
        );

        // Find beats from beat plan
        const beatEntry = beatPlanEntries.find((e) => e.sceneId === bp.id);
        const beats: Beat[] = beatEntry?.beats ?? [];

        // Find beat timings from TTS manifest
        const manifestEntry = manifestEntries.find((e) => e.sceneId === bp.id);
        const beatTimings: BeatTimingResolution[] =
          manifestEntry?.beatTimings ?? [];

        const obs = observeBlueprint(
          bp,
          ctx.bookId,
          beats,
          beatTimings,
          artDirection,
          ctx.renderResult?.success ?? true,
        );
        if (obs) observations.push(obs);
      } catch {
        /* skip malformed blueprints */
      }
    }

    if (observations.length === 0) {
      return {
        stageId: "9-promote",
        status: "skipped",
        artifacts: [],
        durationMs: Date.now() - start,
        message: "No synthesized blueprints to observe",
      };
    }

    // 6. Log observations to file (backward-compatible)
    const outPath = path.join(ctx.planDir, "promotion-observations.json");
    const summary = observations.map((obs) => ({
      ...obs,
      ...checkPromotionEligibility(obs),
    }));
    writeFileSync(outPath, JSON.stringify(summary, null, 2), "utf-8");

    const eligible = summary.filter((s) => s.eligible).length;

    // 7. Accumulate observations into SceneRegistry + evaluate promotions
    const registryPath = path.resolve("generated/registry/scene-registry.json");
    let accumulated = 0;
    let promoted = 0;
    let demoted = 0;
    try {
      const registry = SceneRegistry.loadOrCreate(registryPath);

      // Accumulate observations (with dedup) into registry entries
      accumulated = accumulateObservations(registry, observations);

      // Evaluate promotions for validated entries
      const workflow = new PromotionWorkflow(registry);
      for (const entry of registry.getByStatus("validated")) {
        const decision = workflow.evaluatePromotion(entry.id);
        if (decision.action === "promoted") promoted++;
      }

      // Evaluate demotions for promoted entries
      for (const entry of registry.getByStatus("promoted")) {
        const decision = workflow.evaluateDemotion(entry.id);
        if (decision.action === "demoted") demoted++;
      }

      registry.save();
    } catch {
      /* registry operations are best-effort — don't block pipeline */
    }

    return {
      stageId: "9-promote",
      status: "success",
      artifacts: [outPath],
      durationMs: Date.now() - start,
      message: `Observed ${observations.length} blueprints. ${eligible}/${observations.length} eligible. Registry: +${accumulated} obs, ${promoted} promoted, ${demoted} demoted.`,
    };
  },
};

// ============================================================
// Stage Registry
// ============================================================

const STAGES: DsgsStage[] = [
  analyzeBook,
  planNarrative,
  composeArtDirectionStage,
  planScenes,
  detectGapsStage,
  synthesizeGapsStage,
  registrySyncStage,
  composeBeat,
  planAssets,
  validatePlanStage,
  renderStage,
  promoteStage,
];

// ============================================================
// Orchestration Log
// ============================================================

function loadLog(logPath: string): OrchestrationLog | null {
  if (!existsSync(logPath)) return null;
  try {
    return JSON.parse(readFileSync(logPath, "utf-8")) as OrchestrationLog;
  } catch {
    return null;
  }
}

function saveLog(logPath: string, log: OrchestrationLog): void {
  mkdirSync(path.dirname(logPath), { recursive: true });
  writeFileSync(logPath, JSON.stringify(log, null, 2), "utf-8");
}

// ============================================================
// CLI Argument Parsing
// ============================================================

function parseArgs(): {
  bookPath: string;
  mode: "auto" | "review";
  format: FormatKey;
  resumeFrom?: string;
} {
  const args = process.argv.slice(2);
  const bookPath = args.find((a) => !a.startsWith("--"));

  if (!bookPath) {
    console.error(
      "Usage: npx ts-node scripts/dsgs-orchestrate.ts <book.json> [--mode auto|review] [--format longform|shorts] [--resume-from <stage-id>]",
    );
    process.exit(1);
  }

  const modeIdx = args.indexOf("--mode");
  const mode = modeIdx >= 0 ? (args[modeIdx + 1] as "auto" | "review") : "auto";

  const formatIdx = args.indexOf("--format");
  const format =
    formatIdx >= 0 ? (args[formatIdx + 1] as FormatKey) : "longform";

  const resumeIdx = args.indexOf("--resume-from");
  const resumeFrom = resumeIdx >= 0 ? args[resumeIdx + 1] : undefined;

  return { bookPath: path.resolve(bookPath), mode, format, resumeFrom };
}

// ============================================================
// Main Orchestration Loop
// ============================================================

async function main() {
  const { bookPath, mode, format, resumeFrom } = parseArgs();

  if (!existsSync(bookPath)) {
    console.error(`Book not found: ${bookPath}`);
    process.exit(1);
  }

  const book = JSON.parse(readFileSync(bookPath, "utf-8")) as BookContent;
  const bookId = book.metadata.id;
  const planDir = path.resolve("generated/books", bookId);
  const logPath = path.join(planDir, ".orchestration-log.json");

  // Ensure plan directory exists
  mkdirSync(planDir, { recursive: true });

  const ctx: DsgsContext = {
    bookPath,
    bookId,
    format,
    mode,
    fps: book.production?.fps ?? 30,
    planDir,
    artifacts: new Map(),
  };

  // Load existing log for resume
  const existingLog = loadLog(logPath);

  const log: OrchestrationLog = {
    bookId,
    mode,
    startedAt: new Date().toISOString(),
    stageResults: existingLog?.stageResults ?? [],
  };

  console.log(`\n=== DSGS Orchestrator ===`);
  console.log(`Book: ${bookId}`);
  console.log(`Mode: ${mode}`);
  console.log(`Format: ${format}`);
  if (resumeFrom) console.log(`Resume from: ${resumeFrom}`);
  console.log();

  // Determine start index
  let startIdx = 0;
  if (resumeFrom) {
    const idx = STAGES.findIndex((s) => s.id === resumeFrom);
    if (idx < 0) {
      console.error(`Unknown stage id: ${resumeFrom}`);
      console.error(`Available stages: ${STAGES.map((s) => s.id).join(", ")}`);
      process.exit(1);
    }
    startIdx = idx;
  }

  // Execute stages
  for (let i = startIdx; i < STAGES.length; i++) {
    const stage = STAGES[i];
    console.log(`▶ [${stage.id}] ${stage.name}`);

    const result = await stage.run(ctx);
    log.stageResults.push(result);

    // Record artifacts
    for (const artifact of result.artifacts) {
      ctx.artifacts.set(stage.id, artifact);
    }

    switch (result.status) {
      case "success":
        console.log(`  ✓ ${result.message ?? "완료"} (${result.durationMs}ms)`);
        log.lastCompletedStage = stage.id;
        break;

      case "skipped":
        console.log(
          `  ⏭ ${result.message ?? "건너뜀"} (${result.durationMs}ms)`,
        );
        log.lastCompletedStage = stage.id;
        break;

      case "halted":
        console.log(`  ⏸ ${result.message ?? "정지"}`);
        log.lastCompletedStage = STAGES[i - 1]?.id;
        saveLog(logPath, log);
        console.log(`\nOrchestration halted at stage [${stage.id}].`);
        console.log(
          `Resume with: npx ts-node scripts/dsgs-orchestrate.ts ${bookPath} --resume-from ${stage.id}`,
        );
        process.exit(42);
    }

    // HITL checkpoint handling
    if (stage.checkpoint && mode === "review") {
      const reviewPath = path.join(planDir, `${stage.checkpoint}-review.json`);
      const reviewData = {
        checkpoint: stage.checkpoint,
        stageId: stage.id,
        stageName: stage.name,
        completedStages: log.stageResults.filter((r) => r.status !== "halted"),
        timestamp: new Date().toISOString(),
      };
      writeFileSync(reviewPath, JSON.stringify(reviewData, null, 2), "utf-8");
      log.lastCompletedStage = stage.id;
      saveLog(logPath, log);
      console.log(
        `\n⏸ Checkpoint ${stage.checkpoint}: review 모드 — ${reviewPath} 참조`,
      );
      console.log(
        `Resume with: npx ts-node scripts/dsgs-orchestrate.ts ${bookPath} --mode review --resume-from ${STAGES[i + 1]?.id ?? "done"}`,
      );
      process.exit(42);
    }
  }

  // All stages complete
  saveLog(logPath, log);
  console.log(`\n✅ DSGS Orchestration 완료.`);
  console.log(`Log: ${logPath}`);
  process.exit(0);
}

main().catch((err) => {
  console.error("Orchestrator error:", err);
  process.exit(1);
});
