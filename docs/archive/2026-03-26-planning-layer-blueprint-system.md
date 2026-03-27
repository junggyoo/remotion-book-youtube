# Planning Layer + Blueprint System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a planning layer that generates per-book art direction and storyboard documents, and connect 2 custom blueprint scenes to the existing render pipeline for atomic-habits.

**Architecture:** Planning artifacts live in `generated/books/{book-id}/` as JSON (source of truth) + MD mirrors. A `plan-bridge` module loads these at build time and overlays `renderMode` on the content JSON scene list. Scenes marked `blueprint` route to the existing `BlueprintRenderer`; all others fall through to existing `Scene.tsx` components unchanged.

**Tech Stack:** TypeScript, Zod (validation), Remotion 4, existing design token system

**Key existing infrastructure (do NOT recreate):**

- `src/renderer/BlueprintRenderer.tsx` — full VCL engine already works
- `src/compositions/LongformComposition.tsx` — already has `case "custom"` → BlueprintRenderer
- `src/types/index.ts` — BookFingerprint, SceneBlueprint, SynthesizedBlueprint, VCLElement types exist
- `src/pipeline/durationBudget.ts` — CPS-based budget calculator exists
- `src/design/themes/useTheme.ts` — pure function (not a React hook), returns Theme object

---

## File Map

### New Files (17)

| File                                                | Responsibility                                                                 |
| --------------------------------------------------- | ------------------------------------------------------------------------------ |
| `src/planning/types.ts`                             | Planning-only types (EditorialOutline, BookArtDirection, StoryboardPlan, etc.) |
| `src/planning/schemas.ts`                           | Zod schemas for all 6 planning artifact types                                  |
| `src/planning/loaders/load-book-plan.ts`            | Read `generated/books/{id}/` → BookPlan object                                 |
| `src/planning/loaders/save-book-plan.ts`            | Write JSON + auto-generate MD mirrors                                          |
| `src/planning/theme-resolver.ts`                    | Overlay BookArtDirection onto base Theme (signal + accent)                     |
| `src/planning/blueprint-resolver.ts`                | Load blueprint JSON by sceneId                                                 |
| `src/planning/plan-bridge.ts`                       | Single entry point: load plan → classify scenes by renderMode                  |
| `src/planning/validators/validate-fingerprint.ts`   | BookFingerprint schema checks                                                  |
| `src/planning/validators/validate-outline.ts`       | EditorialOutline schema checks                                                 |
| `src/planning/validators/validate-art-direction.ts` | BookArtDirection schema checks                                                 |
| `src/planning/validators/validate-storyboard.ts`    | Cross-validation: storyboard ↔ content JSON                                    |
| `src/planning/validators/validate-duration.ts`      | Time budget consistency                                                        |
| `src/planning/validators/validate-assets.ts`        | Asset inventory status checks                                                  |
| `src/planning/validators/validate-blueprints.ts`    | Blueprint ↔ storyboard consistency                                             |
| `src/planning/validators/validate-quality-gate.ts`  | Planning completeness report                                                   |
| `src/planning/index.ts`                             | Barrel export                                                                  |
| `scripts/validate-plan.ts`                          | CLI entry point for plan validation                                            |

### New Infrastructure (1)

| File                                    | Responsibility                                      |
| --------------------------------------- | --------------------------------------------------- |
| `src/design/themes/resolveBaseTheme.ts` | Pure theme factory re-export for non-React contexts |

### Modified Files (3)

| File                                       | Change                                                                                        |
| ------------------------------------------ | --------------------------------------------------------------------------------------------- |
| `src/types/index.ts`                       | Add `PlannedSceneWithBlueprint` intersection type + re-export `StoryboardScene` from planning |
| `src/pipeline/buildProps.ts`               | Call `resolvePlanBridge()`, attach `_blueprint` meta to relevant scenes                       |
| `src/compositions/LongformComposition.tsx` | Add blueprint guard before switch statement in SceneRenderer                                  |

### Generated Artifacts (11, Claude Code authored)

| File                                                                      | Content          |
| ------------------------------------------------------------------------- | ---------------- |
| `generated/books/atomic-habits/00-fingerprint.json`                       | BookFingerprint  |
| `generated/books/atomic-habits/01-editorial-outline.json`                 | EditorialOutline |
| `generated/books/atomic-habits/01-editorial-outline.md`                   | MD mirror (auto) |
| `generated/books/atomic-habits/02-art-direction.json`                     | BookArtDirection |
| `generated/books/atomic-habits/02-art-direction.md`                       | MD mirror (auto) |
| `generated/books/atomic-habits/03-storyboard.json`                        | StoryboardPlan   |
| `generated/books/atomic-habits/03-storyboard.md`                          | MD mirror (auto) |
| `generated/books/atomic-habits/04-asset-inventory.json`                   | AssetInventory   |
| `generated/books/atomic-habits/05-motion-plan.json`                       | MotionPlan       |
| `generated/books/atomic-habits/06-blueprints/hook-01.blueprint.json`      | SceneBlueprint   |
| `generated/books/atomic-habits/06-blueprints/framework-01.blueprint.json` | SceneBlueprint   |

---

## Task 1: Planning Types

**Files:**

- Create: `src/planning/types.ts`

- [ ] **Step 1: Create the planning types file**

Write `src/planning/types.ts` with all planning-layer types. Import existing types from `@/types` — do NOT redefine BookFingerprint, SceneBlueprint, etc.

```typescript
// src/planning/types.ts
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
  required: AssetRequirement[];
  reusable: string[];
}

export interface AssetRequirement {
  id: string;
  type: "svg" | "icon" | "diagram" | "texture" | "cover";
  description: string;
  usedInScenes: string[];
  status: "needed" | "placeholder" | "ready";
  fallbackStrategy: "text-only" | "shape-placeholder" | "generic-library";
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

export interface ValidationResult {
  phase: ValidationPhase;
  status: "pass" | "warn" | "fail";
  timestamp: string;
  checks: ValidationCheck[];
}

export interface ValidationCheck {
  id: string;
  level: "BLOCKED" | "WARN" | "INFO";
  passed: boolean;
  message: string;
  sceneId?: string;
  context?: Record<string, unknown>;
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit src/planning/types.ts 2>&1 | head -20`

Expected: No errors (or only path alias errors which are resolved by tsconfig).

- [ ] **Step 3: Commit**

```bash
git add src/planning/types.ts
git commit -m "feat(planning): add planning layer type definitions

Defines EditorialOutline, BookArtDirection, StoryboardPlan,
AssetInventory, MotionPlan, and validation types.
Imports existing DSGS types from @/types — no duplication."
```

---

## Task 2: Zod Schemas for Planning Artifacts

**Files:**

- Create: `src/planning/schemas.ts`

- [ ] **Step 1: Create Zod schemas**

Write `src/planning/schemas.ts`. Each schema validates one planning artifact JSON file.

