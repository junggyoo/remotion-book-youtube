import { existsSync } from "fs";
import path from "path";
import type { PlanValidationCheck, EditorialOutline } from "../types";
import { StoryboardPlanSchema } from "../schemas";

const GENERATED_ROOT = path.resolve("generated/books");

export function validateStoryboard(
  data: unknown,
  contentSceneIds: string[],
  bookId: string,
  outline?: EditorialOutline,
): PlanValidationCheck[] {
  const checks: PlanValidationCheck[] = [];
  const result = StoryboardPlanSchema.safeParse(data);

  if (!result.success) {
    for (const issue of result.error.issues) {
      checks.push({
        id: `sb-schema-${issue.path.join(".")}`,
        level: "BLOCKED",
        passed: false,
        message: `Storyboard: ${issue.path.join(".")}: ${issue.message}`,
      });
    }
    return checks;
  }

  const sb = result.data;
  const contentIdSet = new Set(contentSceneIds);

  // All storyboard sceneIds must exist in content JSON
  for (const scene of sb.scenes) {
    const exists = contentIdSet.has(scene.sceneId);
    checks.push({
      id: `sb-sceneId-${scene.sceneId}`,
      level: "BLOCKED",
      passed: exists,
      message: exists
        ? `"${scene.sceneId}" found`
        : `"${scene.sceneId}" NOT in content JSON`,
      sceneId: scene.sceneId,
    });
  }

  // renderMode consistency
  for (const scene of sb.scenes) {
    if (scene.renderMode === "preset") {
      const has = !!scene.presetSceneType;
      checks.push({
        id: `sb-preset-type-${scene.sceneId}`,
        level: "BLOCKED",
        passed: has,
        message: has
          ? `preset "${scene.sceneId}" type=${scene.presetSceneType}`
          : `preset "${scene.sceneId}" missing presetSceneType`,
        sceneId: scene.sceneId,
      });
    }
    if (scene.renderMode === "blueprint") {
      const hasId = !!scene.blueprintId;
      checks.push({
        id: `sb-bp-id-${scene.sceneId}`,
        level: "BLOCKED",
        passed: hasId,
        message: hasId
          ? `blueprint "${scene.sceneId}" id=${scene.blueprintId}`
          : `blueprint "${scene.sceneId}" missing blueprintId`,
        sceneId: scene.sceneId,
      });
      if (hasId) {
        const bpPath = path.join(
          GENERATED_ROOT,
          bookId,
          "06-blueprints",
          `${scene.blueprintId}.blueprint.json`,
        );
        const fileExists = existsSync(bpPath);
        checks.push({
          id: `sb-bp-file-${scene.sceneId}`,
          level: "BLOCKED",
          passed: fileExists,
          message: fileExists
            ? `blueprint file exists`
            : `blueprint file missing: ${bpPath}`,
          sceneId: scene.sceneId,
        });
      }
    }
  }

  // Order sequential
  const orders = sb.scenes.map((s) => s.order).sort((a, b) => a - b);
  const sequential = orders.every((o, i) => o === i);
  checks.push({
    id: "sb-order",
    level: "BLOCKED",
    passed: sequential,
    message: sequential
      ? `Order 0..${orders.length - 1}`
      : `Order gaps: ${JSON.stringify(orders)}`,
  });

  // Duration vs outline
  if (outline) {
    const dev =
      Math.abs(sb.estimatedDurationSeconds - outline.targetDurationSeconds) /
      outline.targetDurationSeconds;
    checks.push({
      id: "sb-duration-vs-outline",
      level: "WARN",
      passed: dev <= 0.2,
      message: `estimated=${sb.estimatedDurationSeconds}s target=${outline.targetDurationSeconds}s (${(dev * 100).toFixed(1)}%)`,
    });
  }

  // Blueprint count
  const bpCount = sb.scenes.filter((s) => s.renderMode === "blueprint").length;
  checks.push({
    id: "sb-bp-count",
    level: "WARN",
    passed: bpCount <= 3,
    message: `${bpCount} blueprint scenes`,
  });

  // Content-only (INFO)
  const sbIds = new Set(sb.scenes.map((s) => s.sceneId));
  const contentOnly = contentSceneIds.filter((id) => !sbIds.has(id));
  if (contentOnly.length > 0) {
    checks.push({
      id: "sb-content-only",
      level: "INFO",
      passed: true,
      message: `${contentOnly.length} content-only scenes (auto preset): ${contentOnly.join(", ")}`,
    });
  }

  checks.push({
    id: "sb-summary",
    level: "INFO",
    passed: true,
    message: `${sb.scenes.length} storyboard: ${sb.scenes.filter((s) => s.renderMode === "preset").length} preset, ${bpCount} blueprint`,
  });
  return checks;
}
