import React, { useState, useEffect, useCallback } from "react";
import {
  AbsoluteFill,
  Sequence,
  Audio,
  staticFile,
  useCurrentFrame,
  useDelayRender,
} from "remotion";
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
import type { CustomScene } from "@/types";

interface TTSManifestEntry {
  sceneId: string;
  audioFile: string;
  captionsFile: string;
  durationMs: number;
  durationFrames: number;
}

const SceneRenderer: React.FC<{
  scene: PlannedScene;
  format: CompositionProps["format"];
  theme: CompositionProps["theme"];
}> = ({ scene, format, theme }) => {
  const baseProps = {
    format,
    theme,
    from: scene.from,
    durationFrames: scene.resolvedDuration,
    tts: scene.tts,
    subtitles: scene.subtitles,
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

const PREMOUNT_FRAMES = 30;

export const LongformComposition: React.FC<CompositionProps> = ({
  scenes,
  totalDurationFrames,
  fps,
  format,
  theme,
  width,
  height,
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

  return (
    <AbsoluteFill style={{ backgroundColor: theme.bg }}>
      {scenes.map((scene) => {
        const ttsEntry = manifestMap.get(scene.id);

        return (
          <Sequence
            key={scene.id}
            from={scene.from}
            durationInFrames={scene.resolvedDuration}
            name={`${scene.type}-${scene.id}`}
            premountFor={PREMOUNT_FRAMES}
          >
            {/* Scene visual */}
            <SceneRenderer scene={scene} format={format} theme={theme} />

            {/* TTS audio */}
            {ttsEntry && (
              <Audio src={staticFile(`tts/${ttsEntry.audioFile}`)} volume={1} />
            )}

            {/* Word-highlight captions (legacy path) */}
            {ttsEntry && (
              <div style={{ position: "absolute", inset: 0, zIndex: 70 }}>
                <CaptionLayer
                  format={format}
                  theme={theme}
                  captionsFile={`tts/${ttsEntry.captionsFile}`}
                  sceneStartFrame={scene.from}
                />
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
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};

export default LongformComposition;