```typescript
// src/planning/schemas.ts
import { z } from "zod";

const HexColor = z
  .string()
  .regex(/^#[0-9a-fA-F]{6}$/, "Must be a valid hex color (#RRGGBB)");

// ============================================================
// 00. Fingerprint (validates existing BookFingerprint shape)
// ============================================================
export const FingerprintSchema = z.object({
  genre: z.string().min(1),
  subGenre: z.string().optional(),
  structure: z.string().optional(),
  coreFramework: z.string().optional(),
  keyConceptCount: z.number().int().min(1).optional(),
  emotionalTone: z.string().optional(),
  narrativeArcType: z.string().optional(),
  urgencyLevel: z.string().optional(),
  visualMotifs: z.array(z.string()).optional(),
  spatialMetaphors: z.array(z.string()).optional(),
  hookStrategy: z.string().min(1),
  entryAngle: z.string().optional(),
  uniqueElements: z.array(z.string()).optional(),
  contentMode: z.string().optional(),
});

// ============================================================
// 01. Editorial Outline
// ============================================================
export const EditorialOutlineSchema = z.object({
  bookId: z.string().min(1),
  oneLiner: z.string().min(1),
  targetAudience: z.string().min(1),
  hookAngle: z.string().min(1),
  coreMessages: z.array(z.string()).min(1).max(7),
  excludedTopics: z.array(z.string()),
  targetDurationSeconds: z.number().positive(),
  toneKeywords: z.array(z.string()),
  narrativeArc: z.enum([
    "linear",
    "problem-solution",
    "transformation",
    "framework-driven",
  ]),
});

// ============================================================
// 02. Art Direction
// ============================================================
export const BookArtDirectionSchema = z.object({
  bookId: z.string().min(1),
  palette: z.object({
    primary: HexColor,
    secondary: HexColor,
    contrast: z.enum(["high", "medium", "low"]),
  }),
  signalColor: HexColor,
  shapeLanguage: z.enum([
    "geometric",
    "organic",
    "angular",
    "minimal",
    "mixed",
  ]),
  textureMood: z.enum(["grain", "clean", "paper", "noise", "none"]),
  visualMetaphors: z.array(
    z.object({
      concept: z.string(),
      metaphor: z.string(),
      usage: z.string(),
    }),
  ),
  layoutBias: z.enum(["centered", "asymmetric", "grid-heavy", "flow"]),
  motionCharacter: z.enum(["precise", "fluid", "weighted", "snappy"]),
  typographyMood: z.enum(["editorial", "technical", "warm", "bold"]),
});

// ============================================================
// 03. Storyboard
// ============================================================
export const StoryboardSceneSchema = z.object({
  sceneId: z.string().min(1),
  order: z.number().int().min(0),
  purpose: z.string().min(1),
  narrativeGoal: z.string().min(1),
  visualFunction: z.enum([
    "hook",
    "explain",
    "compare",
    "reveal-relation",
    "process",
    "evidence",
    "compress-recap",
    "transition",
    "framework",
    "quote",
    "data",
  ]),
  visualIntent: z.string(),
  layoutMode: z.string(),
  targetDurationSeconds: z.number().positive(),
  onScreenText: z.array(z.string()),
  transitionIntent: z.enum(["cut", "fade", "directional", "morph"]),
  renderMode: z.enum(["preset", "blueprint"]),
  presetSceneType: z.string().optional(),
  blueprintId: z.string().optional(),
});

export const StoryboardPlanSchema = z.object({
  bookId: z.string().min(1),
  totalScenes: z.number().int().positive(),
  estimatedDurationSeconds: z.number().positive(),
  scenes: z.array(StoryboardSceneSchema).min(1),
});

// ============================================================
// 04. Asset Inventory
// ============================================================
export const AssetInventorySchema = z.object({
  bookId: z.string().min(1),
  required: z.array(
    z.object({
      id: z.string().min(1),
      type: z.enum(["svg", "icon", "diagram", "texture", "cover"]),
      description: z.string(),
      usedInScenes: z.array(z.string()),
      status: z.enum(["needed", "placeholder", "ready"]),
      fallbackStrategy: z.enum([
        "text-only",
        "shape-placeholder",
        "generic-library",
      ]),
    }),
  ),
  reusable: z.array(z.string()),
});

// ============================================================
// 05. Motion Plan
// ============================================================
export const MotionPlanSchema = z.object({
  bookId: z.string().min(1),
  globalMotionCharacter: z.string(),
  sceneMotions: z.array(
    z.object({
      sceneId: z.string().min(1),
      choreographyType: z.enum([
        "sequential-reveal",
        "accumulation",
        "comparison-shift",
        "orbit",
        "compression",
        "cascade",
        "standard-stagger",
      ]),
      inSceneLoops: z.boolean(),
      activeStateBehavior: z.enum(["dim-others", "scale-focus", "none"]),
      motionPresetOverride: z.string().optional(),
      notes: z.string(),
    }),
  ),
});
```

- [ ] **Step 2: Verify import and compile**

Run: `npx tsc --noEmit src/planning/schemas.ts 2>&1 | head -20`

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/planning/schemas.ts
git commit -m "feat(planning): add Zod schemas for planning artifact validation"
```

---

## Task 3: PlannedSceneWithBlueprint Type + resolveBaseTheme

**Files:**

- Modify: `src/types/index.ts` (append ~15 lines at end)
- Create: `src/design/themes/resolveBaseTheme.ts`

- [ ] **Step 1: Add PlannedSceneWithBlueprint to types/index.ts**

Append at the end of `src/types/index.ts`:

```typescript
// ============================================================
// Planning Layer Integration
// ============================================================
import type { StoryboardScene } from "@/planning/types";

export type PlannedSceneWithBlueprint = PlannedScene & {
  _blueprint?: SceneBlueprint;
  _storyboard?: StoryboardScene;
};
```

Note: `PlannedScene` is defined in `src/pipeline/buildProps.ts` as `TypedScene & { from: number; resolvedDuration: number; tts?: TTSResult; subtitles?: SubtitleEntry[] }`. Since types/index.ts doesn't currently import PlannedScene, use a local redefinition or import. Check if PlannedScene is already exported from types — if not, define the intersection inline:

```typescript
// If PlannedScene is not in types/index.ts, use this instead:
export interface BlueprintMeta {
  _blueprint?: SceneBlueprint;
  _storyboard?: StoryboardScene;
}
```

The buildProps.ts file will use `PlannedScene & BlueprintMeta` at the attachment site.

- [ ] **Step 2: Create resolveBaseTheme.ts**

`useTheme()` in `src/design/themes/useTheme.ts` is already a pure function (no React hooks). Create a re-export with the correct name for non-React contexts:

```typescript
// src/design/themes/resolveBaseTheme.ts
import type { ThemeMode, GenreKey, Theme } from "@/types";
import { colors } from "@/design/tokens/colors";

/**
 * Pure theme factory — identical logic to useTheme() but named for
 * non-React contexts (pipeline, planning, resolvers).
 *
 * Use resolveBaseTheme() in: src/planning/, src/pipeline/, resolvers
 * Use useTheme() in: src/scenes/, src/compositions/ (React components)
 */
export function resolveBaseTheme(mode: ThemeMode, genre: GenreKey): Theme {
  const semantic = colors.semantic[mode];
  const genreVariant = colors.genreVariants[genre];

  return {
    mode,
    genre,
    bg: semantic.bg,
    surface: semantic.surface,
    surfaceMuted: semantic.surfaceMuted,
    textStrong: semantic.textStrong,
    textMuted: semantic.textMuted,
    lineSubtle: semantic.lineSubtle,
    signal: colors.brand.cobaltBlue,
    accent: genreVariant.accent,
    premium: colors.brand.softGold,
  };
}
```

- [ ] **Step 3: Verify compile**

Run: `npx tsc --noEmit src/design/themes/resolveBaseTheme.ts 2>&1 | head -10`

Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add src/types/index.ts src/design/themes/resolveBaseTheme.ts
git commit -m "feat(planning): add BlueprintMeta type and resolveBaseTheme pure factory"
```

---

## Task 4: Loaders (load-book-plan + save-book-plan)

**Files:**

- Create: `src/planning/loaders/load-book-plan.ts`
- Create: `src/planning/loaders/save-book-plan.ts`

- [ ] **Step 1: Create load-book-plan.ts**

```typescript
// src/planning/loaders/load-book-plan.ts
import { existsSync, readFileSync, readdirSync } from "fs";
import path from "path";
import type { BookFingerprint, SceneBlueprint } from "@/types";
import type {
  BookPlan,
  EditorialOutline,
  BookArtDirection,
  StoryboardPlan,
  AssetInventory,
  MotionPlan,
} from "../types";

const GENERATED_ROOT = path.resolve("generated/books");

function readJsonOrNull<T>(filePath: string): T | null {
  if (!existsSync(filePath)) return null;
  return JSON.parse(readFileSync(filePath, "utf-8")) as T;
}

/**
 * Load all planning artifacts for a book.
 * Returns null if the generated directory does not exist or
 * if the minimum required files (fingerprint + storyboard) are missing.
 */
export function loadBookPlan(bookId: string): BookPlan | null {
  const bookDir = path.join(GENERATED_ROOT, bookId);
  if (!existsSync(bookDir)) return null;

  const fingerprint = readJsonOrNull<BookFingerprint>(
    path.join(bookDir, "00-fingerprint.json"),
  );
  const storyboard = readJsonOrNull<StoryboardPlan>(
    path.join(bookDir, "03-storyboard.json"),
  );

  // Minimum requirement: fingerprint + storyboard must exist
  if (!fingerprint || !storyboard) return null;

  const outline = readJsonOrNull<EditorialOutline>(
    path.join(bookDir, "01-editorial-outline.json"),
  );
  const artDirection = readJsonOrNull<BookArtDirection>(
    path.join(bookDir, "02-art-direction.json"),
  );
  const assetInventory = readJsonOrNull<AssetInventory>(
    path.join(bookDir, "04-asset-inventory.json"),
  );
  const motionPlan = readJsonOrNull<MotionPlan>(
    path.join(bookDir, "05-motion-plan.json"),
  );

  // Load blueprints from 06-blueprints/
  const blueprints: Record<string, SceneBlueprint> = {};
  const blueprintsDir = path.join(bookDir, "06-blueprints");
  if (existsSync(blueprintsDir)) {
    for (const file of readdirSync(blueprintsDir)) {
      if (!file.endsWith(".blueprint.json")) continue;
      const id = file.replace(".blueprint.json", "");
      const bp = readJsonOrNull<SceneBlueprint>(path.join(blueprintsDir, file));
      if (bp) blueprints[id] = bp;
    }
  }

  return {
    fingerprint,
    outline: outline!,
    artDirection: artDirection!,
    storyboard,
    assetInventory: assetInventory ?? { bookId, required: [], reusable: [] },
    motionPlan: motionPlan ?? {
      bookId,
      globalMotionCharacter: "smooth",
      sceneMotions: [],
    },
    blueprints,
  };
}
```

