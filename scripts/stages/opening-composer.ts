/**
 * OpeningComposer stage runner — generates BookArtDirection from BookFingerprint.
 *
 * Pure deterministic mapping: fingerprint fields → art direction fields.
 * Palette colors derive from design-tokens-draft.json genreVariants (single source of truth).
 * No LLM calls.
 */

import "tsconfig-paths/register";
import { readFileSync } from "fs";
import path from "path";
import type { GenreKey, BookFingerprint, EmotionalTone } from "../../src/types";
import type {
  DsgsStage,
  DsgsContext,
  DsgsStageResult,
} from "../dsgs-orchestrate";
import type { BookArtDirection } from "../../src/planning/types";
import { BookArtDirectionSchema } from "../../src/planning/schemas";
import { savePlanArtifact } from "../../src/planning/loaders/save-book-plan";

// ============================================================
// Design Token Colors (from design-tokens-draft.json genreVariants)
// ============================================================

const GENRE_ACCENT: Record<GenreKey, string> = {
  selfHelp: "#10B981",
  psychology: "#8B5CF6",
  business: "#F59E0B",
  philosophy: "#6366F1",
  science: "#06B6D4",
  ai: "#EC4899",
};

const BRAND_COBALT = "#356DFF";
const NEUTRAL_800 = "#1E293B";

// ============================================================
// 1. Genre → Palette
// ============================================================

interface PaletteSpec {
  primary: string;
  secondary: string;
  signalColor: string;
  contrast: "high" | "medium" | "low";
}

/**
 * Genre → palette mapping.
 * primary = genreVariant accent (design token).
 * secondary = complementary neutral or brand color.
 * signalColor = brand cobalt (default) or genre-specific highlight.
 */
const GENRE_PALETTE: Record<GenreKey, PaletteSpec> = {
  selfHelp: {
    primary: GENRE_ACCENT.selfHelp,
    secondary: BRAND_COBALT,
    signalColor: BRAND_COBALT,
    contrast: "high",
  },
  psychology: {
    primary: GENRE_ACCENT.psychology,
    secondary: NEUTRAL_800,
    signalColor: GENRE_ACCENT.psychology,
    contrast: "high",
  },
  business: {
    primary: GENRE_ACCENT.business,
    secondary: NEUTRAL_800,
    signalColor: BRAND_COBALT,
    contrast: "high",
  },
  philosophy: {
    primary: GENRE_ACCENT.philosophy,
    secondary: "#475569",
    signalColor: GENRE_ACCENT.philosophy,
    contrast: "medium",
  },
  science: {
    primary: GENRE_ACCENT.science,
    secondary: "#0F172A",
    signalColor: "#22D3EE",
    contrast: "high",
  },
  ai: {
    primary: GENRE_ACCENT.ai,
    secondary: NEUTRAL_800,
    signalColor: GENRE_ACCENT.ai,
    contrast: "high",
  },
};

// ============================================================
// 2. Structure → ShapeLanguage
// ============================================================

const STRUCTURE_SHAPE: Record<
  BookFingerprint["structure"],
  BookArtDirection["shapeLanguage"]
> = {
  framework: "geometric",
  narrative: "organic",
  argument: "angular",
  collection: "mixed",
};

// ============================================================
// 3. EmotionalTone → MotionCharacter (priority-weighted)
// ============================================================

/** Higher number = higher priority in reduction */
const TONE_PRIORITY: Record<string, number> = {
  intense: 6,
  urgent: 5,
  provocative: 4,
  disciplined: 3,
  uplifting: 2,
  hopeful: 2,
  calm: 1,
  reflective: 1,
};

const TONE_TO_MOTION: Record<string, BookArtDirection["motionCharacter"]> = {
  intense: "snappy",
  urgent: "snappy",
  provocative: "snappy",
  disciplined: "weighted",
  uplifting: "precise",
  hopeful: "precise",
  calm: "fluid",
  reflective: "fluid",
};

const DEFAULT_MOTION: BookArtDirection["motionCharacter"] = "precise";

function resolveMotionCharacter(
  tones: EmotionalTone[],
): BookArtDirection["motionCharacter"] {
  if (tones.length === 0) return DEFAULT_MOTION;

  // Handle string type (book-analyzer currently emits single string)
  const toneArray = Array.isArray(tones) ? tones : [tones];

  let bestTone: string | null = null;
  let bestPriority = -1;

  for (const tone of toneArray) {
    const priority = TONE_PRIORITY[tone] ?? 0;
    if (priority > bestPriority) {
      bestPriority = priority;
      bestTone = tone;
    }
  }

  if (bestTone && TONE_TO_MOTION[bestTone]) {
    return TONE_TO_MOTION[bestTone];
  }
  return DEFAULT_MOTION;
}

// ============================================================
// 4. Genre + Structure → TextureMood, LayoutBias, TypographyMood
// ============================================================

const GENRE_TEXTURE: Record<GenreKey, BookArtDirection["textureMood"]> = {
  selfHelp: "grain",
  psychology: "grain",
  business: "clean",
  philosophy: "paper",
  science: "clean",
  ai: "noise",
};

