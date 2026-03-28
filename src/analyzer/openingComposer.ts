import { z } from "zod";
import type {
  BookFingerprint,
  GenreKey,
  HookStrategy,
  OpeningPackage,
  SynthesizedBlueprint,
  Theme,
  SceneContent,
  CoverContent,
  ChapterDividerContent,
  MediaPlan,
  VCLElement,
  MotionPresetKey,
  LayoutType,
  ChoreographyType,
  TTSEngineKey,
} from "@/types";

// ---------------------------------------------------------------------------
// Hook Strategy Definitions
// ---------------------------------------------------------------------------

export interface HookStrategyDef {
  id: HookStrategy;
  description: string;
  pattern: string;
  score: (fingerprint: BookFingerprint) => number;
}

/**
 * Genre-strategy affinity baseline boosts (0–0.15 range).
 * Modeled after GENRE_DEFAULTS in bookAnalyzer.ts.
 */
export const GENRE_STRATEGY_AFFINITY: Record<
  GenreKey,
  Partial<Record<HookStrategy, number>>
> = {
  selfHelp: { system: 0.12, transformation: 0.08, pain: 0.06 },
  psychology: { question: 0.12, identity: 0.08 },
  business: { system: 0.12, urgency: 0.08 },
  philosophy: { question: 0.12, contrarian: 0.08 },
  science: { contrarian: 0.12, question: 0.08 },
  ai: { urgency: 0.12, system: 0.08 },
};

// ---------------------------------------------------------------------------
// Scoring helpers
// ---------------------------------------------------------------------------

/**
 * 5 scoring dimensions — normalized to sum = 1.0 per strategy:
 *   genreAffinity  0.25
 *   structureMatch 0.25
 *   toneMatch      0.20
 *   contentMode    0.15
 *   narrativeArc   0.15
 */
const W = {
  genre: 0.25,
  structure: 0.25,
  tone: 0.2,
  contentMode: 0.15,
  narrativeArc: 0.15,
} as const;

function genreScore(fp: BookFingerprint, strategy: HookStrategy): number {
  const affinity = GENRE_STRATEGY_AFFINITY[fp.genre]?.[strategy] ?? 0;
  // Normalize affinity (0–0.15) to 0–1 range, then apply weight
  return Math.min(1, affinity / 0.12);
}

function makeToneChecker(tones: string[]) {
  return (fp: BookFingerprint): number => {
    const matches = fp.emotionalTone.filter((t) => tones.includes(t)).length;
    return Math.min(1, matches / Math.max(1, tones.length));
  };
}

// ---------------------------------------------------------------------------
// HOOK_STRATEGIES — the 7 strategies with scoring functions
// ---------------------------------------------------------------------------

