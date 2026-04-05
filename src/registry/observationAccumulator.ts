/**
 * ObservationAccumulator — routes PromotionObservations to the correct
 * SceneRegistry entry, enabling cross-book accumulation for promotion.
 */

import type { SceneFamily } from "@/direction/types";
import type { PromotionObservation } from "@/validator/promotionObserver";
import type { SceneRegistry } from "./SceneRegistry";
import { PRESET_FAMILY_MAP } from "./InventionPromptContract";

/**
 * Infer SceneFamily from a sceneType string (e.g., "framework" → "system-model").
 * Falls back to "concept-introduction" if no mapping exists.
 */
export function inferFamilyFromSceneType(sceneType: string): SceneFamily {
  return PRESET_FAMILY_MAP[sceneType] ?? "concept-introduction";
}

/**
 * Find the best registry entry to attach an observation to.
 * Returns the entry ID, or null if no matching entry exists.
 *
 * Strategy: infer family from obs.sceneType, then pick the highest-priority
 * entry for that family (promoted > validated > active > invented).
 */
export function findBestEntryForObservation(
  registry: SceneRegistry,
  obs: PromotionObservation,
): string | null {
  const family = inferFamilyFromSceneType(obs.sceneType);
  const entry = registry.getBestRecipe(family);
  return entry?.id ?? null;
}

/**
 * Accumulate observations into the registry, routing each to the best
 * matching entry. Skips duplicates (same bookId + blueprintId on same entry).
 *
 * @returns count of newly added observations
 */
export function accumulateObservations(
  registry: SceneRegistry,
  observations: PromotionObservation[],
): number {
  let added = 0;

  for (const obs of observations) {
    const entryId = findBestEntryForObservation(registry, obs);
    if (!entryId) continue;

    const entry = registry.getById(entryId);
    if (!entry) continue;

    // Dedup: skip if same bookId + blueprintId already exists on this entry
    const isDuplicate = entry.observations.some(
      (existing) =>
        existing.bookId === obs.bookId &&
        existing.blueprintId === obs.blueprintId,
    );
    if (isDuplicate) continue;

    registry.addObservation(entryId, obs);
    added++;
  }

  return added;
}
