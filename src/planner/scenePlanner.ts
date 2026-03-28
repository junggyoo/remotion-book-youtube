import { z } from "zod";
import type {
  BookFingerprint,
  VideoNarrativePlan,
  NarrativeSegment,
  OpeningPackage,
  PlanningPolicy,
  ScenePlan,
  PresetMatch,
  ScoreBreakdown,
  SceneType,
  SceneContent,
  SceneBlueprint,
  SegmentRole,
  Theme,
  CoverContent,
  KeyInsightContent,
  FrameworkContent,
  ApplicationContent,
  ClosingContent,
  QuoteContent,
  CompareContrastContent,
  ChapterDividerContent,
  DataContent,
  VCLElement,
  MediaPlan,
  TTSEngineKey,
  LayoutType,
  ChoreographyType,
  MotionPresetKey,
} from "@/types";
import sceneCatalog from "@/schema/scene-catalog.json";

// ---------------------------------------------------------------------------
// Catalog types
// ---------------------------------------------------------------------------

interface CatalogEntry {
  durationFramesDefault: number;
  motionPreset: string;
  layoutArchetype: string;
  altLayoutArchetype?: string;
  layers: Record<string, number>;
}

function getCatalogEntry(sceneType: SceneType): CatalogEntry | undefined {
  return (sceneCatalog.scenes as Record<string, CatalogEntry>)[sceneType];
}

// ---------------------------------------------------------------------------
// Preset capability mapping (9 original scene presets)
// ---------------------------------------------------------------------------

const PRESET_CAPABILITIES: Record<string, string[]> = {
  cover: ["attention-grab", "book-intro"],
  chapterDivider: ["context-setting", "section-break"],
  keyInsight: ["key-concepts", "peak-insight", "evidence"],
  compareContrast: ["before-after", "comparison", "contrast"],
  quote: ["authority", "emotional-peak"],
  framework: ["framework", "step-by-step", "structure"],
  application: ["application", "real-life-example", "how-to"],
  data: ["evidence", "statistics", "quantitative"],
  closing: ["recap", "cta", "summary"],
};

const SCORABLE_PRESETS = Object.keys(PRESET_CAPABILITIES) as SceneType[];

// ---------------------------------------------------------------------------
// Per-sceneType scoring functions (openingComposer pattern)
// ---------------------------------------------------------------------------

interface SlotContext {
  segment: NarrativeSegment;
  slotIndex: number;
  fingerprint: BookFingerprint;
}

function deliveryOverlap(
  requiredDelivery: string[],
  capabilities: string[],
): number {
  if (requiredDelivery.length === 0) return 0;
  let matches = 0;
  for (const req of requiredDelivery) {
    const reqLower = req.toLowerCase();
    for (const cap of capabilities) {
      if (reqLower.includes(cap) || cap.includes(reqLower)) {
        matches++;
        break;
      }
    }
  }
  return matches / requiredDelivery.length;
}

type PresetScorer = {
  score(ctx: SlotContext): ScoreBreakdown & { confidence: number };
};

function makeScorer(
  sceneType: string,
  custom?: (ctx: SlotContext, base: ScoreBreakdown) => ScoreBreakdown,
): PresetScorer {
  const capabilities = PRESET_CAPABILITIES[sceneType] ?? [];

  return {
    score(ctx: SlotContext) {
      const { segment, fingerprint } = ctx;

      // Base scores
      const delivery = deliveryOverlap(segment.requiredDelivery, capabilities);
      const structure = computeStructureScore(sceneType, fingerprint);
      const contentFit = computeContentFitScore(sceneType, segment);
      const layout = computeLayoutScore(sceneType, fingerprint);

      let breakdown: ScoreBreakdown = {
        delivery,
        structure,
        contentFit,
        layout,
        explanation: "",
      };

      // Per-type customization
      if (custom) {
        breakdown = custom(ctx, breakdown);
      }

      // Weighted sum: delivery 0.35, structure 0.25, contentFit 0.25, layout 0.15
      const confidence = Math.min(
        1,
        breakdown.delivery * 0.35 +
          breakdown.structure * 0.25 +
          breakdown.contentFit * 0.25 +
          breakdown.layout * 0.15,
      );

      breakdown.explanation = `${sceneType}: d=${breakdown.delivery.toFixed(2)} s=${breakdown.structure.toFixed(2)} c=${breakdown.contentFit.toFixed(2)} l=${breakdown.layout.toFixed(2)} → ${confidence.toFixed(3)}`;

      return { ...breakdown, confidence };
    },
  };
}

