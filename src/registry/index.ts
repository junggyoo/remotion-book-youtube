/**
 * Scene Registry — barrel export
 *
 * Re-exports all public types, classes, functions, and schemas
 * from the registry module.
 */

// ─── Types ─────────────────────────────────────────────────────────────────────

export type {
  RegistryState,
  RegistryEntry,
  LifecycleStatus,
  EntryOrigin,
  RecipeTemplate,
  ElementTemplate,
  Applicability,
  DerivedFromInfo,
  InventionRecord,
  InventionStatus,
  ValidationResult,
  PromotionRecord,
  BlueprintSnapshot,
} from "./types";

export type { BestRecipeOptions } from "./SceneRegistry";
export type { WorkflowDecision } from "./PromotionWorkflow";
export type { InventionPrompt } from "./InventionPromptContract";

// ─── Classes ───────────────────────────────────────────────────────────────────

export { SceneRegistry } from "./SceneRegistry";
export { PromotionWorkflow } from "./PromotionWorkflow";

// ─── Functions ─────────────────────────────────────────────────────────────────

export { validateInvention } from "./InventionValidator";
export {
  buildInventionPrompt,
  extractInventionRecord,
} from "./InventionPromptContract";
export { migrateBuiltinRecipes } from "./registryMigration";
export { runInventionLoop, queryPromotedRecipe } from "./inventionLoop";
export type {
  InventionLoopResult,
  InventionLoopOptions,
} from "./inventionLoop";

// ─── Schemas ───────────────────────────────────────────────────────────────────

export {
  RegistryStateSchema,
  RegistryEntrySchema,
  InventionRecordSchema,
  PromotionRecordSchema,
  BlueprintSnapshotSchema,
  SCENE_FAMILIES,
  LIFECYCLE_STATUSES,
  ENTRY_ORIGINS,
  INVENTION_STATUSES,
} from "./registrySchema";
