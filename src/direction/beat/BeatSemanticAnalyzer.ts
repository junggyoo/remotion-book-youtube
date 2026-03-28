/**
 * BeatSemanticAnalyzer — Analyzes Korean narrationText and produces a SemanticPlan.
 * Part of Editorial Motion System Phase 1: semantic beat pipeline.
 *
 * narrationText → BeatSemanticAnalyzer → SemanticPlan → BeatProfileResolver → BeatTimelineCompiler
 */

import type { BeatRole } from "../types";
import {
  splitKoreanSentences,
  gradeBoundary,
  type BoundaryStrength,
} from "./koreanTextUtils";

// ─── Types ──────────────────────────────────────────────────

export interface SemanticUnit {
  text: string;
  sentences: string[];
  boundaryBefore: BoundaryStrength | null;
  inferredRole: BeatRole;
  semanticWeight: number;
  emotionalIntensity: number;
}

export type NarrativePattern =
  | "statement-evidence"
  | "buildup-climax"
  | "contrast-resolve"
  | "question-answer"
  | "uniform";

export interface SemanticPlan {
  units: SemanticUnit[];
  dominantPattern: NarrativePattern;
  overallIntensity: number;
}

// ─── Marker dictionaries ────────────────────────────────────

const EVIDENCE_MARKERS = [
  "연구에 따르면",
  "데이터를 보면",
  "실제로",
  "실험",
  "결과",
  "통계",
];

const CONTRAST_MARKERS = ["하지만", "반면에", "반대로", "다른 관점"];

const ESCALATION_MARKERS = ["더 나아가", "무려", "놀랍게도", "심지어", "더욱"];

const REFLECTION_MARKERS = [
  "결국",
  "핵심은",
  "정리하면",
  "한 마디로",
  "돌이켜보면",
];

const BRIDGE_MARKERS = ["한편", "다음으로", "이제", "그렇다면"];

const EMPHATIC_WORDS = ["무려", "정말", "바로", "놀랍게"];

// ─── Helpers ────────────────────────────────────────────────

function containsMarker(text: string, markers: string[]): boolean {
  return markers.some((m) => text.includes(m));
}

function inferRole(text: string, isFirst: boolean): BeatRole {
  if (containsMarker(text, EVIDENCE_MARKERS)) return "evidence";
  if (containsMarker(text, CONTRAST_MARKERS)) return "contrast";
  if (containsMarker(text, ESCALATION_MARKERS)) return "escalation";
  if (containsMarker(text, REFLECTION_MARKERS)) return "reflection";
  if (containsMarker(text, BRIDGE_MARKERS)) return "bridge";
  if (isFirst) return "anchor";
  return "anchor";
}

function calcEmotionalIntensity(text: string, sentenceCount: number): number {
  if (sentenceCount === 0) return 0;

  const exclamations = (text.match(/!/g) || []).length;
  const questions = (text.match(/\?/g) || []).length;
  const ellipsis = (text.match(/\.{3}|…/g) || []).length;
  let emphatics = 0;
  for (const word of EMPHATIC_WORDS) {
    const re = new RegExp(word, "g");
    emphatics += (text.match(re) || []).length;
  }

  const raw =
    (exclamations + questions * 0.8 + ellipsis * 0.5 + emphatics * 0.3) /
    sentenceCount;
  return Math.min(1, raw);
}

function detectPattern(units: SemanticUnit[]): NarrativePattern {
  const roles = units.map((u) => u.inferredRole);

  // Check in specified priority order
  // 1. question-answer: first unit contains "?"
  if (units.length > 0 && units[0].text.includes("?")) {
    return "question-answer";
  }

  // 2. contrast-resolve: any role is "contrast"
  if (roles.includes("contrast")) {
    return "contrast-resolve";
  }

  // 3. buildup-climax: emotionalIntensity increases monotonically
  if (units.length >= 2) {
    let isMonotonic = true;
    for (let i = 1; i < units.length; i++) {
      if (units[i].emotionalIntensity < units[i - 1].emotionalIntensity) {
        isMonotonic = false;
        break;
      }
    }
    if (isMonotonic) return "buildup-climax";
  }

  // 4. statement-evidence: starts with anchor and contains evidence
  if (roles[0] === "anchor" && roles.includes("evidence")) {
    return "statement-evidence";
  }

  // 5. uniform
  return "uniform";
}

// ─── Core function ──────────────────────────────────────────

export function analyzeNarrationSemantics(narrationText: string): SemanticPlan {
  // Edge case: empty or very short text
  if (!narrationText || narrationText.trim().length < 10) {
    return {
      units: [
        {
          text: narrationText?.trim() || "",
          sentences: [narrationText?.trim() || ""],
          boundaryBefore: null,
          inferredRole: "anchor",
          semanticWeight: 1.0,
          emotionalIntensity: 0.3,
        },
      ],
      dominantPattern: "uniform",
      overallIntensity: 0.3,
    };
  }

  // 1. Split sentences
  const sentences = splitKoreanSentences(narrationText);

  // 2. Grade boundaries between adjacent sentences
  const boundaries: BoundaryStrength[] = [];
  for (let i = 1; i < sentences.length; i++) {
    boundaries.push(gradeBoundary(sentences[i]));
  }

  // 3. Group into semantic units — split at "strong" boundaries
  const groups: string[][] = [];
  let currentGroup: string[] = [sentences[0]];

  for (let i = 1; i < sentences.length; i++) {
    const boundary = boundaries[i - 1];
    if (boundary === "strong") {
      groups.push(currentGroup);
      currentGroup = [sentences[i]];
    } else {
      currentGroup.push(sentences[i]);
    }
  }
  groups.push(currentGroup);

  // Build semantic units
  const totalTextLength = sentences.join("").length;

  // Track boundary for each group
  let boundaryIndex = 0;
  const units: SemanticUnit[] = groups.map((group, groupIdx) => {
    const text = group.join(" ");
    const sentenceCount = group.length;

    // Determine boundaryBefore
    let boundaryBefore: BoundaryStrength | null = null;
    if (groupIdx === 0) {
      boundaryBefore = null;
    } else {
      // Find the strong boundary that caused this split
      // Walk through boundaries to find the strong one for this group
      let strongCount = 0;
      for (let i = 0; i < boundaries.length; i++) {
        if (boundaries[i] === "strong") {
          strongCount++;
          if (strongCount === groupIdx) {
            boundaryBefore = "strong";
            break;
          }
        }
      }
      if (boundaryBefore === null) boundaryBefore = "strong"; // fallback for grouped
    }

    const isFirst = groupIdx === 0;
    const role = inferRole(text, isFirst);
    const weight =
      totalTextLength > 0
        ? text.replace(/\s/g, "").length / totalTextLength
        : 1;
    const intensity = calcEmotionalIntensity(text, sentenceCount);

    return {
      text,
      sentences: group,
      boundaryBefore,
      inferredRole: role,
      semanticWeight: weight,
      emotionalIntensity: intensity,
    };
  });

  // Normalize weights so they sum to 1.0
  const weightSum = units.reduce((s, u) => s + u.semanticWeight, 0);
  if (weightSum > 0) {
    for (const unit of units) {
      unit.semanticWeight = unit.semanticWeight / weightSum;
    }
  }

  // 7. Detect dominant pattern
  const dominantPattern = detectPattern(units);

  // 8. Overall intensity
  const overallIntensity =
    units.length > 0
      ? units.reduce((s, u) => s + u.emotionalIntensity, 0) / units.length
      : 0;

  return {
    units,
    dominantPattern,
    overallIntensity,
  };
}
