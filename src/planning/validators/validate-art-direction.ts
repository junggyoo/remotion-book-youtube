import type { PlanValidationCheck } from "../types";
import { BookArtDirectionSchema } from "../schemas";

export function validateArtDirection(data: unknown): PlanValidationCheck[] {
  const checks: PlanValidationCheck[] = [];
  const result = BookArtDirectionSchema.safeParse(data);

  if (!result.success) {
    for (const issue of result.error.issues) {
      checks.push({
        id: `art-schema-${issue.path.join(".")}`,
        level: "BLOCKED",
        passed: false,
        message: `ArtDirection: ${issue.path.join(".")}: ${issue.message}`,
      });
    }
    return checks;
  }

  const ad = result.data;
  const hexRe = /^#[0-9a-fA-F]{6}$/;
  checks.push({
    id: "art-palette-primary",
    level: "BLOCKED",
    passed: hexRe.test(ad.palette.primary),
    message: `palette.primary=${ad.palette.primary}`,
  });
  checks.push({
    id: "art-palette-secondary",
    level: "BLOCKED",
    passed: hexRe.test(ad.palette.secondary),
    message: `palette.secondary=${ad.palette.secondary}`,
  });
  checks.push({
    id: "art-signalColor",
    level: "BLOCKED",
    passed: hexRe.test(ad.signalColor),
    message: `signalColor=${ad.signalColor}`,
  });
  checks.push({
    id: "art-visualMetaphors",
    level: "WARN",
    passed: ad.visualMetaphors.length > 0,
    message:
      ad.visualMetaphors.length > 0
        ? `${ad.visualMetaphors.length} metaphors`
        : "No visualMetaphors",
  });
  return checks;
}
