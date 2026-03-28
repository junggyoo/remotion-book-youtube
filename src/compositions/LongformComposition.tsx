import React, { useState, useEffect, useCallback } from "react";
import {
  AbsoluteFill,
  Sequence,
  Audio,
  staticFile,
  useCurrentFrame,
  useDelayRender,
} from "remotion";
import { TransitionSeries } from "@remotion/transitions";
import {
  mapTransitionIntent,
  type TransitionIntent,
} from "@/transitions/mapTransitionIntent";
import { resolveTransitionSfx, SFX_VOLUME } from "@/transitions/transitionSfx";
import type { StoryboardScene } from "@/planning/types";
import type { PlannedScene, CompositionProps } from "@/pipeline/buildProps";
import type {
  CoverContent,
  ChapterDividerContent,
  KeyInsightContent,
  CompareContrastContent,
  QuoteContent,
  FrameworkContent,
  ApplicationContent,
  DataContent,
  ClosingContent,
  TimelineContent,
  HighlightContent,
  TransitionContent,
  ListRevealContent,
  SplitQuoteContent,
} from "@/types";
import { CoverScene } from "@/scenes/CoverScene";
import { ChapterDividerScene } from "@/scenes/ChapterDividerScene";
import { KeyInsightScene } from "@/scenes/KeyInsightScene";
import { CompareContrastScene } from "@/scenes/CompareContrastScene";
import { QuoteScene } from "@/scenes/QuoteScene";
import { FrameworkScene } from "@/scenes/FrameworkScene";
import { ApplicationScene } from "@/scenes/ApplicationScene";
import { DataScene } from "@/scenes/DataScene";
import { ClosingScene } from "@/scenes/ClosingScene";
import { TimelineScene } from "@/scenes/TimelineScene";
import { HighlightScene } from "@/scenes/HighlightScene";
import { TransitionScene } from "@/scenes/TransitionScene";
import { ListRevealScene } from "@/scenes/ListRevealScene";
import { SplitQuoteScene } from "@/scenes/SplitQuoteScene";
import { CaptionLayer } from "@/components/hud/CaptionLayer";
import { SubtitleLayer } from "@/components/hud/SubtitleLayer";
import { BlueprintRenderer } from "@/renderer/BlueprintRenderer";
import { SceneWrapper } from "@/components/layout/SceneWrapper";
import type { CustomScene } from "@/types";
import type { Beat, BeatTimingResolution } from "../types";
import { useBeatTimeline } from "../hooks/useBeatTimeline";

interface TTSManifestEntry {
  sceneId: string;
  audioFile: string;
  captionsFile: string;
  durationMs: number;
  durationFrames: number;
  beatTimings?: BeatTimingResolution[];
}

const SceneRenderer: React.FC<{
  scene: PlannedScene;
  format: CompositionProps["format"];
  theme: CompositionProps["theme"];
}> = ({ scene, format, theme }) => {
  // Blueprint guard: plan-bridge attached _blueprint → use BlueprintRenderer
  if ("_blueprint" in scene && (scene as any)._blueprint) {
    console.log(`[render] ${scene.id} → BlueprintRenderer`);
    return (
      <BlueprintRenderer
        blueprint={(scene as any)._blueprint}
        beats={scene.beats}
        sceneType={scene.type}
      />
    );
  }

  const baseProps = {
    format,
    theme,
    from: scene.from,
    durationFrames: scene.resolvedDuration,
    tts: scene.tts,
    subtitles: scene.subtitles,
    beats: scene.beats,
  };

  switch (scene.type) {
    case "cover":
      return (
        <CoverScene {...baseProps} content={scene.content as CoverContent} />
      );
    case "chapterDivider":
      return (
        <ChapterDividerScene
          {...baseProps}
          content={scene.content as ChapterDividerContent}
        />
      );
    case "keyInsight":
      return (
        <KeyInsightScene
          {...baseProps}
          content={scene.content as KeyInsightContent}
        />
      );
    case "compareContrast":
      return (
        <CompareContrastScene
          {...baseProps}
          content={scene.content as CompareContrastContent}
        />
      );
    case "quote":
      return (
        <QuoteScene {...baseProps} content={scene.content as QuoteContent} />
      );
    case "framework":
      return (
        <FrameworkScene
          {...baseProps}
          content={scene.content as FrameworkContent}
        />
      );
    case "application":
      return (
        <ApplicationScene
          {...baseProps}
          content={scene.content as ApplicationContent}
        />
      );
    case "data":
      return (
        <DataScene {...baseProps} content={scene.content as DataContent} />
      );
    case "closing":
      return (
        <ClosingScene
          {...baseProps}
          content={scene.content as ClosingContent}
        />
      );
    case "timeline":
      return (
        <TimelineScene
          {...baseProps}
          content={scene.content as TimelineContent}
        />
      );
    case "highlight":
      return (
        <HighlightScene
          {...baseProps}
          content={scene.content as HighlightContent}
        />
      );
    case "transition":
      return (
        <TransitionScene
          {...baseProps}
          content={scene.content as TransitionContent}
        />
      );
    case "listReveal":
      return (
        <ListRevealScene
          {...baseProps}
          content={scene.content as ListRevealContent}
        />
      );
    case "splitQuote":
      return (
        <SplitQuoteScene
          {...baseProps}
          content={scene.content as SplitQuoteContent}
        />
      );
    case "custom":
      return (
        <BlueprintRenderer
          blueprint={(scene as unknown as CustomScene).blueprint}
        />
      );
    default:
      return null;
  }
};

