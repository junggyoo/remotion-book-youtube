import type { TTSResult, TypedScene } from "@/types";
import sceneCatalog from "@/schema/scene-catalog.json";

type SceneCatalogEntry = {
  durationFramesDefault: number;
  [key: string]: unknown;
};

function getCatalogDefault(sceneType: string): number {
  const entry = (sceneCatalog.scenes as Record<string, SceneCatalogEntry>)[
    sceneType
  ];
  if (!entry) {
    throw new Error(
      `Unknown scene type "${sceneType}" — not found in scene-catalog.json`,
    );
  }
  return entry.durationFramesDefault;
}

const TAIL_PADDING_FRAMES = 15;

/**
 * Standalone duration sync utility (same logic as planScenes.resolveDuration).
 *
 * Duration decision tree (revised):
 * 1. narration + TTS → TTS.durationFrames + padding (source of truth)
 * 2. no narration → explicit durationFrames > catalog default
 * 3. narration but no TTS → catalog default (silent mode)
 */
export function syncDuration(scene: TypedScene, ttsResult?: TTSResult): number {
  const hasNarration = !!scene.narrationText?.trim();
  const catalogDefault = getCatalogDefault(scene.type);

  // Case 1: narration 있고 TTS 결과 존재 → TTS가 source of truth
  if (hasNarration && ttsResult) {
    const ttsDuration = ttsResult.durationFrames + TAIL_PADDING_FRAMES;
    const minDuration = (scene as unknown as Record<string, unknown>)
      .minDurationFrames as number | undefined;
    const resolved = Math.max(ttsDuration, minDuration ?? 0);

    if (
      scene.durationFrames !== undefined &&
      scene.durationFrames !== resolved
    ) {
      console.warn(
        `⚠️  Scene ${scene.id}: durationFrames(${scene.durationFrames}) 무시 → TTS 기반 ${resolved}f 사용`,
      );
    }
    return resolved;
  }

  // Case 2: narration 없는 씬 → 명시값 우선, 없으면 catalog default
  if (scene.durationFrames !== undefined) {
    return scene.durationFrames;
  }

  // Case 3: narration 있지만 TTS 실패 → catalog default (silent 모드)
  if (hasNarration && !ttsResult) {
    console.warn(
      `⚠️  Scene ${scene.id}: narration 있으나 TTS 없음 → catalog default ${catalogDefault}f (silent)`,
    );
  }

  return catalogDefault;
}

/**
 * Convert frames to milliseconds.
 */
export function framesToMs(frames: number, fps: number): number {
  return Math.round((frames / fps) * 1000);
}

/**
 * Convert milliseconds to frames.
 */
export function msToFrames(ms: number, fps: number): number {
  return Math.ceil((ms / 1000) * fps);
}
