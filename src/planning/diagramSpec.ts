/**
 * DiagramSpec mapping — converts visual metaphor strings to structured diagram specifications.
 * P1-5: Prerequisite for P2-1 (AnimatedPath, NodeActivation, ZoomFocus).
 *
 * Strategy: regex pattern registry with keyword fallback.
 * Unmatched metaphors return null (placeholder stays).
 */

import type {
  DiagramSpec,
  DiagramType,
  ConnectionPattern,
  AnimationHint,
  DiagramLayoutHint,
} from "@/types";
import type { BookArtDirection } from "./types";

// ---------------------------------------------------------------------------
// Pattern Registry
// ---------------------------------------------------------------------------

interface DiagramPattern {
  regex: RegExp;
  keywords: string[];
  spec: Omit<DiagramSpec, "sourceMetaphor">;
}

const DIAGRAM_PATTERNS: DiagramPattern[] = [
  {
    regex: /circular.*cycle|cycle.*circular|feedback.*loop|loop.*feedback/i,
    keywords: ["cycle", "loop", "wheel", "rotating"],
    spec: {
      diagramType: "cycle",
      connectionPattern: "cyclic",
      animationHint: "path-draw",
      layoutHint: "circular",
    },
  },
  {
    regex: /exponential.*curve|growth.*curve|compound.*growth/i,
    keywords: ["exponential", "curve", "growth"],
    spec: {
      diagramType: "flow",
      connectionPattern: "linear",
      animationHint: "fill-progress",
      layoutHint: "horizontal-split",
    },
  },
  {
    regex: /iceberg|layered.*depth|hidden.*beneath/i,
    keywords: ["iceberg", "beneath", "layers"],
    spec: {
      diagramType: "split",
      connectionPattern: "layered",
      animationHint: "node-activate",
      layoutHint: "vertical-stack",
    },
  },
  {
    regex: /side.by.side|contrasting.*panel|split.*comparison/i,
    keywords: ["side-by-side", "contrasting", "panels"],
    spec: {
      diagramType: "split",
      connectionPattern: "linear",
      animationHint: "split-reveal",
      layoutHint: "horizontal-split",
    },
  },
];

// ---------------------------------------------------------------------------
// Mapping Functions
// ---------------------------------------------------------------------------

/**
 * Maps a single visual metaphor string to a DiagramSpec.
 * Returns null if no pattern matches (metaphor is not diagram-like).
 *
 * Matching strategy:
 * 1. Try regex patterns (first match wins)
 * 2. Fallback: check if metaphor contains any keywords
 */
export function metaphorToDiagramSpec(metaphor: string): DiagramSpec | null {
  if (!metaphor) return null;

  const lower = metaphor.toLowerCase();

  // Phase 1: regex match
  for (const pattern of DIAGRAM_PATTERNS) {
    if (pattern.regex.test(metaphor)) {
      return { ...pattern.spec, sourceMetaphor: metaphor };
    }
  }

  // Phase 2: keyword fallback
  for (const pattern of DIAGRAM_PATTERNS) {
    const matched = pattern.keywords.some((kw) => lower.includes(kw));
    if (matched) {
      return { ...pattern.spec, sourceMetaphor: metaphor };
    }
  }

  return null;
}

export interface DiagramSpecMatch {
  metaphorConcept: string;
  spec: DiagramSpec;
}

/**
 * Batch-converts all visualMetaphors from a BookArtDirection into DiagramSpecs.
 * Returns only the matched entries (non-diagram metaphors are excluded).
 */
export function extractDiagramSpecs(
  artDirection: BookArtDirection,
): DiagramSpecMatch[] {
  const results: DiagramSpecMatch[] = [];

  for (const vm of artDirection.visualMetaphors) {
    const spec = metaphorToDiagramSpec(vm.metaphor);
    if (spec) {
      results.push({ metaphorConcept: vm.concept, spec });
    }
  }

  return results;
}