function computeStructureScore(sceneType: string, fp: BookFingerprint): number {
  const mapping: Record<string, Record<string, number>> = {
    framework: {
      framework: 0.95,
      collection: 0.5,
      argument: 0.3,
      narrative: 0.2,
    },
    application: {
      framework: 0.7,
      narrative: 0.6,
      argument: 0.4,
      collection: 0.3,
    },
    keyInsight: {
      argument: 0.8,
      framework: 0.6,
      narrative: 0.5,
      collection: 0.7,
    },
    compareContrast: {
      argument: 0.7,
      narrative: 0.6,
      framework: 0.4,
      collection: 0.3,
    },
    quote: { narrative: 0.7, argument: 0.6, framework: 0.3, collection: 0.5 },
    data: { argument: 0.8, framework: 0.5, narrative: 0.3, collection: 0.4 },
    cover: { framework: 0.5, narrative: 0.5, argument: 0.5, collection: 0.5 },
    chapterDivider: {
      framework: 0.5,
      narrative: 0.5,
      argument: 0.5,
      collection: 0.5,
    },
    closing: { framework: 0.5, narrative: 0.5, argument: 0.5, collection: 0.5 },
  };
  return mapping[sceneType]?.[fp.structure] ?? 0.3;
}

function computeContentFitScore(
  sceneType: string,
  segment: NarrativeSegment,
): number {
  const roleFit: Record<string, Record<string, number>> = {
    cover: { setup: 0.8, opening: 0.3 },
    chapterDivider: { setup: 0.6, core: 0.4 },
    keyInsight: { core: 0.8, climax: 0.9, resolution: 0.5 },
    compareContrast: { core: 0.6, climax: 0.7, resolution: 0.5 },
    quote: { climax: 0.8, core: 0.4, resolution: 0.5 },
    framework: { core: 0.9, setup: 0.4 },
    application: { resolution: 0.9, core: 0.5 },
    data: { core: 0.6, climax: 0.5 },
    closing: { closing: 1.0 },
  };
  return roleFit[sceneType]?.[segment.role] ?? 0.2;
}

function computeLayoutScore(sceneType: string, fp: BookFingerprint): number {
  const catalog = getCatalogEntry(sceneType as SceneType);
  if (!catalog) return 0.3;

  const archetype = catalog.layoutArchetype;
  let score = 0.4; // base

  // Boost if spatial metaphors align with layout
  for (const metaphor of fp.spatialMetaphors) {
    if (
      metaphor === "순환" &&
      (archetype === "grid-expand" || archetype === "map-flow")
    ) {
      // grid-expand can't express cycles well — this will be caught by gap detector
      score += 0.1;
    }
    if (metaphor === "상승" && archetype === "top-anchor") score += 0.2;
    if (
      metaphor === "층위" &&
      (archetype === "grid-expand" || archetype === "top-anchor")
    )
      score += 0.15;
    if (metaphor === "흐름" && archetype === "map-flow") score += 0.2;
  }

  return Math.min(1, score);
}

