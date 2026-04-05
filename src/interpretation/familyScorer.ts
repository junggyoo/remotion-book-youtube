import type { ScoredFamily, InterpretationContext } from "./types";
import type { SceneFamily } from "@/direction/types";

// Re-use bootstrap map for typeMatch dimension
const SCENE_FAMILY_MAP: Record<string, SceneFamily> = {
  cover: "opening-hook",
  highlight: "opening-hook",
  keyInsight: "concept-introduction",
  compareContrast: "tension-comparison",
  application: "progression-journey",
  quote: "reflective-anchor",
  chapterDivider: "structural-bridge",
  closing: "closing-synthesis",
  data: "evidence-stack",
  timeline: "progression-journey",
  listReveal: "evidence-stack",
  splitQuote: "reflective-anchor",
  transition: "structural-bridge",
};

// Family capabilities for segmentFit scoring
const FAMILY_CAPABILITIES: Record<SceneFamily, string[]> = {
  "concept-introduction": ["explanation", "insight", "key-point", "concept"],
  "system-model": ["framework", "structure", "model", "system", "step-by-step"],
  "progression-journey": [
    "process",
    "timeline",
    "steps",
    "progression",
    "journey",
  ],
  "tension-comparison": [
    "contrast",
    "comparison",
    "before-after",
    "versus",
    "transformation",
  ],
  "reflective-anchor": ["quote", "reflection", "wisdom", "anchor", "pause"],
  "evidence-stack": [
    "data",
    "evidence",
    "proof",
    "statistics",
    "list",
    "examples",
  ],
  "mechanism-explanation": [
    "mechanism",
    "cycle",
    "loop",
    "flow",
    "cause-effect",
  ],
  "opening-hook": [
    "hook",
    "attention-grab",
    "book-intro",
    "cover",
    "highlight",
  ],
  "structural-bridge": [
    "transition",
    "chapter",
    "bridge",
    "divider",
    "segment-change",
  ],
  "closing-synthesis": ["summary", "recap", "cta", "closing", "takeaway"],
  "transformation-shift": ["shift", "evolution", "growth", "change-over-time"],
};

// ArtDirection layoutBias → family affinity
const LAYOUT_BIAS_FAMILY_BOOST: Record<string, SceneFamily[]> = {
  asymmetric: ["tension-comparison"],
  "grid-heavy": ["system-model", "evidence-stack"],
  flow: ["progression-journey", "mechanism-explanation"],
  centered: ["concept-introduction", "reflective-anchor", "closing-synthesis"],
};

export interface ScorerInput {
  sceneType: string;
  segment?: InterpretationContext["segment"];
  artDirection?: InterpretationContext["artDirection"];
  usedFamilies: SceneFamily[];
  bookStructure?: string;
  content?: Record<string, unknown>;
}

// ─── Dimension functions ────────────────────────────────────────────────────

function calcTypeMatch(
  sceneType: string,
  family: SceneFamily,
  bookStructure?: string,
  content?: Record<string, unknown>,
): number {
  if (sceneType === "framework") {
    // Content-aware: small item count (<=3) with cyclic/loop keywords → mechanism-explanation
    const items = content?.items as unknown[] | undefined;
    const itemCount = items?.length ?? 0;
    const hasCyclicHint =
      content?.frameworkLabel &&
      /루프|사이클|순환|loop|cycle|flow|흐름/i.test(
        String(content.frameworkLabel),
      );

    if (itemCount > 0 && itemCount <= 3 && hasCyclicHint) {
      // Cyclic/loop content → mechanism-explanation preferred
      return family === "mechanism-explanation"
        ? 1.0
        : family === "system-model"
          ? 0.4
          : 0.0;
    }

    // Default: bookStructure-based
    const expected =
      bookStructure === "framework" ? "system-model" : "mechanism-explanation";
    return family === expected ? 1.0 : 0.0;
  }
  return SCENE_FAMILY_MAP[sceneType] === family ? 1.0 : 0.0;
}

