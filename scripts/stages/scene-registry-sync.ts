/**
 * SceneRegistrySync stage — DSGS Stage 6.1 (post-synthesis registry sync)
 *
 * Runs after SceneSynthesizer (Stage 6). Loads the SceneRegistry, logs
 * invention records for each synthesized blueprint, validates them,
 * evaluates promotions/demotions, and expires stale inventions.
 *
 * D8: Builds pseudo-gaps for extractInventionRecord (temporary bridge).
 */

import "tsconfig-paths/register";
import { readFileSync, existsSync, readdirSync } from "fs";
import path from "path";
import { SceneRegistry } from "@/registry/SceneRegistry";
import { migrateBuiltinRecipes } from "@/registry/registryMigration";
import { extractInventionRecord } from "@/registry/InventionPromptContract";
import { validateInvention } from "@/registry/InventionValidator";
import { PromotionWorkflow } from "@/registry/PromotionWorkflow";
import type { SynthesizedBlueprint, SceneGap, SceneBlueprint } from "@/types";
import type { BlueprintSnapshot } from "@/registry/types";
import type {
  DsgsStage,
  DsgsContext,
  DsgsStageResult,
} from "../dsgs-orchestrate";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface RegistrySyncResult {
  loaded: boolean;
  migratedCount: number;
  inventionsLogged: number;
  validationsPassed: number;
  validationsFailed: number;
  promotionsEvaluated: number;
  expiredCount: number;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const REGISTRY_PATH = path.resolve("generated/registry/scene-registry.json");

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Load or create the SceneRegistry and migrate builtin recipes.
 */
export function loadOrCreateRegistry(): SceneRegistry {
  const registry = SceneRegistry.loadOrCreate(REGISTRY_PATH);
  const migrated = migrateBuiltinRecipes(registry);
  if (migrated > 0) {
    registry.save();
  }
  return registry;
}

/**
 * Sync synthesized blueprints into the registry after synthesis.
 */
export function syncAfterSynthesis(
  registry: SceneRegistry,
  bookId: string,
  synthesizedBlueprints: SynthesizedBlueprint[],
): RegistrySyncResult {
  let inventionsLogged = 0;
  let validationsPassed = 0;
  let validationsFailed = 0;

  // 1. For each synthesized blueprint, log invention + validate
  for (const bp of synthesizedBlueprints) {
    // Build BlueprintSnapshot
    const snapshot: BlueprintSnapshot = {
      layout: bp.layout,
      choreography: bp.choreography,
      elementCount: bp.elements?.length ?? 0,
      motionPreset: bp.motionPreset,
    };

    // D8: Build pseudo-gap for extractInventionRecord (temporary bridge)
    // SceneGap.bestPresetMatch is a full PresetMatch — fill required fields
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
          explanation: "pseudo-gap for registry sync",
        },
      },
      gapReason: "pseudo-gap-for-registry-sync",
      requiredCapabilities: [],
      priority: "nice",
      intent: bp.intent,
    };

    // Extract invention record
    const record = extractInventionRecord(pseudoGap, bookId, snapshot);
    registry.logInvention(record);
    inventionsLogged++;

    // Validate the blueprint
    const validationResult = validateInvention(bp);

    // Update invention status based on validation
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

  // 2. Expire stale inventions
  const expired = registry.expireStaleInventions();

  // 3. Evaluate promotions for all "validated" entries
  const workflow = new PromotionWorkflow(registry);
  let promotionsEvaluated = 0;

  const validatedEntries = registry.getByStatus("validated");
  for (const entry of validatedEntries) {
    workflow.evaluatePromotion(entry.id);
    promotionsEvaluated++;
  }

  // 4. Evaluate demotions for all "promoted" entries
  const promotedEntries = registry.getByStatus("promoted");
  for (const entry of promotedEntries) {
    workflow.evaluateDemotion(entry.id);
    promotionsEvaluated++;
  }

  // 5. Save registry
  registry.save();

  return {
    loaded: true,
    migratedCount: 0, // migration happens in loadOrCreateRegistry
    inventionsLogged,
    validationsPassed,
    validationsFailed,
    promotionsEvaluated,
    expiredCount: expired.length,
  };
}

// ---------------------------------------------------------------------------
// Stage export
// ---------------------------------------------------------------------------

function isSynthesizedBlueprint(
  bp: SceneBlueprint,
): bp is SynthesizedBlueprint {
  return bp.origin === "synthesized";
}

export const registrySyncStage: DsgsStage = {
  id: "6.1-registry-sync",
  name: "SceneRegistrySync",
  async run(ctx: DsgsContext): Promise<DsgsStageResult> {
    const start = Date.now();

    // 1. Load or create registry + migrate builtins
    const registry = loadOrCreateRegistry();
    const stats = registry.getStats();
    console.log(
      `  Registry loaded: ${stats.total} entries, ${stats.inventions} inventions, ${stats.promotions} promotions`,
    );

    // 2. Find synthesized blueprints from 06-blueprints/
    const bpDir = path.join(ctx.planDir, "06-blueprints");
    const synthesized: SynthesizedBlueprint[] = [];

    if (existsSync(bpDir)) {
      const bpFiles = readdirSync(bpDir).filter((f: string) =>
        f.endsWith(".blueprint.json"),
      );
      for (const file of bpFiles) {
        try {
          const bp = JSON.parse(
            readFileSync(path.join(bpDir, file), "utf-8"),
          ) as SceneBlueprint;
          if (isSynthesizedBlueprint(bp)) {
            synthesized.push(bp);
          }
        } catch {
          // skip malformed blueprints
        }
      }
    }

    if (synthesized.length === 0) {
      // Still save registry (migration may have added entries)
      registry.save();
      return {
        stageId: "6.1-registry-sync",
        status: "success",
        artifacts: [REGISTRY_PATH],
        durationMs: Date.now() - start,
        message: `Registry synced (no synthesized blueprints to log). ${stats.total} entries.`,
      };
    }

    // 3. Sync after synthesis
    const result = syncAfterSynthesis(registry, ctx.bookId, synthesized);

    // 4. Log results
    console.log(`\n  Registry Sync Summary:`);
    console.log(`  ${result.inventionsLogged} inventions logged`);
    console.log(
      `  ${result.validationsPassed} passed / ${result.validationsFailed} failed validation`,
    );
    console.log(
      `  ${result.promotionsEvaluated} promotion/demotion evaluations`,
    );
    if (result.expiredCount > 0) {
      console.log(`  ${result.expiredCount} stale inventions expired`);
    }

    return {
      stageId: "6.1-registry-sync",
      status: "success",
      artifacts: [REGISTRY_PATH],
      durationMs: Date.now() - start,
      message: `Synced ${result.inventionsLogged} inventions (${result.validationsPassed} passed, ${result.validationsFailed} failed). ${result.promotionsEvaluated} promotion evals. ${result.expiredCount} expired.`,
    };
  },
};