export const HOOK_STRATEGIES: Record<HookStrategy, HookStrategyDef> = {
  pain: {
    id: "pain",
    description: "시청자의 문제를 찌름",
    pattern: "문제→공감→해결 약속",
    score(fp) {
      const g = genreScore(fp, "pain") * W.genre;
      const s =
        (fp.structure === "narrative" || fp.structure === "argument"
          ? 0.8
          : 0.3) * W.structure;
      const t =
        makeToneChecker(["urgent", "intense", "provocative"])(fp) * W.tone;
      const c =
        (fp.contentMode === "actionable" || fp.contentMode === "mixed"
          ? 0.7
          : 0.3) * W.contentMode;
      const n =
        (fp.narrativeArcType === "warning"
          ? 0.9
          : fp.narrativeArcType === "transformation"
            ? 0.5
            : 0.2) * W.narrativeArc;
      return g + s + t + c + n;
    },
  },

  contrarian: {
    id: "contrarian",
    description: "통념을 뒤집음",
    pattern: "통념→반박→진짜 이유",
    score(fp) {
      const g = genreScore(fp, "contrarian") * W.genre;
      const s =
        (fp.structure === "argument"
          ? 0.9
          : fp.structure === "collection"
            ? 0.6
            : 0.3) * W.structure;
      const t =
        makeToneChecker(["provocative", "intense", "reflective"])(fp) * W.tone;
      const c =
        (fp.contentMode === "conceptual"
          ? 0.8
          : fp.contentMode === "mixed"
            ? 0.5
            : 0.3) * W.contentMode;
      const n =
        (fp.narrativeArcType === "discovery"
          ? 0.8
          : fp.narrativeArcType === "warning"
            ? 0.6
            : 0.2) * W.narrativeArc;
      return g + s + t + c + n;
    },
  },

  transformation: {
    id: "transformation",
    description: "변화 전후를 먼저 보여줌",
    pattern: "결과→궁금증→방법 약속",
    score(fp) {
      const g = genreScore(fp, "transformation") * W.genre;
      const s =
        (fp.structure === "framework"
          ? 0.7
          : fp.structure === "narrative"
            ? 0.8
            : 0.3) * W.structure;
      const t =
        makeToneChecker(["uplifting", "hopeful", "disciplined"])(fp) * W.tone;
      const c =
        (fp.contentMode === "actionable"
          ? 0.8
          : fp.contentMode === "narrative"
            ? 0.6
            : 0.3) * W.contentMode;
      const n =
        (fp.narrativeArcType === "transformation"
          ? 0.95
          : fp.narrativeArcType === "instruction"
            ? 0.4
            : 0.2) * W.narrativeArc;
      return g + s + t + c + n;
    },
  },

  identity: {
    id: "identity",
    description: "정체성에 연결",
    pattern: "정체성 질문→연결→해답",
    score(fp) {
      const g = genreScore(fp, "identity") * W.genre;
      const s =
        (fp.structure === "narrative"
          ? 0.7
          : fp.structure === "argument"
            ? 0.5
            : 0.3) * W.structure;
      const t = makeToneChecker(["reflective", "calm", "hopeful"])(fp) * W.tone;
      const c =
        (fp.contentMode === "conceptual"
          ? 0.7
          : fp.contentMode === "narrative"
            ? 0.6
            : 0.3) * W.contentMode;
      const n =
        (fp.narrativeArcType === "discovery"
          ? 0.7
          : fp.narrativeArcType === "transformation"
            ? 0.5
            : 0.2) * W.narrativeArc;
      return g + s + t + c + n;
    },
  },

  question: {
    id: "question",
    description: "강한 질문으로 시작",
    pattern: "질문→일반답→깊은 답 약속",
    score(fp) {
      const g = genreScore(fp, "question") * W.genre;
      const s =
        (fp.structure === "argument"
          ? 0.8
          : fp.structure === "collection"
            ? 0.6
            : 0.4) * W.structure;
      const t =
        makeToneChecker(["reflective", "provocative", "calm"])(fp) * W.tone;
      const c =
        (fp.contentMode === "conceptual"
          ? 0.9
          : fp.contentMode === "mixed"
            ? 0.5
            : 0.3) * W.contentMode;
      const n =
        (fp.narrativeArcType === "discovery"
          ? 0.9
          : fp.narrativeArcType === "warning"
            ? 0.4
            : 0.2) * W.narrativeArc;
      return g + s + t + c + n;
    },
  },

  system: {
    id: "system",
    description: "원인이 구조라고 프레이밍",
    pattern: "오해→시스템 관점→해결",
    score(fp) {
      const g = genreScore(fp, "system") * W.genre;
      const s =
        (fp.structure === "framework" && fp.coreFramework
          ? 0.95
          : fp.structure === "framework"
            ? 0.7
            : 0.3) * W.structure;
      const t =
        makeToneChecker(["disciplined", "intense", "urgent"])(fp) * W.tone;
      const c =
        (fp.contentMode === "actionable"
          ? 0.85
          : fp.contentMode === "mixed"
            ? 0.5
            : 0.2) * W.contentMode;
      const n =
        (fp.narrativeArcType === "instruction"
          ? 0.8
          : fp.narrativeArcType === "transformation"
            ? 0.6
            : 0.2) * W.narrativeArc;
      return g + s + t + c + n;
    },
  },

  urgency: {
    id: "urgency",
    description: "지금 바꿔야 한다고 자극",
    pattern: "현재→위험→변화 약속",
    score(fp) {
      const g = genreScore(fp, "urgency") * W.genre;
      const s =
        (fp.structure === "argument"
          ? 0.7
          : fp.structure === "narrative"
            ? 0.5
            : 0.3) * W.structure;
      const t =
        makeToneChecker(["urgent", "intense", "provocative"])(fp) * W.tone;
      const c =
        (fp.contentMode === "actionable"
          ? 0.7
          : fp.contentMode === "mixed"
            ? 0.6
            : 0.3) * W.contentMode;
      const n =
        (fp.narrativeArcType === "warning"
          ? 0.95
          : fp.narrativeArcType === "transformation"
            ? 0.4
            : 0.2) * W.narrativeArc;
      return g + s + t + c + n;
    },
  },
};