- [ ] **Step 2: Create save-book-plan.ts**

```typescript
// src/planning/loaders/save-book-plan.ts
import { existsSync, mkdirSync, writeFileSync } from "fs";
import path from "path";

const GENERATED_ROOT = path.resolve("generated/books");

/**
 * Save a planning artifact as JSON and generate an MD mirror.
 *
 * @param bookId - Book identifier (directory name)
 * @param filename - e.g. "00-fingerprint" (without extension)
 * @param data - JSON-serializable object
 * @param generateMd - Whether to generate .md mirror (default: true for 01~03)
 */
export function savePlanArtifact(
  bookId: string,
  filename: string,
  data: unknown,
  generateMd = false,
): void {
  const bookDir = path.join(GENERATED_ROOT, bookId);
  if (!existsSync(bookDir)) mkdirSync(bookDir, { recursive: true });

  const jsonPath = path.join(bookDir, `${filename}.json`);
  const jsonContent = JSON.stringify(data, null, 2);
  writeFileSync(jsonPath, jsonContent, "utf-8");

  if (generateMd) {
    const mdPath = path.join(bookDir, `${filename}.md`);
    const mdContent = jsonToMarkdown(filename, data);
    writeFileSync(mdPath, mdContent, "utf-8");
  }
}

/**
 * Save a blueprint JSON to 06-blueprints/.
 */
export function saveBlueprintArtifact(
  bookId: string,
  blueprintId: string,
  data: unknown,
): void {
  const dir = path.join(GENERATED_ROOT, bookId, "06-blueprints");
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });

  const jsonPath = path.join(dir, `${blueprintId}.blueprint.json`);
  writeFileSync(jsonPath, JSON.stringify(data, null, 2), "utf-8");
}

/**
 * Save a validation result to .validation/.
 */
export function saveValidationResult(
  bookId: string,
  phase: string,
  data: unknown,
): void {
  const dir = path.join(GENERATED_ROOT, bookId, ".validation");
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });

  const jsonPath = path.join(dir, `${phase}.json`);
  writeFileSync(jsonPath, JSON.stringify(data, null, 2), "utf-8");
}

// --- MD Mirror Generator ---

function jsonToMarkdown(filename: string, data: unknown): string {
  const title = filename.replace(/^\d+-/, "").replace(/-/g, " ");
  const lines: string[] = [`# ${capitalize(title)}`, ""];

  if (typeof data === "object" && data !== null) {
    for (const [key, value] of Object.entries(
      data as Record<string, unknown>,
    )) {
      if (Array.isArray(value)) {
        lines.push(`## ${key}`, "");
        for (const item of value) {
          if (typeof item === "object" && item !== null) {
            const summary = Object.values(item as Record<string, unknown>)
              .slice(0, 3)
              .join(" | ");
            lines.push(`- ${summary}`);
          } else {
            lines.push(`- ${String(item)}`);
          }
        }
        lines.push("");
      } else if (typeof value === "object" && value !== null) {
        lines.push(`## ${key}`, "");
        for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
          lines.push(`- **${k}:** ${String(v)}`);
        }
        lines.push("");
      } else {
        lines.push(`**${key}:** ${String(value)}`, "");
      }
    }
  }

  lines.push(
    "---",
    `> Auto-generated from ${filename}.json. JSON is source of truth.`,
  );
  return lines.join("\n");
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
```

- [ ] **Step 3: Verify compile**

Run: `npx tsc --noEmit src/planning/loaders/load-book-plan.ts src/planning/loaders/save-book-plan.ts 2>&1 | head -10`

Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add src/planning/loaders/
git commit -m "feat(planning): add load-book-plan and save-book-plan loaders"
```

---

## Task 5: Theme Resolver + Blueprint Resolver

**Files:**

- Create: `src/planning/theme-resolver.ts`
- Create: `src/planning/blueprint-resolver.ts`

- [ ] **Step 1: Create theme-resolver.ts**

```typescript
// src/planning/theme-resolver.ts
import type { ThemeMode, GenreKey, Theme } from "@/types";
import { resolveBaseTheme } from "@/design/themes/resolveBaseTheme";
import type { BookArtDirection, BookThemeOverrides } from "./types";

/**
 * Compose brand core theme + book-specific overrides.
 *
 * Layers:
 *   1. Brand Core (resolveBaseTheme) — bg, text, line, premium
 *   2. Genre Variant — accent
 *   3. Book Overrides — signal + accent only (1차)
 */
export function resolveBookTheme(
  mode: ThemeMode,
  genre: GenreKey,
  artDirection?: BookArtDirection,
): Theme {
  const base = resolveBaseTheme(mode, genre);

  if (!artDirection) return base;

  const overrides = extractThemeOverrides(artDirection);

  return {
    ...base,
    ...(overrides.signalColor && { signal: overrides.signalColor }),
    ...(overrides.accentColor && { accent: overrides.accentColor }),
  };
}

function extractThemeOverrides(
  artDirection: BookArtDirection,
): BookThemeOverrides {
  return {
    signalColor: artDirection.signalColor,
    accentColor: artDirection.palette.primary,
    motionCharacter: artDirection.motionCharacter,
  };
}
```

- [ ] **Step 2: Create blueprint-resolver.ts**

```typescript
// src/planning/blueprint-resolver.ts
import { existsSync, readFileSync } from "fs";
import path from "path";
import type { SceneBlueprint } from "@/types";

const GENERATED_ROOT = path.resolve("generated/books");

/**
 * Load a blueprint JSON by bookId and blueprintId.
 * Throws on missing file (fail-fast — validated before render).
 */
export function resolveBlueprint(
  bookId: string,
  blueprintId: string,
): SceneBlueprint {
  const blueprintPath = path.join(
    GENERATED_ROOT,
    bookId,
    "06-blueprints",
    `${blueprintId}.blueprint.json`,
  );

  if (!existsSync(blueprintPath)) {
    throw new Error(
      `Blueprint not found: ${blueprintPath}\n` +
        `Hint: blueprintId="${blueprintId}" in storyboard must match a file in 06-blueprints/`,
    );
  }

  return JSON.parse(readFileSync(blueprintPath, "utf-8")) as SceneBlueprint;
}

/**
 * List all blueprint IDs in a book's 06-blueprints/ directory.
 */
export function listBlueprints(bookId: string): string[] {
  const { readdirSync } = require("fs");
  const dir = path.join(GENERATED_ROOT, bookId, "06-blueprints");
  if (!existsSync(dir)) return [];

  return (readdirSync(dir) as string[])
    .filter((f: string) => f.endsWith(".blueprint.json"))
    .map((f: string) => f.replace(".blueprint.json", ""));
}
```

- [ ] **Step 3: Verify compile**

Run: `npx tsc --noEmit src/planning/theme-resolver.ts src/planning/blueprint-resolver.ts 2>&1 | head -10`

Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add src/planning/theme-resolver.ts src/planning/blueprint-resolver.ts
git commit -m "feat(planning): add theme-resolver and blueprint-resolver"
```

---

## Task 6: Plan Bridge

**Files:**

- Create: `src/planning/plan-bridge.ts`

- [ ] **Step 1: Create plan-bridge.ts**

```typescript
// src/planning/plan-bridge.ts
import type {
  BookContent,
  TypedScene,
  Theme,
  FormatKey,
  SceneBlueprint,
} from "@/types";
import type { PlanBridgeResult, ResolvedScene, StoryboardScene } from "./types";
import { loadBookPlan } from "./loaders/load-book-plan";
import { resolveBookTheme } from "./theme-resolver";
import { resolveBlueprint } from "./blueprint-resolver";
import { resolveBaseTheme } from "@/design/themes/resolveBaseTheme";

