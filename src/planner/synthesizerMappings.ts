// ============================================================
// SceneSynthesizer — Capability Mapping Tables
// Maps GapDetector capability strings to VCL layout/choreography.
// ============================================================

import type { LayoutType, ChoreographyType, MotionPresetKey } from "@/types";
import type { BookArtDirection } from "@/planning/types";
import { layoutRegistry } from "@/renderer/layouts";

// ---------------------------------------------------------------------------
// Capability → Layout Mapping (17 entries, exhaustive)
// ---------------------------------------------------------------------------

export interface CapabilityMapping {
  layout: LayoutType;
  confidence: number;
  note?: string;
}

/**
 * Maps every capability string emitted by gapDetector.ts to a concrete layout.
 * Confidence reflects how well the available layout matches the intent.
 * 1.0 = exact match, 0.5 = safe fallback.
 */
export const capabilityToLayout: Record<string, CapabilityMapping> = {
  // Q1: Framework expressibility
  "cyclic-flow": { layout: "radial", confidence: 1.0 },
  "radial-layout": { layout: "radial", confidence: 1.0 },
  "layered-stack": {
    layout: "grid-expand",
    confidence: 0.7,
    note: "stacked-layers unimplemented",
  },
  "custom-layout": {
    layout: "center-focus",
    confidence: 0.5,
    note: "safe default for unknown metaphors",
  },

  // Q2: Metaphor visualization
  "motif-wheel": { layout: "radial", confidence: 0.9 },
  "motif-spiral": {
    layout: "radial",
    confidence: 0.7,
    note: "spiral approximated as radial",
  },
  "motif-orbit": {
    layout: "radial",
    confidence: 0.6,
    note: "orbit layout unimplemented",
  },
  "motif-web": {
    layout: "grid-n",
    confidence: 0.6,
    note: "web approximated as grid",
  },
  "motif-rhizome": {
    layout: "grid-n",
    confidence: 0.5,
    note: "rhizome approximated as grid",
  },

  // Q3: Temporal flow
  "timeline-h": { layout: "timeline-h", confidence: 1.0 },
  "timeline-v": {
    layout: "timeline-h",
    confidence: 0.8,
    note: "vertical timeline rendered horizontal",
  },

  // Q4: Transformation expressibility
  "before-after-pair": { layout: "split-two", confidence: 1.0 },
  "split-reveal": { layout: "split-two", confidence: 0.9 },

  // Q5: Emotional climax
  "emphasis-composition": { layout: "center-focus", confidence: 0.8 },
  "dramatic-choreography": { layout: "center-focus", confidence: 0.8 },

  // Low-confidence fallback
  "custom-composition": {
    layout: "center-focus",
    confidence: 0.5,
    note: "generic fallback",
  },

  // Policy-forced signature
  "signature-composition": {
    layout: "center-focus",
    confidence: 0.6,
    note: "policy-forced signature scene",
  },
};

// ---------------------------------------------------------------------------
// Layout → Best Choreography + Motion Preset
// ---------------------------------------------------------------------------

export interface ChoreographyMapping {
  choreography: ChoreographyType;
  motionPreset: MotionPresetKey;
}

/**
 * Default choreography for each layout, based on layoutRegistry.compatibleChoreographies.
 * The first compatible choreography is used as the default.
 */
export const layoutToChoreography: Record<string, ChoreographyMapping> = {
  "center-focus": { choreography: "reveal-sequence", motionPreset: "heavy" },
  "split-two": { choreography: "split-reveal", motionPreset: "smooth" },
  "split-compare": { choreography: "split-reveal", motionPreset: "smooth" },
  radial: { choreography: "stagger-clockwise", motionPreset: "smooth" },
  "timeline-h": { choreography: "reveal-sequence", motionPreset: "smooth" },
  "grid-n": { choreography: "stagger-clockwise", motionPreset: "snappy" },
  "grid-expand": { choreography: "stagger-clockwise", motionPreset: "smooth" },
};

// ---------------------------------------------------------------------------
// Emotional Tone → Choreography Override
// ---------------------------------------------------------------------------

const toneToChoreographyHint: Record<string, ChoreographyType> = {
  intense: "reveal-sequence",
  urgent: "reveal-sequence",
  provocative: "reveal-sequence",
  uplifting: "stagger-clockwise",
  disciplined: "reveal-sequence",
  reflective: "path-trace",
  hopeful: "stagger-clockwise",
  calm: "reveal-sequence",
};