function calcSegmentFit(
  segment: InterpretationContext["segment"] | undefined,
  family: SceneFamily,
): number {
  if (!segment) return 0.5;
  const capabilities = FAMILY_CAPABILITIES[family];
  const delivery = segment.requiredDelivery;
  if (delivery.length === 0) return 0.5;
  const overlap = delivery.filter((d) => capabilities.includes(d)).length;
  return Math.min(overlap / delivery.length, 1.0);
}

function calcArtDirectionFit(
  artDirection: InterpretationContext["artDirection"] | undefined,
  family: SceneFamily,
): number {
  if (!artDirection || !artDirection.layoutBias) return 0.5;
  const boosted = LAYOUT_BIAS_FAMILY_BOOST[artDirection.layoutBias];
  if (boosted && boosted.includes(family)) return 0.8;
  return 0.4;
}

function calcVarietyBonus(
  usedFamilies: SceneFamily[],
  family: SceneFamily,
): number {
  const count = usedFamilies.filter((f) => f === family).length;
  if (count === 0) return 1.0;
  if (count === 1) return 0.9;
  if (count === 2) return 0.6;
  return 0.3; // 3+
}

function buildReason(
  family: SceneFamily,
  breakdown: {
    typeMatch: number;
    segmentFit: number;
    artDirectionFit: number;
    varietyBonus: number;
  },
): string {
  const parts: string[] = [];

  if (breakdown.typeMatch === 1.0) {
    parts.push("strong type match");
  }

  if (breakdown.segmentFit >= 0.75) {
    parts.push("high segment fit");
  } else if (breakdown.segmentFit >= 0.5 && breakdown.segmentFit < 0.75) {
    parts.push("moderate segment fit");
  } else if (breakdown.segmentFit < 0.5 && breakdown.segmentFit !== 0.5) {
    parts.push("low segment fit");
  }

  if (breakdown.artDirectionFit === 0.8) {
    parts.push("art direction boost");
  } else if (breakdown.artDirectionFit === 0.4) {
    parts.push("no art direction affinity");
  }

  if (breakdown.varietyBonus === 1.0) {
    parts.push("fresh (unused family)");
  } else if (breakdown.varietyBonus === 0.9) {
    parts.push("acceptable repeat");
  } else if (breakdown.varietyBonus === 0.6) {
    parts.push("soft repeat penalty");
  } else if (breakdown.varietyBonus === 0.3) {
    parts.push("strong repeat penalty");
  }

  return parts.length > 0 ? `${family}: ${parts.join(", ")}` : family;
}

// ─── Public API ─────────────────────────────────────────────────────────────

export function scoreAllFamilies(input: ScorerInput): ScoredFamily[] {
  const allFamilies = Object.keys(FAMILY_CAPABILITIES) as SceneFamily[];

  const scored = allFamilies.map((family) => {
    const typeMatch = calcTypeMatch(
      input.sceneType,
      family,
      input.bookStructure,
      input.content,
    );
    const segmentFit = calcSegmentFit(input.segment, family);
    const artDirectionFit = calcArtDirectionFit(input.artDirection, family);
    const varietyBonus = calcVarietyBonus(input.usedFamilies, family);

    const score =
      typeMatch * 0.3 +
      segmentFit * 0.35 +
      artDirectionFit * 0.2 +
      varietyBonus * 0.15;

    return {
      family,
      score,
      breakdown: { typeMatch, segmentFit, artDirectionFit, varietyBonus },
      reason: buildReason(family, {
        typeMatch,
        segmentFit,
        artDirectionFit,
        varietyBonus,
      }),
    } satisfies ScoredFamily;
  });

  return scored.sort((a, b) => b.score - a.score);
}

export function scoreFamilies(input: ScorerInput): {
  top: ScoredFamily;
  alternatives: ScoredFamily[];
} {
  const all = scoreAllFamilies(input);
  return { top: all[0], alternatives: all.slice(1, 4) };
}