/**
 * Single entry point: load planning artifacts and classify scenes.
 *
 * Rules:
 * - Scene order = content JSON (source of truth), NOT storyboard
 * - Storyboard is partial overlay: only matched sceneIds get planning meta
 * - Scenes not in storyboard → automatic renderMode: 'preset'
 * - hasPlan=false → 100% existing render path
 */
export function resolvePlanBridge(
  book: BookContent,
  format: FormatKey,
): PlanBridgeResult {
  const bookId = book.metadata.id;
  const themeMode = book.production?.themeMode ?? "dark";
  const genre = book.production?.genreOverride ?? book.metadata.genre;

  const plan = loadBookPlan(bookId);

  if (!plan) {
    return {
      bookId,
      theme: resolveBaseTheme(themeMode, genre),
      resolvedScenes: book.scenes.map((scene, i) => ({
        sceneId: scene.id,
        renderMode: "preset" as const,
        presetScene: scene,
        order: i,
        targetDurationSeconds: 0,
      })),
      hasPlan: false,
    };
  }

  // Build storyboard lookup by sceneId
  const storyboardMap = new Map<string, StoryboardScene>();
  for (const entry of plan.storyboard.scenes) {
    storyboardMap.set(entry.sceneId, entry);
  }

  // Theme with book overrides
  const theme = resolveBookTheme(themeMode, genre, plan.artDirection);

  // Resolve each scene from content JSON order
  const resolvedScenes: ResolvedScene[] = book.scenes.map((scene, i) => {
    const storyEntry = storyboardMap.get(scene.id);

    if (
      storyEntry &&
      storyEntry.renderMode === "blueprint" &&
      storyEntry.blueprintId
    ) {
      const blueprint = resolveBlueprint(bookId, storyEntry.blueprintId);
      return {
        sceneId: scene.id,
        renderMode: "blueprint" as const,
        blueprint,
        order: i,
        targetDurationSeconds: storyEntry.targetDurationSeconds,
        storyboardEntry: storyEntry,
      };
    }

    return {
      sceneId: scene.id,
      renderMode: "preset" as const,
      presetScene: scene,
      order: i,
      targetDurationSeconds: storyEntry?.targetDurationSeconds ?? 0,
      storyboardEntry: storyEntry,
    };
  });

  return { bookId, theme, resolvedScenes, hasPlan: true };
}
```

- [ ] **Step 2: Verify compile**

Run: `npx tsc --noEmit src/planning/plan-bridge.ts 2>&1 | head -10`

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/planning/plan-bridge.ts
git commit -m "feat(planning): add plan-bridge — planning <-> render boundary"
```

---

## Task 7: buildProps.ts Integration

**Files:**

- Modify: `src/pipeline/buildProps.ts`

- [ ] **Step 1: Add plan-bridge call to buildProps.ts**

Add import at top of `src/pipeline/buildProps.ts`:

```typescript
import { resolvePlanBridge } from "@/planning/plan-bridge";
import type { SceneBlueprint } from "@/types";
import type { StoryboardScene } from "@/planning/types";
```

Replace the theme resolution line (line 45):

```typescript
// BEFORE:
const theme = useTheme(themeMode, genre);

// AFTER:
const planResult = resolvePlanBridge(
  book,
  format === "both" ? "longform" : format,
);
const theme = planResult.theme;
```

After the `scenes` mapping (after the `.map()` that attaches tts/subtitles, around line 59), add blueprint meta attachment:

```typescript
// Attach blueprint meta from planning layer
const scenesWithBlueprints = scenes.map((scene) => {
  if (!planResult.hasPlan) return scene;

  const resolved = planResult.resolvedScenes.find(
    (r) => r.sceneId === scene.id,
  );

  if (resolved?.renderMode === "blueprint" && resolved.blueprint) {
    return {
      ...scene,
      _blueprint: resolved.blueprint as SceneBlueprint,
      _storyboard: resolved.storyboardEntry as StoryboardScene,
    };
  }
  return scene;
});
```

Update the return to use `scenesWithBlueprints` instead of `scenes`:

```typescript
return {
  scenes: scenesWithBlueprints,
  totalDurationFrames,
  // ... rest unchanged
};
```

- [ ] **Step 2: Verify existing render still works (no planning artifacts)**

Run: `npx tsc --noEmit 2>&1 | head -20`

Expected: No type errors. Since no `generated/books/` directory exists for most books, `hasPlan` will be `false` and everything follows the existing path.

- [ ] **Step 3: Commit**

```bash
git add src/pipeline/buildProps.ts
git commit -m "feat(planning): integrate plan-bridge into buildProps

resolvePlanBridge() is called at build time. When hasPlan=false
(no generated/ artifacts), the existing path is 100% unchanged.
Blueprint scenes get _blueprint meta attached for SceneRenderer."
```

---

## Task 8: LongformComposition Blueprint Guard

**Files:**

- Modify: `src/compositions/LongformComposition.tsx`

- [ ] **Step 1: Add blueprint guard before switch in SceneRenderer**

The existing SceneRenderer (line 57-171 in LongformComposition.tsx) already has `case "custom"` routing to BlueprintRenderer. We add a guard **before** the switch that checks for `_blueprint`:

Add at the very start of the SceneRenderer function body, before the `const baseProps` line:

```typescript
const SceneRenderer: React.FC<{
  scene: PlannedScene;
  format: CompositionProps["format"];
  theme: CompositionProps["theme"];
}> = ({ scene, format, theme }) => {
  // Blueprint guard: if plan-bridge attached a blueprint, use it directly
  if ("_blueprint" in scene && (scene as any)._blueprint) {
    return (
      <BlueprintRenderer
        blueprint={(scene as any)._blueprint}
      />
    );
  }

  const baseProps = {
    // ... existing code unchanged
```

This is safe because:

- BlueprintRenderer is already imported (line 43)
- The existing `case "custom"` path remains for manually defined custom scenes
- The guard fires only for scenes with `_blueprint` meta from plan-bridge

- [ ] **Step 2: Verify compile and that non-blueprint scenes still render**

Run: `npx tsc --noEmit 2>&1 | head -20`

Expected: No errors. All existing compositions continue to work because `_blueprint` is only present when `generated/` artifacts exist.

- [ ] **Step 3: Commit**

```bash
git add src/compositions/LongformComposition.tsx
git commit -m "feat(planning): add blueprint guard in SceneRenderer

Checks for _blueprint meta before the switch statement.
Existing case branches are untouched. Guard only fires when
plan-bridge has attached a blueprint from generated/ artifacts."
```

---

## Task 9: Validators — Schema Phase

**Files:**

- Create: `src/planning/validators/validate-fingerprint.ts`
- Create: `src/planning/validators/validate-outline.ts`
- Create: `src/planning/validators/validate-art-direction.ts`
- Create: `src/planning/validators/validate-storyboard.ts`

- [ ] **Step 1: Create shared validator helper**

Each validator returns `ValidationCheck[]`. Create common helper at the top of each file (or inline — keeping files self-contained):

- [ ] **Step 2: Create validate-fingerprint.ts**

```typescript
// src/planning/validators/validate-fingerprint.ts
import type { BookFingerprint } from "@/types";
import type { ValidationCheck } from "../types";
import { FingerprintSchema } from "../schemas";

export function validateFingerprint(data: unknown): ValidationCheck[] {
  const checks: ValidationCheck[] = [];

  const result = FingerprintSchema.safeParse(data);
  if (!result.success) {
    for (const issue of result.error.issues) {
      checks.push({
        id: `fp-schema-${issue.path.join(".")}`,
        level: "BLOCKED",
        passed: false,
        message: `Fingerprint schema error at ${issue.path.join(".")}: ${issue.message}`,
      });
    }
    return checks;
  }

  const fp = result.data;

  checks.push({
    id: "fp-genre",
    level: "BLOCKED",
    passed: fp.genre.length > 0,
    message: fp.genre.length > 0 ? "genre is valid" : "genre must not be empty",
  });

  checks.push({
    id: "fp-hookStrategy",
    level: "BLOCKED",
    passed: fp.hookStrategy.length > 0,
    message:
      fp.hookStrategy.length > 0
        ? "hookStrategy is present"
        : "hookStrategy must not be empty",
  });

  const hasMotifs = (fp.visualMotifs?.length ?? 0) > 0;
  checks.push({
    id: "fp-visualMotifs",
    level: "WARN",
    passed: hasMotifs,
    message: hasMotifs
      ? `${fp.visualMotifs!.length} visual motifs defined`
      : "No visualMotifs — consider adding at least one",
  });

  return checks;
}
```

