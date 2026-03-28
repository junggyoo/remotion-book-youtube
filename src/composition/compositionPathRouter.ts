import type { SceneBlueprint } from "@/types";
import type { SceneSpec } from "@/direction/types";
import type { CompositionContext } from "./types";
import { recipeRegistry } from "./familyRecipes";
import { composeBlueprint } from "./CompositionFactory";

const COMPOSE_CONFIDENCE_THRESHOLD = 0.6;

/**
 * Determine if a SceneSpec should use the composed rendering path.
 * Conditions: source is "composed" AND recipe exists AND confidence >= threshold
 */
export function shouldCompose(spec: SceneSpec): boolean {
  if (spec.source !== "composed") return false;

  if (!(spec.family in recipeRegistry)) {
    console.debug(
      `[CompositionPathRouter] Family "${spec.family}" has no recipe. Falling back to preset.`,
    );
    return false;
  }

  if ((spec.confidence ?? 1.0) < COMPOSE_CONFIDENCE_THRESHOLD) {
    console.debug(
      `[CompositionPathRouter] Scene "${spec.id}" confidence ${spec.confidence} < ${COMPOSE_CONFIDENCE_THRESHOLD}. Falling back to preset.`,
    );
    return false;
  }

  return true;
}

/**
 * Try to compose a SceneBlueprint from a SceneSpec.
 * Returns null if the scene should use the preset path instead.
 */
export function tryComposeScene(
  spec: SceneSpec,
  ctx: CompositionContext,
): SceneBlueprint | null {
  if (!shouldCompose(spec)) return null;

  const blueprint = composeBlueprint(spec, ctx);

  if (!blueprint) {
    console.warn(
      `[CompositionPathRouter] composeBlueprint returned null for scene "${spec.id}" (family: ${spec.family}). Falling back to preset.`,
    );
  }

  return blueprint;
}