// Per-type customizations
const PRESET_SCORERS: Record<string, PresetScorer> = {
  cover: makeScorer("cover"),
  chapterDivider: makeScorer("chapterDivider"),
  keyInsight: makeScorer("keyInsight"),
  compareContrast: makeScorer("compareContrast", (ctx, base) => {
    // Boost for transformation arc with before/after
    if (ctx.fingerprint.narrativeArcType === "transformation") {
      base.contentFit = Math.min(1, base.contentFit + 0.15);
    }
    return base;
  }),
  quote: makeScorer("quote"),
  framework: makeScorer("framework", (ctx, base) => {
    // Strong boost when structure is framework AND coreFramework exists
    if (
      ctx.fingerprint.structure === "framework" &&
      ctx.fingerprint.coreFramework
    ) {
      base.structure = 0.95;
      base.contentFit = Math.min(1, base.contentFit + 0.1);
    }
    return base;
  }),
  application: makeScorer("application"),
  data: makeScorer("data"),
  closing: makeScorer("closing"),
};

// ---------------------------------------------------------------------------
// Segment → Scene Slot Expansion
// ---------------------------------------------------------------------------

interface SceneSlot {
  segment: NarrativeSegment;
  slotIndex: number;
  intent: string;
}

function expandSegmentToSlots(
  segment: NarrativeSegment,
  fingerprint: BookFingerprint,
  policy: PlanningPolicy,
): SceneSlot[] {
  const slots: SceneSlot[] = [];

  switch (segment.role) {
    case "setup":
      slots.push({ segment, slotIndex: 0, intent: "표지 + 맥락 설정" });
      slots.push({ segment, slotIndex: 1, intent: "저자/배경 소개" });
      break;
    case "core": {
      // One slot per key concept, capped by format policy
      const maxScenes = policy.formatPolicy.sceneCountRange[1];
      const conceptSlots = Math.min(
        fingerprint.keyConceptCount,
        Math.max(3, maxScenes - 5),
      );
      for (let i = 0; i < conceptSlots; i++) {
        slots.push({
          segment,
          slotIndex: i,
          intent: fingerprint.coreFramework
            ? `${fingerprint.coreFramework} 핵심 개념 ${i + 1}/${conceptSlots}`
            : `핵심 개념 ${i + 1}/${conceptSlots}`,
        });
      }
      break;
    }
    case "climax":
      slots.push({ segment, slotIndex: 0, intent: "핵심 인사이트 강조" });
      if (fingerprint.uniqueElements.length > 1) {
        slots.push({ segment, slotIndex: 1, intent: "감정적 클라이맥스" });
      }
      break;
    case "resolution":
      slots.push({ segment, slotIndex: 0, intent: "실생활 적용 방법" });
      if (
        fingerprint.contentMode === "actionable" ||
        fingerprint.contentMode === "mixed"
      ) {
        slots.push({ segment, slotIndex: 1, intent: "실천 단계" });
      }
      break;
    case "closing":
      slots.push({ segment, slotIndex: 0, intent: "요약 및 CTA" });
      break;
    default:
      // opening is skipped before this function is called
      break;
  }

  return slots;
}

// ---------------------------------------------------------------------------
// Draft Content Generation
// ---------------------------------------------------------------------------

function createDraftContent(
  sceneType: SceneType,
  slot: SceneSlot,
  fp: BookFingerprint,
): SceneContent {
  switch (sceneType) {
    case "cover":
      return {
        title: fp.entryAngle.slice(0, 60),
        author: "",
        coverImageUrl: "covers/placeholder.png",
      } as CoverContent;
    case "chapterDivider":
      return {
        chapterNumber: slot.slotIndex + 1,
        chapterTitle: slot.intent.slice(0, 60),
      } as ChapterDividerContent;
    case "keyInsight":
      return {
        headline: slot.intent.slice(0, 60),
        body: "",
        supportText: "",
      } as KeyInsightContent;
    case "compareContrast":
      return {
        leftLabel: "전",
        leftContent: "",
        rightLabel: "후",
        rightContent: "",
      } as CompareContrastContent;
    case "quote":
      return {
        quoteText: "",
        attribution: fp.entryAngle.slice(0, 30),
      } as QuoteContent;
    case "framework":
      return {
        frameworkLabel: fp.coreFramework ?? "",
        items: [],
      } as FrameworkContent;
    case "application":
      return { anchorStatement: slot.intent, steps: [] } as ApplicationContent;
    case "data":
      return {
        dataLabel: slot.intent.slice(0, 40),
        chartType: "bar",
        data: [],
      } as DataContent;
    case "closing":
      return { recapStatement: "핵심 요약", ctaText: "" } as ClosingContent;
    default:
      return {
        headline: slot.intent.slice(0, 60),
        body: "",
      } as KeyInsightContent;
  }
}