- [ ] **Step 3: Create validate-outline.ts**

```typescript
// src/planning/validators/validate-outline.ts
import type { ValidationCheck } from "../types";
import { EditorialOutlineSchema } from "../schemas";

export function validateOutline(data: unknown): ValidationCheck[] {
  const checks: ValidationCheck[] = [];

  const result = EditorialOutlineSchema.safeParse(data);
  if (!result.success) {
    for (const issue of result.error.issues) {
      checks.push({
        id: `outline-schema-${issue.path.join(".")}`,
        level: "BLOCKED",
        passed: false,
        message: `Outline schema error at ${issue.path.join(".")}: ${issue.message}`,
      });
    }
    return checks;
  }

  const o = result.data;

  checks.push({
    id: "outline-targetDuration",
    level: "BLOCKED",
    passed: o.targetDurationSeconds > 0,
    message: `targetDurationSeconds=${o.targetDurationSeconds}`,
  });

  checks.push({
    id: "outline-coreMessages",
    level: "BLOCKED",
    passed: o.coreMessages.length >= 1 && o.coreMessages.length <= 7,
    message: `coreMessages count=${o.coreMessages.length} (1~7)`,
  });

  checks.push({
    id: "outline-oneLiner",
    level: "BLOCKED",
    passed: o.oneLiner.length > 0,
    message: o.oneLiner.length > 0 ? "oneLiner present" : "oneLiner empty",
  });

  checks.push({
    id: "outline-toneKeywords",
    level: "WARN",
    passed: o.toneKeywords.length > 0,
    message:
      o.toneKeywords.length > 0
        ? `${o.toneKeywords.length} tone keywords`
        : "No toneKeywords — consider adding at least one",
  });

  return checks;
}
```

- [ ] **Step 4: Create validate-art-direction.ts**

```typescript
// src/planning/validators/validate-art-direction.ts
import type { ValidationCheck } from "../types";
import { BookArtDirectionSchema } from "../schemas";

export function validateArtDirection(data: unknown): ValidationCheck[] {
  const checks: ValidationCheck[] = [];

  const result = BookArtDirectionSchema.safeParse(data);
  if (!result.success) {
    for (const issue of result.error.issues) {
      checks.push({
        id: `art-schema-${issue.path.join(".")}`,
        level: "BLOCKED",
        passed: false,
        message: `ArtDirection schema error at ${issue.path.join(".")}: ${issue.message}`,
      });
    }
    return checks;
  }

  const ad = result.data;
  const hexRe = /^#[0-9a-fA-F]{6}$/;

  checks.push({
    id: "art-palette-primary",
    level: "BLOCKED",
    passed: hexRe.test(ad.palette.primary),
    message: `palette.primary=${ad.palette.primary}`,
  });

  checks.push({
    id: "art-palette-secondary",
    level: "BLOCKED",
    passed: hexRe.test(ad.palette.secondary),
    message: `palette.secondary=${ad.palette.secondary}`,
  });

  checks.push({
    id: "art-signalColor",
    level: "BLOCKED",
    passed: hexRe.test(ad.signalColor),
    message: `signalColor=${ad.signalColor}`,
  });

  checks.push({
    id: "art-visualMetaphors",
    level: "WARN",
    passed: ad.visualMetaphors.length > 0,
    message:
      ad.visualMetaphors.length > 0
        ? `${ad.visualMetaphors.length} visual metaphors`
        : "No visualMetaphors — consider adding at least one",
  });

  return checks;
}
```

- [ ] **Step 5: Create validate-storyboard.ts (교차 검증 핵심)**

```typescript
// src/planning/validators/validate-storyboard.ts
import { existsSync } from "fs";
import path from "path";
import type { BookContent } from "@/types";
import type { ValidationCheck } from "../types";
import type { EditorialOutline } from "../types";
import { StoryboardPlanSchema } from "../schemas";

const GENERATED_ROOT = path.resolve("generated/books");

export function validateStoryboard(
  data: unknown,
  contentSceneIds: string[],
  bookId: string,
  outline?: EditorialOutline,
): ValidationCheck[] {
  const checks: ValidationCheck[] = [];

  // 1. Schema validation
  const result = StoryboardPlanSchema.safeParse(data);
  if (!result.success) {
    for (const issue of result.error.issues) {
      checks.push({
        id: `sb-schema-${issue.path.join(".")}`,
        level: "BLOCKED",
        passed: false,
        message: `Storyboard schema error at ${issue.path.join(".")}: ${issue.message}`,
      });
    }
    return checks;
  }

  const sb = result.data;
  const contentIdSet = new Set(contentSceneIds);

  // 2. All storyboard sceneIds must exist in content JSON (fail-fast)
  for (const scene of sb.scenes) {
    const exists = contentIdSet.has(scene.sceneId);
    checks.push({
      id: `sb-sceneId-exists-${scene.sceneId}`,
      level: "BLOCKED",
      passed: exists,
      message: exists
        ? `sceneId "${scene.sceneId}" found in content`
        : `sceneId "${scene.sceneId}" NOT found in content JSON — fail-fast`,
      sceneId: scene.sceneId,
    });
  }

  // 3. renderMode=preset → presetSceneType required
  for (const scene of sb.scenes) {
    if (scene.renderMode === "preset") {
      const has = !!scene.presetSceneType;
      checks.push({
        id: `sb-preset-type-${scene.sceneId}`,
        level: "BLOCKED",
        passed: has,
        message: has
          ? `preset "${scene.sceneId}" has presetSceneType="${scene.presetSceneType}"`
          : `renderMode=preset but presetSceneType missing for "${scene.sceneId}"`,
        sceneId: scene.sceneId,
      });
    }
  }

  // 4. renderMode=blueprint → blueprintId required + file exists
  for (const scene of sb.scenes) {
    if (scene.renderMode === "blueprint") {
      const hasId = !!scene.blueprintId;
      checks.push({
        id: `sb-blueprint-id-${scene.sceneId}`,
        level: "BLOCKED",
        passed: hasId,
        message: hasId
          ? `blueprint "${scene.sceneId}" has blueprintId="${scene.blueprintId}"`
          : `renderMode=blueprint but blueprintId missing for "${scene.sceneId}"`,
        sceneId: scene.sceneId,
      });

      if (hasId) {
        const bpPath = path.join(
          GENERATED_ROOT,
          bookId,
          "06-blueprints",
          `${scene.blueprintId}.blueprint.json`,
        );
        const fileExists = existsSync(bpPath);
        checks.push({
          id: `sb-blueprint-file-${scene.sceneId}`,
          level: "BLOCKED",
          passed: fileExists,
          message: fileExists
            ? `blueprint file exists: ${scene.blueprintId}.blueprint.json`
            : `blueprint file missing: ${bpPath}`,
          sceneId: scene.sceneId,
        });
      }
    }
  }

  // 5. Order is sequential from 0
  const orders = sb.scenes.map((s) => s.order).sort((a, b) => a - b);
  const sequential = orders.every((o, i) => o === i);
  checks.push({
    id: "sb-order-sequential",
    level: "BLOCKED",
    passed: sequential,
    message: sequential
      ? `Scene order is sequential 0..${orders.length - 1}`
      : `Scene order has gaps: ${JSON.stringify(orders)}`,
  });

  // 6. Duration estimate vs outline target (WARN)
  if (outline) {
    const deviation =
      Math.abs(sb.estimatedDurationSeconds - outline.targetDurationSeconds) /
      outline.targetDurationSeconds;
    checks.push({
      id: "sb-duration-vs-outline",
      level: "WARN",
      passed: deviation <= 0.2,
      message: `estimated=${sb.estimatedDurationSeconds}s vs target=${outline.targetDurationSeconds}s (deviation ${(deviation * 100).toFixed(1)}%)`,
    });
  }

  // 7. Blueprint count limit (WARN)
  const bpCount = sb.scenes.filter((s) => s.renderMode === "blueprint").length;
  checks.push({
    id: "sb-blueprint-count",
    level: "WARN",
    passed: bpCount <= 3,
    message: `${bpCount} blueprint scenes (limit 3 for 1차)`,
  });

  // 8. Content-only scenes (INFO)
  const sbIds = new Set(sb.scenes.map((s) => s.sceneId));
  const contentOnly = contentSceneIds.filter((id) => !sbIds.has(id));
  if (contentOnly.length > 0) {
    checks.push({
      id: "sb-content-only-scenes",
      level: "INFO",
      passed: true,
      message: `${contentOnly.length} scenes in content but not in storyboard (auto preset): ${contentOnly.join(", ")}`,
    });
  }

  // 9. Summary (INFO)
  const presetCount = sb.scenes.filter((s) => s.renderMode === "preset").length;
  checks.push({
    id: "sb-summary",
    level: "INFO",
    passed: true,
    message: `${sb.scenes.length} storyboard scenes: ${presetCount} preset, ${bpCount} blueprint`,
  });

  return checks;
}
```