// ---------------------------------------------------------------------------
// Scoring API
// ---------------------------------------------------------------------------

export interface StrategyScore {
  strategy: HookStrategy;
  score: number;
}

export interface HookSelection {
  primary: HookStrategy;
  secondary?: HookStrategy;
}

/**
 * Scores all 7 hook strategies against a BookFingerprint.
 * Returns sorted descending by score.
 */
export function scoreStrategies(fingerprint: BookFingerprint): StrategyScore[] {
  const strategies = Object.keys(HOOK_STRATEGIES) as HookStrategy[];
  const scores: StrategyScore[] = strategies.map((strategy) => ({
    strategy,
    score: HOOK_STRATEGIES[strategy].score(fingerprint),
  }));
  scores.sort((a, b) => b.score - a.score);
  return scores;
}

/**
 * Selects primary (and optional secondary) hook strategy.
 *
 * Rules:
 * - Secondary only if score >= primary * 0.7 (relative threshold)
 * - Minimum score floor: if ALL < 0.3, fallback to fingerprint.hookStrategy
 * - Tie-breaking: prefer fingerprint.hookStrategy
 */
export function selectHookStrategy(
  fingerprint: BookFingerprint,
): HookSelection {
  const scores = scoreStrategies(fingerprint);

  // Minimum score floor
  if (scores[0].score < 0.3) {
    return { primary: fingerprint.hookStrategy };
  }

  // Tie-breaking: if top two are equal, prefer fingerprint.hookStrategy
  let primary = scores[0];
  if (
    scores.length > 1 &&
    Math.abs(scores[0].score - scores[1].score) < 0.001
  ) {
    if (scores[1].strategy === fingerprint.hookStrategy) {
      primary = scores[1];
    }
  }

  const result: HookSelection = { primary: primary.strategy };

  // Secondary: different from primary, score >= primary * 0.7
  const SECONDARY_THRESHOLD = 0.7;
  for (const s of scores) {
    if (
      s.strategy !== primary.strategy &&
      s.score >= primary.score * SECONDARY_THRESHOLD
    ) {
      result.secondary = s.strategy;
      break;
    }
  }

  return result;
}

// ---------------------------------------------------------------------------
// OpeningPackage Assembly
// ---------------------------------------------------------------------------

const FPS = 30;

interface ComposeOptions {
  format: "longform" | "shorts";
  theme: Theme;
}

const DURATION_RANGES = {
  longform: { hook: [8, 12], intro: [12, 23], total: [20, 35] },
  shorts: { hook: [2, 4], intro: [3, 6], total: [5, 10] },
} as const;

function secToFrames(sec: number): number {
  return Math.round(sec * FPS);
}

