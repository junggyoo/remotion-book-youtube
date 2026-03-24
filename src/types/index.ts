// ============================================================
// Editorial Signal — Canonical Type Definitions
// Single source of truth for all TypeScript types.
// Precedence: REVISED_CANONICAL_SPEC.md > this file > all others
// ============================================================

// --- Enums / Literal Unions ---

export type ThemeMode = "dark" | "light";

export type GenreKey =
  | "selfHelp"
  | "psychology"
  | "business"
  | "philosophy"
  | "science"
  | "ai";

export type FormatKey = "longform" | "shorts" | "both";

export type SceneType =
  | "cover"
  | "chapterDivider"
  | "keyInsight"
  | "compareContrast"
  | "quote"
  | "framework"
  | "application"
  | "data"
  | "closing"
  | "timeline"
  | "highlight"
  | "transition"
  | "listReveal"
  | "splitQuote"
  | "custom";

/** Content-level layout archetype hints. @see LayoutType for full VCL layout grammar. */
export type LayoutArchetype =
  | "center-focus"
  | "left-anchor"
  | "split-compare"
  | "grid-expand"
  | "quote-hold"
  | "map-flow"
  | "top-anchor"
  | "band-divider";

export type MotionPresetKey =
  | "gentle"
  | "smooth"
  | "snappy"
  | "heavy"
  | "dramatic";

// --- Theme ---

export interface Theme {
  mode: ThemeMode;
  genre: GenreKey;
  bg: string;
  surface: string;
  surfaceMuted: string;
  textStrong: string;
  textMuted: string;
  lineSubtle: string;
  signal: string;
  accent: string;
  premium: string;
}

// --- Scene Content Types ---

export interface CoverContent {
  title: string;
  subtitle?: string;
  author: string;
  coverImageUrl: string; // REQUIRED. Not optional. Spec §3.
  brandLabel?: string;
  backgroundVariant?: "dark" | "light";
}

export interface ChapterDividerContent {
  chapterNumber: number;
  chapterTitle: string;
  chapterSubtitle?: string;
  useAltLayout?: boolean;
}

export interface KeyInsightContent {
  headline: string; // hard limit: 60 chars
  supportText?: string;
  underlineKeyword?: string;
  useSignalBar?: boolean;
}

export interface CompareContrastContent {
  leftLabel: string;
  leftContent: string;
  rightLabel: string;
  rightContent: string;
  leftTag?: "before" | "myth" | "wrong" | "common" | "custom";
  rightTag?: "after" | "fact" | "right" | "author" | "custom";
  showConnector?: boolean;
  revealOrder?: "simultaneous" | "left-first" | "right-first";
}

export interface QuoteContent {
  quoteText: string; // max 3 lines
  attribution: string;
  useSerif?: boolean;
  showTexture?: boolean;
}

export interface FrameworkItem {
  number: number;
  title: string;
  description?: string;
  iconId?: string;
}

export interface FrameworkContent {
  frameworkLabel: string;
  items: FrameworkItem[]; // max 5
  showConnectors?: boolean;
  showDescriptions?: boolean;
}

export interface ApplicationStep {
  title: string;
  detail?: string;
  iconId?: string;
}

export interface ApplicationContent {
  anchorStatement: string;
  steps: ApplicationStep[]; // max 4
  showPaths?: boolean;
  showCheckmarks?: boolean;
}

export interface DataPoint {
  label: string;
  value: number;
  highlight?: boolean;
}

export interface DataContent {
  chartType: "bar" | "line" | "compare" | "stepFlow" | "matrix";
  dataLabel: string;
  data: DataPoint[];
  annotation?: string;
  sourceCredit?: string;
  unit?: string;
}

export interface ClosingContent {
  recapStatement: string;
  ctaText?: string;
  showBrandLabel?: boolean;
}

// --- New Motion Graphic Scene Content Types ---

export interface TimelineEvent {
  year: string;
  title: string;
  description?: string;
}

export interface TimelineContent {
  timelineLabel: string;
  events: TimelineEvent[]; // max 6
  showConnectors?: boolean;
}

export interface HighlightContent {
  mainText: string;
  subText?: string;
  highlightColor?: "signal" | "accent" | "premium";
  showPulse?: boolean;
}

