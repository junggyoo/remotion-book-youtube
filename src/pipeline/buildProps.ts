import type {
  BookContent,
  TypedScene,
  TTSResult,
  Theme,
  FormatKey,
  FormatConfig,
  SubtitleEntry,
  SceneBlueprint,
} from "@/types";
import { planScenes } from "@/pipeline/planScenes";
import { useTheme } from "@/design/themes/useTheme";
import { useFormat } from "@/design/themes/useFormat";
import type { PlanBridgeResult, StoryboardScene } from "@/planning/types";

export type PlannedScene = TypedScene & {
  from: number;
  resolvedDuration: number;
  tts?: TTSResult;
  subtitles?: SubtitleEntry[];
};

export interface CompositionProps {
  bookId: string;
  scenes: PlannedScene[];
  totalDurationFrames: number;
  fps: number;
  format: FormatKey;
  theme: Theme;
  width: number;
  height: number;
}

/**
 * Build full composition props from BookContent.
 *
 * planResult is optional — when provided (from scripts running in Node.js),
 * book theme overrides and blueprint meta are applied.
 * When omitted (Remotion Studio webpack bundle), uses base theme with no planning.
 */
export function buildCompositionProps(
  book: BookContent,
  format: FormatKey,
  ttsResults?: Map<string, TTSResult>,
  subtitleMap?: Map<string, SubtitleEntry[]>,
  planResult?: PlanBridgeResult,
): CompositionProps {
  const fps = book.production?.fps ?? 30;
  const themeMode = book.production?.themeMode ?? "dark";
  const genre = book.production?.genreOverride ?? book.metadata.genre;
  const theme = planResult?.theme ?? useTheme(themeMode, genre);
  const formatConfig: FormatConfig = useFormat(
    format === "both" ? "longform" : format,
  );

  const planned = planScenes(book.scenes, format, ttsResults);

  // Attach TTS and subtitle data to each planned scene
  const scenes: PlannedScene[] = planned.map((scene) => {
    const tts = ttsResults?.get(scene.id);
    const subtitles = subtitleMap?.get(scene.id);
    return {
      ...scene,
      tts,
      subtitles,
    };
  });

  // Attach blueprint meta from planning layer
  const scenesWithBlueprints = scenes.map((scene) => {
    if (!planResult?.hasPlan) return scene;

    const resolved = planResult.resolvedScenes.find(
      (r) => r.sceneId === scene.id,
    );

    if (resolved?.renderMode === "blueprint" && resolved.blueprint) {
      return {
        ...scene,
        _blueprint: resolved.blueprint,
        _storyboard: resolved.storyboardEntry,
      };
    }
    return scene;
  });

  const totalDurationFrames =
    scenesWithBlueprints.length > 0
      ? scenesWithBlueprints[scenesWithBlueprints.length - 1].from +
        scenesWithBlueprints[scenesWithBlueprints.length - 1].resolvedDuration
      : 0;

  return {
    bookId: book.metadata.id,
    scenes: scenesWithBlueprints,
    totalDurationFrames,
    fps,
    format,
    theme,
    width: formatConfig.width,
    height: formatConfig.height,
  };
}
