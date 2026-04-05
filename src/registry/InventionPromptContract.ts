/**
 * InventionPromptContract — Gap → Blueprint mapping
 *
 * Task 5: Structured invention prompts with derivedFrom traceability (D8).
 * inferFamily() is a bootstrap heuristic (D10), NOT the canonical classifier.
 */

import type { SceneGap } from "@/types";
import type { SceneFamily } from "@/direction/types";
import type {
  BlueprintSnapshot,
  InventionRecord,
  DerivedFromInfo,
} from "./types";

// ─── Public Types ───────────────────────────────────────────────────────────

export interface InventionPrompt {
  gapId: string;
  bookId: string;
  family: SceneFamily;
  intent: string;
  unmetCapabilities: string[];
  requiredLayout: string | null;
  emotionalTones: string[];
  constraints: string[];
  requiredFields: string[];
  fallbackPreset: string;
}

// ─── Brand Constraints ──────────────────────────────────────────────────────

const BRAND_CONSTRAINTS: string[] = [
  "Headline must be <= 60 characters (MAX_HEADLINE_CHARS)",
  "Maximum 2 accent colors per scene (MAX_ACCENT_COLORS)",
  "No hardcoded hex colors — use design tokens only",
  "No hardcoded px values — use spacing tokens",
  "spring() must use motion-presets.json preset, no arbitrary config",
  "Scale emphasis must not exceed 1.15",
  "Y offset must not exceed 48px",
  "fallbackPreset is mandatory for all synthesized scenes",
];

const REQUIRED_FIELDS: string[] = [
  "layout",
  "elements",
  "choreography",
  "fallbackPreset",
];

// ─── Capability → Family Mapping (D10 bootstrap heuristic) ─────────────────

const CAPABILITY_FAMILY_MAP: Record<string, SceneFamily> = {
  "cyclic-flow": "mechanism-explanation",
  "radial-layout": "system-model",
  "layered-stack": "system-model",
  "motif-wheel": "mechanism-explanation",
  "motif-spiral": "mechanism-explanation",
  "motif-orbit": "system-model",
  "motif-web": "system-model",
  "motif-rhizome": "system-model",
  "timeline-h": "progression-journey",
  "timeline-v": "progression-journey",
  "before-after-pair": "transformation-shift",
  "split-reveal": "tension-comparison",
  "emphasis-composition": "evidence-stack",
  "dramatic-choreography": "concept-introduction",
};

/** SceneType → family fallback when no capability matches */
export const PRESET_FAMILY_MAP: Record<string, SceneFamily> = {
  cover: "opening-hook",
  hook: "opening-hook",
  intro: "opening-hook",
  keyInsight: "concept-introduction",
  framework: "system-model",
  application: "progression-journey",
  compareContrast: "tension-comparison",
  quote: "reflective-anchor",
  data: "evidence-stack",
  timeline: "progression-journey",
  highlight: "concept-introduction",
  chapterDivider: "structural-bridge",
  closing: "closing-synthesis",
  insight: "concept-introduction",
  listReveal: "system-model",
  splitQuote: "reflective-anchor",
};

// ─── Private Helpers ────────────────────────────────────────────────────────

function deriveGapId(gap: SceneGap): string {
  return `${gap.segment}-${gap.slotIndex}`;
}

function inferFamily(gap: SceneGap): SceneFamily {
  // 1. Try capability-based mapping (first match wins)
  for (const cap of gap.requiredCapabilities) {
    const family = CAPABILITY_FAMILY_MAP[cap];
    if (family) return family;
  }

  // 2. Fallback: map bestPresetMatch.sceneType to family
  const presetType = gap.bestPresetMatch.sceneType;
  const family = PRESET_FAMILY_MAP[presetType];
  if (family) return family;

  // 3. Ultimate fallback
  return "concept-introduction";
}

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * Maps a SceneGap to a structured invention prompt.
 */
export function buildInventionPrompt(
  gap: SceneGap,
  bookId: string,
): InventionPrompt {
  const gapId = deriveGapId(gap);
  const family = inferFamily(gap);

  return {
    gapId,
    bookId,
    family,
    intent: gap.intent,
    unmetCapabilities: [...gap.requiredCapabilities],
    requiredLayout: null, // layout is determined during blueprint generation
    emotionalTones: [], // derived from direction layer, not gap
    constraints: [...BRAND_CONSTRAINTS],
    requiredFields: [...REQUIRED_FIELDS],
    fallbackPreset: gap.bestPresetMatch.sceneType,
  };
}

/**
 * Creates an InventionRecord with 30-day expiry and derivedFrom traceability (D8).
 */
export function extractInventionRecord(
  gap: SceneGap,
  bookId: string,
  snapshot: BlueprintSnapshot,
): InventionRecord {
  const gapId = deriveGapId(gap);
  const family = inferFamily(gap);
  const now = new Date();
  const expires = new Date(now);
  expires.setDate(expires.getDate() + 30);

  const derivedFrom: DerivedFromInfo = {
    gapCapabilities: [...gap.requiredCapabilities],
    fallbackPreset: gap.bestPresetMatch.sceneType,
  };

  return {
    id: `inv-${gapId}-${now.getTime()}`,
    gapId,
    bookId,
    family,
    blueprintSnapshot: snapshot,
    status: "invented",
    inventedAt: now.toISOString(),
    expiresAt: expires.toISOString(),
    validationResult: null,
    derivedFrom,
  };
}