/** Wrapper to provide useCurrentFrame() to SubtitleLayer inside a Sequence */
const SubtitleLayerWrapper: React.FC<{
  format: CompositionProps["format"];
  theme: CompositionProps["theme"];
  subtitles: import("@/types").SubtitleEntry[];
}> = ({ format, theme, subtitles }) => {
  const frame = useCurrentFrame();
  return (
    <SubtitleLayer
      format={format}
      theme={theme}
      subtitles={subtitles}
      currentFrame={frame}
    />
  );
};

function applyResolvedTimings(
  beats: Beat[],
  beatTimings: BeatTimingResolution[],
  sceneDurationFrames: number,
): Beat[] {
  return beats.map((beat) => {
    const timing = beatTimings.find((t) => t.beatId === beat.id);
    if (timing && sceneDurationFrames > 0) {
      return {
        ...beat,
        startRatio: timing.resolvedStartFrame / sceneDurationFrames,
        endRatio: timing.resolvedEndFrame / sceneDurationFrames,
      };
    }
    return beat;
  });
}

const BeatEmphasisCaptionLayer: React.FC<{
  beats: Beat[];
  durationFrames: number;
  captionsFile: string;
  sceneStartFrame: number;
  format: CompositionProps["format"];
  theme: CompositionProps["theme"];
  fps: number;
  beatTimings?: BeatTimingResolution[];
}> = ({
  beats,
  durationFrames,
  captionsFile,
  sceneStartFrame,
  format,
  theme,
  fps,
  beatTimings,
}) => {
  const { currentEmphasis, activeBeat } = useBeatTimeline(
    beats,
    durationFrames,
  );
  const emphasisTimeRangeMs = activeBeat
    ? (() => {
        const timing = beatTimings?.find((t) => t.beatId === activeBeat.id);
        return {
          startMs: timing
            ? (timing.resolvedStartFrame / fps) * 1000
            : ((activeBeat.startRatio * durationFrames) / fps) * 1000,
          endMs: timing
            ? (timing.resolvedEndFrame / fps) * 1000
            : ((activeBeat.endRatio * durationFrames) / fps) * 1000,
        };
      })()
    : undefined;

  return (
    <CaptionLayer
      format={format}
      theme={theme}
      captionsFile={captionsFile}
      sceneStartFrame={sceneStartFrame}
      emphasisKeywords={
        currentEmphasis.length > 0 ? currentEmphasis : undefined
      }
      emphasisTimeRangeMs={emphasisTimeRangeMs}
    />
  );
};

const PREMOUNT_FRAMES = 30;