// ---------------------------------------------------------------------------
// matchPresets — Public API (Stage 4)
// ---------------------------------------------------------------------------

export function matchPresets(
  narrativePlan: VideoNarrativePlan,
  fingerprint: BookFingerprint,
  _openingPackage: OpeningPackage,
  policy: PlanningPolicy,
): ScenePlan {
  const allMatches: PresetMatch[] = [];

  for (const segment of narrativePlan.segments) {
    // Skip opening — handled by OpeningPackage (Stage 3)
    if (segment.role === "opening") continue;

    const slots = expandSegmentToSlots(segment, fingerprint, policy);

    for (const slot of slots) {
      // Closing always maps to 'closing' preset with confidence 1.0
      if (segment.role === "closing") {
        allMatches.push({
          segment: segment.role,
          slotIndex: slot.slotIndex,
          sceneType: "closing",
          content: createDraftContent("closing", slot, fingerprint),
          confidence: 1.0,
          scoreBreakdown: {
            delivery: 1.0,
            structure: 1.0,
            contentFit: 1.0,
            layout: 1.0,
            explanation: "closing: always maps to closing preset",
          },
        });
        continue;
      }

      // Score all presets for this slot
      const ctx: SlotContext = {
        segment,
        slotIndex: slot.slotIndex,
        fingerprint,
      };
      let bestScore = -1;
      let bestType: SceneType = "keyInsight";
      let bestBreakdown: ScoreBreakdown & { confidence: number } = {
        delivery: 0,
        structure: 0,
        contentFit: 0,
        layout: 0,
        explanation: "",
        confidence: 0,
      };
      const alternatives: SceneType[] = [];

      for (const preset of SCORABLE_PRESETS) {
        if (preset === "closing") continue; // closing is role-specific
        const scorer = PRESET_SCORERS[preset];
        const result = scorer.score(ctx);

        if (result.confidence > bestScore) {
          if (bestScore > 0) alternatives.push(bestType);
          bestScore = result.confidence;
          bestType = preset;
          bestBreakdown = result;
        } else if (result.confidence > bestScore * 0.7) {
          alternatives.push(preset);
        }
      }

      allMatches.push({
        segment: segment.role,
        slotIndex: slot.slotIndex,
        sceneType: bestType,
        content: createDraftContent(bestType, slot, fingerprint),
        confidence: bestBreakdown.confidence,
        scoreBreakdown: {
          delivery: bestBreakdown.delivery,
          structure: bestBreakdown.structure,
          contentFit: bestBreakdown.contentFit,
          layout: bestBreakdown.layout,
          explanation: bestBreakdown.explanation,
        },
        alternativeTypes:
          alternatives.length > 0 ? alternatives.slice(0, 3) : undefined,
      });
    }
  }

  return {
    presetMatches: allMatches,
    gaps: [],
    policy,
    totalSlots: allMatches.length,
  };
}

// ---------------------------------------------------------------------------
// toPresetBlueprint — Handoff to Stage 7+
// ---------------------------------------------------------------------------

