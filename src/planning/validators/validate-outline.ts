import type { PlanValidationCheck } from "../types";
import { EditorialOutlineSchema } from "../schemas";

export function validateOutline(data: unknown): PlanValidationCheck[] {
  const checks: PlanValidationCheck[] = [];
  const result = EditorialOutlineSchema.safeParse(data);

  if (!result.success) {
    for (const issue of result.error.issues) {
      checks.push({
        id: `outline-schema-${issue.path.join(".")}`,
        level: "BLOCKED",
        passed: false,
        message: `Outline: ${issue.path.join(".")}: ${issue.message}`,
      });
    }
    return checks;
  }

  const o = result.data;
  checks.push({
    id: "outline-targetDuration",
    level: "BLOCKED",
    passed: o.targetDurationSeconds > 0,
    message: `targetDurationSeconds=${o.targetDurationSeconds}`,
  });
  checks.push({
    id: "outline-coreMessages",
    level: "BLOCKED",
    passed: o.coreMessages.length >= 1 && o.coreMessages.length <= 7,
    message: `coreMessages count=${o.coreMessages.length}`,
  });
  checks.push({
    id: "outline-oneLiner",
    level: "BLOCKED",
    passed: o.oneLiner.length > 0,
    message: o.oneLiner.length > 0 ? "oneLiner present" : "oneLiner empty",
  });
  checks.push({
    id: "outline-toneKeywords",
    level: "WARN",
    passed: o.toneKeywords.length > 0,
    message:
      o.toneKeywords.length > 0
        ? `${o.toneKeywords.length} tone keywords`
        : "No toneKeywords",
  });
  return checks;
}
