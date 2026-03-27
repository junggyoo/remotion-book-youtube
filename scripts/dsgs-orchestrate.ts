#!/usr/bin/env node
/**
 * DSGS Orchestrator — chains all DSGS pipeline stages in sequence.
 *
 * Usage:
 *   npx ts-node scripts/dsgs-orchestrate.ts <book.json> [--mode auto|review] [--format longform|shorts] [--resume-from <stage-id>]
 *
 * Stages 1-6.5 are generation stubs (require Claude Code agent).
 * Stages 7-9 call existing scripts (validate-plan, prepare-plan + make-video).
 *
 * Exit codes: 0=success, 1=failure, 42=halted (awaiting agent or review checkpoint)
 */

import "tsconfig-paths/register";
import { execFileSync } from "child_process";
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "fs";
import path from "path";
import type { BookContent, FormatKey } from "../src/types";
import type { PlanBridgeResult } from "../src/planning/types";
import { analyzeBook } from "./stages/book-analyzer";
import { planNarrative } from "./stages/narrative-planner";
import { planAssets } from "./stages/asset-planner";
import { composeBeat } from "./stages/beat-composer";
import { planScenes } from "./stages/scene-planner";

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

const validatePlanStage: DsgsStage = {
  id: "7-validate",
  name: "BlueprintValidator",
  async run(ctx: DsgsContext): Promise<DsgsStageResult> {
    const start = Date.now();
    try {
      execFileSync(
        "npx",
        ["ts-node", "scripts/validate-plan.ts", ctx.planDir],
        {
          stdio: "pipe",
          encoding: "utf-8",
        },
      );
      return {
        stageId: "7-validate",
        status: "success",
        artifacts: [path.join(ctx.planDir, ".validation")],
        durationMs: Date.now() - start,
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return {
        stageId: "7-validate",
        status: "halted",
        artifacts: [],
        durationMs: Date.now() - start,
        message: `Validation failed: ${msg.slice(0, 200)}`,
      };
    }
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

      return {
        stageId: "8-render",
        status: "success",
        artifacts: [],
        durationMs: Date.now() - start,
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
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
    // Stub in v1 — promotion logic TBD
    return {
      stageId: "9-promote",
      status: "skipped",
      artifacts: [],
      durationMs: Date.now() - start,
      message: "Promotion stage not yet implemented",
    };
  },
};

// ============================================================
// Stage Registry
// ============================================================

const STAGES: DsgsStage[] = [
  analyzeBook,
  planNarrative,
  createGenerationStub(
    "3-opening",
    "OpeningComposer",
    "02-art-direction.json",
    "/opening-compose <bookPath>",
    "A", // Checkpoint A: after opening
  ),
  planScenes,
  createGenerationStub(
    "5-gap-detector",
    "GapDetector",
    "04-asset-inventory.json",
    "/scene-architect gaps <bookPath>",
  ),
  createGenerationStub(
    "6-synthesizer",
    "SceneSynthesizer",
    "05-motion-plan.json",
    "/scene-architect synthesize <bookPath>",
    "B", // Checkpoint B: after synthesis
  ),
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
