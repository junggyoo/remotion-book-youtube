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
  | "dramatic"
  | "wordReveal"
  | "punchy";

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

export interface EvidenceCard {
  type: "statistic" | "quote" | "case" | "research";
  value: string;
  caption?: string;
  source?: string;
}

export interface KeyInsightContent {
  headline: string; // hard limit: 60 chars
  supportText?: string;
  underlineKeyword?: string;
  useSignalBar?: boolean;
  evidenceCard?: EvidenceCard;
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
  /** P2-1f: metaphor string for diagram pipeline (e.g., "circular cycle", "timeline") */
  diagramHint?: string;
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
  beats?: Beat[];
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
  beats?: Beat[];
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
  ttsEngine?:
    | "edge-tts"
    | "elevenlabs"
    | "google-tts"
    | "minimax"
    | "qwen3-tts"
    | "fish-audio";
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

/** BGM auto-ducking configuration for narration-dominant mixing */
export interface BGMDuckingConfig {
  /** Volume during narration (0~1). Default 0.04 */
  narratingVolume: number;
  /** Volume during silence/gaps (0~1). Default 0.12 */
  silenceVolume: number;
  /** Fade-in frames when ducking starts. Default 6 */
  attackFrames: number;
  /** Fade-out frames when ducking releases. Default 18 */
  releaseFrames: number;
  /** Minimum silence frames before release triggers. Prevents pumping. Default 12 */
  minSilenceBeforeRelease: number;
}

export interface BookContent {
  $schema?: string;
  metadata: BookMetadata;
  production?: ProductionConfig;
  narration: NarrationConfig;
  scenes: TypedScene[];
  audio?: AudioConfig;
  thumbnail?: import("@/thumbnail/types").ThumbnailConfig;
}

// --- TTS / Subtitle ---

export interface TTSResult {
  sceneId: string;
  audioFilePath: string;
  durationFrames: number;
  durationMs: number;
}

/**
 * Extended TTS result with word-level caption data from VTT parsing.
 * Used by generateTTSWithCaptions() in the DSGS pipeline.
 */
export interface TTSResultWithCaptions extends TTSResult {
  captions: import("@remotion/captions").Caption[];
  vttPath?: string;
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
  beats?: Beat[];
  /** P2-3: VTT captions file path for narration sync (relative to staticFile) */
  captionsFile?: string;
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
  headlineXL: number;
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
  origin: "preset" | "synthesized" | "composed";
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
  /** P2-1e: DiagramSpec used to generate diagram elements (if any). */
  diagramSpec?: DiagramSpec;
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
// Beat System Types — P2 Extension (BEAT_SYSTEM_DESIGN_SPEC_v0.2.md)
// ---------------------------------------------------------------------------

/**
 * Beat role — 씬 타입에 독립적인 의미론적 역할.
 * 씬 컴포넌트가 role을 기준으로 렌더 로직을 분기할 수 있다.
 */
export type BeatRole =
  | "hook" // 시선을 끄는 첫 요소
  | "headline" // 핵심 주장
  | "support" // 보조 설명
  | "evidence" // 근거/데이터
  | "reveal" // 순차 공개 (framework items, list items)
  | "compare" // 비교 대상 등장
  | "transition" // 다음 씬으로의 전환 준비
  | "recap" // 요약/마무리
  | (string & {}); // 확장 가능

/**
 * Beat = 씬 내부의 시간 구간.
 * 각 beat는 시각 요소의 활성화 시점과 나레이션 구간을 정의한다.
 *
 * 설계 규칙:
 * - beats 배열은 startRatio 오름차순 정렬이어야 한다
 * - beats는 겹칠 수 없다 (gap은 허용 — gap에서는 마지막 상태 hold)
 * - 모든 beat의 합이 반드시 0~1 전체를 커버할 필요는 없다
 */
export interface Beat {
  /** beat 고유 ID. 씬 내에서 유일. */
  id: string;

  /** beat의 역할. 씬 타입별로 의미가 다르다. */
  role: BeatRole;

  /**
   * 씬 duration 대비 시작 비율 (0~1).
   * 실제 프레임 = Math.round(scene.durationFrames * startRatio)
   */
  startRatio: number;

  /**
   * 씬 duration 대비 종료 비율 (0~1).
   * endRatio > startRatio 필수.
   * 최소 beat 길이: endRatio - startRatio >= 0.12
   */
  endRatio: number;

  /**
   * 이 beat 구간에서 재생될 나레이션 텍스트.
   * 설정하면 씬의 narrationText를 beat 단위로 분할한 것.
   * 미설정이면 이 beat 구간에는 나레이션 없음 (시각 전용 beat).
   */
  narrationText?: string;

  /**
   * 이 beat에서 활성화(등장)할 시각 요소 키 목록.
   * 프리셋 씬: content 필드 이름 (예: "headline", "supportText")
   * VCL 씬: VCLElement.id (예: "headline-01")
   * 빈 배열이면 시각 변화 없이 나레이션만 진행.
   */
  activates: string[];

