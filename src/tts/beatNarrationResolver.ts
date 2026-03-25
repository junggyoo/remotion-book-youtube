import type { Beat } from "../types";

/**
 * Minimal scene shape — avoids coupling to full SceneBase.
 * generate-captions.ts has its own inline BookContent type.
 */
interface SceneWithBeats {
  narrationText?: string;
  beats?: Beat[];
}

/**
 * Resolve narration text for TTS generation.
 * - Beats with narrationText → concatenate in beat order
 * - No beats / all visual-only beats → scene.narrationText as-is
 *
 * CONSTRAINT: beat narrationText order MUST match beat startRatio order.
 */
export function resolveBeatNarration(
  scene: SceneWithBeats,
): string | undefined {
  if (!scene.beats || scene.beats.length === 0) {
    return scene.narrationText;
  }

  const narratedBeats = scene.beats.filter(
    (b) => b.narrationText && b.narrationText.trim().length > 0,
  );

  if (narratedBeats.length === 0) {
    return scene.narrationText; // All beats visual-only
  }

  // Runtime assertion: beats with narration must be in startRatio order
  for (let i = 1; i < narratedBeats.length; i++) {
    if (narratedBeats[i].startRatio < narratedBeats[i - 1].startRatio) {
      console.warn(
        `[beatNarrationResolver] Beat order mismatch: ${narratedBeats[i].id} startRatio < ${narratedBeats[i - 1].id}. Using scene narration fallback.`,
      );
      return scene.narrationText;
    }
  }

  return narratedBeats.map((b) => b.narrationText!).join(" ");
}
