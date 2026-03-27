#!/usr/bin/env node
import "tsconfig-paths/register";
import { existsSync, readFileSync, readdirSync } from "fs";
import path from "path";
import { validateFingerprint } from "../src/planning/validators/validate-fingerprint";
import { validateOutline } from "../src/planning/validators/validate-outline";
import { validateArtDirection } from "../src/planning/validators/validate-art-direction";
import { validateStoryboard } from "../src/planning/validators/validate-storyboard";
import { validateDuration } from "../src/planning/validators/validate-duration";
import { validateAssets } from "../src/planning/validators/validate-assets";
import { validateBlueprints } from "../src/planning/validators/validate-blueprints";
import { validateRenderQA } from "../src/planning/validators/validate-render-qa";
import { validateQualityGate } from "../src/planning/validators/validate-quality-gate";
import { saveValidationResult } from "../src/planning/loaders/save-book-plan";
import type {
  PlanValidationResult,
  PlanValidationCheck,
  EditorialOutline,
  StoryboardPlan,
  AssetInventory,
} from "../src/planning/types";

function readJson(p: string): unknown | null {
  if (!existsSync(p)) return null;
  return JSON.parse(readFileSync(p, "utf-8")) as unknown;
}

function deriveStatus(checks: PlanValidationCheck[]): "pass" | "warn" | "fail" {
  if (checks.some((c) => !c.passed && c.level === "BLOCKED")) return "fail";
  if (checks.some((c) => !c.passed && c.level === "WARN")) return "warn";
  return "pass";
}

function fmt(name: string, r: PlanValidationResult): string {
  const icon = r.status === "pass" ? "✓" : r.status === "warn" ? "⚠" : "✗";
  const passed = r.checks.filter((c) => c.passed).length;
  return (
    `[${name}]`.padEnd(16) +
    `${icon} ${r.status.toUpperCase()}  (${passed}/${r.checks.length})`
  );
}

async function main() {
  const bookDir = process.argv[2];
  if (!bookDir || !existsSync(bookDir)) {
    console.error(
      "Usage: npx ts-node scripts/validate-plan.ts generated/books/<book-id>",
    );
    process.exit(1);
  }

  const bookId = path.basename(bookDir);

  // Find content JSON: try --content flag, then bookId match, then scan by metadata.id
  const contentIdx = process.argv.indexOf("--content");
  let contentPath = contentIdx !== -1 ? process.argv[contentIdx + 1] : "";
  if (!contentPath || !existsSync(contentPath)) {
    contentPath = path.join("content/books", `${bookId}.json`);
  }
  if (!existsSync(contentPath)) {
    // Scan content/books/ for matching metadata.id
    const booksDir = path.join("content/books");
    const found = readdirSync(booksDir)
      .filter((f: string) => f.endsWith(".json"))
      .find((f: string) => {
        const data = JSON.parse(readFileSync(path.join(booksDir, f), "utf-8"));
        return data?.metadata?.id === bookId;
      });
    if (found) contentPath = path.join(booksDir, found);
  }
  if (!existsSync(contentPath)) {
    console.error(
      `Content not found for bookId "${bookId}". Use --content <path>`,
    );
    process.exit(1);
  }

  const content = JSON.parse(readFileSync(contentPath, "utf-8")) as {
    scenes: Array<{ id: string }>;
  };
  const contentSceneIds: string[] = content.scenes.map((s) => s.id);

  const fingerprint = readJson(path.join(bookDir, "00-fingerprint.json"));
  const outline = readJson(path.join(bookDir, "01-editorial-outline.json"));
  const artDirection = readJson(path.join(bookDir, "02-art-direction.json"));
  const storyboard = readJson(path.join(bookDir, "03-storyboard.json"));
  const assetInventory = readJson(
    path.join(bookDir, "04-asset-inventory.json"),
  );

  const results: PlanValidationResult[] = [];

  // Schema phase
  const schemaChecks: PlanValidationCheck[] = [
    ...(fingerprint
      ? validateFingerprint(fingerprint)
      : [
          {
            id: "fp-missing",
            level: "BLOCKED" as const,
            passed: false,
            message: "00-fingerprint.json missing",
          },
        ]),
    ...(outline
      ? validateOutline(outline)
      : [
          {
            id: "outline-missing",
            level: "BLOCKED" as const,
            passed: false,
            message: "01-editorial-outline.json missing",
          },
        ]),
    ...(artDirection
      ? validateArtDirection(artDirection)
      : [
          {
            id: "art-missing",
            level: "BLOCKED" as const,
            passed: false,
            message: "02-art-direction.json missing",
          },
        ]),
    ...(storyboard
      ? validateStoryboard(
          storyboard,
          contentSceneIds,
          bookId,
          outline as EditorialOutline,
        )
      : [
          {
            id: "sb-missing",
            level: "BLOCKED" as const,
            passed: false,
            message: "03-storyboard.json missing",
          },
        ]),
  ];
  results.push({
    phase: "schema",
    status: deriveStatus(schemaChecks),
    timestamp: new Date().toISOString(),
    checks: schemaChecks,
  });

  // Duration phase
  if (storyboard && outline) {
    const c = validateDuration(
      storyboard as StoryboardPlan,
      outline as EditorialOutline,
    );
    results.push({
      phase: "duration",
      status: deriveStatus(c),
      timestamp: new Date().toISOString(),
      checks: c,
    });
  }

  // Assets phase
  if (assetInventory) {
    const c = validateAssets(assetInventory as AssetInventory);
    results.push({
      phase: "assets",
      status: deriveStatus(c),
      timestamp: new Date().toISOString(),
      checks: c,
    });
  }

  // Blueprints phase
  if (storyboard) {
    const c = validateBlueprints(bookId, storyboard as StoryboardPlan);
    results.push({
      phase: "blueprints",
      status: deriveStatus(c),
      timestamp: new Date().toISOString(),
      checks: c,
    });
  }

  // Render QA phase
  if (storyboard) {
    const rqc = validateRenderQA(bookId, storyboard as StoryboardPlan);
    results.push({
      phase: "render-qa",
      status: deriveStatus(rqc),
      timestamp: new Date().toISOString(),
      checks: rqc,
    });
  }

  // Quality gate
  const qgc = validateQualityGate(
    bookId,
    storyboard as StoryboardPlan | undefined,
    contentSceneIds.length,
  );
  results.push({
    phase: "quality-gate",
    status: deriveStatus(qgc),
    timestamp: new Date().toISOString(),
    checks: qgc,
  });

  // Save + print
  for (const r of results) saveValidationResult(bookId, r.phase, r);

  console.log("");
  for (const r of results) console.log(fmt(r.phase, r));
  console.log("");
  console.log(`Results saved to ${bookDir}/.validation/`);

  process.exit(results.some((r) => r.status === "fail") ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
