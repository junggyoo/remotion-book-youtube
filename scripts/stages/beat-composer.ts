/**
 * BeatComposer stage runner — auto-generates beats arrays for each scene.
 *
 * Applies beat-patterns.md rules per scene type:
 * - keyInsight: 2-beat or 3-beat (evidence rubric)
 * - framework/application: N+1 sequential reveal
 * - compareContrast: 3-beat
 * - quote: 2-beat
 * - cover/highlight/chapterDivider/closing: 1-2 beat by duration
 *
 * Deterministic baseline — the beat-compose skill provides editorial refinement.
 */

import "tsconfig-paths/register";
import { readFileSync } from "fs";
import path from "path";
import type {
  Beat,
  BeatRole,
  BeatDesignRationale,
  BeatPlanEntry,
  BeatPlanArtifact,
  BookContent,
  SceneType,
} from "../../src/types";
import type {
  DsgsStage,
  DsgsContext,
  DsgsStageResult,
} from "../dsgs-orchestrate";
import { savePlanArtifact } from "../../src/planning/loaders/save-book-plan";

// ============================================================
// Korean Text Utilities
// ============================================================

/** Split Korean text into sentences by sentence-ending markers. */
function splitKoreanSentences(text: string): string[] {
  // Split on Korean sentence enders followed by space or end
  const raw = text
    .split(/(?<=[.?!다요죠니까세요습니다])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  return raw.length > 0 ? raw : [text];
}

/** Boundary strength between two adjacent sentences. */
type BoundaryStrength = "strong" | "medium" | "weak";

const STRONG_MARKERS = [
  "그런데",
  "하지만",
  "반면에",
  "한편",
  "실제로",
  "연구에 따르면",
  "흥미로운 건",
  "데이터를 보면",
  "결국",
  "핵심은",
  "정리하면",
  "한 마디로",
  "그 후",
  "몇 년 뒤",
  "지금은",
  "당신은",
  "여러분은",
];

const MEDIUM_MARKERS = [
  "예를 들어",
  "구체적으로",
  "실제 사례로",
  "특히",
  "무엇보다",
  "가장 중요한 건",
  "반대로",
  "다른 관점에서",
];

function gradeBoundary(nextSentence: string): BoundaryStrength {
  const trimmed = nextSentence.trimStart();
  for (const marker of STRONG_MARKERS) {
    if (trimmed.startsWith(marker)) return "strong";
  }
  for (const marker of MEDIUM_MARKERS) {
    if (trimmed.startsWith(marker)) return "medium";
  }
  return "weak";
}

/** Extract emphasis targets from Korean text: numbers, English terms, quoted strings. */
function extractEmphasisTargets(text: string, maxCount = 3): string[] {
  const targets: string[] = [];

  // Priority 1: Numbers/percentages with Korean unit suffixes
  const numbers = text.match(
    /\d+[\d,.]*(?:%|배|개|가지|초|분|시간|년|권|부|만|억|천)?/g,
  );
  if (numbers)
    targets.push(...numbers.filter((n) => n.length >= 2 || /\d{2,}/.test(n)));

  // Priority 1: English terms (proper nouns, technical terms)
  const english = text.match(/[A-Z][a-zA-Z]{2,}/g);
  if (english) targets.push(...english);

  // Priority 2: Quoted terms (Korean quotation marks)
  const quoted = text.match(/[''""「」『』]([^''""「」『』]+)[''""「」『』]/g);
  if (quoted) {
    targets.push(
      ...quoted
        .map((q) => q.replace(/[''""「」『』]/g, ""))
        .filter((q) => q.length > 1),
    );
  }

  // Deduplicate and limit
  return Array.from(new Set(targets)).slice(0, maxCount);
}

// ============================================================
// Evidence Rubric Check
// ============================================================

type EvidenceGrade = "A" | "B" | "C";

function gradeEvidence(
  evidenceCard: Record<string, unknown> | undefined,
): EvidenceGrade {
  if (!evidenceCard) return "C";

  const value = String(evidenceCard.value ?? "");
  const source = String(evidenceCard.source ?? "");

  // A: specific number + academic/institutional source
  const hasNumber = /\d+/.test(value);
  const hasSource = source.length > 0;

  if (hasNumber && hasSource) return "A";
  if (hasNumber || hasSource || value.length > 10) return "B";
  return "C";
}

// ============================================================
// Beat Generation Per Scene Type
// ============================================================

interface SceneData {
  id: string;
  type: string;
  narrationText?: string;
  content?: Record<string, unknown>;
  beats?: Beat[];
  durationFrames?: number;
}

function generateBeatsForScene(
  scene: SceneData,
  fps: number,
): { beats: Beat[]; rationale: BeatDesignRationale } {
  const type = scene.type as SceneType;
  const narration = scene.narrationText ?? "";
  const content = (scene.content ?? {}) as Record<string, unknown>;

  switch (type) {
    case "keyInsight":
      return generateKeyInsightBeats(scene.id, narration, content);
    case "framework":
      return generateFrameworkBeats(scene.id, narration, content);
    case "application":
      return generateApplicationBeats(scene.id, narration, content);
    case "compareContrast":
      return generateCompareContrastBeats(scene.id, narration, content);
    case "quote":
      return generateQuoteBeats(scene.id, narration, content);
    case "cover":
      return generateCoverBeats(scene.id, narration, content);
    case "closing":
      return generateClosingBeats(scene.id, narration, content);
    case "chapterDivider":
      return generateChapterDividerBeats(scene.id, narration, content);
    case "highlight":
      return generateHighlightBeats(scene.id, narration, content);
    default:
      return generateDefaultBeats(scene.id, narration, type);
  }
}

// --- keyInsight: 2-beat or 3-beat ---

function generateKeyInsightBeats(
  sceneId: string,
  narration: string,
  content: Record<string, unknown>,
): { beats: Beat[]; rationale: BeatDesignRationale } {
  const evidenceCard = content.evidenceCard as
    | Record<string, unknown>
    | undefined;
  const grade = gradeEvidence(evidenceCard);
  const use3Beat = grade === "A" || grade === "B";

  const sentences = splitKoreanSentences(narration);
  const totalChars = narration.length;

  if (use3Beat && sentences.length >= 2) {
    // 3-beat: headline → support → evidence
    const groups = groupSentencesIntoBeatCount(sentences, 3);
    const ratios = charRatios(groups);
    // Clamp to beat-patterns.md ranges
    const r = clampRatios(ratios, [
      [0.25, 0.4],
      [0.25, 0.35],
      [0.25, 0.35],
    ]);

    return {
      beats: [
        makeBeat(
          sceneId,
          1,
          "headline",
          0,
          r[0],
          groups[0],
          ["signalBar", "headline"],
          "enter",
        ),
        makeBeat(
          sceneId,
          2,
          "support",
          r[0],
          r[0] + r[1],
          groups[1],
          ["supportText"],
          "enter",
        ),
        makeBeat(
          sceneId,
          3,
          "evidence",
          r[0] + r[1],
          1.0,
          groups[2],
          evidenceCard ? ["evidenceCard"] : ["supportText"],
          evidenceCard ? "replace" : "enter",
          evidenceCard ? ["supportText"] : undefined,
        ),
      ],
      rationale: {
        segmentationReason: `keyInsight 3-beat. ${sentences.length}개 문장을 강한 경계 기준 3그룹 분절.`,
        evidenceDecision: evidenceCard
          ? (`included-${grade}` as "included-A" | "included-B")
          : "not-applicable",
        densityDecision: `beat당 평균 ${(3 / 3).toFixed(1)}개 시각 사건. 적정.`,
        riskFlags: totalChars < 80 ? ["짧은 나레이션 — beat 밀도 주의"] : [],
      },
    };
  }

  // 2-beat: headline → support
  const groups = groupSentencesIntoBeatCount(sentences, 2);
  const ratios = charRatios(groups);
  const r = clampRatios(ratios, [
    [0.4, 0.55],
    [0.45, 0.6],
  ]);

  return {
    beats: [
      makeBeat(
        sceneId,
        1,
        "headline",
        0,
        r[0],
        groups[0],
        ["signalBar", "headline"],
        "enter",
      ),
      makeBeat(
        sceneId,
        2,
        "support",
        r[0],
        1.0,
        groups[1],
        ["supportText"],
        "enter",
      ),
    ],
    rationale: {
      segmentationReason: `keyInsight 2-beat. evidence ${grade}등급 → evidenceCard 미사용.`,
      evidenceDecision: grade === "C" ? "excluded-C" : "not-applicable",
      densityDecision: `beat당 평균 1.0개 시각 사건. 적정.`,
      riskFlags: [],
    },
  };
}

// --- framework: N+1 sequential reveal ---

function generateFrameworkBeats(
  sceneId: string,
  narration: string,
  content: Record<string, unknown>,
): { beats: Beat[]; rationale: BeatDesignRationale } {
  const items = (content.items as unknown[]) ?? [];
  const itemCount = items.length;
  const beatCount = itemCount + 1; // headline + N reveals

  const sentences = splitKoreanSentences(narration);
  const groups = groupSentencesIntoBeatCount(sentences, beatCount);

  // headline gets 15-25%, rest split equally
  const headlineRatio = Math.max(0.15, Math.min(0.25, 1 / beatCount));
  const remainRatio = 1 - headlineRatio;
  const itemRatio = remainRatio / itemCount;

  const beats: Beat[] = [
    makeBeat(
      sceneId,
      1,
      "headline",
      0,
      headlineRatio,
      groups[0],
      ["frameworkLabel"],
      "enter",
    ),
  ];

  let cursor = headlineRatio;
  for (let i = 0; i < itemCount; i++) {
    const end = i === itemCount - 1 ? 1.0 : round(cursor + itemRatio);
    beats.push(
      makeBeat(
        sceneId,
        i + 2,
        "reveal",
        round(cursor),
        end,
        groups[i + 1] ?? "",
        [`item-${i}`],
        "enter",
      ),
    );
    cursor = end;
  }

  return {
    beats,
    rationale: {
      segmentationReason: `framework N+1(${beatCount}) beat. ${itemCount}개 항목 순차 reveal.`,
      evidenceDecision: "not-applicable",
      densityDecision: `beat당 1개 시각 사건(항목 등장). 적정.`,
      riskFlags:
        beatCount > 6
          ? [`${beatCount} beat로 많지만 framework 순차 reveal 패턴이므로 허용`]
          : [],
    },
  };
}

// --- application: N+1 sequential reveal ---

function generateApplicationBeats(
  sceneId: string,
  narration: string,
  content: Record<string, unknown>,
): { beats: Beat[]; rationale: BeatDesignRationale } {
  const steps = (content.steps as unknown[]) ?? [];
  const stepCount = steps.length;
  const beatCount = stepCount + 1;

  const sentences = splitKoreanSentences(narration);
  const groups = groupSentencesIntoBeatCount(sentences, beatCount);

  const headlineRatio = Math.max(0.12, Math.min(0.2, 1 / beatCount));
  const remainRatio = 1 - headlineRatio;
  const stepRatio = remainRatio / stepCount;

  const beats: Beat[] = [
    makeBeat(
      sceneId,
      1,
      "headline",
      0,
      headlineRatio,
      groups[0],
      ["anchorStatement"],
      "enter",
    ),
  ];

  let cursor = headlineRatio;
  for (let i = 0; i < stepCount; i++) {
    const end = i === stepCount - 1 ? 1.0 : round(cursor + stepRatio);
    beats.push(
      makeBeat(
        sceneId,
        i + 2,
        "reveal",
        round(cursor),
        end,
        groups[i + 1] ?? "",
        [`step-${i}`],
        "enter",
      ),
    );
    cursor = end;
  }

  return {
    beats,
    rationale: {
      segmentationReason: `application N+1(${beatCount}) beat. ${stepCount}개 step 순차 reveal.`,
      evidenceDecision: "not-applicable",
      densityDecision: `beat당 1개 시각 사건(step 등장). 적정.`,
      riskFlags: [],
    },
  };
}

// --- compareContrast: 3-beat ---

function generateCompareContrastBeats(
  sceneId: string,
  narration: string,
  _content: Record<string, unknown>,
): { beats: Beat[]; rationale: BeatDesignRationale } {
  const sentences = splitKoreanSentences(narration);
  const groups = groupSentencesIntoBeatCount(sentences, 3);
  const ratios = charRatios(groups);
  const r = clampRatios(ratios, [
    [0.3, 0.4],
    [0.3, 0.4],
    [0.2, 0.3],
  ]);

  return {
    beats: [
      makeBeat(
        sceneId,
        1,
        "hook",
        0,
        r[0],
        groups[0],
        ["leftLabel", "leftContent"],
        "enter",
      ),
      makeBeat(
        sceneId,
        2,
        "compare",
        r[0],
        r[0] + r[1],
        groups[1],
        ["rightLabel", "rightContent"],
        "enter",
      ),
      makeBeat(
        sceneId,
        3,
        "recap",
        r[0] + r[1],
        1.0,
        groups[2],
        ["connector"],
        "replace",
        ["leftContent"],
      ),
    ],
    rationale: {
      segmentationReason: `compareContrast 3-beat. 좌측→우측→결론 구조 분절.`,
      evidenceDecision: "not-applicable",
      densityDecision: `beat당 평균 1.7개 시각 사건. 적정 범위.`,
      riskFlags: [],
    },
  };
}

// --- quote: 2-beat ---

function generateQuoteBeats(
  sceneId: string,
  narration: string,
  _content: Record<string, unknown>,
): { beats: Beat[]; rationale: BeatDesignRationale } {
  const sentences = splitKoreanSentences(narration);
  const groups = groupSentencesIntoBeatCount(sentences, 2);
  const ratios = charRatios(groups);
  const r = clampRatios(ratios, [
    [0.65, 0.75],
    [0.25, 0.35],
  ]);

  return {
    beats: [
      makeBeat(
        sceneId,
        1,
        "headline",
        0,
        r[0],
        groups[0],
        ["quoteText"],
        "enter",
      ),
      makeBeat(
        sceneId,
        2,
        "support",
        r[0],
        1.0,
        groups[1],
        ["attribution"],
        "enter",
      ),
    ],
    rationale: {
      segmentationReason: `quote 2-beat 기본 패턴. 인용문(${Math.round(r[0] * 100)}%) + 저자(${Math.round((1 - r[0]) * 100)}%).`,
      evidenceDecision: "not-applicable",
      densityDecision: `beat당 1개 시각 사건. 적정.`,
      riskFlags: [],
    },
  };
}

// --- cover: 2-beat ---

function generateCoverBeats(
  sceneId: string,
  narration: string,
  _content: Record<string, unknown>,
): { beats: Beat[]; rationale: BeatDesignRationale } {
  const sentences = splitKoreanSentences(narration);
  const groups = groupSentencesIntoBeatCount(sentences, 2);

  return {
    beats: [
      makeBeat(
        sceneId,
        1,
        "headline",
        0,
        0.55,
        groups[0],
        ["title", "subtitle", "author"],
        "enter",
      ),
      makeBeat(
        sceneId,
        2,
        "support",
        0.55,
        1.0,
        groups[1],
        ["brandLabel"],
        "enter",
      ),
    ],
    rationale: {
      segmentationReason: `cover 2-beat. 타이틀(55%) + 브랜드(45%).`,
      evidenceDecision: "not-applicable",
      densityDecision: `beat-1에 3개 요소 동시 등장(cover 예외). beat-2는 1개.`,
      riskFlags: [],
    },
  };
}

// --- closing: 2-beat ---

function generateClosingBeats(
  sceneId: string,
  narration: string,
  _content: Record<string, unknown>,
): { beats: Beat[]; rationale: BeatDesignRationale } {
  const sentences = splitKoreanSentences(narration);
  const groups = groupSentencesIntoBeatCount(sentences, 2);

  return {
    beats: [
      makeBeat(
        sceneId,
        1,
        "headline",
        0,
        0.55,
        groups[0],
        ["recapStatement"],
        "enter",
      ),
      makeBeat(
        sceneId,
        2,
        "transition",
        0.55,
        1.0,
        groups[1],
        ["ctaText"],
        "enter",
      ),
    ],
    rationale: {
      segmentationReason: `closing 2-beat. 요약(55%) + CTA(45%).`,
      evidenceDecision: "not-applicable",
      densityDecision: `beat당 1개 시각 사건. 적정.`,
      riskFlags: [],
    },
  };
}

// --- chapterDivider: 1-beat ---

function generateChapterDividerBeats(
  sceneId: string,
  narration: string,
  _content: Record<string, unknown>,
): { beats: Beat[]; rationale: BeatDesignRationale } {
  return {
    beats: [
      makeBeat(
        sceneId,
        1,
        "headline",
        0,
        1.0,
        narration,
        ["chapterNumber", "chapterTitle", "chapterSubtitle"],
        "enter",
      ),
    ],
    rationale: {
      segmentationReason: `chapterDivider 단일 beat. 전체 나레이션을 한 beat로.`,
      evidenceDecision: "not-applicable",
      densityDecision: `1 beat, 3개 요소 동시. chapterDivider 허용.`,
      riskFlags: [],
    },
  };
}

// --- highlight: 2-3 beat ---

function generateHighlightBeats(
  sceneId: string,
  narration: string,
  content: Record<string, unknown>,
): { beats: Beat[]; rationale: BeatDesignRationale } {
  const sentences = splitKoreanSentences(narration);
  const hasSub = Boolean(content.subText);

  if (sentences.length >= 3 || narration.length > 120) {
    // 3-beat
    const groups = groupSentencesIntoBeatCount(sentences, 3);
    const ratios = charRatios(groups);
    const r = clampRatios(ratios, [
      [0.25, 0.4],
      [0.3, 0.4],
      [0.25, 0.35],
    ]);

    return {
      beats: [
        makeBeat(sceneId, 1, "hook", 0, r[0], groups[0], ["mainText"], "enter"),
        makeBeat(
          sceneId,
          2,
          "evidence",
          r[0],
          r[0] + r[1],
          groups[1],
          hasSub ? ["subText"] : ["mainText"],
          "enter",
        ),
        makeBeat(
          sceneId,
          3,
          "recap",
          r[0] + r[1],
          1.0,
          groups[2],
          ["mainText"],
          "emphasis",
        ),
      ],
      rationale: {
        segmentationReason: `highlight 3-beat. ${sentences.length}개 문장, ${narration.length}자.`,
        evidenceDecision: "not-applicable",
        densityDecision: `beat당 1개 시각 사건.`,
        riskFlags: [],
      },
    };
  }

  // 2-beat
  const groups = groupSentencesIntoBeatCount(sentences, 2);

  return {
    beats: [
      makeBeat(sceneId, 1, "hook", 0, 0.45, groups[0], ["mainText"], "enter"),
      makeBeat(
        sceneId,
        2,
        "support",
        0.45,
        1.0,
        groups[1],
        hasSub ? ["subText"] : ["mainText"],
        "enter",
      ),
    ],
    rationale: {
      segmentationReason: `highlight 2-beat. 짧은 나레이션.`,
      evidenceDecision: "not-applicable",
      densityDecision: `beat당 1개 시각 사건.`,
      riskFlags: [],
    },
  };
}

// --- default fallback ---

function generateDefaultBeats(
  sceneId: string,
  narration: string,
  type: string,
): { beats: Beat[]; rationale: BeatDesignRationale } {
  if (!narration || narration.length < 20) {
    return {
      beats: [
        makeBeat(sceneId, 1, "headline", 0, 1.0, narration, ["*"], "enter"),
      ],
      rationale: {
        segmentationReason: `${type} 단일 beat fallback. 나레이션 짧음 또는 없음.`,
        evidenceDecision: "not-applicable",
        densityDecision: `wildcard(*) 활성화.`,
        riskFlags: [`알 수 없는 씬 타입 ${type} — 기본 패턴 적용`],
      },
    };
  }

  // 2-beat for anything else with narration
  const sentences = splitKoreanSentences(narration);
  const groups = groupSentencesIntoBeatCount(sentences, 2);

  return {
    beats: [
      makeBeat(sceneId, 1, "headline", 0, 0.5, groups[0], ["*"], "enter"),
      makeBeat(sceneId, 2, "support", 0.5, 1.0, groups[1], ["*"], "enter"),
    ],
    rationale: {
      segmentationReason: `${type} 기본 2-beat. 나레이션 반분.`,
      evidenceDecision: "not-applicable",
      densityDecision: `wildcard(*) 활성화.`,
      riskFlags: [`씬 타입 ${type}에 전용 패턴 미정의`],
    },
  };
}

// ============================================================
// Utility Functions
// ============================================================

function makeBeat(
  sceneId: string,
  index: number,
  role: BeatRole,
  startRatio: number,
  endRatio: number,
  narrationText: string,
  activates: string[],
  transition: "enter" | "replace" | "emphasis" = "enter",
  deactivates?: string[],
): Beat {
  const beat: Beat = {
    id: `${sceneId}-b${index}`,
    role,
    startRatio: round(startRatio),
    endRatio: round(endRatio),
    activates,
    transition,
  };

  if (narrationText && narrationText.length > 0) {
    beat.narrationText = narrationText;
    beat.emphasisTargets = extractEmphasisTargets(narrationText);
  }

  if (deactivates && deactivates.length > 0) {
    beat.deactivates = deactivates;
  }

  return beat;
}

/** Group sentences into N beat groups using boundary grading. */
function groupSentencesIntoBeatCount(
  sentences: string[],
  beatCount: number,
): string[] {
  if (sentences.length <= beatCount) {
    // Pad with empty strings if fewer sentences than beats
    const result = sentences.map((s) => s);
    while (result.length < beatCount) result.push("");
    return result;
  }

  // Find boundary strengths between sentences
  const boundaries: { index: number; strength: BoundaryStrength }[] = [];
  for (let i = 1; i < sentences.length; i++) {
    boundaries.push({ index: i, strength: gradeBoundary(sentences[i]) });
  }

  // Sort boundaries by strength (strong > medium > weak), then by position
  const strengthOrder: Record<BoundaryStrength, number> = {
    strong: 0,
    medium: 1,
    weak: 2,
  };
  boundaries.sort(
    (a, b) =>
      strengthOrder[a.strength] - strengthOrder[b.strength] ||
      a.index - b.index,
  );

  // Select top (beatCount - 1) split points
  const splitPoints = boundaries
    .slice(0, beatCount - 1)
    .map((b) => b.index)
    .sort((a, b) => a - b);

  // Group sentences
  const groups: string[] = [];
  let start = 0;
  for (const split of splitPoints) {
    groups.push(sentences.slice(start, split).join(" "));
    start = split;
  }
  groups.push(sentences.slice(start).join(" "));

  return groups;
}

/** Calculate character-count-proportional ratios for groups. */
function charRatios(groups: string[]): number[] {
  const total = groups.reduce((sum, g) => sum + Math.max(g.length, 1), 0);
  return groups.map((g) => Math.max(g.length, 1) / total);
}

/** Clamp ratios to min/max ranges while keeping sum = 1. */
function clampRatios(ratios: number[], ranges: [number, number][]): number[] {
  const clamped = ratios.map((r, i) =>
    Math.max(ranges[i][0], Math.min(ranges[i][1], r)),
  );

  // Normalize to sum = 1
  const sum = clamped.reduce((a, b) => a + b, 0);
  return clamped.map((c) => round(c / sum));
}

function round(n: number): number {
  return Math.round(n * 100) / 100;
}

// ============================================================
// Quality Self-Validation
// ============================================================

interface ValidationResult {
  passed: boolean;
  errors: string[];
  warnings: string[];
}

function validateBeats(
  beats: Beat[],
  originalNarration: string,
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // 1. Minimum beat duration: endRatio - startRatio >= 0.12
  for (const beat of beats) {
    const duration = beat.endRatio - beat.startRatio;
    if (duration < 0.11) {
      // 0.11 to account for rounding
      errors.push(
        `Beat ${beat.id}: duration ${duration.toFixed(2)} < 0.12 minimum`,
      );
    }
  }

  // 2. No overlap check: beats sequential
  for (let i = 1; i < beats.length; i++) {
    if (beats[i].startRatio < beats[i - 1].endRatio - 0.01) {
      errors.push(
        `Beat ${beats[i].id} overlaps with ${beats[i - 1].id}: start ${beats[i].startRatio} < prev end ${beats[i - 1].endRatio}`,
      );
    }
  }

  // 3. Narration continuity (concatenated beat narrations ≈ original)
  if (originalNarration) {
    const beatNarration = beats
      .map((b) => b.narrationText ?? "")
      .filter((t) => t.length > 0)
      .join(" ");
    const originalClean = originalNarration.replace(/\s+/g, " ").trim();
    const beatClean = beatNarration.replace(/\s+/g, " ").trim();
    // Check character count within ±20% tolerance
    const ratio = beatClean.length / Math.max(originalClean.length, 1);
    if (ratio < 0.8 || ratio > 1.2) {
      warnings.push(
        `Narration continuity: beat합산 ${beatClean.length}자 vs 원본 ${originalClean.length}자 (ratio: ${ratio.toFixed(2)})`,
      );
    }
  }

  // 4. emphasisTargets in narrationText check
  for (const beat of beats) {
    if (beat.emphasisTargets && beat.narrationText) {
      for (const target of beat.emphasisTargets) {
        if (!beat.narrationText.includes(target)) {
          warnings.push(
            `Beat ${beat.id}: emphasisTarget "${target}" not found in narrationText`,
          );
        }
      }
    }
  }

  // 5. First beat starts at 0
  if (beats.length > 0 && beats[0].startRatio > 0.01) {
    warnings.push(`First beat starts at ${beats[0].startRatio}, not 0`);
  }

  // 6. Last beat ends at 1
  if (beats.length > 0 && beats[beats.length - 1].endRatio < 0.99) {
    warnings.push(
      `Last beat ends at ${beats[beats.length - 1].endRatio}, not 1.0`,
    );
  }

  return {
    passed: errors.length === 0,
    errors,
    warnings,
  };
}

// ============================================================
// Stage Runner
// ============================================================

export const composeBeat: DsgsStage = {
  id: "6.3-beat-composer",
  name: "BeatComposer",
  async run(ctx: DsgsContext): Promise<DsgsStageResult> {
    const start = Date.now();
    const book = JSON.parse(readFileSync(ctx.bookPath, "utf-8")) as BookContent;
    const forceBeats = process.argv.includes("--force-beats");

    const entries: BeatPlanEntry[] = [];
    let processedCount = 0;
    let skippedCount = 0;
    const allErrors: string[] = [];

    for (const scene of book.scenes) {
      const sceneData: SceneData = {
        id: scene.id,
        type: scene.type,
        narrationText: scene.narrationText,
        content: scene.content as Record<string, unknown>,
        beats: scene.beats,
        durationFrames: scene.durationFrames,
      };

      // Skip scenes with existing beats unless --force-beats
      if (sceneData.beats && sceneData.beats.length > 0 && !forceBeats) {
        entries.push({
          sceneId: scene.id,
          sceneType: scene.type,
          beats: sceneData.beats,
          rationale: {
            segmentationReason: "기존 beats 유지 (수동 작성)",
            evidenceDecision: "not-applicable",
            densityDecision: "기존 beats 유지",
            riskFlags: [],
          },
          skipped: true,
          skipReason: "기존 beats 배열 존재 — 보존",
        });
        skippedCount++;
        continue;
      }

      // Generate beats
      const { beats, rationale } = generateBeatsForScene(sceneData, ctx.fps);

      // Self-validate
      const validation = validateBeats(beats, scene.narrationText ?? "");
      if (!validation.passed) {
        allErrors.push(`Scene ${scene.id}: ${validation.errors.join("; ")}`);
      }
      if (validation.warnings.length > 0) {
        rationale.riskFlags.push(
          ...validation.warnings.map((w) => `[QA] ${w}`),
        );
      }

      entries.push({
        sceneId: scene.id,
        sceneType: scene.type,
        beats,
        rationale,
        skipped: false,
      });
      processedCount++;
    }

    const artifact: BeatPlanArtifact = {
      bookId: ctx.bookId,
      generatedAt: new Date().toISOString(),
      totalScenes: book.scenes.length,
      processedScenes: processedCount,
      skippedScenes: skippedCount,
      entries,
    };

    // Save artifact (savePlanArtifact auto-appends .json)
    savePlanArtifact(ctx.bookId, "06.3-beat-plan", artifact);
    const outPath = path.join(ctx.planDir, "06.3-beat-plan.json");

    if (allErrors.length > 0) {
      return {
        stageId: "6.3-beat-composer",
        status: "halted",
        artifacts: [outPath],
        durationMs: Date.now() - start,
        message: `Beat validation errors: ${allErrors.join(" | ")}`,
      };
    }

    return {
      stageId: "6.3-beat-composer",
      status: "success",
      artifacts: [outPath],
      durationMs: Date.now() - start,
      message: `Beats generated: ${processedCount} processed, ${skippedCount} skipped (total ${book.scenes.length} scenes)`,
    };
  },
};
