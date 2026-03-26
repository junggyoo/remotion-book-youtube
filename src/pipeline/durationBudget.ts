/**
 * Duration Budget Engine — Pre-TTS planning layer.
 *
 * Given a target video duration and scene composition, produces per-scene
 * character budgets so that narration can be authored to the right length
 * BEFORE TTS generation.
 */

// ---------------------------------------------------------------------------
// Types (planning-only — not part of the render pipeline)
// ---------------------------------------------------------------------------

export interface SceneComposition {
  id: string;
  type: string;
  itemCount: number; // framework items, application steps, timeline events, etc.
}

export interface SceneBudget {
  sceneId: string;
  type: string;
  targetSeconds: number;
  minChars: number;
  recommendedChars: number;
  maxChars: number;
}

export interface SceneBudgetPlan {
  targetDurationSeconds: number;
  koreanCPS: number;
  estimatedNarrationChars: number;
  scenes: SceneBudget[];
  totalMinChars: number;
  totalRecommendedChars: number;
  totalMaxChars: number;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/**
 * Korean characters per second for edge-tts ko-KR-SunHiNeural at speed 1.
 * Calibrated from actual TTS output: 981 chars / 171.9s ≈ 5.7 CPS.
 */
const KOREAN_CPS_DEFAULT = 5.7;

/** Per-scene type minimum character formulas: base + perItem × itemCount */
const CHAR_FORMULAS: Record<string, { base: number; perItem: number }> = {
  framework: { base: 40, perItem: 45 },
  application: { base: 50, perItem: 55 },
  keyInsight: { base: 80, perItem: 0 },
  compareContrast: { base: 120, perItem: 0 },
  quote: { base: 60, perItem: 0 },
  cover: { base: 40, perItem: 0 },
  closing: { base: 40, perItem: 0 },
  highlight: { base: 60, perItem: 0 },
  chapterDivider: { base: 20, perItem: 0 },
  data: { base: 80, perItem: 0 },
  timeline: { base: 40, perItem: 35 },
  listReveal: { base: 40, perItem: 30 },
  transition: { base: 15, perItem: 0 },
  splitQuote: { base: 80, perItem: 0 },
};

/**
 * Scene segment classification for time budget allocation.
 * Ratios are midpoints of the allowed ranges from the spec.
 */
const SEGMENT_RATIOS: Record<string, number> = {
  opening: 0.12,
  core: 0.73,
  divider: 0.04,
  closing: 0.07,
};

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Compute the minimum narration character count for a scene type.
 */
export function getMinChars(type: string, itemCount: number): number {
  const formula = CHAR_FORMULAS[type];
  if (!formula) return 40; // safe fallback
  return formula.base + formula.perItem * itemCount;
}

/**
 * Extract SceneComposition from raw content JSON scenes.
 */
export function extractSceneComposition(scenes: any[]): SceneComposition[] {
  return scenes.map((s) => ({
    id: s.id,
    type: s.type,
    itemCount:
      s.content?.items?.length ??
      s.content?.steps?.length ??
      s.content?.events?.length ??
      0,
  }));
}

/**
 * Calculate a full duration budget plan.
 *
 * @param targetDurationSeconds - desired total video length
 * @param scenes - scene composition (id, type, itemCount)
 * @param options.cps - override Korean chars-per-second (default: 11.4)
 * @param options.ttsSpeed - TTS speed multiplier (default: 1). CPS scales proportionally.
 */
export function calculateBudget(
  targetDurationSeconds: number,
  scenes: SceneComposition[],
  options?: { cps?: number; ttsSpeed?: number },
): SceneBudgetPlan {
  const ttsSpeed = options?.ttsSpeed ?? 1;
  const koreanCPS = (options?.cps ?? KOREAN_CPS_DEFAULT) * ttsSpeed;
  const estimatedNarrationChars = Math.round(targetDurationSeconds * koreanCPS);

  // --- Classify scenes into segments ---
  const classified = classifyScenes(scenes);
  const dividerCount = classified.filter((c) => c.segment === "divider").length;

  // Proportional allocation
  const segmentTotals = {
    opening: SEGMENT_RATIOS.opening,
    core: 0, // computed as remainder
    divider: SEGMENT_RATIOS.divider,
    closing: SEGMENT_RATIOS.closing,
  };

  // Count scenes per segment
  const segmentCounts: Record<string, number> = {
    opening: 0,
    core: 0,
    divider: 0,
    closing: 0,
  };
  for (const c of classified) segmentCounts[c.segment]++;

  // Total ratio used by fixed segments
  const fixedRatio =
    segmentCounts.opening * segmentTotals.opening +
    segmentCounts.divider * segmentTotals.divider +
    segmentCounts.closing * segmentTotals.closing;

  const coreRatio = Math.max(0, 1 - fixedRatio);
  const corePerScene =
    segmentCounts.core > 0 ? coreRatio / segmentCounts.core : 0;

  // --- Build per-scene budgets ---
  const sceneBudgets: SceneBudget[] = classified.map((c) => {
    let ratio: number;
    switch (c.segment) {
      case "opening":
        ratio = segmentTotals.opening;
        break;
      case "closing":
        ratio = segmentTotals.closing;
        break;
      case "divider":
        ratio = segmentTotals.divider;
        break;
      default:
        ratio = corePerScene;
    }

    const targetSeconds = Math.round(targetDurationSeconds * ratio * 10) / 10;
    const minChars = getMinChars(c.scene.type, c.scene.itemCount);
    const recommendedChars = Math.round(minChars * 1.3);
    const maxChars = Math.round(minChars * 2.0);

    return {
      sceneId: c.scene.id,
      type: c.scene.type,
      targetSeconds,
      minChars,
      recommendedChars,
      maxChars,
    };
  });

  return {
    targetDurationSeconds,
    koreanCPS,
    estimatedNarrationChars,
    scenes: sceneBudgets,
    totalMinChars: sceneBudgets.reduce((s, b) => s + b.minChars, 0),
    totalRecommendedChars: sceneBudgets.reduce(
      (s, b) => s + b.recommendedChars,
      0,
    ),
    totalMaxChars: sceneBudgets.reduce((s, b) => s + b.maxChars, 0),
  };
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

interface ClassifiedScene {
  scene: SceneComposition;
  segment: "opening" | "core" | "divider" | "closing";
}

function classifyScenes(scenes: SceneComposition[]): ClassifiedScene[] {
  return scenes.map((scene, idx) => {
    // Last scene = closing (if type is closing)
    if (idx === scenes.length - 1 && scene.type === "closing") {
      return { scene, segment: "closing" as const };
    }
    // Chapter dividers
    if (scene.type === "chapterDivider" || scene.type === "transition") {
      return { scene, segment: "divider" as const };
    }
    // First 1-2 scenes (cover, hook/highlight) = opening
    if (idx <= 1 && (scene.type === "cover" || scene.type === "highlight")) {
      return { scene, segment: "opening" as const };
    }
    // Everything else = core
    return { scene, segment: "core" as const };
  });
}