// ---------------------------------------------------------------------------
// Public: Resolve Layout from Capabilities
// ---------------------------------------------------------------------------

/**
 * Art direction layoutBias → layout family confidence boost.
 * Applied additively after capability-based resolution.
 */
const layoutBiasBoost: Record<
  BookArtDirection["layoutBias"],
  { layouts: LayoutType[]; boost: number }
> = {
  asymmetric: { layouts: ["split-two", "split-compare"], boost: 0.15 },
  "grid-heavy": { layouts: ["grid-n", "grid-expand"], boost: 0.15 },
  flow: { layouts: ["radial", "timeline-h", "timeline-v"], boost: 0.15 },
  centered: { layouts: ["center-focus"], boost: 0.1 },
};

/**
 * Resolves the best layout from a set of required capabilities.
 * When layoutBias is provided, matching layout families get a confidence boost.
 */
export function resolveLayout(
  requiredCapabilities: string[],
  layoutBias?: BookArtDirection["layoutBias"],
): {
  layout: LayoutType;
  confidence: number;
} {
  // Build candidates with base confidence
  const candidates: Array<{ layout: LayoutType; confidence: number }> = [];

  for (const cap of requiredCapabilities) {
    const mapping = capabilityToLayout[cap];
    if (mapping) {
      candidates.push({
        layout: mapping.layout,
        confidence: mapping.confidence,
      });
    }
  }

  if (candidates.length === 0) {
    console.warn(
      `[SceneSynthesizer] No mapping found for capabilities: [${requiredCapabilities.join(", ")}]. Using center-focus.`,
    );
    return { layout: "center-focus", confidence: 0.4 };
  }

  // Apply layoutBias boost
  if (layoutBias) {
    const biasConfig = layoutBiasBoost[layoutBias];
    if (biasConfig) {
      for (const c of candidates) {
        if (biasConfig.layouts.includes(c.layout)) {
          c.confidence = Math.min(1.0, c.confidence + biasConfig.boost);
        }
      }
    }
  }

  // Select highest confidence
  candidates.sort((a, b) => b.confidence - a.confidence);
  return { layout: candidates[0].layout, confidence: candidates[0].confidence };
}

// ---------------------------------------------------------------------------
// Public: Select Choreography (with layout compatibility hard constraint)
// ---------------------------------------------------------------------------

/**
 * Art direction motionCharacter → preferred motionPreset.
 */
const motionCharacterPreset: Record<
  BookArtDirection["motionCharacter"],
  MotionPresetKey
> = {
  precise: "snappy",
  fluid: "smooth",
  weighted: "heavy",
  snappy: "snappy",
};

/**
 * Selects choreography + motionPreset for a given layout and emotional tone.
 * When motionCharacter is provided, it overrides the default motionPreset.
 * Enforces compatibility with layoutRegistry — never returns an incompatible pairing.
 */
export function selectChoreography(
  layout: LayoutType,
  emotionalTones: string[],
  motionCharacter?: BookArtDirection["motionCharacter"],
): ChoreographyMapping {
  // Start with layout default
  const defaultMapping =
    layoutToChoreography[layout] ?? layoutToChoreography["center-focus"];

  // Determine motionPreset: art direction override > layout default
  const resolvedMotionPreset = motionCharacter
    ? motionCharacterPreset[motionCharacter]
    : defaultMapping.motionPreset;

  // Try emotional tone override for choreography
  for (const tone of emotionalTones) {
    const hint = toneToChoreographyHint[tone];
    if (hint) {
      // Check compatibility with layout
      const reg = layoutRegistry[layout];
      if (reg?.compatibleChoreographies?.includes(hint)) {
        return {
          choreography: hint,
          motionPreset: resolvedMotionPreset,
        };
      }
    }
  }

  return {
    choreography: defaultMapping.choreography,
    motionPreset: resolvedMotionPreset,
  };
}

// ---------------------------------------------------------------------------
// Public: Fallback Preset Selection
// ---------------------------------------------------------------------------

/** Maps gap segment to a safe fallback scene type. */
const segmentFallbackPreset: Record<string, string> = {
  opening: "keyInsight",
  setup: "keyInsight",
  core: "framework",
  climax: "keyInsight",
  resolution: "application",
  closing: "closing",
};

export function getFallbackPresetForSegment(segment: string): string {
  return segmentFallbackPreset[segment] ?? "keyInsight";
}
