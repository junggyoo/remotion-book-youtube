import { z } from "zod";
import path from "path";
import fs from "fs";
import type { BookContent, ValidationResult, SceneType } from "@/types";

// --- Zod Schemas for all 9 content types ---

const CoverContentSchema = z.object({
  title: z.string().min(1),
  subtitle: z.string().optional(),
  author: z.string().min(1),
  coverImageUrl: z.string().min(1), // REQUIRED. Spec §3.
  brandLabel: z.string().optional(),
  backgroundVariant: z.enum(["dark", "light"]).optional(),
});

const ChapterDividerContentSchema = z.object({
  chapterNumber: z.number(),
  chapterTitle: z.string().min(1),
  chapterSubtitle: z.string().optional(),
  useAltLayout: z.boolean().optional(),
});

const EvidenceCardSchema = z.object({
  type: z.enum(["statistic", "quote", "case", "research"]),
  value: z.string().min(1),
  caption: z.string().optional(),
  source: z.string().optional(),
});

const KeyInsightContentSchema = z.object({
  headline: z.string().min(1).max(60), // hard limit
  supportText: z.string().optional(),
  underlineKeyword: z.string().optional(),
  useSignalBar: z.boolean().optional(),
  evidenceCard: EvidenceCardSchema.optional(),
});

const CompareContrastContentSchema = z.object({
  leftLabel: z.string().min(1),
  leftContent: z.string().min(1),
  rightLabel: z.string().min(1),
  rightContent: z.string().min(1),
  leftTag: z.enum(["before", "myth", "wrong", "common", "custom"]).optional(),
  rightTag: z.enum(["after", "fact", "right", "author", "custom"]).optional(),
  showConnector: z.boolean().optional(),
  revealOrder: z.enum(["simultaneous", "left-first", "right-first"]).optional(),
});

const QuoteContentSchema = z.object({
  quoteText: z.string().min(1),
  attribution: z.string().min(1),
  useSerif: z.boolean().optional(),
  showTexture: z.boolean().optional(),
});

const FrameworkItemSchema = z.object({
  number: z.number(),
  title: z.string().min(1),
  description: z.string().optional(),
  iconId: z.string().optional(),
});

const FrameworkContentSchema = z.object({
  frameworkLabel: z.string().min(1),
  items: z.array(FrameworkItemSchema).max(5),
  showConnectors: z.boolean().optional(),
  showDescriptions: z.boolean().optional(),
});

const ApplicationStepSchema = z.object({
  title: z.string().min(1),
  detail: z.string().optional(),
  iconId: z.string().optional(),
});

const ApplicationContentSchema = z.object({
  anchorStatement: z.string().min(1),
  steps: z.array(ApplicationStepSchema).max(4),
  showPaths: z.boolean().optional(),
  showCheckmarks: z.boolean().optional(),
});

const DataPointSchema = z.object({
  label: z.string().min(1),
  value: z.number(),
  highlight: z.boolean().optional(),
});

const DataContentSchema = z.object({
  chartType: z.enum(["bar", "line", "compare", "stepFlow", "matrix"]),
  dataLabel: z.string().min(1),
  data: z.array(DataPointSchema),
  annotation: z.string().optional(),
  sourceCredit: z.string().optional(),
  unit: z.string().optional(),
});

const ClosingContentSchema = z.object({
  recapStatement: z.string().min(1),
  ctaText: z.string().optional(),
  showBrandLabel: z.boolean().optional(),
});

// --- New Motion Graphic Scene Content Schemas ---

const TimelineEventSchema = z.object({
  year: z.string().min(1),
  title: z.string().min(1),
  description: z.string().optional(),
});

const TimelineContentSchema = z.object({
  timelineLabel: z.string().min(1),
  events: z.array(TimelineEventSchema).max(6),
  showConnectors: z.boolean().optional(),
});

const HighlightContentSchema = z.object({
  mainText: z.string().min(1),
  subText: z.string().optional(),
  highlightColor: z.enum(["signal", "accent", "premium"]).optional(),
  showPulse: z.boolean().optional(),
});

const TransitionContentSchema = z.object({
  label: z.string().optional(),
  style: z.enum(["fade", "wipe", "zoom"]).optional(),
  showBrandMark: z.boolean().optional(),
});

const ListRevealItemSchema = z.object({
  title: z.string().min(1),
  subtitle: z.string().optional(),
  iconId: z.string().optional(),
});

