/**
 * Scene Registry Zod Schemas
 *
 * Validates RegistryEntry, InventionRecord, PromotionRecord, and RegistryState.
 * All enum values mirror the TypeScript types in @/types and @/direction/types.
 */

import { z } from "zod";

// ─── Enum Constants ─────────────────────────────────────────────────────────

export const SCENE_FAMILIES = [
  "opening-hook",
  "concept-introduction",
  "mechanism-explanation",
  "system-model",
  "tension-comparison",
  "progression-journey",
  "transformation-shift",
  "evidence-stack",
  "reflective-anchor",
  "structural-bridge",
  "closing-synthesis",
] as const;

/** D1: "builtin" is NOT a lifecycle status — it is an origin value. */
export const LIFECYCLE_STATUSES = [
  "active",
  "invented",
  "validated",
  "promoted",
  "demoted",
  "expired",
  "archived",
] as const;

export const ENTRY_ORIGINS = [
  "builtin",
  "invention",
  "manual",
  "migration",
] as const;

export const INVENTION_STATUSES = [
  "invented",
  "validation-passed",
  "validation-failed",
  "promoted",
  "expired",
] as const;

const LAYOUT_TYPES = [
  "center-focus",
  "left-anchor",
  "split-compare",
  "grid-expand",
  "quote-hold",
  "map-flow",
  "top-anchor",
  "band-divider",
  "split-two",
  "timeline-h",
  "timeline-v",
  "radial",
  "pyramid",
  "flowchart",
  "stacked-layers",
  "orbit",
  "matrix-2x2",
  "scattered-cards",
  "comparison-bar",
  "grid-n",
] as const;

const CHOREOGRAPHY_TYPES = [
  "reveal-sequence",
  "stagger-clockwise",
  "count-up",
  "path-trace",
  "split-reveal",
  "stack-build",
  "zoom-focus",
  "wave-fill",
  "morph-transition",
  "pulse-emphasis",
] as const;

const MOTION_PRESET_KEYS = [
  "gentle",
  "smooth",
  "snappy",
  "heavy",
  "dramatic",
  "wordReveal",
  "punchy",
] as const;

// ─── Shared Sub-Schemas ─────────────────────────────────────────────────────

const ElementTemplateSchema = z.object({
  id: z.string(),
  type: z.string(),
  props: z.record(z.string(), z.unknown()),
  layer: z.number(),
  beatActivationKey: z.string(),
});

const RecipeTemplateSchema = z.object({
  defaultLayout: z.enum(LAYOUT_TYPES),
  defaultChoreography: z.enum(CHOREOGRAPHY_TYPES),
  elementTemplate: z.array(ElementTemplateSchema),
  defaultMotionPreset: z.enum(MOTION_PRESET_KEYS).optional(),
  layoutConfig: z.record(z.string(), z.unknown()).optional(),
});

const ApplicabilitySchema = z.object({
  formats: z.array(z.enum(["longform", "shorts"])).optional(),
  genres: z.array(z.string()).optional(),
});

const DerivedFromInfoSchema = z.object({
  gapCapabilities: z.array(z.string()),
  fallbackPreset: z.string().optional(),
});

const PromotionObservationSchema = z.object({
  blueprintId: z.string(),
  sceneType: z.string(),
  bookId: z.string(),
  renderStable: z.boolean(),
  timingCoherence: z.number(),
  focusClarity: z.number(),
  motionEntropy: z.number(),
  maxActivatesPerBeat: z.number(),
  maxConcurrentChannels: z.number(),
  reuseCandidateTag: z.array(z.string()).optional(),
});

// ─── Main Schemas ───────────────────────────────────────────────────────────

export const RegistryEntrySchema = z.object({
  id: z.string(),
  family: z.enum(SCENE_FAMILIES),
  lifecycleStatus: z.enum(LIFECYCLE_STATUSES),
  origin: z.enum(ENTRY_ORIGINS),
  recipe: RecipeTemplateSchema,
  observations: z.array(PromotionObservationSchema),
  version: z.number().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  statusReason: z.string().optional(),
  applicability: ApplicabilitySchema.optional(),
  derivedFrom: DerivedFromInfoSchema.optional(),
});

export const BlueprintSnapshotSchema = z.object({
  layout: z.enum(LAYOUT_TYPES),
  choreography: z.enum(CHOREOGRAPHY_TYPES),
  elementCount: z.number(),
  motionPreset: z.enum(MOTION_PRESET_KEYS),
});

const ValidationResultSchema = z.object({
  passed: z.boolean(),
  violations: z.array(z.string()),
  checkedAt: z.string().datetime(),
});

export const InventionRecordSchema = z.object({
  id: z.string(),
  gapId: z.string(),
  bookId: z.string(),
  family: z.enum(SCENE_FAMILIES),
  blueprintSnapshot: BlueprintSnapshotSchema,
  status: z.enum(INVENTION_STATUSES),
  inventedAt: z.string().datetime(),
  expiresAt: z.string().datetime(),
  validationResult: ValidationResultSchema.nullable(),
  derivedFrom: DerivedFromInfoSchema.optional(),
});

export const PromotionRecordSchema = z.object({
  entryId: z.string(),
  family: z.enum(SCENE_FAMILIES),
  action: z.enum(["promoted", "demoted", "expired"]),
  reason: z.string(),
  observationCount: z.number(),
  avgTimingCoherence: z.number(),
  avgFocusClarity: z.number(),
  minTimingCoherence: z.number(),
  minFocusClarity: z.number(),
  decidedAt: z.string().datetime(),
});

export const RegistryStateSchema = z.object({
  version: z.number(),
  entries: z.array(RegistryEntrySchema),
  inventionLog: z.array(InventionRecordSchema),
  promotionLog: z.array(PromotionRecordSchema),
  lastUpdated: z.string().datetime(),
});
