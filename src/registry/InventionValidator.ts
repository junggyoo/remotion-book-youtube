/**
 * D5: Preflight structural + brand sanity check for invented blueprints.
 * NOT full L1 brand validation — just minimum viability checks.
 */
import type { SynthesizedBlueprint } from "@/types";
import type { ValidationResult } from "./types";

const MAX_HEADLINE_CHARS = 60;
const MAX_ACCENT_COLORS = 2;
const ACCENT_COLOR_KEYS = new Set(["signal", "accent", "premium"]);

export function validateInvention(
  blueprint: SynthesizedBlueprint,
): ValidationResult {
  const violations: string[] = [];

  // EMPTY_ELEMENTS — elements array empty or missing
  if (!blueprint.elements || blueprint.elements.length === 0) {
    violations.push("EMPTY_ELEMENTS");
  }

  // MISSING_FALLBACK_PRESET — no fallbackPreset
  if (!blueprint.fallbackPreset) {
    violations.push("MISSING_FALLBACK_PRESET");
  }

  // INVALID_LAYOUT — layout empty/missing
  if (!blueprint.layout) {
    violations.push("INVALID_LAYOUT");
  }

  // INVALID_CHOREOGRAPHY — choreography empty/missing
  if (!blueprint.choreography) {
    violations.push("INVALID_CHOREOGRAPHY");
  }

  // MISSING_MEDIA_PLAN — no mediaPlan
  if (!blueprint.mediaPlan) {
    violations.push("MISSING_MEDIA_PLAN");
  }

  // EMPTY_NARRATION — mediaPlan.narrationText empty
  if (blueprint.mediaPlan && !blueprint.mediaPlan.narrationText?.trim()) {
    violations.push("EMPTY_NARRATION");
  }

  // HEADLINE_TOO_LONG — any headline element text > 60 chars
  if (blueprint.elements && blueprint.elements.length > 0) {
    for (const el of blueprint.elements) {
      if (el.type === "headline") {
        const text = el.props.text;
        if (typeof text === "string" && text.length > MAX_HEADLINE_CHARS) {
          violations.push("HEADLINE_TOO_LONG");
          break;
        }
      }
    }
  }

  // ACCENT_BUDGET_EXCEEDED — more than 2 distinct accent colors
  if (blueprint.elements && blueprint.elements.length > 0) {
    const usedAccents = new Set<string>();
    for (const el of blueprint.elements) {
      const color = el.props.color;
      if (typeof color === "string" && ACCENT_COLOR_KEYS.has(color)) {
        usedAccents.add(color);
      }
    }
    if (usedAccents.size > MAX_ACCENT_COLORS) {
      violations.push("ACCENT_BUDGET_EXCEEDED");
    }
  }

  return {
    passed: violations.length === 0,
    violations,
    checkedAt: new Date().toISOString(),
  };
}