- [ ] **Step 6: Verify all validators compile**

Run: `npx tsc --noEmit src/planning/validators/validate-fingerprint.ts src/planning/validators/validate-outline.ts src/planning/validators/validate-art-direction.ts src/planning/validators/validate-storyboard.ts 2>&1 | head -20`

Expected: No errors.

- [ ] **Step 7: Commit**

```bash
git add src/planning/validators/validate-fingerprint.ts src/planning/validators/validate-outline.ts src/planning/validators/validate-art-direction.ts src/planning/validators/validate-storyboard.ts
git commit -m "feat(planning): add schema-phase validators

Includes fingerprint, outline, art-direction, and storyboard (cross-validation).
Storyboard validator checks sceneId existence, renderMode consistency,
blueprint file existence, and order sequentiality."
```

---

## Task 10: Validators — Duration, Assets, Blueprints, Quality Gate

**Files:**

- Create: `src/planning/validators/validate-duration.ts`
- Create: `src/planning/validators/validate-assets.ts`
- Create: `src/planning/validators/validate-blueprints.ts`
- Create: `src/planning/validators/validate-quality-gate.ts`

- [ ] **Step 1: Create validate-duration.ts**

```typescript
// src/planning/validators/validate-duration.ts
import type { ValidationCheck } from "../types";
import type { StoryboardPlan, EditorialOutline } from "../types";

const KOREAN_CPS = 5.7;

export function validateDuration(
  storyboard: StoryboardPlan,
  outline: EditorialOutline,
): ValidationCheck[] {
  const checks: ValidationCheck[] = [];

  // 1. Total duration vs outline target
  const totalSec = storyboard.scenes.reduce(
    (sum, s) => sum + s.targetDurationSeconds,
    0,
  );
  const deviation =
    Math.abs(totalSec - outline.targetDurationSeconds) /
    outline.targetDurationSeconds;
  checks.push({
    id: "dur-total-vs-target",
    level: "WARN",
    passed: deviation <= 0.2,
    message: `Total storyboard=${totalSec}s vs target=${outline.targetDurationSeconds}s (deviation ${(deviation * 100).toFixed(1)}%)`,
  });

  // 2. Per-scene bounds
  for (const scene of storyboard.scenes) {
    const tooShort = scene.targetDurationSeconds < 3;
    const tooLong = scene.targetDurationSeconds > 120;
    if (tooShort || tooLong) {
      checks.push({
        id: `dur-scene-bounds-${scene.sceneId}`,
        level: "WARN",
        passed: false,
        message: `Scene "${scene.sceneId}" duration=${scene.targetDurationSeconds}s (${tooShort ? "<3s" : ">120s"})`,
        sceneId: scene.sceneId,
      });
    }
  }

  // 3. Estimated chars per scene (INFO)
  for (const scene of storyboard.scenes) {
    const estChars = Math.round(scene.targetDurationSeconds * KOREAN_CPS);
    checks.push({
      id: `dur-est-chars-${scene.sceneId}`,
      level: "INFO",
      passed: true,
      message: `Scene "${scene.sceneId}": ~${estChars} chars at ${KOREAN_CPS} CPS`,
      sceneId: scene.sceneId,
    });
  }

  return checks;
}
```

- [ ] **Step 2: Create validate-assets.ts**

```typescript
// src/planning/validators/validate-assets.ts
import type { ValidationCheck } from "../types";
import type { AssetInventory } from "../types";

export function validateAssets(inventory: AssetInventory): ValidationCheck[] {
  const checks: ValidationCheck[] = [];

  const needed = inventory.required.filter((a) => a.status === "needed");
  const placeholder = inventory.required.filter(
    (a) => a.status === "placeholder",
  );
  const ready = inventory.required.filter((a) => a.status === "ready");

  if (needed.length > 0) {
    checks.push({
      id: "assets-needed",
      level: "WARN",
      passed: false,
      message: `${needed.length} assets still needed: ${needed.map((a) => a.id).join(", ")}`,
    });
  }

  checks.push({
    id: "assets-summary",
    level: "INFO",
    passed: true,
    message: `Assets: ${ready.length} ready, ${placeholder.length} placeholder, ${needed.length} needed`,
  });

  return checks;
}
```

- [ ] **Step 3: Create validate-blueprints.ts**

```typescript
// src/planning/validators/validate-blueprints.ts
import { existsSync, readFileSync, readdirSync } from "fs";
import path from "path";
import type { ValidationCheck } from "../types";
import type { StoryboardPlan } from "../types";

const GENERATED_ROOT = path.resolve("generated/books");

export function validateBlueprints(
  bookId: string,
  storyboard: StoryboardPlan,
): ValidationCheck[] {
  const checks: ValidationCheck[] = [];
  const bpDir = path.join(GENERATED_ROOT, bookId, "06-blueprints");

  const blueprintScenes = storyboard.scenes.filter(
    (s) => s.renderMode === "blueprint" && s.blueprintId,
  );

  for (const scene of blueprintScenes) {
    const bpPath = path.join(bpDir, `${scene.blueprintId}.blueprint.json`);

    if (!existsSync(bpPath)) {
      checks.push({
        id: `bp-file-${scene.sceneId}`,
        level: "BLOCKED",
        passed: false,
        message: `Blueprint file missing: ${scene.blueprintId}.blueprint.json`,
        sceneId: scene.sceneId,
      });
      continue;
    }

    let bp: any;
    try {
      bp = JSON.parse(readFileSync(bpPath, "utf-8"));
    } catch (e) {
      checks.push({
        id: `bp-parse-${scene.sceneId}`,
        level: "BLOCKED",
        passed: false,
        message: `Blueprint JSON parse error: ${(e as Error).message}`,
        sceneId: scene.sceneId,
      });
      continue;
    }

    // mediaPlan existence (DSGS absolute rule)
    const hasMediaPlan = !!bp.mediaPlan;
    checks.push({
      id: `bp-mediaPlan-${scene.sceneId}`,
      level: "BLOCKED",
      passed: hasMediaPlan,
      message: hasMediaPlan
        ? `mediaPlan present for "${scene.sceneId}"`
        : `mediaPlan MISSING for "${scene.sceneId}" — DSGS absolute rule`,
      sceneId: scene.sceneId,
    });

    // ID consistency
    const idMatch = bp.id === scene.blueprintId;
    checks.push({
      id: `bp-id-match-${scene.sceneId}`,
      level: "BLOCKED",
      passed: idMatch,
      message: idMatch
        ? `blueprint.id matches filename`
        : `blueprint.id="${bp.id}" !== filename "${scene.blueprintId}"`,
      sceneId: scene.sceneId,
    });

    // elements array exists (WARN)
    const hasElements = Array.isArray(bp.elements) && bp.elements.length > 0;
    checks.push({
      id: `bp-elements-${scene.sceneId}`,
      level: "WARN",
      passed: hasElements,
      message: hasElements
        ? `${bp.elements.length} elements defined`
        : `No elements in blueprint "${scene.sceneId}"`,
      sceneId: scene.sceneId,
    });
  }

  return checks;
}
```

- [ ] **Step 4: Create validate-quality-gate.ts**

