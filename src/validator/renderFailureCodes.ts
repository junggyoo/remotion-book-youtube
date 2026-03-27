// ============================================================
// Editorial Signal — Render Failure Codes (P1-6)
// Static analysis of blueprint JSON to classify structural
// issues that predict render-time visual failures.
// Report-only — no auto-fix.
// ============================================================

import designTokens from "@/design/tokens/design-tokens-draft.json";
import { layout } from "@/design/tokens/layout";
import motionPresetsJson from "@/design/tokens/motion-presets.json";
import type { SceneBlueprint, VCLElement, MotionPresetKey } from "@/types";

// --- Enum ---

export enum RenderFailureCode {
  LAYOUT_WRAP_FAIL = "LAYOUT_WRAP_FAIL",
  TEXT_DENSITY_WARN = "TEXT_DENSITY_WARN",
  PRESET_SIMILARITY_WARN = "PRESET_SIMILARITY_WARN",
  NO_NON_TEXT_VISUAL_WARN = "NO_NON_TEXT_VISUAL_WARN",
  LOW_VISUAL_HIERARCHY_WARN = "LOW_VISUAL_HIERARCHY_WARN",
  TRANSITION_TOO_LONG_WARN = "TRANSITION_TOO_LONG_WARN",
  KINETIC_TEXT_OVERFLOW_FAIL = "KINETIC_TEXT_OVERFLOW_FAIL",
}

// --- Result types ---

export interface RenderQACheckResult {
  code: RenderFailureCode;
  level: "BLOCKED" | "WARN";
  passed: boolean;
  message: string;
}

export interface RenderQAResult {
  blueprintId: string;
  checks: RenderQACheckResult[];
  overallLevel: "PASS" | "WARN" | "BLOCKED";
}

// --- TokenRef resolver ---

type FormatKey = "longform" | "shorts";

const typographyScale = designTokens.typography.scale as Record<
  FormatKey,
  Record<string, number>
>;

/**
 * Resolves a tokenRef string like "typeScale.headlineL" to a pixel value.
 * Maps to design-tokens-draft.json → typography.scale[format][key].
 */
function resolveTokenRef(tokenRef: string, format: FormatKey): number | null {
  // Expected format: "typeScale.{key}" e.g. "typeScale.headlineL"
  const match = tokenRef.match(/^typeScale\.(\w+)$/);
  if (!match) return null;
  const key = match[1];
  const scaleForFormat = typographyScale[format];
  if (!scaleForFormat || !(key in scaleForFormat)) return null;
  return scaleForFormat[key];
}

// --- Helpers ---

const TEXT_ELEMENT_TYPES = new Set([
  "headline",
  "body-text",
  "label",
  "caption",
  "quote-text",
  "number-display",
]);

const VISUAL_ELEMENT_TYPES = new Set([
  "icon",
  "image",
  "shape",
  "bar-chart",
  "line-chart",
  "progress-ring",
  "stat-card",
  "comparison-pair",
]);

function isTextElement(type: string): boolean {
  return TEXT_ELEMENT_TYPES.has(type);
}

function extractTextFromElement(el: VCLElement): string {
  const props = el.props;
  if (typeof props.text === "string") return props.text;
  if (typeof props.content === "string") return props.content;
  if (typeof props.value === "string") return props.value;
  if (typeof props.label === "string") return props.label;
  if (typeof props.quote === "string") return props.quote;
  return "";
}

/**
 * Estimate rendered width of text in pixels.
 * Korean CJK characters: fontSize × 0.85
 * ASCII/Latin characters: fontSize × 0.5
 */
