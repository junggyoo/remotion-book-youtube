/**
 * Invention Loop Orchestrator (WP-6)
 *
 * Ties together gap detection → registry query → invention → validation → promotion
 * into a single automated function. Can be called standalone or from the DSGS pipeline.
 *
 * Flow:
 *   1. Load/create registry + migrate builtins
 *   2. Expire stale inventions (30-day TTL)
 *   3. For each gap: check registry for promoted recipe → skip if found
 *   4. For new gaps: log invention, validate, register
 *   5. Evaluate promotions/demotions for all eligible entries
 *   6. Save registry + return summary
 */

import path from "path";
import { SceneRegistry } from "./SceneRegistry";
import { migrateBuiltinRecipes } from "./registryMigration";
import { extractInventionRecord } from "./InventionPromptContract";
import { validateInvention } from "./InventionValidator";
import { PromotionWorkflow } from "./PromotionWorkflow";
import type { SynthesizedBlueprint, SceneGap } from "@/types";
import type { BlueprintSnapshot } from "./types";
import type { SceneFamily } from "@/direction/types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface InventionLoopResult {
  gapsDetected: number;
  gapsWithExistingRecipe: number;
  inventionsCreated: number;
  validationsPassed: number;
  validationsFailed: number;
  promotionsEvaluated: number;
  promotionsApplied: number;
  demotionsApplied: number;
  expiredInventions: number;
}

export interface InventionLoopOptions {
  registryPath?: string;
  dryRun?: boolean;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DEFAULT_REGISTRY_PATH = path.resolve(
  "generated/registry/scene-registry.json",
);

// ---------------------------------------------------------------------------
// Main orchestrator
// ---------------------------------------------------------------------------

/**
 * Run the full invention loop for a book's synthesized blueprints and gaps.
 */
export function runInventionLoop(
  bookId: string,
  gaps: SceneGap[],
  synthesizedBlueprints: SynthesizedBlueprint[],
  options: InventionLoopOptions = {},
): InventionLoopResult {
  const registryPath = options.registryPath ?? DEFAULT_REGISTRY_PATH;

  // 1. Load or create registry + migrate builtins
  const registry = SceneRegistry.loadOrCreate(registryPath);
  const migrated = migrateBuiltinRecipes(registry);
  if (migrated > 0) {
    registry.save();
  }

  // 2. Expire stale inventions
  const expired = registry.expireStaleInventions();

  // 3. Check gaps against registry for existing promoted recipes
  let gapsWithExistingRecipe = 0;
  const newGaps: SceneGap[] = [];

  for (const gap of gaps) {
    // Infer family from gap capabilities (same logic as InventionPromptContract)
    const family = inferFamilyFromGap(gap);
    const bestRecipe = registry.getBestRecipe(family);

    if (bestRecipe && bestRecipe.lifecycleStatus === "promoted") {
      gapsWithExistingRecipe++;
    } else {
      newGaps.push(gap);
    }
  }

  // 4. Log inventions for synthesized blueprints
  let inventionsCreated = 0;
  let validationsPassed = 0;
  let validationsFailed = 0;

  for (const bp of synthesizedBlueprints) {
    const snapshot: BlueprintSnapshot = {
      layout: bp.layout,
      choreography: bp.choreography,
      elementCount: bp.elements?.length ?? 0,
      motionPreset: bp.motionPreset,
    };

    // Build pseudo-gap for traceability
    const pseudoGap: SceneGap = {
      segment: "core",
      slotIndex: 0,
      bestPresetMatch: {
        segment: "core",
        slotIndex: 0,
        sceneType: bp.fallbackPreset,
        content: bp.fallbackContent,
        confidence: 0,
        scoreBreakdown: {
          delivery: 0,
          structure: 0,
          contentFit: 0,
          layout: 0,
          explanation: "invention-loop-auto",
        },
      },
      gapReason: "invention-loop",
      requiredCapabilities: [],
      priority: "nice",
      intent: bp.intent,
    };

    const record = extractInventionRecord(pseudoGap, bookId, snapshot);
    registry.logInvention(record);
    inventionsCreated++;

    const validationResult = validateInvention(bp);
    const newStatus = validationResult.passed
      ? "validation-passed"
      : "validation-failed";
    registry.updateInventionStatus(record.id, newStatus, validationResult);

    if (validationResult.passed) {
      validationsPassed++;
    } else {
      validationsFailed++;
    }
  }

  // 5. Evaluate promotions and demotions
  const workflow = new PromotionWorkflow(registry);
  let promotionsEvaluated = 0;
  let promotionsApplied = 0;
  let demotionsApplied = 0;

  for (const entry of registry.getByStatus("validated")) {
    const decision = workflow.evaluatePromotion(entry.id);
    promotionsEvaluated++;
    if (decision.action === "promoted") promotionsApplied++;
  }

  for (const entry of registry.getByStatus("promoted")) {
    const decision = workflow.evaluateDemotion(entry.id);
    promotionsEvaluated++;
    if (decision.action === "demoted") demotionsApplied++;
  }

  // 6. Save registry
  if (!options.dryRun) {
    registry.save();
  }

  return {
    gapsDetected: gaps.length,
    gapsWithExistingRecipe,
    inventionsCreated,
    validationsPassed,
    validationsFailed,
    promotionsEvaluated,
    promotionsApplied,
    demotionsApplied,
    expiredInventions: expired.length,
  };
}

/**
 * Query registry for best recipe for a given family.
 * Returns the recipe template if a promoted entry exists, null otherwise.
 */
export function queryPromotedRecipe(
  family: SceneFamily,
  registryPath?: string,
) {
  const rPath = registryPath ?? DEFAULT_REGISTRY_PATH;
  const registry = SceneRegistry.loadOrCreate(rPath);
  const best = registry.getBestRecipe(family);

  if (best && best.lifecycleStatus === "promoted") {
    return best.recipe;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const CAPABILITY_FAMILY_MAP: Record<string, SceneFamily> = {
  "cyclic-flow": "mechanism-explanation",
  "radial-layout": "system-model",
  "layered-stack": "system-model",
  "motif-wheel": "mechanism-explanation",
  "motif-spiral": "mechanism-explanation",
  "motif-orbit": "system-model",
  "motif-web": "system-model",
  "motif-rhizome": "system-model",
  "timeline-h": "progression-journey",
  "timeline-v": "progression-journey",
  "before-after-pair": "transformation-shift",
  "split-reveal": "tension-comparison",
  "emphasis-composition": "evidence-stack",
  "dramatic-choreography": "concept-introduction",
};

const PRESET_FAMILY_MAP: Record<string, SceneFamily> = {
  keyInsight: "concept-introduction",
  framework: "system-model",
  application: "progression-journey",
  compareContrast: "tension-comparison",
  quote: "reflective-anchor",
  data: "evidence-stack",
  timeline: "progression-journey",
  highlight: "concept-introduction",
};

function inferFamilyFromGap(gap: SceneGap): SceneFamily {
  for (const cap of gap.requiredCapabilities) {
    const family = CAPABILITY_FAMILY_MAP[cap];
    if (family) return family;
  }
  const presetType = gap.bestPresetMatch.sceneType;
  return PRESET_FAMILY_MAP[presetType] ?? "concept-introduction";
}