const ListRevealContentSchema = z.object({
  listLabel: z.string().min(1),
  items: z.array(ListRevealItemSchema).max(7),
  showNumbers: z.boolean().optional(),
  revealStyle: z.enum(["stagger", "cascade"]).optional(),
});

const SplitQuoteContentSchema = z.object({
  leftQuote: z.string().min(1),
  leftAttribution: z.string().min(1),
  rightQuote: z.string().min(1),
  rightAttribution: z.string().min(1),
  vsLabel: z.string().optional(),
});

// --- Beat Definition Schema (BEAT_SYSTEM_DESIGN_SPEC §4-1) ---

const BeatDefinitionSchema = z.object({
  id: z.string().min(1),
  role: z.string().min(1), // BeatRole — open union, validated semantically in validateBeats
  startRatio: z.number().min(0).max(1),
  endRatio: z.number().min(0).max(1),
  narrationText: z.string().optional(),
  activates: z.array(z.string()),
  deactivates: z.array(z.string()).optional(),
  emphasisTargets: z.array(z.string()).optional(),
  motionPreset: z
    .enum(["gentle", "smooth", "snappy", "heavy", "dramatic"])
    .optional(),
  transition: z.enum(["enter", "replace", "emphasis"]).optional(),
});

// --- Scene Asset Refs (NO coverImage, NO bgm) ---

const SceneAssetRefsSchema = z.object({
  backgroundTexture: z.string().optional(),
  icon: z.string().optional(),
  sfx: z.string().optional(),
});

// --- Shorts Scene Config (NO 'enabled' field) ---

const ShortsSceneConfigSchema = z.object({
  skipForShorts: z.boolean().optional(),
  durationFramesOverride: z.number().optional(),
  beats: z.array(BeatDefinitionSchema).optional(),
});

// --- Scene Base ---

const SceneBaseSchema = z.object({
  id: z.string().min(1),
  type: z.enum([
    "cover",
    "chapterDivider",
    "keyInsight",
    "compareContrast",
    "quote",
    "framework",
    "application",
    "data",
    "closing",
    "timeline",
    "highlight",
    "transition",
    "listReveal",
    "splitQuote",
  ]),
  layoutArchetypeOverride: z
    .enum([
      "center-focus",
      "left-anchor",
      "split-compare",
      "grid-expand",
      "quote-hold",
      "map-flow",
      "top-anchor",
      "band-divider",
    ])
    .optional(),
  durationFrames: z.number().optional(),
  motionPresetOverride: z
    .enum(["gentle", "smooth", "snappy", "heavy", "dramatic"])
    .optional(),
  narrationText: z.string().optional(), // FLAT field. Never scene.narration.text.
  assets: SceneAssetRefsSchema.optional(),
  shorts: ShortsSceneConfigSchema.optional(),
  beats: z.array(BeatDefinitionSchema).optional(),
});

// --- Discriminated union for typed scenes ---

const TypedSceneSchema = z.discriminatedUnion("type", [
  SceneBaseSchema.extend({
    type: z.literal("cover"),
    content: CoverContentSchema,
  }),
  SceneBaseSchema.extend({
    type: z.literal("chapterDivider"),
    content: ChapterDividerContentSchema,
  }),
  SceneBaseSchema.extend({
    type: z.literal("keyInsight"),
    content: KeyInsightContentSchema,
  }),
  SceneBaseSchema.extend({
    type: z.literal("compareContrast"),
    content: CompareContrastContentSchema,
  }),
  SceneBaseSchema.extend({
    type: z.literal("quote"),
    content: QuoteContentSchema,
  }),
  SceneBaseSchema.extend({
    type: z.literal("framework"),
    content: FrameworkContentSchema,
  }),
  SceneBaseSchema.extend({
    type: z.literal("application"),
    content: ApplicationContentSchema,
  }),
  SceneBaseSchema.extend({
    type: z.literal("data"),
    content: DataContentSchema,
  }),
  SceneBaseSchema.extend({
    type: z.literal("closing"),
    content: ClosingContentSchema,
  }),
  SceneBaseSchema.extend({
    type: z.literal("timeline"),
    content: TimelineContentSchema,
  }),
  SceneBaseSchema.extend({
    type: z.literal("highlight"),
    content: HighlightContentSchema,
  }),
  SceneBaseSchema.extend({
    type: z.literal("transition"),
    content: TransitionContentSchema,
  }),
  SceneBaseSchema.extend({
    type: z.literal("listReveal"),
    content: ListRevealContentSchema,
  }),
  SceneBaseSchema.extend({
    type: z.literal("splitQuote"),
    content: SplitQuoteContentSchema,
  }),
]);