function createMediaPlanTemplate(narrationSentinel: string): MediaPlan {
  return {
    narrationText: narrationSentinel,
    captionPlan: {
      mode: "sentence-by-sentence",
      maxCharsPerLine: 28,
      maxLines: 2,
      leadFrames: 3,
      trailFrames: 6,
      transitionStyle: "fade-slide",
    },
    audioPlan: {
      ttsEngine: "edge-tts" as TTSEngineKey,
      voiceKey: "ko-KR-SunHiNeural",
      speed: 1.0,
      pitch: "+0Hz",
    },
    assetPlan: {
      required: [],
      fallbackMode: "text-only",
    },
  };
}

export function toPresetBlueprint(
  match: PresetMatch,
  options: {
    format: "longform" | "shorts";
    theme: Theme;
    from: number;
    durationFrames: number;
  },
): SceneBlueprint {
  const catalog = getCatalogEntry(match.sceneType);

  const elements: VCLElement[] = [
    {
      id: `${match.sceneType}-headline`,
      type: "headline",
      props: { text: "" },
    },
    { id: `${match.sceneType}-body`, type: "body-text", props: { text: "" } },
    {
      id: `${match.sceneType}-texture`,
      type: "texture-overlay",
      props: { opacity: 0.08 },
    },
  ];

  return {
    id: `preset-${match.segment}-${match.slotIndex}-${match.sceneType}`,
    intent: match.scoreBreakdown.explanation,
    origin: "preset",
    layout: (catalog?.layoutArchetype ?? "center-focus") as LayoutType,
    layoutConfig: {},
    elements,
    choreography: "reveal-sequence" as ChoreographyType,
    motionPreset: (catalog?.motionPreset ?? "heavy") as MotionPresetKey,
    format: options.format,
    theme: options.theme,
    from: options.from,
    durationFrames: options.durationFrames,
    mediaPlan: createMediaPlanTemplate(
      `[${match.segment.toUpperCase()}_${match.slotIndex}_NARRATION]`,
    ),
  };
}

// ---------------------------------------------------------------------------
// Zod Schemas
// ---------------------------------------------------------------------------

export const ScoreBreakdownSchema = z.object({
  delivery: z.number().min(0).max(1),
  structure: z.number().min(0).max(1),
  contentFit: z.number().min(0).max(1),
  layout: z.number().min(0).max(1),
  explanation: z.string(),
});

export const PresetMatchSchema = z.object({
  segment: z.enum([
    "opening",
    "setup",
    "core",
    "climax",
    "resolution",
    "closing",
  ]),
  slotIndex: z.number().int().min(0),
  sceneType: z.string().min(1),
  content: z.record(z.string(), z.unknown()),
  confidence: z.number().min(0).max(1),
  scoreBreakdown: ScoreBreakdownSchema,
  alternativeTypes: z.array(z.string()).optional(),
});

export const ScenePlanSchema = z.object({
  presetMatches: z.array(PresetMatchSchema),
  gaps: z.array(
    z.object({
      segment: z.enum([
        "opening",
        "setup",
        "core",
        "climax",
        "resolution",
        "closing",
      ]),
      slotIndex: z.number().int().min(0),
      bestPresetMatch: PresetMatchSchema,
      gapReason: z.string().min(1),
      requiredCapabilities: z.array(z.string()).min(1),
      priority: z.enum(["must", "nice"]),
      intent: z.string().min(1),
    }),
  ),
  policy: z.object({
    presetConfidenceThreshold: z.number(),
    minSignatureScenes: z.number(),
    maxSynthesizedScenes: z.number(),
    openingMustBeDynamic: z.boolean(),
    formatPolicy: z.object({
      format: z.enum(["longform", "shorts"]),
      maxElementsPerScene: z.number(),
      captionDensity: z.enum(["low", "medium", "high"]),
      openingDurationSecRange: z.tuple([z.number(), z.number()]),
      sceneCountRange: z.tuple([z.number(), z.number()]),
    }),
  }),
  totalSlots: z.number().int().min(0),
});
