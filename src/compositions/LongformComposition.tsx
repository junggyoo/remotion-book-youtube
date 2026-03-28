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
import { computeBgmVolume, DEFAULT_DUCKING_CONFIG } from "@/audio/bgmDucker";
import type { Caption } from "@remotion/captions";
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
import {
  CameraLayer,
  SCENE_CAMERA_DEFAULTS,
} from "@/components/layout/CameraLayer";
import { SceneWrapper } from "@/components/layout/SceneWrapper";
import { BackgroundMotion } from "@/components/layout/BackgroundMotion";
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
    // P2-3: Caption file for narration sync
    captionsFile: (scene as any)._captionsFile as string | undefined,
  };

  // P2-2: Determine camera mode — shorts forces static
  const cameraMode =
    format === "shorts"
      ? ("static" as const)
      : (SCENE_CAMERA_DEFAULTS[scene.type] ?? "static");

  let sceneContent: React.ReactNode = null;

  switch (scene.type) {
    case "cover":
      sceneContent = (
        <CoverScene {...baseProps} content={scene.content as CoverContent} />
      );
      break;
    case "chapterDivider":
      sceneContent = (
        <ChapterDividerScene
          {...baseProps}
          content={scene.content as ChapterDividerContent}
        />
      );
      break;
    case "keyInsight":
      sceneContent = (
        <KeyInsightScene
          {...baseProps}
          content={scene.content as KeyInsightContent}
          resolvedMotion={scene.resolvedMotion}
        />
      );
      break;
    case "compareContrast":
      sceneContent = (
        <CompareContrastScene
          {...baseProps}
          content={scene.content as CompareContrastContent}
        />
      );
      break;
    case "quote":
      sceneContent = (
        <QuoteScene {...baseProps} content={scene.content as QuoteContent} />
      );
      break;
    case "framework":
      sceneContent = (
        <FrameworkScene
          {...baseProps}
          content={scene.content as FrameworkContent}
          resolvedMotion={scene.resolvedMotion}
        />
      );
      break;
    case "application":
      sceneContent = (
        <ApplicationScene
          {...baseProps}
          content={scene.content as ApplicationContent}
        />
      );
      break;
    case "data":
      sceneContent = (
        <DataScene {...baseProps} content={scene.content as DataContent} />
      );
      break;
    case "closing":
      sceneContent = (
        <ClosingScene
          {...baseProps}
          content={scene.content as ClosingContent}
        />
      );
      break;
    case "timeline":
      sceneContent = (
        <TimelineScene
          {...baseProps}
          content={scene.content as TimelineContent}
        />
      );
      break;
    case "highlight":
      sceneContent = (
        <HighlightScene
          {...baseProps}
          content={scene.content as HighlightContent}
        />
      );
      break;
    case "transition":
      sceneContent = (
        <TransitionScene
          {...baseProps}
          content={scene.content as TransitionContent}
        />
      );
      break;
    case "listReveal":
      sceneContent = (
        <ListRevealScene
          {...baseProps}
          content={scene.content as ListRevealContent}
        />
      );
      break;
    case "splitQuote":
      sceneContent = (
        <SplitQuoteScene
          {...baseProps}
          content={scene.content as SplitQuoteContent}
        />
      );
      break;
    case "custom":
      // Custom scenes use BlueprintRenderer which has its own CameraLayer
      return (
        <BlueprintRenderer
          blueprint={(scene as unknown as CustomScene).blueprint}
        />
      );
    default:
      return null;
  }

  // P2-2: Wrap preset scenes with CameraLayer
  // Static mode is a passthrough (no transform), so wrapping is always safe
  return (
    <CameraLayer
      mode={cameraMode}
      format={format}
      sceneType={scene.type}
      durationFrames={scene.resolvedDuration}
    >
      <BackgroundMotion format={format}>{sceneContent}</BackgroundMotion>
    </CameraLayer>
  );
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
  bgmTrack,
}) => {
  const [manifest, setManifest] = useState<TTSManifestEntry[] | null>(null);
  const [allCaptions, setAllCaptions] = useState<Caption[]>([]);
  const { delayRender, continueRender } = useDelayRender();
  const [handle] = useState(() => delayRender());

  const loadManifest = useCallback(async () => {
    try {
      const res = await fetch(staticFile("tts/manifest.json"));
      const data: TTSManifestEntry[] = await res.json();
      setManifest(data);

      // Build global captions for BGM ducking — offset each scene's captions
      // by its absolute start time in the composition
      if (bgmTrack) {
        const globalCaptions: Caption[] = [];
        for (const scene of scenes) {
          const entry = data.find((e) => e.sceneId === scene.id);
          if (!entry) continue;
          try {
            const capRes = await fetch(staticFile(`tts/${entry.captionsFile}`));
            const raw = await capRes.json();
            const caps: Caption[] = Array.isArray(raw)
              ? raw
              : (raw.captions ?? []);
            const offsetMs = (scene.from / fps) * 1000;
            for (const c of caps) {
              globalCaptions.push({
                ...c,
                startMs: c.startMs + offsetMs,
                endMs: c.endMs + offsetMs,
              });
            }
          } catch {
            // Skip scenes with no caption data
          }
        }
        setAllCaptions(globalCaptions);
      }
    } catch {
      // No TTS manifest — render without audio/captions
      setManifest([]);
    }
    continueRender(handle);
  }, [continueRender, handle, bgmTrack, scenes, fps]);

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
    const sceneWithResolvedBeats = {
      ...scene,
      beats: resolvedBeats,
      // P2-3: Attach captionsFile for narration sync in scene components
      _captionsFile: ttsEntry ? `tts/${ttsEntry.captionsFile}` : undefined,
    };

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
      {/* BGM layer with auto-ducking under narration */}
      {bgmTrack && (
        <Audio
          src={staticFile(bgmTrack)}
          volume={(f) =>
            computeBgmVolume(f, allCaptions, DEFAULT_DUCKING_CONFIG, fps)
          }
          loop
        />
      )}

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