// --- BookContent schema ---

const BookMetadataSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  author: z.string().min(1),
  originalTitle: z.string().optional(),
  genre: z.enum([
    "selfHelp",
    "psychology",
    "business",
    "philosophy",
    "science",
    "ai",
  ]),
  isbn: z.string().optional(),
  coverImageUrl: z.string().optional(),
  publishYear: z.number().optional(),
  tags: z.array(z.string()).optional(),
  channelNote: z.string().optional(),
});

const ProductionConfigSchema = z.object({
  format: z.enum(["longform", "shorts", "both"]).optional(),
  targetDurationSeconds: z.number().optional(),
  fps: z.number().optional(),
  themeMode: z.enum(["dark", "light"]).optional(),
  genreOverride: z
    .enum(["selfHelp", "psychology", "business", "philosophy", "science", "ai"])
    .optional(),
});

const NarrationConfigSchema = z.object({
  voice: z.string().min(1),
  ttsEngine: z
    .enum(["edge-tts", "elevenlabs", "google-tts", "minimax"])
    .optional(),
  speed: z.number().optional(),
  pitch: z.string().optional(),
  subtitleMaxCharsPerLine: z.number().optional(),
  subtitleMaxLines: z.number().optional(),
});

const AudioConfigSchema = z.object({
  bgmTrack: z.string().optional(),
  bgmVolume: z.number().optional(),
  sonicLogo: z.string().optional(),
});

const BookContentSchema = z.object({
  $schema: z.string().optional(),
  metadata: BookMetadataSchema,
  production: ProductionConfigSchema.optional(),
  narration: NarrationConfigSchema,
  scenes: z.array(TypedSceneSchema).min(1),
  audio: AudioConfigSchema.optional(),
});

// --- Constants ---

export const MIN_SCENES = { longform: 5, shorts: 1, both: 5 } as const;

// --- Helpers ---

function hasDuplicateIds(scenes: Array<{ id: string }>): boolean {
  const ids = scenes.map((s) => s.id);
  return new Set(ids).size !== ids.length;
}

function fileExists(relativePath: string): boolean {
  const absPath = path.resolve(process.cwd(), relativePath);
  return fs.existsSync(absPath);
}

function hasLicensePendingAssets(book: BookContent): boolean {
  // Check asset-manifest for any referenced assets with pending-check status
  const manifestPath = path.resolve(
    process.cwd(),
    "src/schema/asset-manifest.json",
  );
  if (!fs.existsSync(manifestPath)) return false;

  try {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));
    const assets: Array<{ id: string; license: { status: string } }> =
      manifest.assets ?? [];
    const pendingIds = new Set(
      assets
        .filter((a) => a.license.status === "pending-check")
        .map((a) => a.id),
    );
    if (pendingIds.size === 0) return false;

    // Check if any scene references a pending-check asset
    for (const scene of book.scenes) {
      if (scene.assets) {
        const refs = [
          scene.assets.backgroundTexture,
          scene.assets.icon,
          scene.assets.sfx,
        ];
        for (const ref of refs) {
          if (ref && pendingIds.has(ref)) return true;
        }
      }
    }
  } catch {
    // If manifest can't be read, don't block
  }

  return false;
}

// --- Beat Validation (BEAT_SYSTEM_DESIGN_SPEC §10) ---

interface BeatValidationResult {
  errors: string[];
  warnings: string[];
}