export interface TransitionContent {
  label?: string;
  style?: "fade" | "wipe" | "zoom";
  showBrandMark?: boolean;
}

export interface ListRevealItem {
  title: string;
  subtitle?: string;
  iconId?: string;
}

export interface ListRevealContent {
  listLabel: string;
  items: ListRevealItem[]; // max 7
  showNumbers?: boolean;
  revealStyle?: "stagger" | "cascade";
}

export interface SplitQuoteContent {
  leftQuote: string;
  leftAttribution: string;
  rightQuote: string;
  rightAttribution: string;
  vsLabel?: string;
}

// --- Scene Structure ---

export interface ShortsSceneConfig {
  skipForShorts?: boolean; // default: false
  durationFramesOverride?: number;
  // NOTE: 'enabled' field is REMOVED. Use skipForShorts only. Spec §3.
}

export interface SceneAssetRefs {
  backgroundTexture?: string; // manifest ID
  icon?: string; // manifest ID
  sfx?: string; // manifest ID
  // NOTE: coverImage REMOVED → use CoverContent.coverImageUrl. Spec §3.
  // NOTE: bgm REMOVED → use AudioConfig.bgmTrack. Spec §3.
}

export interface SceneBase {
  id: string;
  type: SceneType;
  layoutArchetypeOverride?: LayoutArchetype;
  durationFrames?: number;
  motionPresetOverride?: MotionPresetKey;
  narrationText?: string; // FLAT field. Never scene.narration.text. Spec §4.
  assets?: SceneAssetRefs;
  shorts?: ShortsSceneConfig;
}

// --- CustomScene ---

/**
 * A scene driven by a pre-built SceneBlueprint (BlueprintRenderer path).
 * Used when type: "custom" appears in content JSON.
 * BlueprintRenderer is not yet implemented — the composition renders null and logs a warning.
 */
export type CustomScene = SceneBase & {
  type: "custom";
  content: Record<string, unknown>;
  blueprint: SceneBlueprint;
};

// --- Discriminated Union for Typed Scenes ---

export type TypedScene =
  | (SceneBase & { type: "cover"; content: CoverContent })
  | (SceneBase & { type: "chapterDivider"; content: ChapterDividerContent })
  | (SceneBase & { type: "keyInsight"; content: KeyInsightContent })
  | (SceneBase & { type: "compareContrast"; content: CompareContrastContent })
  | (SceneBase & { type: "quote"; content: QuoteContent })
  | (SceneBase & { type: "framework"; content: FrameworkContent })
  | (SceneBase & { type: "application"; content: ApplicationContent })
  | (SceneBase & { type: "data"; content: DataContent })
  | (SceneBase & { type: "closing"; content: ClosingContent })
  | (SceneBase & { type: "timeline"; content: TimelineContent })
  | (SceneBase & { type: "highlight"; content: HighlightContent })
  | (SceneBase & { type: "transition"; content: TransitionContent })
  | (SceneBase & { type: "listReveal"; content: ListRevealContent })
  | (SceneBase & { type: "splitQuote"; content: SplitQuoteContent })
  | CustomScene;

/** Union of all scene content types. Used by SynthesizedBlueprint.fallbackContent and pipeline stages. */
export type SceneContent =
  | CoverContent
  | ChapterDividerContent
  | KeyInsightContent
  | CompareContrastContent
  | QuoteContent
  | FrameworkContent
  | ApplicationContent
  | DataContent
  | ClosingContent
  | TimelineContent
  | HighlightContent
  | TransitionContent
  | ListRevealContent
  | SplitQuoteContent;

// --- Book / Production / Narration ---

export interface BookMetadata {
  id: string;
  title: string;
  author: string;
  originalTitle?: string;
  genre: GenreKey;
  isbn?: string;
  coverImageUrl?: string; // external tool use only, not for render
  publishYear?: number;
  tags?: string[];
  channelNote?: string;
}

export interface ProductionConfig {
  format?: FormatKey; // default: 'both'
  targetDurationSeconds?: number; // default: 480
  fps?: number; // default: 30
  themeMode?: ThemeMode; // default: 'dark'
  genreOverride?: GenreKey;
}

export interface NarrationConfig {
  voice: string;
  ttsEngine?: "edge-tts" | "elevenlabs" | "google-tts" | "minimax";
  speed?: number; // default: 1.0
  pitch?: string; // default: '+0Hz'
  subtitleMaxCharsPerLine?: number; // default: 28
  subtitleMaxLines?: number; // default: 2
}

