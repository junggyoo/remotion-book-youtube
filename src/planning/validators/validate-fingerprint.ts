import type { PlanValidationCheck } from "../types";
import { FingerprintSchema } from "../schemas";

export function validateFingerprint(data: unknown): PlanValidationCheck[] {
  const checks: PlanValidationCheck[] = [];
  const result = FingerprintSchema.safeParse(data);

  if (!result.success) {
    for (const issue of result.error.issues) {
      checks.push({
        id: `fp-schema-${issue.path.join(".")}`,
        level: "BLOCKED",
        passed: false,
        message: `Fingerprint: ${issue.path.join(".")}: ${issue.message}`,
      });
    }
    return checks;
  }

  const fp = result.data;
  checks.push({
    id: "fp-genre",
    level: "BLOCKED",
    passed: fp.genre.length > 0,
    message: fp.genre.length > 0 ? "genre is valid" : "genre must not be empty",
  });
  checks.push({
    id: "fp-hookStrategy",
    level: "BLOCKED",
    passed: fp.hookStrategy.length > 0,
    message:
      fp.hookStrategy.length > 0
        ? "hookStrategy present"
        : "hookStrategy empty",
  });
  const hasMotifs = (fp.visualMotifs?.length ?? 0) > 0;
  checks.push({
    id: "fp-visualMotifs",
    level: "WARN",
    passed: hasMotifs,
    message: hasMotifs
      ? `${fp.visualMotifs!.length} visual motifs`
      : "No visualMotifs",
  });
  return checks;
}
