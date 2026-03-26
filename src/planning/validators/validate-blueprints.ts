import { existsSync, readFileSync } from "fs";
import path from "path";
import type { PlanValidationCheck, StoryboardPlan } from "../types";

const GENERATED_ROOT = path.resolve("generated/books");

export function validateBlueprints(
  bookId: string,
  storyboard: StoryboardPlan,
): PlanValidationCheck[] {
  const checks: PlanValidationCheck[] = [];
  const bpDir = path.join(GENERATED_ROOT, bookId, "06-blueprints");
  const bpScenes = storyboard.scenes.filter(
    (s) => s.renderMode === "blueprint" && s.blueprintId,
  );

  for (const scene of bpScenes) {
    const bpPath = path.join(bpDir, `${scene.blueprintId}.blueprint.json`);
    if (!existsSync(bpPath)) {
      checks.push({
        id: `bp-file-${scene.sceneId}`,
        level: "BLOCKED",
        passed: false,
        message: `Missing: ${scene.blueprintId}.blueprint.json`,
        sceneId: scene.sceneId,
      });
      continue;
    }

    let bp: Record<string, unknown>;
    try {
      bp = JSON.parse(readFileSync(bpPath, "utf-8")) as Record<string, unknown>;
    } catch (e) {
      checks.push({
        id: `bp-parse-${scene.sceneId}`,
        level: "BLOCKED",
        passed: false,
        message: `Parse error: ${(e as Error).message}`,
        sceneId: scene.sceneId,
      });
      continue;
    }

    checks.push({
      id: `bp-mediaPlan-${scene.sceneId}`,
      level: "BLOCKED",
      passed: !!bp.mediaPlan,
      message: bp.mediaPlan ? "mediaPlan present" : "mediaPlan MISSING",
      sceneId: scene.sceneId,
    });
    checks.push({
      id: `bp-id-${scene.sceneId}`,
      level: "BLOCKED",
      passed: bp.id === scene.blueprintId,
      message:
        bp.id === scene.blueprintId
          ? "id matches filename"
          : `id="${bp.id}" !== "${scene.blueprintId}"`,
      sceneId: scene.sceneId,
    });
    checks.push({
      id: `bp-elements-${scene.sceneId}`,
      level: "WARN",
      passed:
        Array.isArray(bp.elements) && (bp.elements as unknown[]).length > 0,
      message: Array.isArray(bp.elements)
        ? `${(bp.elements as unknown[]).length} elements`
        : "No elements",
      sceneId: scene.sceneId,
    });
  }
  return checks;
}