function validateBeats(
  scene: {
    id: string;
    durationFrames?: number;
    shorts?: { beats?: unknown[] };
    narrationText?: string;
  },
  beats: Array<{
    id: string;
    role: string;
    startRatio: number;
    endRatio: number;
    narrationText?: string;
    emphasisTargets?: string[];
  }>,
): BeatValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (beats.length === 0) return { errors, warnings };

  // 1. startRatio 오름차순 정렬 확인
  for (let i = 1; i < beats.length; i++) {
    if (beats[i].startRatio < beats[i - 1].startRatio) {
      errors.push(
        `[${scene.id}] beat "${beats[i].id}" startRatio is before previous beat`,
      );
    }
  }

  // 2. endRatio > startRatio
  for (const beat of beats) {
    if (beat.endRatio <= beat.startRatio) {
      errors.push(
        `[${scene.id}] beat "${beat.id}" endRatio must be > startRatio`,
      );
    }
  }

  // 3. 비율 범위 0~1
  for (const beat of beats) {
    if (beat.startRatio < 0 || beat.endRatio > 1) {
      errors.push(
        `[${scene.id}] beat "${beat.id}" ratios must be in 0~1 range`,
      );
    }
  }

  // 4. overlap 검사
  for (let i = 1; i < beats.length; i++) {
    if (beats[i].startRatio < beats[i - 1].endRatio) {
      errors.push(
        `[${scene.id}] beats "${beats[i - 1].id}" and "${beats[i].id}" overlap`,
      );
    }
  }

  // 5. beat id 중복 검사
  const ids = beats.map((b) => b.id);
  const dupes = ids.filter((id, i) => ids.indexOf(id) !== i);
  if (dupes.length > 0) {
    errors.push(`[${scene.id}] duplicate beat ids: ${dupes.join(", ")}`);
  }

  // 6. beat 최소 길이: 0.12 미만 금지
  for (const beat of beats) {
    const length = beat.endRatio - beat.startRatio;
    if (length < 0.12) {
      errors.push(
        `[${scene.id}] beat "${beat.id}" length ${length.toFixed(2)} is below minimum 0.12`,
      );
    }
  }

  // 7. shorts beat 최소 길이 경고: 0.18 미만
  const shortsBeats = scene.shorts?.beats as
    | Array<{
        id: string;
        startRatio: number;
        endRatio: number;
      }>
    | undefined;
  if (shortsBeats) {
    for (const beat of shortsBeats) {
      const length = beat.endRatio - beat.startRatio;
      if (length < 0.18) {
        warnings.push(
          `[${scene.id}] shorts beat "${beat.id}" length ${length.toFixed(2)} below recommended 0.18`,
        );
      }
    }
  }

  // 8. 8초+ 씬에서 단일 beat 경고
  const fps = 30; // default fps
  const durationSec = (scene.durationFrames ?? 150) / fps;
  if (durationSec >= 8 && beats.length === 1) {
    warnings.push(
      `[${scene.id}] scene is ${durationSec.toFixed(0)}s but has only 1 beat. Consider adding more beats.`,
    );
  }

  // B2: narrationText 합침 일치 검사
  if (scene.narrationText) {
    const combined = beats
      .map((b) => b.narrationText)
      .filter(Boolean)
      .join(" ");
    if (combined.length > 0) {
      const prefix = combined.substring(0, Math.min(20, combined.length));
      if (!scene.narrationText.includes(prefix)) {
        warnings.push(
          `[${scene.id}] beat narrationText 합침이 씬 narrationText와 불일치`,
        );
      }
    }
  }

  // B3: emphasisTargets 자막 반영 가능성 검사
  for (const beat of beats) {
    if (beat.emphasisTargets && beat.narrationText) {
      for (const target of beat.emphasisTargets) {
        if (!beat.narrationText.includes(target)) {
          warnings.push(
            `[${scene.id}] emphasisTarget "${target}"가 beat "${beat.id}" narrationText에 없음`,
          );
        }
      }
    }
  }

  // B4: beat 전환 시점이 씬 경계에 너무 가까운 경우 경고
  if (scene.durationFrames) {
    for (const beat of beats) {
      const transitionFrame = Math.round(
        beat.startRatio * scene.durationFrames,
      );
      if (transitionFrame > 0 && transitionFrame < 5) {
        warnings.push(
          `[${scene.id}] beat "${beat.id}" 전환이 씬 시작에 너무 가까움 (${transitionFrame}f)`,
        );
      }
      const endFrame = Math.round(beat.endRatio * scene.durationFrames);
      if (
        endFrame > scene.durationFrames - 5 &&
        endFrame < scene.durationFrames
      ) {
        warnings.push(
          `[${scene.id}] beat "${beat.id}" 종료가 씬 끝에 너무 가까움 (${scene.durationFrames - endFrame}f gap)`,
        );
      }
    }
  }

  return { errors, warnings };
}

// --- Main validation ---