const STRUCTURE_LAYOUT: Record<
  BookFingerprint["structure"],
  BookArtDirection["layoutBias"]
> = {
  framework: "grid-heavy",
  narrative: "flow",
  argument: "asymmetric",
  collection: "centered",
};

const GENRE_TYPOGRAPHY: Record<GenreKey, BookArtDirection["typographyMood"]> = {
  selfHelp: "warm",
  psychology: "editorial",
  business: "bold",
  philosophy: "editorial",
  science: "technical",
  ai: "technical",
};

// ============================================================
// 5. VisualMotifs + SpatialMetaphors → VisualMetaphors
// ============================================================

interface VisualMetaphorEntry {
  concept: string;
  metaphor: string;
  usage: string;
}

/** Known motif → metaphor mapping table */
const MOTIF_TABLE: Record<string, Omit<VisualMetaphorEntry, "concept">> = {
  "structured framework": {
    metaphor: "circular multi-step cycle with directional arrows",
    usage: "framework scene — 핵심 구조 시각화",
  },
  "split comparison": {
    metaphor: "side-by-side contrasting panels with divider",
    usage: "compareContrast scene — 전/후 또는 대비 시각화",
  },
  "quote emphasis": {
    metaphor: "large serif typography with subtle texture overlay",
    usage: "quote scene — 인용구 강조 및 여백 활용",
  },
  "data visualization": {
    metaphor: "annotated chart with highlighted data point",
    usage: "data scene — 핵심 수치 시각적 강조",
  },
  "timeline progression": {
    metaphor: "horizontal flow with connected milestone nodes",
    usage: "timeline scene — 시간적 흐름 시각화",
  },
};

function buildVisualMetaphors(
  visualMotifs: string[],
  spatialMetaphors: string[],
): VisualMetaphorEntry[] {
  const result: VisualMetaphorEntry[] = [];

  for (const motif of visualMotifs) {
    const known = MOTIF_TABLE[motif];
    if (known) {
      result.push({ concept: motif, ...known });
    } else {
      // Fallback for unknown motifs
      result.push({
        concept: motif,
        metaphor: motif,
        usage: "background accent — 보조 시각 요소",
      });
    }
  }

  for (const spatial of spatialMetaphors) {
    result.push({
      concept: spatial,
      metaphor: spatial,
      usage: "spatial metaphor — 공간적 비유 표현",
    });
  }

  return result;
}

// ============================================================
// Stage Runner
// ============================================================

function composeArtDirection(
  bookId: string,
  fingerprint: BookFingerprint,
): BookArtDirection {
  const palette = GENRE_PALETTE[fingerprint.genre];
  const tones: EmotionalTone[] = Array.isArray(fingerprint.emotionalTone)
    ? fingerprint.emotionalTone
    : [fingerprint.emotionalTone as unknown as EmotionalTone];

  return {
    bookId,
    palette: {
      primary: palette.primary,
      secondary: palette.secondary,
      contrast: palette.contrast,
    },
    signalColor: palette.signalColor,
    shapeLanguage: STRUCTURE_SHAPE[fingerprint.structure],
    textureMood: GENRE_TEXTURE[fingerprint.genre],
    visualMetaphors: buildVisualMetaphors(
      fingerprint.visualMotifs,
      fingerprint.spatialMetaphors,
    ),
    layoutBias: STRUCTURE_LAYOUT[fingerprint.structure],
    motionCharacter: resolveMotionCharacter(tones),
    typographyMood: GENRE_TYPOGRAPHY[fingerprint.genre],
  };
}

export const composeArtDirectionStage: DsgsStage = {
  id: "3-opening",
  name: "OpeningComposer",
  checkpoint: "A",
  async run(ctx: DsgsContext): Promise<DsgsStageResult> {
    const start = Date.now();

    // Read fingerprint from previous stage
    const fpPath = path.join(ctx.planDir, "00-fingerprint.json");
    let fingerprint: BookFingerprint;
    try {
      fingerprint = JSON.parse(
        readFileSync(fpPath, "utf-8"),
      ) as BookFingerprint;
    } catch {
      return {
        stageId: "3-opening",
        status: "halted",
        artifacts: [],
        durationMs: Date.now() - start,
        message: `Cannot read fingerprint: ${fpPath}`,
      };
    }

    // Compose art direction
    const artDirection = composeArtDirection(ctx.bookId, fingerprint);

    // Validate with Zod
    const validation = BookArtDirectionSchema.safeParse(artDirection);
    if (!validation.success) {
      return {
        stageId: "3-opening",
        status: "halted",
        artifacts: [],
        durationMs: Date.now() - start,
        message: `Art direction validation failed: ${validation.error.issues.map((i) => i.message).join(", ")}`,
      };
    }

    // Save artifact
    savePlanArtifact(ctx.bookId, "02-art-direction", artDirection);
    const outPath = path.join(ctx.planDir, "02-art-direction.json");

    return {
      stageId: "3-opening",
      status: "success",
      artifacts: [outPath],
      durationMs: Date.now() - start,
      message: `ArtDirection: palette=${artDirection.palette.primary}, shape=${artDirection.shapeLanguage}, motion=${artDirection.motionCharacter}`,
    };
  },
};
