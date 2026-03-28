// ============================================================
// Editorial Signal — QA Auto-fix (P2-6b)
// Safe-only fixes: no text meaning changes, no content deletion.
// ============================================================

import designTokens from "@/design/tokens/design-tokens-draft.json";
import motionPresetsJson from "@/design/tokens/motion-presets.json";
import { layout } from "@/design/tokens/layout";
import {
  RenderFailureCode,
  runRenderQA,
  type RenderQAResult,
  type RenderQACheckResult,
} from "./renderFailureCodes";
import type { SceneBlueprint, VCLElement, MotionPresetKey } from "@/types";

// --- Constants ---

/** Only these codes have safe auto-fix implementations. */
const SAFE_FIX_CODES = new Set<RenderFailureCode>([
  RenderFailureCode.LAYOUT_WRAP_FAIL,
  RenderFailureCode.TRANSITION_TOO_LONG_WARN,
]);

/** Headline tokenRef step-down chain (larger → smaller). */
const HEADLINE_STEP_DOWN: Record<string, string> = {
  "typeScale.headlineXL": "typeScale.headlineL",
  "typeScale.headlineL": "typeScale.headlineM",
  "typeScale.headlineM": "typeScale.headlineS",
};

type FormatKey = "longform" | "shorts";

const typographyScale = designTokens.typography.scale as Record<
  FormatKey,
  Record<string, number>
>;

/** Motion presets sorted by max enter duration ascending. */
const PRESETS_BY_MAX_DURATION: Array<{
  key: MotionPresetKey;
  maxDuration: number;
}> = Object.entries(
  motionPresetsJson.presets as Record<
    string,
    { type?: string; durationRange?: number[] }
  >,
)
  .filter(([, p]) => p.type !== "interpolate" && p.durationRange?.[1] != null)
  .map(([key, p]) => ({
    key: key as MotionPresetKey,
    maxDuration: p.durationRange![1],
  }))
  .sort((a, b) => a.maxDuration - b.maxDuration);

// --- Result type ---

export interface AutoFixResult {
  fixed: boolean;
  blueprint: SceneBlueprint;
  appliedFixes: string[];
  skippedCodes: RenderFailureCode[];
}

// --- Helpers ---

function resolveTokenRef(tokenRef: string, format: FormatKey): number | null {
  const match = tokenRef.match(/^typeScale\.(\w+)$/);
  if (!match) return null;
  const scaleForFormat = typographyScale[format];
  if (!scaleForFormat || !(match[1] in scaleForFormat)) return null;
  return scaleForFormat[match[1]];
}

function estimateTextWidth(text: string, fontSize: number): number {
  let width = 0;
  for (const char of text) {
    const code = char.codePointAt(0) ?? 0;
    if (
      (code >= 0x4e00 && code <= 0x9fff) ||
      (code >= 0xac00 && code <= 0xd7a3) ||
      (code >= 0x1100 && code <= 0x11ff) ||
      (code >= 0x3130 && code <= 0x318f) ||
      (code >= 0x3400 && code <= 0x4dbf) ||
      (code >= 0xf900 && code <= 0xfaff)
    ) {
      width += fontSize * 0.85;
    } else {
      width += fontSize * 0.5;
    }
  }
  return width;
}

function extractText(el: VCLElement): string {
  const p = el.props;
  if (typeof p.text === "string") return p.text;
  if (typeof p.content === "string") return p.content;
  if (typeof p.value === "string") return p.value;
  if (typeof p.label === "string") return p.label;
  if (typeof p.quote === "string") return p.quote;
  return "";
}

// --- Fix: LAYOUT_WRAP_FAIL ---

function fixLayoutWrap(
  blueprint: SceneBlueprint,
  format: FormatKey,
): string | null {
  const contentWidth = layout[format].safeArea.contentColumnWidth;

  for (const el of blueprint.elements) {
    if (el.type !== "headline") continue;
    const text = extractText(el);
    if (!text) continue;

    const tokenRef = el.props.tokenRef as string | undefined;
    if (!tokenRef) continue;

    const fontSize = resolveTokenRef(tokenRef, format);
    if (fontSize === null) continue;

    const estimatedWidth = estimateTextWidth(text, fontSize);
    if (estimatedWidth <= contentWidth) continue;

    // Step down tokenRef until it fits (max 3 steps)
    let currentRef = tokenRef;
    for (let step = 0; step < 3; step++) {
      const nextRef = HEADLINE_STEP_DOWN[currentRef];
      if (!nextRef) break;

      const nextSize = resolveTokenRef(nextRef, format);
      if (nextSize === null) break;

      currentRef = nextRef;
      const nextWidth = estimateTextWidth(text, nextSize);
      if (nextWidth <= contentWidth) break;
    }

    if (currentRef !== tokenRef) {
      el.props.tokenRef = currentRef;
      return `LAYOUT_WRAP_FAIL: headline tokenRef ${tokenRef} → ${currentRef} (element ${el.id})`;
    }
  }

  return null;
}