export async function validateBook(book: unknown): Promise<ValidationResult> {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Step 1: Zod structural validation
  const parseResult = BookContentSchema.safeParse(book);
  if (!parseResult.success) {
    const zodErrors = parseResult.error.issues.map(
      (issue) => `${issue.path.join(".")}: ${issue.message}`,
    );
    return { level: "BLOCKED", errors: zodErrors, warnings: [] };
  }

  const parsed = parseResult.data as BookContent;
  const format = parsed.production?.format ?? "both";
  const isLongform = format === "longform" || format === "both";

  // Step 2: Level 0 — BLOCKED checks

  // Min scenes
  const minRequired = MIN_SCENES[format];
  if (parsed.scenes.length < minRequired) {
    errors.push(
      `Minimum ${minRequired} scenes required for format "${format}", got ${parsed.scenes.length}`,
    );
  }

  // Duplicate IDs
  if (hasDuplicateIds(parsed.scenes)) {
    errors.push("Duplicate scene IDs detected");
  }

  // Longform: cover must appear within first 3 scenes, last must be 'closing'
  if (isLongform) {
    const coverIndex = parsed.scenes.findIndex((s) => s.type === "cover");
    if (coverIndex === -1 || coverIndex >= 3) {
      errors.push(
        'Longform: "cover" scene must appear within the first 3 scenes',
      );
    }
    if (parsed.scenes[parsed.scenes.length - 1]?.type !== "closing") {
      errors.push('Longform: last scene must be type "closing"');
    }

    // Cover image validation
    const coverScene = parsed.scenes.find((s) => s.type === "cover");
    if (coverScene) {
      const coverImageUrl = (coverScene.content as { coverImageUrl: string })
        .coverImageUrl;
      const coverPath = path.join("assets", coverImageUrl);
      if (!fileExists(coverPath)) {
        errors.push(`Cover image not found: ${coverPath}`);
      }
    }
  }

  // Headline hard limit (60 chars) and narrationText hard limit (500 chars)
  for (const scene of parsed.scenes) {
    if (scene.type === "keyInsight") {
      const headline = (scene.content as { headline: string }).headline;
      if (headline.length > 60) {
        errors.push(
          `Scene ${scene.id}: headline exceeds 60 chars (${headline.length})`,
        );
      }
    }

    if (scene.narrationText && scene.narrationText.length > 500) {
      errors.push(
        `Scene ${scene.id}: narrationText exceeds 500 chars (${scene.narrationText.length})`,
      );
    }
  }

  // License pending-check assets
  if (hasLicensePendingAssets(parsed)) {
    errors.push(
      'Cannot render: book references assets with license status "pending-check"',
    );
  }

  // Step 3: Level 1 — WARN checks
  for (const scene of parsed.scenes) {
    if (
      scene.narrationText &&
      scene.narrationText.length > 300 &&
      scene.narrationText.length <= 500
    ) {
      warnings.push(
        `Scene ${scene.id}: narrationText > 120 chars (${scene.narrationText.length}), TTS may be long`,
      );
    }
  }

  // Step 4: Beat validation (BEAT_SYSTEM_DESIGN_SPEC §10)
  for (const scene of parsed.scenes) {
    // B1: 8초+ 씬에 beats 없음 경고
    const FPS = 30;
    if (
      scene.durationFrames &&
      scene.durationFrames / FPS >= 8 &&
      (!scene.beats || scene.beats.length === 0)
    ) {
      warnings.push(
        `[${scene.id}] 8초+ 씬(${(scene.durationFrames / FPS).toFixed(1)}s)에 beats가 없습니다`,
      );
    }

    if (scene.beats && scene.beats.length > 0) {
      const beatResult = validateBeats(scene, scene.beats);
      errors.push(...beatResult.errors);
      warnings.push(...beatResult.warnings);
    }
  }

  const level = errors.length > 0 ? "BLOCKED" : "PASS";
  return { level, errors, warnings };
}

export { BookContentSchema, TypedSceneSchema };

export const ContentSchemaMap: Record<
  Exclude<SceneType, "custom">,
  z.ZodSchema
> = {
  cover: CoverContentSchema,
  chapterDivider: ChapterDividerContentSchema,
  keyInsight: KeyInsightContentSchema,
  compareContrast: CompareContrastContentSchema,
  quote: QuoteContentSchema,
  framework: FrameworkContentSchema,
  application: ApplicationContentSchema,
  data: DataContentSchema,
  closing: ClosingContentSchema,
  timeline: TimelineContentSchema,
  highlight: HighlightContentSchema,
  transition: TransitionContentSchema,
  listReveal: ListRevealContentSchema,
  splitQuote: SplitQuoteContentSchema,
};
