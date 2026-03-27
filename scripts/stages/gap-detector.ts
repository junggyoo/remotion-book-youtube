/**
 * GapDetector stage runner — detects gaps where no preset adequately fits.
 *
 * Pure gap detection only. Asset requirement generation is Stage 6.5 AssetPlanner's responsibility.
 *
 * Input artifacts:
 *   - 00-fingerprint.json (BookFingerprint)
 *   - 01-editorial-outline.json (EditorialOutline)
 *   - book content JSON (BookContent)
 *
 * Output artifact:
 *   - 04-gap-analysis.json (ScenePlan with gaps populated)
 */

import "tsconfig-paths/register";
import { readFileSync } from "fs";
import path from "path";
import type {
  BookContent,
  BookFingerprint,
  OpeningPackage,
} from "../../src/types";
import type { EditorialOutline } from "../../src/planning/types";
import type {
  DsgsStage,
  DsgsContext,
  DsgsStageResult,
} from "../dsgs-orchestrate";
import { savePlanArtifact } from "../../src/planning/loaders/save-book-plan";
import { matchPresets } from "../../src/planner/scenePlanner";
import { detectGaps } from "../../src/planner/gapDetector";
import {
  buildNarrativePlan,
  buildDefaultPolicy,
} from "../../src/planner/narrativePlanBuilder";

// ---------------------------------------------------------------------------
// Stage export
// ---------------------------------------------------------------------------

export const detectGapsStage: DsgsStage = {
  id: "5-gap-detector",
  name: "GapDetector",
  artifactFile: "04-gap-analysis.json",
  async run(ctx: DsgsContext): Promise<DsgsStageResult> {
    const start = Date.now();
    const outPath = path.join(ctx.planDir, "04-gap-analysis.json");

    // Skip if artifact already exists
    const { existsSync } = await import("fs");
    if (existsSync(outPath)) {
      return {
        stageId: "5-gap-detector",
        status: "skipped",
        artifacts: [outPath],
        durationMs: Date.now() - start,
        message: "Artifact exists: 04-gap-analysis.json",
      };
    }

    // 1. Read fingerprint
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
        stageId: "5-gap-detector",
        status: "halted",
        artifacts: [],
        durationMs: Date.now() - start,
        message: `Cannot read fingerprint at ${fpPath}. Run stage 1-analyzer first.`,
      };
    }

    // 2. Read editorial outline
    const outlinePath =
      ctx.artifacts.get("2-planner") ??
      path.join(ctx.planDir, "01-editorial-outline.json");
    let outline: EditorialOutline;
    try {
      outline = JSON.parse(
        readFileSync(outlinePath, "utf-8"),
      ) as EditorialOutline;
    } catch {
      return {
        stageId: "5-gap-detector",
        status: "halted",
        artifacts: [],
        durationMs: Date.now() - start,
        message: `Cannot read outline at ${outlinePath}. Run stage 2-planner first.`,
      };
    }

    // 3. Read book content
    let book: BookContent;
    try {
      book = JSON.parse(readFileSync(ctx.bookPath, "utf-8")) as BookContent;
    } catch {
      return {
        stageId: "5-gap-detector",
        status: "halted",
        artifacts: [],
        durationMs: Date.now() - start,
        message: `Cannot read book content at ${ctx.bookPath}.`,
      };
    }

    // 3.5. Normalize fingerprint fields that may be strings instead of arrays
    if (typeof fingerprint.emotionalTone === "string") {
      fingerprint.emotionalTone = [
        fingerprint.emotionalTone,
      ] as unknown as typeof fingerprint.emotionalTone;
    }
    if (!Array.isArray(fingerprint.emotionalTone)) {
      fingerprint.emotionalTone = [];
    }
    if (typeof fingerprint.spatialMetaphors === "string") {
      fingerprint.spatialMetaphors = [
        fingerprint.spatialMetaphors,
      ] as unknown as typeof fingerprint.spatialMetaphors;
    }
    if (!Array.isArray(fingerprint.spatialMetaphors)) {
      fingerprint.spatialMetaphors = [];
    }
    if (typeof fingerprint.visualMotifs === "string") {
      fingerprint.visualMotifs = [
        fingerprint.visualMotifs,
      ] as unknown as typeof fingerprint.visualMotifs;
    }
    if (!Array.isArray(fingerprint.visualMotifs)) {
      fingerprint.visualMotifs = [];
    }
    if (typeof fingerprint.uniqueElements === "string") {
      fingerprint.uniqueElements = [
        fingerprint.uniqueElements,
      ] as unknown as typeof fingerprint.uniqueElements;
    }
    if (!Array.isArray(fingerprint.uniqueElements)) {
      fingerprint.uniqueElements = [];
    }

    // 4. Re-derive ScenePlan (fresh computation, no staleness risk)
    const narrativePlan = buildNarrativePlan(outline, book);
    const policy = buildDefaultPolicy(ctx.format);
    const scenePlan = matchPresets(
      narrativePlan,
      fingerprint,
      null as unknown as OpeningPackage, // unused by matchPresets
      policy,
    );

    // 5. Run gap detection with policy enforcement
    const result = detectGaps(scenePlan, fingerprint, narrativePlan);

    // 6. Save artifact
    savePlanArtifact(ctx.bookId, "04-gap-analysis", result, true);

    // 7. Build summary
    const gapCount = result.gaps.length;
    const mustCount = result.gaps.filter((g) => g.priority === "must").length;
    const niceCount = result.gaps.filter((g) => g.priority === "nice").length;
    const presetCount = result.presetMatches.length;

    const gapDetails = result.gaps
      .map(
        (g) =>
          `  - [${g.segment}#${g.slotIndex}] ${g.priority.toUpperCase()}: ${g.gapReason}`,
      )
      .join("\n");

    if (gapCount > 0) {
      console.log(`\n  Gap Summary:`);
      console.log(
        `  ${gapCount} gaps detected (${mustCount} must, ${niceCount} nice), ${presetCount} presets retained`,
      );
      console.log(gapDetails);
    }

    const summaryMsg = `Gaps: ${gapCount} (${mustCount} must, ${niceCount} nice), Presets: ${presetCount}, Policy: min=${policy.minSignatureScenes} max=${policy.maxSynthesizedScenes}`;

    return {
      stageId: "5-gap-detector",
      status: "success",
      artifacts: [outPath],
      durationMs: Date.now() - start,
      message: summaryMsg,
    };
  },
};
