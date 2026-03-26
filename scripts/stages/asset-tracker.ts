/**
 * AssetTracker — tracks per-book asset status (generated/manual/missing).
 * Checks filesystem for actual asset files and updates status accordingly.
 */

import "tsconfig-paths/register";
import { existsSync, readFileSync } from "fs";
import path from "path";
import type {
  DsgsStage,
  DsgsContext,
  DsgsStageResult,
} from "../dsgs-orchestrate";
import { savePlanArtifact } from "../../src/planning/loaders/save-book-plan";

interface TrackedAsset {
  assetId: string;
  type: string;
  description: string;
  resolvedStatus: "generated" | "manual" | "missing";
  filePath?: string;
}

interface AssetStatusReport {
  bookId: string;
  timestamp: string;
  totalAssets: number;
  generated: number;
  manual: number;
  missing: number;
  assets: TrackedAsset[];
}

interface AssetRequirement {
  assetId: string;
  type: string;
  description: string;
  status: string;
}

function resolveAssetStatus(
  bookId: string,
  req: AssetRequirement,
): TrackedAsset {
  // Check generated path first
  const generatedPath = path.resolve(
    "assets/generated",
    bookId,
    `${req.assetId}.svg`,
  );
  if (existsSync(generatedPath)) {
    return {
      assetId: req.assetId,
      type: req.type,
      description: req.description,
      resolvedStatus: "generated",
      filePath: generatedPath,
    };
  }

  // Check manual assets directory
  const manualPaths = [
    path.resolve("assets", `${req.assetId}.svg`),
    path.resolve("assets", `${req.assetId}.png`),
    path.resolve("assets/icons", `${req.assetId}.svg`),
    path.resolve("assets/covers", `${req.assetId}.png`),
    path.resolve("assets/textures", `${req.assetId}.png`),
  ];

  for (const mp of manualPaths) {
    if (existsSync(mp)) {
      return {
        assetId: req.assetId,
        type: req.type,
        description: req.description,
        resolvedStatus: "manual",
        filePath: mp,
      };
    }
  }

  return {
    assetId: req.assetId,
    type: req.type,
    description: req.description,
    resolvedStatus: "missing",
  };
}

export const trackAssets: DsgsStage = {
  id: "6.5-asset-tracker",
  name: "AssetTracker",
  async run(ctx: DsgsContext): Promise<DsgsStageResult> {
    const start = Date.now();

    const reqPath = path.join(ctx.planDir, "asset-requirements.json");
    if (!existsSync(reqPath)) {
      return {
        stageId: "6.5-asset-tracker",
        status: "skipped",
        artifacts: [],
        durationMs: Date.now() - start,
        message: "No asset-requirements.json found — skipping tracking",
      };
    }

    const report = JSON.parse(readFileSync(reqPath, "utf-8")) as {
      requirements: AssetRequirement[];
    };

    const tracked = report.requirements.map((req) =>
      resolveAssetStatus(ctx.bookId, req),
    );

    const statusReport: AssetStatusReport = {
      bookId: ctx.bookId,
      timestamp: new Date().toISOString(),
      totalAssets: tracked.length,
      generated: tracked.filter((t) => t.resolvedStatus === "generated").length,
      manual: tracked.filter((t) => t.resolvedStatus === "manual").length,
      missing: tracked.filter((t) => t.resolvedStatus === "missing").length,
      assets: tracked,
    };

    savePlanArtifact(ctx.bookId, "asset-status", statusReport);
    const outPath = path.join(ctx.planDir, "asset-status.json");

    const missingCount = statusReport.missing;
    if (missingCount > 0) {
      console.warn(
        `  ⚠️  ${missingCount} missing asset(s) — fallback will be used`,
      );
    }

    return {
      stageId: "6.5-asset-tracker",
      status: "success",
      artifacts: [outPath],
      durationMs: Date.now() - start,
      message: `Assets: ${statusReport.totalAssets} total (generated:${statusReport.generated}, manual:${statusReport.manual}, missing:${statusReport.missing})`,
    };
  },
};