  /**
   * 이 beat에서 비활성화(퇴장)할 요소 키 목록.
   * 미설정이면 이전 beat의 요소는 계속 보인다 (누적 모드).
   */
  deactivates?: string[];

  /**
   * 이 beat에서 강조할 단어/구 목록.
   * activates와 별개 네임스페이스. 자막 하이라이트 등에 사용.
   */
  emphasisTargets?: string[];

  /** beat 진입 시 사용할 모션 프리셋 오버라이드. */
  motionPreset?: MotionPresetKey;

  /**
   * beat-level 모션 스타일. 기본: "enter" (등장).
   * "replace"는 이전 요소를 교체하며 등장.
   * "emphasis"는 이미 visible인 요소에 강조 효과만 추가.
   */
  transition?: "enter" | "replace" | "emphasis";

  /**
   * Fish Audio S2 감정 태그. [bracket] 문법.
   * 예: "[호기심 어린 톤으로]", "[pause]", "[emphasis]"
   * Fish Audio 경로에서만 TTS 텍스트에 삽입된다.
   * edge-tts/qwen3에서는 무시된다.
   */
  emotionTag?: string;
}

/**
 * 요소의 beat 기반 애니메이션 상태.
 * 요소는 항상 마운트 상태를 유지하고, state만 전이한다.
 */
export type ElementVisibility =
  | "hidden" // 아직 어떤 beat에서도 활성화되지 않음
  | "entering" // 활성화 beat에 진입한 직후 (모션 재생 중)
  | "visible" // 모션 완료, 계속 보이는 상태
  | "exiting" // deactivates에 의해 퇴장 모션 진행 중
  | "emphasized"; // 이미 visible인 요소에 강조 효과 적용 중

export interface ElementBeatState {
  visibility: ElementVisibility;
  /** 이 요소가 entering 상태가 된 프레임 */
  entryFrame: number;
  /** exiting이면 퇴장이 시작된 프레임 */
  exitFrame?: number;
  /** 현재 beat의 emphasisTargets에 해당하는 강조가 활성인지 */
  emphasis: boolean;
  /** entering/exiting 모션에 사용할 preset */
  motionPreset: MotionPresetKey;
}

/** useBeatTimeline 훅의 반환 타입 */
export interface BeatTimelineState {
  /** 현재 활성 beat (없으면 null = beat 사이 gap, 마지막 상태 hold) */
  activeBeat: Beat | null;
  /** 요소별 상태 */
  elementStates: Map<string, ElementBeatState>;
  /** 현재 beat의 진행률 0~1 */
  beatProgress: number;
  /** 현재 beat의 emphasisTargets */
  currentEmphasis: string[];
  /** P2-4: 현재 활성 emphasis 채널 (emphasis beat 기간 중 policy에 따라 결정) */
  activeChannels: Set<ChannelKey>;
  /** P2-4: emphasis 직후 recovery window (12f) 내인지 여부 */
  isInRecoveryWindow: boolean;
}

/** Phase B: TTS-resolved beat timing. Maps ratio-based beats to actual audio frames. */
export interface BeatTimingResolution {
  beatId: string;
  /** TTS audio-based resolved start frame */
  resolvedStartFrame: number;
  /** TTS audio-based resolved end frame */
  resolvedEndFrame: number;
  /** Original content JSON ratio (fallback reference) */
  originalStartRatio: number;
  /** Original content JSON ratio (fallback reference) */
  originalEndRatio: number;
}

// ---------------------------------------------------------------------------
// P2-3: NarrationSync types
// ---------------------------------------------------------------------------

/** Emphasis timing policy for sync — onset/hold/decay in frames */
export interface EmphasisTimingPolicy {
  onsetFrames: number;
  holdFrames: number;
  decayFrames: number;
}

/** Sync policy mode per scene type */
export type SyncPolicyMode = "concept" | "phrase" | "none";

/** useNarrationSync hook return type */
export interface NarrationSyncState {
  /** Currently spoken word from VTT captions (null if between words) */
  currentWord: string | null;
  /** Whether the current word matches an emphasisTarget */
  isEmphasisWord: boolean;
  /** Currently active emphasis targets (from beat timeline) */
  activeEmphasisTargets: string[];
  /** Emphasis progress 0~1 based on onset/hold/decay timing */
  emphasisProgress: number;
  /** The matched emphasis target string (null if no match) */
  matchedTarget: string | null;
}

// ---------------------------------------------------------------------------
// P2-4: Emphasis Channel Policy types
// ---------------------------------------------------------------------------

/** Emphasis response channel identifier */
export type ChannelKey = "sceneText" | "subtitle" | "background" | "camera";

/** Per-channel on/off policy for emphasis response */
export type ChannelPolicy = Record<ChannelKey, boolean>;

/** Emphasis style from BookArtDirection (P2-0) */
export type EmphasisStyle = "text-first" | "diagram-first" | "balanced";

// ---------------------------------------------------------------------------
// DSGS Stage 6.3: BeatComposer types
// ---------------------------------------------------------------------------

/** BeatComposer의 구조화된 설계 근거. 각 씬의 beat 설계 판단을 문서화한다. */
export interface BeatDesignRationale {
  /** 나레이션 분절 근거 (narration-segmentation.md 기반) */
  segmentationReason: string;
  /** evidenceCard 사용 판단 (evidence-rubric.md 기반) */
  evidenceDecision:
    | "included-A"
    | "included-B"
    | "excluded-C"
    | "not-applicable";
  /** 정보 밀도 판단 (beat당 평균 시각 사건 수) */
  densityDecision: string;
  /** 잠재적 위험 플래그 */
  riskFlags: string[];
}

/** BeatComposer Stage 6.3 출력: 씬별 beats + rationale */
export interface BeatPlanEntry {
  sceneId: string;
  sceneType: string;
  beats: Beat[];
  rationale: BeatDesignRationale;
  skipped: boolean;
  skipReason?: string;
}

/** 06.3-beat-plan.json artifact 전체 구조 */
export interface BeatPlanArtifact {
  bookId: string;
  generatedAt: string;
  totalScenes: number;
  processedScenes: number;
  skippedScenes: number;
  entries: BeatPlanEntry[];
}

// ---------------------------------------------------------------------------
// DSGS P1-5: DiagramSpec — visual metaphor → structured diagram specification
// Enables P2-1 (AnimatedPath, NodeActivation, ZoomFocus) consumption.
// ---------------------------------------------------------------------------

export type DiagramType =
  | "cycle" // circular processes (habit loop, feedback loop)
  | "flow" // linear/branching progressions (growth curve, funnel)
  | "split" // layered/divided views (iceberg, comparison)
  | "hierarchy" // tree structures
  | "network" // interconnected nodes
  | "timeline" // horizontal/vertical time progression
  | "pyramid" // stacked layers (Maslow, priority tiers)
  | "ladder" // TODO P2-1: sequential ascending steps
  | "hub-spoke" // TODO P2-1: center node with radiating connections
  | "matrix2x2" // TODO P2-1: 2x2 quadrant grid
  | "funnel"; // TODO P2-1: narrowing stages

export type ConnectionPattern =
  | "cyclic" // arrows form a loop
  | "linear" // start-to-end
  | "branching" // one-to-many
  | "layered" // stacked levels
  | "radial"; // center-outward

export type AnimationHint =
  | "path-draw" // SVG path drawing → AnimatedPath
  | "node-activate" // sequential node highlighting → NodeActivation
  | "fill-progress" // progressive fill/growth
  | "zoom-focus" // zoom into specific area → ZoomFocus
  | "split-reveal"; // two halves reveal

export type DiagramLayoutHint =
  | "circular"
  | "vertical-stack"
  | "horizontal-split"
  | "grid"
  | "freeform";

export type DiagramRevealMode = "trace" | "construct" | "cascade";
export type DiagramCompletionBehavior = "hold" | "zoom-node";

export interface DiagramSpec {
  diagramType: DiagramType;
  nodeCount?: number;
  /** P2-1f: 실제 노드 라벨 텍스트 (없으면 geometry builder 기본값 사용) */
  nodeLabels?: string[];
  connectionPattern: ConnectionPattern;
  animationHint: AnimationHint;
  layoutHint?: DiagramLayoutHint;
  sourceMetaphor: string;
  /** P2-1a: 다이어그램 요소 등장 방식 */
  revealMode?: DiagramRevealMode;
  /** P2-1a: 완성 후 행동 */
  completionBehavior?: DiagramCompletionBehavior;
}

// ---------------------------------------------------------------------------
// P2-2: CameraLayer types
// ---------------------------------------------------------------------------

/** Camera behavior mode for CameraLayer. */
export type CameraMode = "static" | "slow-zoom" | "guided";

/**
 * Normalized element position within a scene canvas (0~1 range).
 * Used by CameraLayer guided mode to compute camera target.
 * Blueprint scenes: derived from BlueprintRenderer's positionById Map.
 */
export interface SceneElementLayoutMeta {
  elementId: string;
  /** Normalized X anchor (0~1, where 0.5 = center) */
  anchorX: number;
  /** Normalized Y anchor (0~1, where 0.5 = center) */
  anchorY: number;
  /** Element width as ratio of canvas width (optional) */
  widthRatio?: number;
  /** Element height as ratio of canvas height (optional) */
  heightRatio?: number;
}

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

// ============================================================
// Planning Layer Integration
// ============================================================
import type { StoryboardScene } from "../planning/types";

export interface BlueprintMeta {
  _blueprint?: SceneBlueprint;
  _storyboard?: StoryboardScene;
}

// ─── Direction Layer (Phase 0) ──────────────────────────────
export type {
  SceneFamily,
  DirectionProfileName,
  DirectionParams,
  DirectionProfile,
  CompositionPath,
  ElementSpec as DirectionElementSpec,
  TransitionSpec,
  BeatProfile,
  BeatSegment,
  GapCandidate,
  SceneSpec,
} from "@/direction/types";
export type { BeatRole as DirectionBeatRole } from "@/direction/types";
