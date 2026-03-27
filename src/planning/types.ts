import type {
  BookFingerprint,
  SceneBlueprint,
  BookContent,
  GenreKey,
  FormatKey,
  SceneType,
  TypedScene,
  MotionPresetKey,
  ThemeMode,
  Theme,
  DiagramSpec,
} from "@/types";

// ============================================================
// 01. Editorial Outline
// ============================================================
export interface EditorialOutline {
  bookId: string;
  oneLiner: string;
  targetAudience: string;
  hookAngle: string;
  coreMessages: string[];
  excludedTopics: string[];
  targetDurationSeconds: number;
  toneKeywords: string[];
  narrativeArc:
    | "linear"
    | "problem-solution"
    | "transformation"
    | "framework-driven";
}

// ============================================================
// 02. Book Art Direction
// ============================================================
export interface BookArtDirection {
  bookId: string;
  palette: {
    primary: string;
    secondary: string;
    contrast: "high" | "medium" | "low";
  };
  signalColor: string;
  shapeLanguage: "geometric" | "organic" | "angular" | "minimal" | "mixed";
  textureMood: "grain" | "clean" | "paper" | "noise" | "none";
  visualMetaphors: Array<{
    concept: string;
    metaphor: string;
    usage: string;
  }>;
  layoutBias: "centered" | "asymmetric" | "grid-heavy" | "flow";
  motionCharacter: "precise" | "fluid" | "weighted" | "snappy";
  typographyMood: "editorial" | "technical" | "warm" | "bold";
}

// ============================================================
// 03. Storyboard (핵심 중간 계약)
// ============================================================
export interface StoryboardPlan {
  bookId: string;
  totalScenes: number;
  estimatedDurationSeconds: number;
  scenes: StoryboardScene[];
}

export interface StoryboardScene {
  sceneId: string;
  order: number;
  purpose: string;
  narrativeGoal: string;
  visualFunction: VisualFunction;
  visualIntent: string;
  layoutMode: string;
  targetDurationSeconds: number;
  onScreenText: string[];
  /** 이 씬 → 다음 씬 전환 의도. 실제 transition 구현은 composition 레벨에서 소비 */
  transitionIntent: "cut" | "fade" | "directional" | "morph";
  renderMode: "preset" | "blueprint";
  presetSceneType?: SceneType;
  blueprintId?: string;
}

export type VisualFunction =
  | "hook"
  | "explain"
  | "compare"
  | "reveal-relation"
  | "process"
  | "evidence"
  | "compress-recap"
  | "transition"
  | "framework"
  | "quote"
  | "data";

// ============================================================
// 04. Asset Inventory
// ============================================================
export interface AssetInventory {
  bookId: string;
  required: PlanningAssetRequirement[];
  reusable: string[];
}

export interface PlanningAssetRequirement {
  id: string;
  type: "svg" | "icon" | "diagram" | "texture" | "cover";
  description: string;
  usedInScenes: string[];
  status: "needed" | "placeholder" | "ready";
  fallbackStrategy: "text-only" | "shape-placeholder" | "generic-library";
  diagramSpec?: DiagramSpec;
}

// ============================================================
// 05. Motion Plan
// ============================================================
export interface MotionPlan {
  bookId: string;
  globalMotionCharacter: MotionPresetKey;
  sceneMotions: SceneMotionPlan[];
}

export interface SceneMotionPlan {
  sceneId: string;
  choreographyType:
    | "sequential-reveal"
    | "accumulation"
    | "comparison-shift"
    | "orbit"
    | "compression"
    | "cascade"
    | "standard-stagger";
  inSceneLoops: boolean;
  activeStateBehavior: "dim-others" | "scale-focus" | "none";
  motionPresetOverride?: MotionPresetKey;
  notes: string;
}

// ============================================================
// Theme Resolver
// ============================================================
export interface BookThemeOverrides {
  signalColor?: string;
  accentColor?: string;
  motionCharacter?: BookArtDirection["motionCharacter"];
}

// ============================================================
// Plan Bridge
// ============================================================
export interface BookPlan {
  fingerprint: BookFingerprint;
  outline: EditorialOutline;
  artDirection: BookArtDirection;
  storyboard: StoryboardPlan;
  assetInventory: AssetInventory;
  motionPlan: MotionPlan;
  blueprints: Record<string, SceneBlueprint>;
}

export interface ResolvedScene {
  sceneId: string;
  renderMode: "preset" | "blueprint";
  presetScene?: TypedScene;
  blueprint?: SceneBlueprint;
  order: number;
  targetDurationSeconds: number;
  storyboardEntry?: StoryboardScene;
}

export interface PlanBridgeResult {
  bookId: string;
  theme: Theme;
  resolvedScenes: ResolvedScene[];
  hasPlan: boolean;
  artInfluence?: import("./theme-resolver").ResolvedArtInfluence;
}

// ============================================================
// Validation
// ============================================================
export type ValidationPhase =
  | "schema"
  | "duration"
  | "assets"
  | "blueprints"
  | "quality-gate";

export interface PlanValidationResult {
  phase: ValidationPhase;
  status: "pass" | "warn" | "fail";
  timestamp: string;
  checks: PlanValidationCheck[];
}

export interface PlanValidationCheck {
  id: string;
  level: "BLOCKED" | "WARN" | "INFO";
  passed: boolean;
  message: string;
  sceneId?: string;
  context?: Record<string, unknown>;
}