function estimateTextWidth(text: string, fontSize: number): number {
  let width = 0;
  for (const char of text) {
    const code = char.codePointAt(0) ?? 0;
    // CJK Unified Ideographs + Hangul Syllables + Hangul Jamo + Hangul Compat Jamo
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

function getFormatLayout(format: FormatKey) {
  return layout[format];
}

// --- Check functions ---

function checkLayoutWrap(
  blueprint: SceneBlueprint,
  format: FormatKey,
): RenderQACheckResult {
  const fmt = getFormatLayout(format);
  const contentWidth = fmt.safeArea.contentColumnWidth;

  for (const el of blueprint.elements) {
    if (el.type !== "headline") continue;
    const text = extractTextFromElement(el);
    if (!text) continue;

    const tokenRef = el.props.tokenRef as string | undefined;
    if (!tokenRef) continue;

    const fontSize = resolveTokenRef(tokenRef, format);
    if (fontSize === null) continue;

    const estimatedWidth = estimateTextWidth(text, fontSize);
    if (estimatedWidth > contentWidth) {
      return {
        code: RenderFailureCode.LAYOUT_WRAP_FAIL,
        level: "BLOCKED",
        passed: false,
        message: `Headline "${text.slice(0, 30)}..." estimated width ${Math.round(estimatedWidth)}px exceeds contentColumnWidth ${contentWidth}px (fontSize=${fontSize}, chars=${text.length})`,
      };
    }
  }

  return {
    code: RenderFailureCode.LAYOUT_WRAP_FAIL,
    level: "BLOCKED",
    passed: true,
    message: "All headlines fit within contentColumnWidth",
  };
}

function checkTextDensity(
  blueprint: SceneBlueprint,
  format: FormatKey,
): RenderQACheckResult {
  const fmt = getFormatLayout(format);
  const safeWidth = fmt.width - 2 * fmt.safeArea.outerMarginX;
  const safeHeight = fmt.height - 2 * fmt.safeArea.outerMarginY;
  const safeAreaPixels = safeWidth * safeHeight;

  let totalChars = 0;
  for (const el of blueprint.elements) {
    if (!isTextElement(el.type)) continue;
    const text = extractTextFromElement(el);
    totalChars += text.length;
  }

  // Threshold: 0.0003 chars/px² (calibrated against atomic-habits baselines)
  const density = totalChars / safeAreaPixels;
  const threshold = 0.0003;
  const passed = density <= threshold;

  return {
    code: RenderFailureCode.TEXT_DENSITY_WARN,
    level: "WARN",
    passed,
    message: passed
      ? `Text density ${density.toFixed(6)} within threshold ${threshold}`
      : `Text density ${density.toFixed(6)} exceeds threshold ${threshold} (${totalChars} chars in ${safeAreaPixels}px² safe area)`,
  };
}

function checkPresetSimilarity(blueprint: SceneBlueprint): RenderQACheckResult {
  // Only applies to synthesized blueprints
  if (blueprint.origin !== "synthesized") {
    return {
      code: RenderFailureCode.PRESET_SIMILARITY_WARN,
      level: "WARN",
      passed: true,
      message: "Not a synthesized blueprint — skipped",
    };
  }

  const synth = blueprint as SceneBlueprint & {
    fallbackPreset?: string;
  };
  const fallbackPreset = synth.fallbackPreset;
  if (!fallbackPreset) {
    return {
      code: RenderFailureCode.PRESET_SIMILARITY_WARN,
      level: "WARN",
      passed: true,
      message: "No fallbackPreset — cannot check similarity",
    };
  }

  // Check if ALL element IDs follow the preset naming pattern
  const presetPattern = new RegExp(`^${fallbackPreset}-`);
  const allMatchPreset =
    blueprint.elements.length > 0 &&
    blueprint.elements.every((el) => presetPattern.test(el.id));

  return {
    code: RenderFailureCode.PRESET_SIMILARITY_WARN,
    level: "WARN",
    passed: !allMatchPreset,
    message: allMatchPreset
      ? `All ${blueprint.elements.length} element IDs match preset pattern "${fallbackPreset}-*" — synthesis added no custom structure`
      : `Element IDs show custom structure (not all matching "${fallbackPreset}-*")`,
  };
}

function checkNonTextVisual(blueprint: SceneBlueprint): RenderQACheckResult {
  // Only applies to synthesized blueprints
  if (blueprint.origin !== "synthesized") {
    return {
      code: RenderFailureCode.NO_NON_TEXT_VISUAL_WARN,
      level: "WARN",
      passed: true,
      message: "Not a synthesized blueprint — skipped",
    };
  }

  const visualCount = blueprint.elements.filter((el) =>
    VISUAL_ELEMENT_TYPES.has(el.type),
  ).length;

  return {
    code: RenderFailureCode.NO_NON_TEXT_VISUAL_WARN,
    level: "WARN",
    passed: visualCount > 0,
    message:
      visualCount > 0
        ? `${visualCount} non-text visual element(s) found`
        : "No non-text visual elements (icon, image, shape, chart) — custom scene relies on text only",
  };
}

function checkVisualHierarchy(
  blueprint: SceneBlueprint,
  format: FormatKey,
): RenderQACheckResult {
  const fontSizes: number[] = [];

  for (const el of blueprint.elements) {
    if (!isTextElement(el.type)) continue;
    const text = extractTextFromElement(el);
    if (!text) continue; // skip empty text elements

    const tokenRef = el.props.tokenRef as string | undefined;
    if (!tokenRef) continue;

    const fontSize = resolveTokenRef(tokenRef, format);
    if (fontSize !== null) {
      fontSizes.push(fontSize);
    }
  }

  if (fontSizes.length < 2) {
    return {
      code: RenderFailureCode.LOW_VISUAL_HIERARCHY_WARN,
      level: "WARN",
      passed: true,
      message: `Less than 2 text elements with resolvable tokenRef — skipped (found ${fontSizes.length})`,
    };
  }

  const maxFont = Math.max(...fontSizes);
  const minFont = Math.min(...fontSizes);
  const ratio = maxFont / minFont;
  const threshold = 1.5;
  const passed = ratio >= threshold;

  return {
    code: RenderFailureCode.LOW_VISUAL_HIERARCHY_WARN,
    level: "WARN",
    passed,
    message: passed
      ? `Visual hierarchy ratio ${ratio.toFixed(2)} (${maxFont}/${minFont}) meets threshold ${threshold}`
      : `Visual hierarchy ratio ${ratio.toFixed(2)} (${maxFont}/${minFont}) below threshold ${threshold} — insufficient size contrast`,
  };
}

function checkTransitionTooLong(
  blueprint: SceneBlueprint,
): RenderQACheckResult {
  const presetKey = blueprint.motionPreset as string;
  const presets = motionPresetsJson.presets as Record<
    string,
    { type?: string; durationRange?: number[] }
  >;
  const preset = presets[presetKey];

  if (!preset) {
    return {
      code: RenderFailureCode.TRANSITION_TOO_LONG_WARN,
      level: "WARN",
      passed: true,
      message: `Unknown motionPreset "${presetKey}" — skipped`,
    };
  }

  // gentle is ambient/drift, not a transition — skip
  if (preset.type === "interpolate") {
    return {
      code: RenderFailureCode.TRANSITION_TOO_LONG_WARN,
      level: "WARN",
      passed: true,
      message: `Preset "${presetKey}" is interpolate-type (ambient) — not a transition, skipped`,
    };
  }

  const maxEnterFrames = preset.durationRange?.[1];
  if (maxEnterFrames === undefined || blueprint.durationFrames <= 0) {
    return {
      code: RenderFailureCode.TRANSITION_TOO_LONG_WARN,
      level: "WARN",
      passed: true,
      message: "No durationRange or zero durationFrames — skipped",
    };
  }

  const ratio = maxEnterFrames / blueprint.durationFrames;
  const threshold = 0.2;
  const passed = ratio <= threshold;

  return {
    code: RenderFailureCode.TRANSITION_TOO_LONG_WARN,
    level: "WARN",
    passed,
    message: passed
      ? `Transition ratio ${(ratio * 100).toFixed(1)}% (${maxEnterFrames}f/${blueprint.durationFrames}f) within ${threshold * 100}% threshold`
      : `Transition ratio ${(ratio * 100).toFixed(1)}% (${maxEnterFrames}f/${blueprint.durationFrames}f) exceeds ${threshold * 100}% — enter animation takes too long relative to scene duration`,
  };
}

function checkKineticTextOverflow(
  blueprint: SceneBlueprint,
  _format: FormatKey,
): RenderQACheckResult {
  // Deferred: no kinetic-text elements exist in current blueprints.
  // Enum value defined for future use. Check returns passed with skip.
  const hasKineticText = blueprint.elements.some(
    (el) =>
      el.type === "kinetic-text" || (el.props && "kineticRange" in el.props),
  );

  if (!hasKineticText) {
    return {
      code: RenderFailureCode.KINETIC_TEXT_OVERFLOW_FAIL,
      level: "BLOCKED",
      passed: true,
      message: "No kinetic-text elements — skipped",
    };
  }

  // When kinetic-text elements are present in future blueprints,
  // implement: estimate max text extent vs bodyMaxWidth
  return {
    code: RenderFailureCode.KINETIC_TEXT_OVERFLOW_FAIL,
    level: "BLOCKED",
    passed: true,
    message: "Kinetic text check not yet implemented — passed by default",
  };
}

// --- Aggregator ---

export function runRenderQA(
  blueprint: SceneBlueprint,
  format: FormatKey,
): RenderQAResult {
  const checks: RenderQACheckResult[] = [
    checkLayoutWrap(blueprint, format),
    checkTextDensity(blueprint, format),
    checkPresetSimilarity(blueprint),
    checkNonTextVisual(blueprint),
    checkVisualHierarchy(blueprint, format),
    checkTransitionTooLong(blueprint),
    checkKineticTextOverflow(blueprint, format),
  ];

  const hasBlocked = checks.some((c) => !c.passed && c.level === "BLOCKED");
  const hasWarn = checks.some((c) => !c.passed && c.level === "WARN");
  const overallLevel = hasBlocked ? "BLOCKED" : hasWarn ? "WARN" : "PASS";

  return {
    blueprintId: blueprint.id,
    checks,
    overallLevel,
  };
}

// Re-export resolveTokenRef for testing
export { resolveTokenRef as _resolveTokenRefForTest };
