import { existsSync, readFileSync, readdirSync } from "fs";
import path from "path";
import type { PlanValidationCheck } from "../types";
import type { StoryboardPlan } from "../types";
import { runRenderQA } from "../../validator/renderFailureCodes";
import type { SceneBlueprint } from "@/types";

const GENERATED_ROOT = path.resolve("generated/books");

export function validateRenderQA(
  bookId: string,
  _storyboard: StoryboardPlan,
): PlanValidationCheck[] {
  const checks: PlanValidationCheck[] = [];
  const bpDir = path.join(GENERATED_ROOT, bookId, "06-blueprints");

  if (!existsSync(bpDir)) {
    checks.push({
      id: "rqa-no-blueprints-dir",
      level: "WARN",
      passed: true,
      message: "No 06-blueprints directory — render-qa skipped",
    });
    return checks;
  }

  const bpFiles = readdirSync(bpDir).filter((f: string) =>
    f.endsWith(".blueprint.json"),
  );

  if (bpFiles.length === 0) {
    checks.push({
      id: "rqa-no-blueprint-files",
      level: "WARN",
      passed: true,
      message: "No blueprint files found — render-qa skipped",
    });
    return checks;
  }

  for (const file of bpFiles) {
    const filePath = path.join(bpDir, file);
    let bp: SceneBlueprint;

    try {
      bp = JSON.parse(readFileSync(filePath, "utf-8")) as SceneBlueprint;
    } catch (e) {
      checks.push({
        id: `rqa-parse-error-${file}`,
        level: "WARN",
        passed: false,
        message: `Failed to parse ${file}: ${(e as Error).message}`,
      });
      continue;
    }

    const format = bp.format || "longform";
    const result = runRenderQA(bp, format);

    for (const check of result.checks) {
      // Only include failing checks or BLOCKED-level checks in output
      // to keep the report concise
      if (!check.passed) {
        checks.push({
          id: `rqa-${check.code}-${bp.id}`,
          level: check.level,
          passed: false,
          message: `[${bp.id}] ${check.message}`,
          sceneId: bp.id,
        });
      }
    }

    // If all checks passed, add a single summary
    if (result.overallLevel === "PASS") {
      checks.push({
        id: `rqa-pass-${bp.id}`,
        level: "INFO",
        passed: true,
        message: `[${bp.id}] All render-qa checks passed`,
        sceneId: bp.id,
      });
    }
  }

  return checks;
}