export interface AudioConfig {
  bgmTrack?: string; // assets/sounds/ relative path
  bgmVolume?: number; // default: 0.12
  sonicLogo?: string;
}

export interface BookContent {
  $schema?: string;
  metadata: BookMetadata;
  production?: ProductionConfig;
  narration: NarrationConfig;
  scenes: TypedScene[];
  audio?: AudioConfig;
}

// --- TTS / Subtitle ---

export interface TTSResult {
  sceneId: string;
  audioFilePath: string;
  durationFrames: number;
  durationMs: number;
}

export interface SubtitleEntry {
  text: string;
  startFrame: number;
  endFrame: number;
  lines: string[]; // pre-split, max 28 chars/line, max 2 lines
}

// --- Pipeline ---

export type ValidationLevel = "BLOCKED" | "PASS";

export interface ValidationResult {
  level: ValidationLevel;
  errors: string[];
  warnings: string[];
}

export interface ResolvedAsset {
  id: string;
  usedFallback: boolean;
  resolvedPath: string;
  fallbackReason?: string;
}

// --- Scene Props (for React components) ---

export interface BaseSceneProps {
  format: FormatKey;
  theme: Theme;
  from: number;
  durationFrames: number;
  tts?: TTSResult;
  subtitles?: SubtitleEntry[];
}

// --- Format Layout ---

export interface SafeAreaConfig {
  outerMarginX: number;
  outerMarginY: number;
  bodyMaxWidth: number;
  contentColumnWidth: number;
}

export interface FormatConfig {
  width: number;
  height: number;
  safeArea: SafeAreaConfig;
  gridColumns: number;
  gutter: number;
  typeScale: TypeScale;
}

export interface TypeScale {
  headlineL: number;
  headlineM: number;
  headlineS: number;
  bodyL: number;
  bodyM: number;
  bodyS: number;
  caption: number;
  label: number;
}

// --- Motion ---

export interface ResolvedMotionConfig {
  type: "spring" | "interpolate";
  springConfig?: { stiffness: number; damping: number; mass: number };
  easingBezier?: [number, number, number, number];
  durationRange: [number, number];
  overshootClamping: boolean;
}

// ---------------------------------------------------------------------------
// DSGS Orchestration Types (Spec Section 3)
// TODO: Split into dsgs.ts when file exceeds 700 lines or 3+ DSGS pipeline modules exist
// ---------------------------------------------------------------------------

// --- DSGS Union Types ---

/**
 * @inferred from spec Section 3-1 examples. Closed union with string escape hatch
 * for analyzer flexibility. Extend as new tones are identified.
 */
export type EmotionalTone =
  | "uplifting"
  | "disciplined"
  | "reflective"
  | "urgent"
  | "hopeful"
  | "provocative"
  | "calm"
  | "intense"
  | (string & {});

/** DSGS Spec 3-1 */
export type NarrativeArcType =
  | "transformation"
  | "discovery"
  | "warning"
  | "instruction";

/** DSGS Spec 3-1 */
export type HookStrategy =
  | "pain"
  | "contrarian"
  | "transformation"
  | "identity"
  | "question"
  | "system"
  | "urgency";

/** DSGS Spec 3-2 */
export type SegmentRole =
  | "opening"
  | "setup"
  | "core"
  | "climax"
  | "resolution"
  | "closing";

/**
 * DSGS Spec Section 4-2 VCL layout grammar.
 * Superset of LayoutArchetype (content-level hints).
 * @see LayoutArchetype for content-level layout hints used in existing scene types.
 */
export type LayoutType =
  // Existing LayoutArchetype values
  | "center-focus"
  | "left-anchor"
  | "split-compare"
  | "grid-expand"
  | "quote-hold"
  | "map-flow"
  | "top-anchor"
  | "band-divider"
  // Extended VCL grammar values
  | "split-two"
  | "timeline-h"
  | "timeline-v"
  | "radial"
  | "pyramid"
  | "flowchart"
  | "stacked-layers"
  | "orbit"
  | "matrix-2x2"
  | "scattered-cards"
  | "comparison-bar"
  | "grid-n";