export const LongformComposition: React.FC<CompositionProps> = ({
  scenes,
  totalDurationFrames,
  fps,
  format,
  theme,
  width,
  height,
  textureMood,
}) => {
  const [manifest, setManifest] = useState<TTSManifestEntry[] | null>(null);
  const { delayRender, continueRender } = useDelayRender();
  const [handle] = useState(() => delayRender());

  const loadManifest = useCallback(async () => {
    try {
      const res = await fetch(staticFile("tts/manifest.json"));
      const data = await res.json();
      setManifest(data);
    } catch {
      // No TTS manifest — render without audio/captions
      setManifest([]);
    }
    continueRender(handle);
  }, [continueRender, handle]);

  useEffect(() => {
    loadManifest();
  }, [loadManifest]);

  if (!manifest) return null;

  const manifestMap = new Map(manifest.map((e) => [e.sceneId, e]));

  // Determine if storyboard data is available (enables TransitionSeries path)
  const hasStoryboard = scenes.some(
    (s) => "_storyboard" in s && (s as any)._storyboard?.transitionIntent,
  );

  /** Shared scene content renderer — used by both Sequence and TransitionSeries paths */
  const renderSceneContent = (scene: PlannedScene, sceneStartFrame: number) => {
    const ttsEntry = manifestMap.get(scene.id);

    const resolvedBeats =
      scene.beats && ttsEntry?.beatTimings
        ? applyResolvedTimings(
            scene.beats,
            ttsEntry.beatTimings,
            scene.resolvedDuration,
          )
        : scene.beats;
    const sceneWithResolvedBeats = { ...scene, beats: resolvedBeats };

    return (
      <>
        {/* Scene visual with optional depth wrapper */}
        <SceneWrapper theme={theme} format={format} textureMood={textureMood}>
          <SceneRenderer
            scene={sceneWithResolvedBeats}
            format={format}
            theme={theme}
          />
        </SceneWrapper>

        {/* TTS audio */}
        {/* TODO(P1-1): During TransitionSeries overlap, both outgoing and incoming
            Audio play simultaneously. This is natural for fade transitions (crossfade)
            but may be noticeable for directional/wipe. Address in a follow-up. */}
        {ttsEntry && (
          <Audio src={staticFile(`tts/${ttsEntry.audioFile}`)} volume={1} />
        )}

        {/* Word-highlight captions (beat-aware or legacy path) */}
        {ttsEntry && (
          <div style={{ position: "absolute", inset: 0, zIndex: 70 }}>
            {resolvedBeats && resolvedBeats.length > 0 ? (
              <BeatEmphasisCaptionLayer
                beats={resolvedBeats}
                durationFrames={scene.resolvedDuration}
                captionsFile={`tts/${ttsEntry.captionsFile}`}
                sceneStartFrame={sceneStartFrame}
                format={format}
                theme={theme}
                fps={fps}
                beatTimings={ttsEntry.beatTimings}
              />
            ) : (
              <CaptionLayer
                format={format}
                theme={theme}
                captionsFile={`tts/${ttsEntry.captionsFile}`}
                sceneStartFrame={sceneStartFrame}
              />
            )}
          </div>
        )}

        {/* Sentence-level subtitles (DSGS path — when no CaptionLayer data) */}
        {!ttsEntry && scene.subtitles && scene.subtitles.length > 0 && (
          <SubtitleLayerWrapper
            format={format}
            theme={theme}
            subtitles={scene.subtitles}
          />
        )}
      </>
    );
  };

  return (
    <AbsoluteFill style={{ backgroundColor: theme.bg }}>
      {hasStoryboard
        ? // ── TransitionSeries path (storyboard-driven with transitions) ──
          // TODO(P1-1-sunset): Remove Sequence fallback once all books use storyboard.
          // Trigger: after 2-3 books are validated through TransitionSeries path.
          (() => {
            // P2-6a: Resolve transition SFX with dedup
            const transitionIntents = scenes.map((s) => {
              const sb = (s as any)._storyboard as StoryboardScene | undefined;
              return sb?.transitionIntent as TransitionIntent | undefined;
            });
            const resolvedSfx = resolveTransitionSfx(transitionIntents);

            return (
              <TransitionSeries>
                {scenes.map((scene, i) => {
                  const storyboard = (scene as any)._storyboard as
                    | StoryboardScene
                    | undefined;
                  const transitionMapping =
                    i < scenes.length - 1 && storyboard?.transitionIntent
                      ? mapTransitionIntent(
                          storyboard.transitionIntent as TransitionIntent,
                        )
                      : null;
                  const sfxFile = resolvedSfx[i];

                  return (
                    <React.Fragment key={scene.id}>
                      <TransitionSeries.Sequence
                        durationInFrames={scene.resolvedDuration}
                      >
                        {renderSceneContent(scene, 0)}

                        {/* P2-6a: Transition SFX at scene end */}
                        {sfxFile && transitionMapping && (
                          <Sequence
                            from={
                              scene.resolvedDuration -
                              transitionMapping.durationInFrames
                            }
                          >
                            <Audio
                              src={staticFile(`sounds/${sfxFile}`)}
                              volume={SFX_VOLUME}
                            />
                          </Sequence>
                        )}
                      </TransitionSeries.Sequence>

                      {transitionMapping && (
                        <TransitionSeries.Transition
                          presentation={transitionMapping.presentation}
                          timing={transitionMapping.timing}
                        />
                      )}
                    </React.Fragment>
                  );
                })}
              </TransitionSeries>
            );
          })()
        : // ── Sequence fallback (no storyboard / legacy path) ──
          scenes.map((scene) => (
            <Sequence
              key={scene.id}
              from={scene.from}
              durationInFrames={scene.resolvedDuration}
              name={`${scene.type}-${scene.id}`}
              premountFor={PREMOUNT_FRAMES}
            >
              {renderSceneContent(scene, scene.from)}
            </Sequence>
          ))}
    </AbsoluteFill>
  );
};

export default LongformComposition;
