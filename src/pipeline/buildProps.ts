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
import {
  mapTransitionIntent,
  type TransitionIntent,
} from "@/transitions/mapTransitionIntent";
import {
  resolveDirectionFromFingerprint,
  adaptPresetToSceneSpec,
  resolveMotionParams,
} from "@/direction";
import type {
  DirectionProfile,
  SceneSpec,
  ResolvedMotionParams,
} from "@/direction";
import type { SceneFamily } from "@/direction/types";

// Near the top — composed path activation config
// TODO(Phase 2B): Move to experiment config / feature flag when more families are added.
const COMPOSED_FAMILIES: SceneFamily[] = [
  "concept-introduction",
  "system-model",
  "progression-journey",
];
import { tryComposeScene } from "@/composition/compositionPathRouter";
import type { CompositionContext } from "@/composition/types";

export type PlannedScene = TypedScene & {
  from: number;
  resolvedDuration: number;
  tts?: TTSResult;
  subtitles?: SubtitleEntry[];
  sceneSpec?: SceneSpec;
  resolvedMotion?: ResolvedMotionParams;
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
  textureMood?: "grain" | "clean" | "paper" | "noise" | "none";
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

  // Attach blueprint meta + storyboard entry from planning layer
  const scenesWithBlueprints = scenes.map((scene) => {
    if (!planResult?.hasPlan) return scene;

    const resolved = planResult.resolvedScenes.find(
      (r) => r.sceneId === scene.id,
    );

    if (!resolved) return scene;

    return {
      ...scene,
      ...(resolved.renderMode === "blueprint" && resolved.blueprint
        ? { _blueprint: resolved.blueprint }
        : {}),
      // Always attach _storyboard so transitionIntent is available for all scenes
      _storyboard: resolved.storyboardEntry,
    };
  });

  // Direction enrichment (Phase 0)
  const fingerprintHint = {
    genre: (book.metadata?.genre ?? "selfHelp") as any,
    structure: (planResult as any)?.fingerprint?.structure ?? "framework",
    emotionalTone: (planResult as any)?.fingerprint?.emotionalTone ?? [],
  };
  const bookDirection = resolveDirectionFromFingerprint(fingerprintHint);

  const directionEnrichedScenes = scenesWithBlueprints.map((scene) => {
    const spec = adaptPresetToSceneSpec(
      {
        id: scene.id,
        type: scene.type,
        narrationText: (scene as any).narrationText ?? "",
        content: (scene as any).content ?? {},
      },
      bookDirection,
      fingerprintHint.structure,
      { composedFamilies: COMPOSED_FAMILIES },
    );
    const resolvedMotion = resolveMotionParams(
      bookDirection.base,
      scene.resolvedDuration ?? 150,
    );
    let enriched: typeof scene & {
      sceneSpec: SceneSpec;
      resolvedMotion: ResolvedMotionParams;
    } = {
      ...scene,
      sceneSpec: spec,
      resolvedMotion,
    };

    if (spec.source === "composed") {
      const compositionCtx: CompositionContext = {
        format,
        theme,
        from: scene.from,
        durationFrames: scene.resolvedDuration,
        motionPreset: resolvedMotion?.preset ?? "heavy",
      };
      const composedBlueprint = tryComposeScene(spec, compositionCtx);
      if (composedBlueprint) {
        // Phase 2A: _blueprint injection is a temporary bridge.
        // Uses SceneRenderer's existing blueprint guard (LongformComposition.tsx:75).
        // TODO(Phase 2B): Promote to typed PlannedScene.composedBlueprint field.
        (enriched as any)._blueprint = composedBlueprint;
      }
    }

    return enriched;
  });

  // Calculate totalDurationFrames, subtracting transition overlaps when storyboard exists
  const naiveTotalDuration =
    directionEnrichedScenes.length > 0
      ? directionEnrichedScenes[directionEnrichedScenes.length - 1].from +
        directionEnrichedScenes[directionEnrichedScenes.length - 1]
          .resolvedDuration
      : 0;

  // Transition overlap: each non-"cut" transition shortens total duration
  // transitionIntent on scene[i] = transition FROM scene[i] TO scene[i+1]
  // Last scene's transitionIntent is ignored (nothing after it)
  let transitionOverlap = 0;
  if (planResult?.hasPlan) {
    for (let i = 0; i < directionEnrichedScenes.length - 1; i++) {
      const storyboard = (directionEnrichedScenes[i] as any)._storyboard as
        | StoryboardScene
        | undefined;
      const intent = storyboard?.transitionIntent as
        | TransitionIntent
        | undefined;
      if (intent) {
        const mapping = mapTransitionIntent(intent);
        transitionOverlap += mapping?.durationInFrames ?? 0;
      }
    }
  }

  const totalDurationFrames = naiveTotalDuration - transitionOverlap;

  return {
    bookId: book.metadata.id,
    scenes: directionEnrichedScenes,
    totalDurationFrames,
    fps,
    format,
    theme,
    width: formatConfig.width,
    height: formatConfig.height,
    textureMood: planResult?.artInfluence?.textureMood,
  };
}
