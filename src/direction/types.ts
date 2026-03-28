import type {
  SceneType,
  LayoutType,
  ChoreographyType,
  MotionPresetKey,
  GenreKey,
} from "@/types";

// ─── Scene Family ───────────────────────────────────────────
export type SceneFamily =
  | "opening-hook"
  | "concept-introduction"
  | "mechanism-explanation"
  | "system-model"
  | "tension-comparison"
  | "progression-journey"
  | "transformation-shift"
  | "evidence-stack"
  | "reflective-anchor"
  | "structural-bridge"
  | "closing-synthesis";

// ─── Direction ──────────────────────────────────────────────
export type DirectionProfileName =
  | "analytical"
  | "systematic"
  | "contemplative"
  | "persuasive"
  | "urgent"
  | "inspirational"
  | "investigative";

export interface DirectionParams {
  pacing: number;
  energy: number;
  emphasisDensity: number;
  holdRatio: number;
  revealPattern: "sequential" | "parallel" | "layered" | "suspense";
  transitionTension: number;
  subtitleCadence: "steady" | "syncopated" | "dramatic-pause";
}

export interface DirectionProfile {
  name: DirectionProfileName;
  base: DirectionParams;
}

// ─── Composition Path ───────────────────────────────────────
export type CompositionPath = "preset" | "composed" | "invented";

// ─── Element Spec ───────────────────────────────────────────
export interface ElementSpec {
  id: string;
  primitive: string;
  props: Record<string, unknown>;
  layer: number;
  beatActivationKey: string;
}

// ─── Transition Spec ────────────────────────────────────────
export interface TransitionSpec {
  type: "cut" | "crossfade" | "directional-wipe" | "zoom-bridge" | "hold-fade";
  duration: number;
  tension: number;
  direction?: "left" | "right" | "up" | "down";
}

// ─── Beat Profile ───────────────────────────────────────────
export type BeatRole =
  | "anchor"
  | "evidence"
  | "reveal"
  | "contrast"
  | "escalation"
  | "reflection"
  | "bridge"
  | (string & {});

export interface BeatProfile {
  segments: BeatSegment[];
  timingIntent: "even" | "front-loaded" | "back-loaded" | "climactic";
  emphasisStrategy: "single-peak" | "distributed" | "escalating";
}

export interface BeatSegment {
  id: string;
  role: BeatRole;
  narrationText: string;
  semanticWeight: number;
  emotionalIntensity: number;
  startRatio: number;
  endRatio: number;
  activates: string[];
  emphasisTargets: string[];
  transition: "enter" | "replace" | "emphasis" | "hold" | "exit";
}

// ─── Gap Candidate ──────────────────────────────────────────
export interface GapCandidate {
  sceneId: string;
  family: SceneFamily;
  unmetNeed: string;
  requiredVisualGrammar: string[];
  confidence: number;
}

// ─── SceneSpec — 5-Layer 공통 계약 ──────────────────────────
export interface SceneSpec {
  id: string;
  family: SceneFamily;
  intent: string;

  layout: LayoutType;
  elements: ElementSpec[];
  choreography: ChoreographyType;

  direction: DirectionProfile;
  directionOverrides?: Partial<DirectionParams>;

  beatProfile?: BeatProfile;

  durationStrategy?: {
    mode: "tts-driven" | "beat-driven" | "hybrid" | "fixed";
    minFrames?: number;
    maxFrames?: number;
  };

  transitionIn?: TransitionSpec;
  transitionOut?: TransitionSpec;

  source: CompositionPath;
  confidence: number;
  fallbackPreset?: SceneType;

  narrationText: string;
  content: Record<string, unknown>;

  interpretationMeta?: {
    derivedFrom: string[];
    whyThisFamily?: string;
    whyThisDirection?: string;
  };

  constraintHints?: {
    maxDensity?: number;
    accentBudget?: number;
    subtitleMode?: "standard" | "minimal";
  };

  brandValidation?: {
    status: "pending" | "passed" | "failed";
    violations?: string[];
  };
}