/** DSGS Spec Section 4-3 */
export type ChoreographyType =
  | "reveal-sequence"
  | "stagger-clockwise"
  | "count-up"
  | "path-trace"
  | "split-reveal"
  | "stack-build"
  | "zoom-focus"
  | "wave-fill"
  | "morph-transition"
  | "pulse-emphasis";

/**
 * DSGS Spec 3-3. Blueprint-level TTS engine selection.
 * Separate from NarrationConfig.ttsEngine (book-level input).
 */
export type TTSEngineKey =
  | "edge-tts"
  | "qwen3-tts"
  | "chatterbox"
  | "fish-audio-s2"
  | "elevenlabs";

// --- DSGS Helper Interfaces ---

/**
 * @inferred from spec Section 3-2 (emotionalCurve: EmotionalPoint[]).
 * Minimal shape; extend when emotional curve rendering is implemented.
 */
export interface EmotionalPoint {
  timestamp: number;
  intensity: number;
  label?: string;
}

/**
 * @inferred from spec Section 4-1 (VCL vocabulary) and Section 4-4 (BlueprintRenderer).
 * Core data structure for DSGS synthesis engine.
 */
export type VCLElementType =
  // Text primitives
  | "headline"
  | "body-text"
  | "label"
  | "caption"
  | "quote-text"
  | "number-display"
  // Visual primitives
  | "icon"
  | "image"
  | "shape"
  | "divider"
  | "texture-overlay"
  | "color-block"
  // Data primitives
  | "bar-chart"
  | "line-chart"
  | "progress-ring"
  | "stat-card"
  | "comparison-pair"
  // Structural primitives
  | "container"
  | "grid"
  | "stack"
  | "spacer"
  | "safe-area-inset"
  | (string & {});

export interface VCLElement {
  id: string;
  type: VCLElementType;
  props: Record<string, unknown>;
}

/** DSGS Spec 3-3 */
export interface AssetRequirement {
  role:
    | "book-cover"
    | "author-photo"
    | "concept-image"
    | "icon"
    | "texture"
    | "diagram";
  description: string;
  optional: boolean;
}

/** DSGS Spec 3-2 */
export interface NarrativeSegment {
  role: SegmentRole;
  durationRatio: number; // sum = 1.0
  intent: string;
  requiredDelivery: string[];
}

/** DSGS Spec 3-3. Every SceneBlueprint must include a mediaPlan. */
export interface MediaPlan {
  narrationText: string;

  captionPlan: {
    mode: "sentence-by-sentence";
    maxCharsPerLine: number;
    maxLines: number;
    leadFrames: number;
    trailFrames: number;
    highlightKeywords?: string[];
    transitionStyle: "fade-slide" | "hard-cut";
  };

  audioPlan: {
    ttsEngine: TTSEngineKey;
    voiceKey: string;
    speed: number; // 0.7 ~ 1.4
    pitch: string; // "+0Hz"
    pauses?: Array<{ afterSentence: number; ms: number }>;
  };

  assetPlan: {
    required: AssetRequirement[];
    searchQueries?: string[];
    fallbackMode: "text-only" | "shape-placeholder" | "generic-library";
  };
}

// --- DSGS Main Interfaces ---

/** DSGS Spec 3-1 */
export interface BookFingerprint {
  genre: GenreKey;
  subGenre?: string;
  structure: "framework" | "narrative" | "argument" | "collection";
  coreFramework?: string;
  keyConceptCount: number;
  emotionalTone: EmotionalTone[];
  narrativeArcType: NarrativeArcType;
  urgencyLevel: "low" | "medium" | "high";
  visualMotifs: string[];
  spatialMetaphors: string[];
  hookStrategy: HookStrategy;
  entryAngle: string;
  uniqueElements: string[];
  contentMode: "actionable" | "conceptual" | "narrative" | "mixed";
}

/** DSGS Spec 3-2 */
export interface VideoNarrativePlan {
  totalDurationSec: number;
  segments: NarrativeSegment[];
  emotionalCurve: EmotionalPoint[];
}

/**
 * DSGS Spec 3-3. Planning artifact — NOT a React component contract.
 * Overlapping fields (format, theme, from, durationFrames) with BaseSceneProps
 * serve different purposes: SceneBlueprint is pipeline data, BaseSceneProps is render props.
 */
