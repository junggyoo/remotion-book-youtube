import type {
  PlanValidationCheck,
  StoryboardPlan,
  EditorialOutline,
} from "../types";

const KOREAN_CPS = 5.7;

export function validateDuration(
  storyboard: StoryboardPlan,
  outline: EditorialOutline,
): PlanValidationCheck[] {
  const checks: PlanValidationCheck[] = [];
  const totalSec = storyboard.scenes.reduce(
    (sum, s) => sum + s.targetDurationSeconds,
    0,
  );
  const dev =
    Math.abs(totalSec - outline.targetDurationSeconds) /
    outline.targetDurationSeconds;
  checks.push({
    id: "dur-total",
    level: "WARN",
    passed: dev <= 0.2,
    message: `total=${totalSec}s target=${outline.targetDurationSeconds}s (${(dev * 100).toFixed(1)}%)`,
  });

  for (const scene of storyboard.scenes) {
    if (scene.targetDurationSeconds < 3 || scene.targetDurationSeconds > 120) {
      checks.push({
        id: `dur-bounds-${scene.sceneId}`,
        level: "WARN",
        passed: false,
        message: `"${scene.sceneId}" duration=${scene.targetDurationSeconds}s`,
        sceneId: scene.sceneId,
      });
    }
  }

  for (const scene of storyboard.scenes) {
    checks.push({
      id: `dur-chars-${scene.sceneId}`,
      level: "INFO",
      passed: true,
      message: `"${scene.sceneId}": ~${Math.round(scene.targetDurationSeconds * KOREAN_CPS)} chars`,
      sceneId: scene.sceneId,
    });
  }
  return checks;
}