function createMediaPlanTemplate(narrationSentinel: string): MediaPlan {
  return {
    narrationText: narrationSentinel,
    captionPlan: {
      mode: "sentence-by-sentence",
      maxCharsPerLine: 28,
      maxLines: 2,
      leadFrames: 2,
      trailFrames: 2,
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

function createHookBlueprint(
  fingerprint: BookFingerprint,
  selection: HookSelection,
  options: ComposeOptions,
  from: number,
): SynthesizedBlueprint {
  const strategyDef = HOOK_STRATEGIES[selection.primary];
  const range = DURATION_RANGES[options.format].hook;
  const durationSec = (range[0] + range[1]) / 2;
  const durationFrames = secToFrames(durationSec);

  const elements: VCLElement[] = [
    {
      id: "hook-headline",
      type: "headline",
      props: { text: fingerprint.entryAngle },
    },
    {
      id: "hook-body",
      type: "body-text",
      props: { text: strategyDef.pattern },
    },
    { id: "hook-texture", type: "texture-overlay", props: { opacity: 0.08 } },
  ];

  const fallbackContent: CoverContent = {
    title: fingerprint.entryAngle.slice(0, 60),
    author: "",
    coverImageUrl: "covers/placeholder.png",
  };

  return {
    id: `opening-hook-${fingerprint.genre}-${selection.primary}`,
    intent: `${strategyDef.description} — ${strategyDef.pattern}`,
    origin: "synthesized",
    lifecycle: "ephemeral",
    fallbackPreset: "cover",
    fallbackContent,
    layout: "center-focus" as LayoutType,
    layoutConfig: {},
    elements,
    choreography: "reveal-sequence" as ChoreographyType,
    motionPreset: "dramatic" as MotionPresetKey,
    format: options.format,
    theme: options.theme,
    from,
    durationFrames,
    mediaPlan: createMediaPlanTemplate("[HOOK_NARRATION]"),
  };
}

function createIntroBlueprint(
  fingerprint: BookFingerprint,
  options: ComposeOptions,
  from: number,
): SynthesizedBlueprint {
  const range = DURATION_RANGES[options.format].intro;
  const durationSec = (range[0] + range[1]) / 2;
  const durationFrames = secToFrames(durationSec);

  const elements: VCLElement[] = [
    { id: "intro-headline", type: "headline", props: { text: "" } },
    { id: "intro-body", type: "body-text", props: { text: "" } },
    {
      id: "intro-image",
      type: "image",
      props: { src: "", role: "book-cover" },
    },
  ];

  const fallbackContent: ChapterDividerContent = {
    chapterNumber: 0,
    chapterTitle: fingerprint.entryAngle.slice(0, 60),
  };

  return {
    id: `opening-intro-${fingerprint.genre}`,
    intent: "책의 맥락 설정 — 왜 이 영상을 봐야 하는가",
    origin: "synthesized",
    lifecycle: "ephemeral",
    fallbackPreset: "chapterDivider",
    fallbackContent,
    layout: "left-anchor" as LayoutType,
    layoutConfig: {},
    elements,
    choreography: "reveal-sequence" as ChoreographyType,
    motionPreset: "heavy" as MotionPresetKey,
    format: options.format,
    theme: options.theme,
    from,
    durationFrames,
    mediaPlan: createMediaPlanTemplate("[INTRO_NARRATION]"),
  };
}

/**
 * Composes an OpeningPackage from a BookFingerprint.
 *
 * This is a pure deterministic function — no LLM calls.
 * Creative narration content (narrationText) is left as sentinel values
 * ('[HOOK_NARRATION]', '[INTRO_NARRATION]') for the agent layer to fill.
 *
 * fingerprint.hookStrategy is the BookAnalyzer's (Stage 1) recommendation.
 * This function independently re-scores all 7 strategies against fingerprint
 * features; fingerprint.hookStrategy is only used as a tie-breaker.
 */
export function composeOpening(
  fingerprint: BookFingerprint,
  options: ComposeOptions,
): OpeningPackage {
  const selection = selectHookStrategy(fingerprint);
  const totalRange = DURATION_RANGES[options.format].total;

  const hook = createHookBlueprint(fingerprint, selection, options, 0);
  const intro = createIntroBlueprint(fingerprint, options, hook.durationFrames);

  const rawDurationSec = (hook.durationFrames + intro.durationFrames) / FPS;
  const packageDurationSec = Math.max(
    totalRange[0],
    Math.min(totalRange[1], rawDurationSec),
  );

  const transitionBridge = {
    transitionToBody: fingerprint.coreFramework
      ? `그 ${selection.primary === "system" ? "시스템" : "방법"}의 핵심이 바로 ${fingerprint.coreFramework}인데요—`
      : `${fingerprint.entryAngle.slice(0, 30)}에서 시작합니다—`,
    carryKeyword: fingerprint.coreFramework?.split(" ")[0],
    audioCrossfadeMs: 500,
  };

  const introFraming = selection.secondary
    ? `${HOOK_STRATEGIES[selection.primary].description} + ${HOOK_STRATEGIES[selection.secondary].description}`
    : HOOK_STRATEGIES[selection.primary].description;

  const pkg: OpeningPackage = {
    hook,
    intro,
    transitionBridge,
    hookStrategy: selection.primary,
    introFraming,
    packageDurationSec,
  };

  // Validate output with Zod
  OpeningPackageSchema.parse(pkg);

  return pkg;
}

// ---------------------------------------------------------------------------
// Zod Output Schema
// ---------------------------------------------------------------------------

const VCLElementSchema = z.object({
  id: z.string().min(1),
  type: z.string().min(1),
  props: z.record(z.string(), z.unknown()),
});

const MediaPlanSchema = z.object({
  narrationText: z.string().min(1),
  captionPlan: z.object({
    mode: z.literal("sentence-by-sentence"),
    maxCharsPerLine: z.number(),
    maxLines: z.number(),
    leadFrames: z.number(),
    trailFrames: z.number(),
    transitionStyle: z.enum(["fade-slide", "hard-cut"]),
  }),
  audioPlan: z.object({
    ttsEngine: z.string(),
    voiceKey: z.string(),
    speed: z.number(),
    pitch: z.string(),
  }),
  assetPlan: z.object({
    required: z.array(z.unknown()),
    fallbackMode: z.enum(["text-only", "shape-placeholder", "generic-library"]),
  }),
});

const SynthesizedBlueprintSchema = z.object({
  id: z.string().min(1),
  intent: z.string().min(1),
  origin: z.literal("synthesized"),
  lifecycle: z.enum(["ephemeral", "candidate-promotable"]),
  fallbackPreset: z.string().min(1),
  fallbackContent: z.record(z.string(), z.unknown()),
  layout: z.string().min(1),
  layoutConfig: z.record(z.string(), z.unknown()).optional(),
  elements: z.array(VCLElementSchema).min(1),
  choreography: z.string().min(1),
  motionPreset: z.string().min(1),
  format: z.enum(["longform", "shorts"]),
  theme: z.object({
    mode: z.string(),
    genre: z.string(),
    bg: z.string(),
    surface: z.string(),
    surfaceMuted: z.string(),
    textStrong: z.string(),
    textMuted: z.string(),
    lineSubtle: z.string(),
    signal: z.string(),
    accent: z.string(),
    premium: z.string(),
  }),
  from: z.number().int().min(0),
  durationFrames: z.number().int().min(1),
  mediaPlan: MediaPlanSchema,
});

export const OpeningPackageSchema = z.object({
  hook: SynthesizedBlueprintSchema,
  intro: SynthesizedBlueprintSchema,
  transitionBridge: z.object({
    transitionToBody: z.string().min(1),
    carryKeyword: z.string().optional(),
    audioCrossfadeMs: z.number().optional(),
  }),
  hookStrategy: z.enum([
    "pain",
    "contrarian",
    "transformation",
    "identity",
    "question",
    "system",
    "urgency",
  ]),
  introFraming: z.string().min(1),
  packageDurationSec: z.number().min(5).max(35),
});