export interface SceneBlueprint {
  id: string;
  intent: string;
  origin: "preset" | "synthesized";
  layout: LayoutType;
  layoutConfig?: Record<string, unknown>;
  elements: VCLElement[];
  choreography: ChoreographyType;
  motionPreset: MotionPresetKey;
  format: "longform" | "shorts"; // narrowed from FormatKey — blueprints are format-specific
  theme: Theme;
  from: number;
  durationFrames: number;
  mediaPlan: MediaPlan;
}

/** DSGS Spec 3-4 */
export interface SynthesizedBlueprint extends SceneBlueprint {
  origin: "synthesized";
  lifecycle: "ephemeral" | "candidate-promotable";
  fallbackPreset: SceneType;
  fallbackContent: SceneContent;
  /** How well the available layout matched the requested capability (0~1). */
  synthesisConfidence?: number;
}

/** DSGS Spec 3-5 */
export interface OpeningPackage {
  hook: SynthesizedBlueprint;
  intro: SynthesizedBlueprint;
  transitionBridge: {
    transitionToBody: string;
    carryKeyword?: string;
    audioCrossfadeMs?: number;
  };
  hookStrategy: HookStrategy;
  introFraming: string;
  packageDurationSec: number; // 20~35s
}

/** DSGS Spec 3-6 */
export interface FormatPolicy {
  format: "longform" | "shorts";
  maxElementsPerScene: number;
  captionDensity: "low" | "medium" | "high";
  openingDurationSecRange: [number, number];
  sceneCountRange: [number, number];
}

/** DSGS Spec 3-6 */
export interface PlanningPolicy {
  presetConfidenceThreshold: number; // default 0.7
  minSignatureScenes: number; // default 2
  maxSynthesizedScenes: number; // default 5
  openingMustBeDynamic: boolean; // default true
  formatPolicy: FormatPolicy;
}

/** DSGS Spec 3-7 */
export interface SceneQualityMetrics {
  readabilityScore: number;
  brandConsistencyScore: number;
  visualComplexityScore: number;
  renderStability: number;
  shortsAdaptability: number;
  openingGenericness?: number;
}

/** DSGS Spec 3-7 */
export const QUALITY_GATE = {
  readabilityScore: 0.8,
  brandConsistencyScore: 0.85,
  renderStability: 0.95,
  openingGenericnessMax: 0.35,
  promotionMinReusability: 0.6,
  promotionMinAbstractability: 0.7,
  promotionMinQuality: 0.8,
  promotionMinStability: 0.95,
} as const;

// ---------------------------------------------------------------------------
// DSGS Stage 4-5: ScenePlanner + GapDetector types
// ---------------------------------------------------------------------------

/** DSGS Spec 6-1. Per-dimension score breakdown for HITL review & debugging. */
export interface ScoreBreakdown {
  delivery: number; // 0~1
  structure: number; // 0~1
  contentFit: number; // 0~1
  layout: number; // 0~1
  explanation: string; // human-readable reasoning
}

/** DSGS Spec 6-1. ScenePlanner output for each scene slot. */
export interface PresetMatch {
  segment: SegmentRole; // spec field name
  slotIndex: number; // plan-level extension: 0-based within segment
  sceneType: SceneType; // best-matching preset
  content: SceneContent; // draft content for this slot
  confidence: number; // 0~1
  scoreBreakdown: ScoreBreakdown; // per-dimension breakdown
  alternativeTypes?: SceneType[]; // runner-up matches
}

/** DSGS Spec 6-2. A scene slot where no preset adequately fits. */
export interface SceneGap {
  segment: SegmentRole;
  slotIndex: number;
  bestPresetMatch: PresetMatch; // the rejected match (for fallback reference)
  gapReason: string; // which of the 5 questions triggered this
  requiredCapabilities: string[]; // what the gap needs (e.g., 'cyclic-flow', 'timeline')
  priority: "must" | "nice"; // must = signature scene candidate
  intent: string; // what this scene should communicate
}

/** ScenePlanner full output. */
export interface ScenePlan {
  presetMatches: PresetMatch[]; // confidence >= threshold
  gaps: SceneGap[]; // confidence < threshold
  policy: PlanningPolicy; // the policy used
  totalSlots: number; // sum of all scene slots across segments
}
