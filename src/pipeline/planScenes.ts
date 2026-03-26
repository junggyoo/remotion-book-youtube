import type { TypedScene, FormatKey, TTSResult } from "@/types";
import sceneCatalog from "@/schema/scene-catalog.json";

type SceneCatalogEntry = {
  durationFramesDefault: number;
  [key: string]: unknown;
};

/**
 * Fallback defaults for scene types not yet in scene-catalog.json.
 * These will be removed once a human adds them to the catalog.
 */
const EXTENDED_SCENE_DEFAULTS: Record<string, number> = {
  timeline: 240,
  highlight: 120,
  transition: 60,
  listReveal: 210,
  splitQuote: 180,
};

function getCatalogDefault(sceneType: string): number {
  const entry = (sceneCatalog.scenes as Record<string, SceneCatalogEntry>)[
    sceneType
  ];
  if (entry) {
    return entry.durationFramesDefault;
  }
  const fallback = EXTENDED_SCENE_DEFAULTS[sceneType];
  if (fallback !== undefined) {
    return fallback;
  }
  throw new Error(
    `Unknown scene type "${sceneType}" — not found in scene-catalog.json`,
  );
}

const TAIL_PADDING_FRAMES = 15;

/**
 * Duration decision tree (revised):
 * 1. narration + TTS → TTS.durationFrames + padding (source of truth)
 * 2. no narration → explicit durationFrames > catalog default
 * 3. narration but no TTS → catalog default (silent mode)
 */
export function resolveDuration(
  scene: TypedScene,
  ttsResult?: TTSResult,
): number {
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
 * Filter scenes for format:
 * - longform → return all
 * - shorts → filter out skipForShorts===true; if empty, fallback to all with warning
 */
export function getScenesForFormat(
  scenes: TypedScene[],
  format: FormatKey,
): TypedScene[] {
  if (format === "longform" || format === "both") {
    return scenes;
  }

  // shorts
  const filtered = scenes.filter((s) => s.shorts?.skipForShorts !== true);
  if (filtered.length === 0) {
    console.warn(
      "All scenes have skipForShorts=true — falling back to all scenes for shorts format",
    );
    return scenes;
  }
  return filtered;
}

export type PlannedScene = TypedScene & {
  resolvedDuration: number;
  from: number;
};

/**
 * Plan scenes: resolve durations and calculate cumulative `from` offsets.
 */
export function planScenes(
  scenes: TypedScene[],
  format: FormatKey,
  ttsResults?: Map<string, TTSResult>,
): PlannedScene[] {
  const formatScenes = getScenesForFormat(scenes, format);
  const planned: PlannedScene[] = [];
  let cumulativeFrom = 0;

  for (const scene of formatScenes) {
    const ttsResult = ttsResults?.get(scene.id);
    const resolvedDuration = resolveDuration(scene, ttsResult);

    planned.push({
      ...scene,
      resolvedDuration,
      from: cumulativeFrom,
    });

    cumulativeFrom += resolvedDuration;
  }

  return planned;
}
