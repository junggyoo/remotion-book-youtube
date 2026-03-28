/**
 * P2-6a: Transition SFX
 *
 * Maps transitionIntent → sound effect file.
 * Provides dedup logic to prevent consecutive identical SFX.
 */

import type { TransitionIntent } from "./mapTransitionIntent";

// ── SFX Mapping ──

/** Maps each transition intent to its SFX file (or null for silence). */
export const TRANSITION_SFX: Record<TransitionIntent, string | null> = {
  fade: null,
  directional: "whoosh.mp3",
  cut: null,
  morph: "shimmer.mp3",
};

/** SFX volume range (narration-subordinate) */
export const SFX_VOLUME = 0.35;

// ── Dedup Logic ──

/**
 * Given an ordered list of transitionIntents between scenes,
 * returns the resolved SFX file for each transition (with dedup applied).
 *
 * Rule: If the same non-null SFX would play consecutively, the second is nulled.
 */
export function resolveTransitionSfx(
  intents: (TransitionIntent | undefined)[],
): (string | null)[] {
  let lastSfx: string | null = null;

  return intents.map((intent) => {
    if (!intent) return null;

    const sfx = TRANSITION_SFX[intent] ?? null;

    // Dedup: suppress consecutive identical SFX
    if (sfx !== null && sfx === lastSfx) {
      return null;
    }

    lastSfx = sfx;
    return sfx;
  });
}