```typescript
// src/planning/validators/validate-quality-gate.ts
import { existsSync } from "fs";
import path from "path";
import type { ValidationCheck } from "../types";
import type { StoryboardPlan } from "../types";

const GENERATED_ROOT = path.resolve("generated/books");

const PLANNING_FILES = [
  "00-fingerprint.json",
  "01-editorial-outline.json",
  "02-art-direction.json",
  "03-storyboard.json",
  "04-asset-inventory.json",
  "05-motion-plan.json",
];

export function validateQualityGate(
  bookId: string,
  storyboard?: StoryboardPlan,
  totalContentScenes?: number,
): ValidationCheck[] {
  const checks: ValidationCheck[] = [];
  const bookDir = path.join(GENERATED_ROOT, bookId);

  // 1. Planning completeness
  let presentCount = 0;
  for (const file of PLANNING_FILES) {
    if (existsSync(path.join(bookDir, file))) presentCount++;
  }
  checks.push({
    id: "qg-completeness",
    level: "INFO",
    passed: true,
    message: `Planning docs: ${presentCount}/${PLANNING_FILES.length} present`,
  });

  // 2. Blueprint ratio
  if (storyboard && totalContentScenes) {
    const bpCount = storyboard.scenes.filter(
      (s) => s.renderMode === "blueprint",
    ).length;
    checks.push({
      id: "qg-blueprint-ratio",
      level: "INFO",
      passed: true,
      message: `Blueprint scenes: ${bpCount}/${totalContentScenes}`,
    });
  }

  // 3. Art direction + no blueprints warning
  const hasArt = existsSync(path.join(bookDir, "02-art-direction.json"));
  const hasBpDir = existsSync(path.join(bookDir, "06-blueprints"));
  if (hasArt && !hasBpDir) {
    checks.push({
      id: "qg-art-no-blueprints",
      level: "WARN",
      passed: false,
      message:
        "Art direction exists but no blueprints directory — consider creating at least one custom blueprint",
    });
  }

  return checks;
}
```

- [ ] **Step 5: Verify compile**

Run: `npx tsc --noEmit src/planning/validators/validate-duration.ts src/planning/validators/validate-assets.ts src/planning/validators/validate-blueprints.ts src/planning/validators/validate-quality-gate.ts 2>&1 | head -20`

Expected: No errors.

- [ ] **Step 6: Commit**

```bash
git add src/planning/validators/validate-duration.ts src/planning/validators/validate-assets.ts src/planning/validators/validate-blueprints.ts src/planning/validators/validate-quality-gate.ts
git commit -m "feat(planning): add duration, assets, blueprints, and quality-gate validators"
```

---

## Task 11: CLI Entry Point + Barrel Export

**Files:**

- Create: `scripts/validate-plan.ts`
- Create: `src/planning/index.ts`

- [ ] **Step 1: Create scripts/validate-plan.ts**

```typescript
// scripts/validate-plan.ts
// Usage: npx ts-node scripts/validate-plan.ts generated/books/atomic-habits
import { existsSync, readFileSync } from "fs";
import path from "path";
import { validateFingerprint } from "../src/planning/validators/validate-fingerprint";
import { validateOutline } from "../src/planning/validators/validate-outline";
import { validateArtDirection } from "../src/planning/validators/validate-art-direction";
import { validateStoryboard } from "../src/planning/validators/validate-storyboard";
import { validateDuration } from "../src/planning/validators/validate-duration";
import { validateAssets } from "../src/planning/validators/validate-assets";
import { validateBlueprints } from "../src/planning/validators/validate-blueprints";
import { validateQualityGate } from "../src/planning/validators/validate-quality-gate";
import { saveValidationResult } from "../src/planning/loaders/save-book-plan";
import type { ValidationResult, ValidationCheck } from "../src/planning/types";

function readJson(filePath: string): unknown | null {
  if (!existsSync(filePath)) return null;
  return JSON.parse(readFileSync(filePath, "utf-8"));
}

function deriveStatus(checks: ValidationCheck[]): "pass" | "warn" | "fail" {
  if (checks.some((c) => !c.passed && c.level === "BLOCKED")) return "fail";
  if (checks.some((c) => !c.passed && c.level === "WARN")) return "warn";
  return "pass";
}

function formatPhase(name: string, result: ValidationResult): string {
  const icon =
    result.status === "pass" ? "✓" : result.status === "warn" ? "⚠" : "✗";
  const total = result.checks.length;
  const passed = result.checks.filter((c) => c.passed).length;
  const blocked = result.checks.filter(
    (c) => !c.passed && c.level === "BLOCKED",
  );
  const detail =
    blocked.length > 0
      ? ` — BLOCKED: ${blocked.map((b) => b.message).join("; ")}`
      : "";
  return (
    `[${name}]`.padEnd(16) +
    `${icon} ${result.status.toUpperCase()}  (${passed}/${total})${detail}`
  );
}

async function main() {
  const bookDir = process.argv[2];
  if (!bookDir || !existsSync(bookDir)) {
    console.error(
      "Usage: npx ts-node scripts/validate-plan.ts generated/books/<book-id>",
    );
    console.error(`Path not found: ${bookDir}`);
    process.exit(1);
  }

  const bookId = path.basename(bookDir);

  // Find content JSON
  const contentPath = path.join("content/books", `${bookId}.json`);
  if (!existsSync(contentPath)) {
    console.error(`Content JSON not found: ${contentPath}`);
    process.exit(1);
  }
  const content = JSON.parse(readFileSync(contentPath, "utf-8"));
  const contentSceneIds: string[] = content.scenes.map((s: any) => s.id);

  // Load planning artifacts
  const fingerprint = readJson(path.join(bookDir, "00-fingerprint.json"));
  const outline = readJson(path.join(bookDir, "01-editorial-outline.json"));
  const artDirection = readJson(path.join(bookDir, "02-art-direction.json"));
  const storyboard = readJson(path.join(bookDir, "03-storyboard.json"));
  const assetInventory = readJson(
    path.join(bookDir, "04-asset-inventory.json"),
  );

  const results: ValidationResult[] = [];

  // Phase: schema
  const schemaChecks: ValidationCheck[] = [
    ...(fingerprint
      ? validateFingerprint(fingerprint)
      : [
          {
            id: "fp-missing",
            level: "BLOCKED" as const,
            passed: false,
            message: "00-fingerprint.json missing",
          },
        ]),
    ...(outline
      ? validateOutline(outline)
      : [
          {
            id: "outline-missing",
            level: "BLOCKED" as const,
            passed: false,
            message: "01-editorial-outline.json missing",
          },
        ]),
    ...(artDirection
      ? validateArtDirection(artDirection)
      : [
          {
            id: "art-missing",
            level: "BLOCKED" as const,
            passed: false,
            message: "02-art-direction.json missing",
          },
        ]),
    ...(storyboard
      ? validateStoryboard(storyboard, contentSceneIds, bookId, outline as any)
      : [
          {
            id: "sb-missing",
            level: "BLOCKED" as const,
            passed: false,
            message: "03-storyboard.json missing",
          },
        ]),
  ];
  const schemaResult: ValidationResult = {
    phase: "schema",
    status: deriveStatus(schemaChecks),
    timestamp: new Date().toISOString(),
    checks: schemaChecks,
  };
  results.push(schemaResult);

  // Phase: duration
  if (storyboard && outline) {
    const durChecks = validateDuration(storyboard as any, outline as any);
    const durResult: ValidationResult = {
      phase: "duration",
      status: deriveStatus(durChecks),
      timestamp: new Date().toISOString(),
      checks: durChecks,
    };
    results.push(durResult);
  }

  // Phase: assets
  if (assetInventory) {
    const assetChecks = validateAssets(assetInventory as any);
    const assetResult: ValidationResult = {
      phase: "assets",
      status: deriveStatus(assetChecks),
      timestamp: new Date().toISOString(),
      checks: assetChecks,
    };
    results.push(assetResult);
  }

  // Phase: blueprints
  if (storyboard) {
    const bpChecks = validateBlueprints(bookId, storyboard as any);
    const bpResult: ValidationResult = {
      phase: "blueprints",
      status: deriveStatus(bpChecks),
      timestamp: new Date().toISOString(),
      checks: bpChecks,
    };
    results.push(bpResult);
  }

  // Phase: quality-gate
  const qgChecks = validateQualityGate(
    bookId,
    storyboard as any,
    contentSceneIds.length,
  );
  const qgResult: ValidationResult = {
    phase: "quality-gate",
    status: deriveStatus(qgChecks),
    timestamp: new Date().toISOString(),
    checks: qgChecks,
  };
  results.push(qgResult);

  // Save results
  for (const r of results) {
    saveValidationResult(bookId, r.phase, r);
  }

  // Print summary
  console.log("");
  for (const r of results) {
    console.log(formatPhase(r.phase, r));
  }
  console.log("");
  console.log(`Results saved to ${bookDir}/.validation/`);

  // Exit code
  const hasFail = results.some((r) => r.status === "fail");
  process.exit(hasFail ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
```

