import { existsSync } from "fs";
import path from "path";
import type { PlanValidationCheck, StoryboardPlan } from "../types";

const GENERATED_ROOT = path.resolve("generated/books");
const PLANNING_FILES = [
  "00-fingerprint.json",
  "01-editorial-outline.json",
  "02-art-direction.json",
  "03-storyboard.json",
  "04-asset-inventory.json",
  "05-motion-plan.json",
];

export function validateQualityGate(
  bookId: string,
  storyboard?: StoryboardPlan,
  totalContentScenes?: number,
): PlanValidationCheck[] {
  const checks: PlanValidationCheck[] = [];
  const bookDir = path.join(GENERATED_ROOT, bookId);

  let present = 0;
  for (const f of PLANNING_FILES) {
    if (existsSync(path.join(bookDir, f))) present++;
  }
  checks.push({
    id: "qg-completeness",
    level: "INFO",
    passed: true,
    message: `Planning docs: ${present}/${PLANNING_FILES.length}`,
  });

  if (storyboard && totalContentScenes) {
    const bpCount = storyboard.scenes.filter(
      (s) => s.renderMode === "blueprint",
    ).length;
    checks.push({
      id: "qg-bp-ratio",
      level: "INFO",
      passed: true,
      message: `Blueprint: ${bpCount}/${totalContentScenes}`,
    });
  }

  if (
    existsSync(path.join(bookDir, "02-art-direction.json")) &&
    !existsSync(path.join(bookDir, "06-blueprints"))
  ) {
    checks.push({
      id: "qg-art-no-bp",
      level: "WARN",
      passed: false,
      message: "Art direction exists but no blueprints",
    });
  }
  return checks;
}