// --- Fix: TRANSITION_TOO_LONG_WARN ---

const TRANSITION_CLAMP_RATIO = 0.15;

function fixTransitionTooLong(blueprint: SceneBlueprint): string | null {
  if (blueprint.durationFrames <= 0) return null;

  const currentPresetKey = blueprint.motionPreset as string;
  const presets = motionPresetsJson.presets as Record<
    string,
    { type?: string; durationRange?: number[] }
  >;
  const currentPreset = presets[currentPresetKey];
  if (!currentPreset) return null;
  if (currentPreset.type === "interpolate") return null;

  const maxEnter = currentPreset.durationRange?.[1];
  if (maxEnter === undefined) return null;

  const maxAllowed = Math.floor(
    blueprint.durationFrames * TRANSITION_CLAMP_RATIO,
  );
  if (maxEnter <= maxAllowed) return null;

  // Find the heaviest preset that fits within the clamp
  const candidate = [...PRESETS_BY_MAX_DURATION]
    .reverse()
    .find((p) => p.maxDuration <= maxAllowed);

  if (!candidate || candidate.key === currentPresetKey) return null;

  const oldPreset = blueprint.motionPreset;
  blueprint.motionPreset = candidate.key;
  return `TRANSITION_TOO_LONG_WARN: motionPreset ${oldPreset} → ${candidate.key} (maxEnter ${maxEnter}f → ${candidate.maxDuration}f, limit ${maxAllowed}f at 15% of ${blueprint.durationFrames}f)`;
}

// --- Public API ---

/**
 * Attempt safe auto-fixes on a blueprint based on QA results.
 * Only fixes LAYOUT_WRAP_FAIL and TRANSITION_TOO_LONG_WARN.
 * Returns a deep-cloned blueprint (original is not mutated).
 */
export function autoFixBlueprint(
  blueprint: SceneBlueprint,
  qaResult: RenderQAResult,
): AutoFixResult {
  // Deep clone to avoid mutating the original
  const bp: SceneBlueprint = JSON.parse(JSON.stringify(blueprint));
  const format = (bp.format || "longform") as FormatKey;

  const appliedFixes: string[] = [];
  const skippedCodes: RenderFailureCode[] = [];

  for (const check of qaResult.checks) {
    if (check.passed) continue;

    if (!SAFE_FIX_CODES.has(check.code)) {
      skippedCodes.push(check.code);
      continue;
    }

    let fixMsg: string | null = null;

    switch (check.code) {
      case RenderFailureCode.LAYOUT_WRAP_FAIL:
        fixMsg = fixLayoutWrap(bp, format);
        break;
      case RenderFailureCode.TRANSITION_TOO_LONG_WARN:
        fixMsg = fixTransitionTooLong(bp);
        break;
    }

    if (fixMsg) {
      appliedFixes.push(fixMsg);
    }
  }

  return {
    fixed: appliedFixes.length > 0,
    blueprint: bp,
    appliedFixes,
    skippedCodes,
  };
}

/**
 * Run QA + auto-fix loop on a single blueprint (max attempts).
 * Returns the final blueprint and aggregated fix log.
 */
export function autoFixWithRetry(
  blueprint: SceneBlueprint,
  maxAttempts: number = 2,
): {
  blueprint: SceneBlueprint;
  totalFixes: string[];
  finalQA: RenderQAResult;
  attempts: number;
} {
  const format = (blueprint.format || "longform") as FormatKey;
  let current = blueprint;
  const totalFixes: string[] = [];
  let qa = runRenderQA(current, format);
  let attempts = 0;

  while (attempts < maxAttempts && qa.overallLevel !== "PASS") {
    const result = autoFixBlueprint(current, qa);
    if (!result.fixed) break; // No more safe fixes possible

    current = result.blueprint;
    totalFixes.push(...result.appliedFixes);
    qa = runRenderQA(current, format);
    attempts++;
  }

  return { blueprint: current, totalFixes, finalQA: qa, attempts };
}