- [ ] **Step 2: Create src/planning/index.ts barrel**

```typescript
// src/planning/index.ts
export type {
  EditorialOutline,
  BookArtDirection,
  StoryboardPlan,
  StoryboardScene,
  AssetInventory,
  AssetRequirement,
  MotionPlan,
  SceneMotionPlan,
  BookThemeOverrides,
  BookPlan,
  ResolvedScene,
  PlanBridgeResult,
  VisualFunction,
  ValidationPhase,
  ValidationResult,
  ValidationCheck,
} from "./types";

export { resolvePlanBridge } from "./plan-bridge";
export { resolveBookTheme } from "./theme-resolver";
export { resolveBlueprint, listBlueprints } from "./blueprint-resolver";
export { loadBookPlan } from "./loaders/load-book-plan";
export {
  savePlanArtifact,
  saveBlueprintArtifact,
  saveValidationResult,
} from "./loaders/save-book-plan";
```

- [ ] **Step 3: Verify the CLI compiles**

Run: `npx tsc --noEmit scripts/validate-plan.ts 2>&1 | head -20`

Expected: No errors (or path-alias resolution notes that are handled by ts-node).

- [ ] **Step 4: Commit**

```bash
git add scripts/validate-plan.ts src/planning/index.ts
git commit -m "feat(planning): add validate-plan CLI and barrel export

Usage: npx ts-node scripts/validate-plan.ts generated/books/<id>
Runs all 5 validation phases and saves results to .validation/"
```

---

## Task 12: Add generated/ to .gitignore selectively

**Files:**

- Modify: `.gitignore`

- [ ] **Step 1: Add gitignore rules**

Add to `.gitignore`:

```
# Planning artifacts — validation results are ephemeral
generated/books/**/.validation/
```

Note: The planning JSONs and MDs themselves (`generated/books/*/`) should be tracked in git (they are the planning source of truth). Only `.validation/` results are ephemeral.

- [ ] **Step 2: Commit**

```bash
git add .gitignore
git commit -m "chore: gitignore ephemeral validation results"
```

---

## Task 13: Full TypeScript Compile Check

**Files:** None (verification only)

- [ ] **Step 1: Run full project TypeScript check**

Run: `npx tsc --noEmit 2>&1 | tail -20`

Expected: No new errors introduced. Fix any issues found.

- [ ] **Step 2: Run existing validation**

Run: `npm run validate -- content/books/atomic-habits.json`

Expected: Passes exactly as before (no regression).

- [ ] **Step 3: Verify no-plan fallback**

Run Remotion studio to verify miracle-morning (no planning artifacts) still renders:

Run: `npx remotion studio 2>&1 | head -5`

Expected: Studio launches without errors.

- [ ] **Step 4: Commit any fixes**

If any fixes were needed:

```bash
git add -A
git commit -m "fix(planning): resolve TypeScript compilation issues from integration"
```

---

## Task 14: Generate Atomic-Habits Planning Artifacts

**Files:**

- Create: all 11 files in `generated/books/atomic-habits/`

This task is **Claude Code authored** — the content is generated by analyzing the atomic-habits book content and writing planning documents.

- [ ] **Step 1: Read atomic-habits content**

Read `content/books/atomic-habits.json` to understand the book's structure, scenes, narration, and beats.

- [ ] **Step 2: Generate 00-fingerprint.json**

Write `generated/books/atomic-habits/00-fingerprint.json` conforming to the BookFingerprint type. Must include: genre, hookStrategy, visualMotifs, emotionalTone.

- [ ] **Step 3: Generate 01-editorial-outline.json + md**

Use `savePlanArtifact(bookId, "01-editorial-outline", data, true)` to write both JSON and MD mirror.

- [ ] **Step 4: Generate 02-art-direction.json + md**

Use `savePlanArtifact(bookId, "02-art-direction", data, true)`. Must define palette, signalColor, shapeLanguage, visualMetaphors, motionCharacter.

- [ ] **Step 5: Generate 03-storyboard.json + md**

Use `savePlanArtifact(bookId, "03-storyboard", data, true)`. Must include all 11 sceneIds from content JSON. Set `hook-01` and `framework-01` to `renderMode: "blueprint"`, all others to `renderMode: "preset"`.

- [ ] **Step 6: Generate 04-asset-inventory.json**

Use `savePlanArtifact(bookId, "04-asset-inventory", data)`.

- [ ] **Step 7: Generate 05-motion-plan.json**

Use `savePlanArtifact(bookId, "05-motion-plan", data)`. Include sceneMotions for all 11 sceneIds.

- [ ] **Step 8: Generate 06-blueprints/hook-01.blueprint.json**

Write a SceneBlueprint for the hook scene. Must include: id, intent, layout, elements[], choreography, motionPreset, format, theme, mediaPlan, durationFrames.

- [ ] **Step 9: Generate 06-blueprints/framework-01.blueprint.json**

Write a SceneBlueprint for the framework scene. Must include the same required fields.

- [ ] **Step 10: Run validation**

Run: `npx ts-node scripts/validate-plan.ts generated/books/atomic-habits`

Expected: All phases pass (or only WARN/INFO, no BLOCKED).

- [ ] **Step 11: Fix any validation errors and re-run**

Iterate until validation passes cleanly.

- [ ] **Step 12: Commit**

```bash
git add generated/books/atomic-habits/
git commit -m "feat(planning): generate atomic-habits planning artifacts

6 planning docs + 2 custom blueprints (hook-01, framework-01).
All validation phases pass."
```

---

## Task 15: End-to-End Render Verification

**Files:** None (verification only)

- [ ] **Step 1: Run existing content validation**

Run: `npm run validate -- content/books/atomic-habits.json`

Expected: Passes (no regression).

- [ ] **Step 2: Run planning validation**

Run: `npx ts-node scripts/validate-plan.ts generated/books/atomic-habits`

Expected: All phases pass.

- [ ] **Step 3: Test render with planning**

Run: `npm run make:video content/books/atomic-habits.json`

Expected: Render completes. `hook-01` and `framework-01` use BlueprintRenderer path. Other 9 scenes use existing Scene.tsx.

- [ ] **Step 4: Test fallback — delete planning and render**

```bash
mv generated/books/atomic-habits generated/books/atomic-habits.bak
npm run make:video content/books/atomic-habits.json
mv generated/books/atomic-habits.bak generated/books/atomic-habits
```

Expected: Render completes with identical output to pre-planning state (hasPlan=false path).

- [ ] **Step 5: Test miracle-morning still works**

Run: `npm run make:video content/books/miracle-morning.json`

Expected: Render completes unchanged (no planning artifacts for this book).

- [ ] **Step 6: Final commit**

```bash
git add -A
git commit -m "verify: end-to-end planning layer + blueprint render for atomic-habits

Verification checklist:
- Content validation passes
- Planning validation passes
- Render with blueprints succeeds
- Fallback without planning works
- Non-planned books unaffected"
```

---

## Verification Checklist (Post-Implementation)

### Code

- [ ] `npm run validate -- content/books/atomic-habits.json` passes
- [ ] `npx ts-node scripts/validate-plan.ts generated/books/atomic-habits` passes
- [ ] Planning-less books (miracle-morning) render identically

### Render

- [ ] atomic-habits longform render succeeds
- [ ] `hook-01` uses BlueprintRenderer path
- [ ] `framework-01` uses BlueprintRenderer path
- [ ] Other 9 scenes use existing Scene.tsx
- [ ] Theme override (signal/accent) visible across all scenes

### Fallback

- [ ] Delete `generated/books/atomic-habits/` → render identical to pre-planning
- [ ] Delete one blueprint file → `validate-plan` reports BLOCKED
- [ ] Add invalid sceneId to storyboard → `validate-plan` reports BLOCKED

### Artifacts

- [ ] 6 planning JSONs pass schema validation
- [ ] MD mirrors match JSON content
- [ ] `.validation/` contains 5 result files
