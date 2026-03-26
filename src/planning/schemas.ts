import { z } from "zod";

const HexColor = z
  .string()
  .regex(/^#[0-9a-fA-F]{6}$/, "Must be a valid hex color (#RRGGBB)");

// 00. Fingerprint (validates existing BookFingerprint shape from @/types)
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

// 01. Editorial Outline
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

// 02. Art Direction
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

// 03. Storyboard
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

// 04. Asset Inventory
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

// 05. Motion Plan
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

// Inferred types
export type FingerprintInput = z.infer<typeof FingerprintSchema>;
export type EditorialOutlineInput = z.infer<typeof EditorialOutlineSchema>;
export type BookArtDirectionInput = z.infer<typeof BookArtDirectionSchema>;
export type StoryboardSceneInput = z.infer<typeof StoryboardSceneSchema>;
export type StoryboardPlanInput = z.infer<typeof StoryboardPlanSchema>;
export type AssetInventoryInput = z.infer<typeof AssetInventorySchema>;
export type MotionPlanInput = z.infer<typeof MotionPlanSchema>;
