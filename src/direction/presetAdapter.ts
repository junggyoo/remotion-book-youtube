import type { SceneType } from "@/types";
import type { SceneSpec, DirectionProfile, SceneFamily } from "./types";
import { resolveSceneFamily } from "./interpretationBootstrap";
import { analyzeNarrationSemantics } from "./beat/BeatSemanticAnalyzer";
import { resolveBeatProfile } from "./beat/BeatProfileResolver";
import { compileBeatTimeline } from "./beat/BeatTimelineCompiler";
import type { InterpretationResult } from "@/interpretation/types";

const PRESET_LAYOUT_MAP: Record<string, string> = {
  cover: "center-focus",
  chapterDivider: "left-anchor",
  keyInsight: "center-focus",
  compareContrast: "split-compare",
  quote: "quote-hold",
  framework: "grid-expand",
  application: "map-flow",
  data: "grid-expand",
  closing: "center-focus",
  highlight: "center-focus",
  timeline: "timeline-h",
  listReveal: "grid-expand",
  splitQuote: "split-compare",
  transition: "center-focus",
};

const PRESET_CHOREOGRAPHY_MAP: Record<string, string> = {
  cover: "reveal-sequence",
  chapterDivider: "reveal-sequence",
  keyInsight: "reveal-sequence",
  compareContrast: "split-reveal",
  quote: "reveal-sequence",
  framework: "stagger-clockwise",
  application: "reveal-sequence",
  data: "reveal-sequence",
  closing: "reveal-sequence",
  highlight: "reveal-sequence",
  timeline: "path-trace",
  listReveal: "stagger-clockwise",
  splitQuote: "split-reveal",
  transition: "reveal-sequence",
};

interface MinimalScene {
  id: string;
  type: SceneType | string;
  narrationText: string;
  content: Record<string, unknown>;
}

interface AdaptOptions {
  /** Families that should use composed path instead of preset. Type-safe SceneFamily[]. */
  composedFamilies?: SceneFamily[];
  /** Optional interpretation result to override family, layout, choreography, and meta. */
  interpretation?: InterpretationResult;
}

export function adaptPresetToSceneSpec(
  scene: MinimalScene,
  direction: DirectionProfile,
  bookStructure?: string,
  options?: AdaptOptions,
): SceneSpec {
  const interpretation = options?.interpretation;

  // Resolve family: interpretation wins over bootstrap
  const family = interpretation
    ? interpretation.family
    : resolveSceneFamily(scene.type, bookStructure);

  // Resolve layout: interpretation hint wins over preset default
  const presetLayout = (PRESET_LAYOUT_MAP[scene.type] ?? "center-focus") as any;
  const layout = interpretation?.layoutHint
    ? (interpretation.layoutHint as any)
    : presetLayout;

  // Resolve choreography: interpretation hint wins over preset default
  const presetChoreography = (PRESET_CHOREOGRAPHY_MAP[scene.type] ??
    "reveal-sequence") as any;
  const choreography = interpretation?.choreographyHint
    ? (interpretation.choreographyHint as any)
    : presetChoreography;

  // Phase 1: Semantic beat profile
  let beatProfile;
  if (scene.narrationText && scene.narrationText.length >= 10) {
    const semanticPlan = analyzeNarrationSemantics(scene.narrationText);
    const resolved = resolveBeatProfile(semanticPlan, direction);
    beatProfile = compileBeatTimeline(semanticPlan, resolved, direction);
  }

  // Source is determined by the FINAL family vs composedFamilies
  const source: SceneSpec["source"] = options?.composedFamilies?.includes(
    family,
  )
    ? "composed"
    : "preset";

  // Build interpretationMeta
  const derivedFrom = interpretation
    ? [
        ...interpretation.trace.derivedFrom,
        ...(interpretation.layoutHint
          ? [`layout:${interpretation.layoutHint}`]
          : []),
        ...(interpretation.choreographyHint
          ? [`choreography:${interpretation.choreographyHint}`]
          : []),
      ]
    : [`preset:${scene.type}`, `direction:${direction.name}`];

  const interpretationMeta: SceneSpec["interpretationMeta"] = {
    derivedFrom,
    whyThisFamily: interpretation
      ? interpretation.trace.whyThisFamily
      : `${scene.type} → ${family} (preset adapter default mapping)`,
    whyThisDirection:
      interpretation?.trace.whyThisDirection ??
      `${direction.name} (book-level direction from interpretation bootstrap)`,
    ...(interpretation?.trace.alternativeChoices
      ? { alternativeChoices: interpretation.trace.alternativeChoices }
      : {}),
  };

  return {
    id: scene.id,
    family,
    intent: `${family} via preset ${scene.type}`,
    layout,
    elements: [],
    choreography,
    direction,
    beatProfile,
    durationStrategy: { mode: scene.narrationText ? "tts-driven" : "fixed" },
    source,
    confidence: interpretation ? interpretation.familyConfidence : 1.0,
    fallbackPreset: scene.type as SceneType,
    narrationText: scene.narrationText,
    content: scene.content,
    interpretationMeta,
    constraintHints: { accentBudget: 2, subtitleMode: "standard" },
    brandValidation: { status: "pending" },
  };
}
