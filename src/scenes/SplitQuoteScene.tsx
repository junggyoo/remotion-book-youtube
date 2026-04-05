import React from "react";
import { AbsoluteFill } from "remotion";
import type {
  BaseSceneProps,
  SplitQuoteContent,
  ElementBeatState,
} from "@/types";
import { sp } from "@/design/tokens/spacing";
import { SafeArea } from "@/components/layout/SafeArea";
import { BeatElement } from "@/components/motion/BeatElement";
import { QuoteBlock } from "@/components/primitives/QuoteBlock";
import { LabelChip } from "@/components/primitives/LabelChip";
import { DividerLine } from "@/components/primitives/DividerLine";
import { useBeatTimeline } from "@/hooks/useBeatTimeline";
import { useCaptions } from "@/hooks/useCaptions";
import { useNarrationSync } from "@/hooks/useNarrationSync";
import { useEmphasisGate } from "@/hooks/useEmphasisGate";
import { resolveBeats } from "@/pipeline/resolveBeats";

// zIndex layers
const LAYERS = {
  background: 0,
  texture: 5,
  leftQuote: 20,
  rightQuote: 20,
  divider: 30,
  vsLabel: 35,
} as const;

const WILDCARD_STAGGER: Record<string, ElementBeatState> = {
  leftQuote: {
    visibility: "entering",
    entryFrame: 0,
    emphasis: false,
    motionPreset: "heavy",
  },
  rightQuote: {
    visibility: "entering",
    entryFrame: 9,
    emphasis: false,
    motionPreset: "heavy",
  },
  vsLabel: {
    visibility: "entering",
    entryFrame: 18,
    emphasis: false,
    motionPreset: "heavy",
  },
};

interface SplitQuoteSceneProps extends BaseSceneProps {
  content: SplitQuoteContent;
}

export const SplitQuoteScene: React.FC<SplitQuoteSceneProps> = ({
  format,
  theme,
  from,
  durationFrames,
  content,
  beats,
  captionsFile,
}) => {
  const isShorts = format === "shorts";
  const vsLabel = content.vsLabel ?? "VS";

  // Beat resolution
  const resolvedBeats = resolveBeats(
    {
      id: `splitQuote-${from}`,
      type: "splitQuote",
      beats,
      narrationText: "",
    },
    format,
  );
  const { elementStates, activeBeat, activeChannels, isInRecoveryWindow } =
    useBeatTimeline(resolvedBeats, durationFrames, "heavy", {
      sceneType: "splitQuote",
      format,
    });
  const isWildcard =
    resolvedBeats.length === 1 && resolvedBeats[0].activates.includes("*");

  // P2-3: Narration sync — emphasis words glow in quote text
  const captions = useCaptions(captionsFile);
  const narrationSync = useNarrationSync({
    captions,
    emphasisTargets: activeBeat?.emphasisTargets ?? [],
    sceneType: "splitQuote",
    format,
  });

  // P2-4: Gate sceneText channel
  const { isChannelActive: sceneTextActive } = useEmphasisGate({
    channelKey: "sceneText",
    sceneType: "splitQuote",
    format,
    beatTimeline: { activeChannels, isInRecoveryWindow },
  });
  const gatedEmphasisProgress = sceneTextActive
    ? narrationSync.emphasisProgress
    : 0;

  const getBeatState = (key: string): ElementBeatState | undefined => {
    if (isWildcard) return WILDCARD_STAGGER[key];
    return elementStates.get(key);
  };

  return (
    <AbsoluteFill style={{ backgroundColor: theme.bg }}>
      {/* Background layer */}
      <AbsoluteFill
        style={{
          zIndex: LAYERS.background,
          backgroundColor: theme.bg,
        }}
      />

      {/* Texture layer */}
      <AbsoluteFill
        style={{
          zIndex: LAYERS.texture,
          backgroundColor: theme.surfaceMuted,
          opacity: 0.04,
        }}
      />

      {/* Main content */}
      <div style={{ position: "absolute", inset: 0, zIndex: LAYERS.leftQuote }}>
        <SafeArea format={format} theme={theme}>
          <div
            style={{
              display: "flex",
              flexDirection: isShorts ? "column" : "row",
              alignItems: isShorts ? "stretch" : "center",
              justifyContent: "center",
              height: "100%",
              position: "relative",
            }}
          >
            {/* Left / Top quote */}
            <div
              style={{
                flex: 1,
                display: "flex",
                alignItems: "center",
                paddingRight: isShorts ? 0 : sp(5),
                paddingBottom: isShorts ? sp(4) : 0,
              }}
            >
              <BeatElement
                elementKey="leftQuote"
                beatState={getBeatState("leftQuote")}
                format={format}
                theme={theme}
                motionType="slide"
                slideDirection="left"
              >
                <QuoteBlock
                  format={format}
                  theme={theme}
                  quoteText={content.leftQuote}
                  attribution={content.leftAttribution}
                  useSerif
                />
              </BeatElement>
            </div>

            {/* Center / Horizontal divider + VS label */}
            <div
              style={{
                zIndex: LAYERS.divider,
                display: "flex",
                flexDirection: isShorts ? "row" : "column",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                position: "relative",
              }}
            >
              <DividerLine
                format={format}
                theme={theme}
                orientation={isShorts ? "horizontal" : "vertical"}
              />

              {/* VS label centered on divider */}
              <div
                style={{
                  position: "absolute",
                  zIndex: LAYERS.vsLabel,
                }}
              >
                <BeatElement
                  elementKey="vsLabel"
                  beatState={getBeatState("vsLabel")}
                  format={format}
                  theme={theme}
                  motionType="scale"
                  scaleFrom={0.92}
                >
                  <LabelChip
                    format={format}
                    theme={theme}
                    label={vsLabel}
                    variant="signal"
                  />
                </BeatElement>
              </div>
            </div>

            {/* Right / Bottom quote */}
            <div
              style={{
                flex: 1,
                display: "flex",
                alignItems: "center",
                paddingLeft: isShorts ? 0 : sp(5),
                paddingTop: isShorts ? sp(4) : 0,
              }}
            >
              <BeatElement
                elementKey="rightQuote"
                beatState={getBeatState("rightQuote")}
                format={format}
                theme={theme}
                motionType="slide"
                slideDirection="right"
              >
                <QuoteBlock
                  format={format}
                  theme={theme}
                  quoteText={content.rightQuote}
                  attribution={content.rightAttribution}
                  useSerif
                />
              </BeatElement>
            </div>
          </div>
        </SafeArea>
      </div>

      {/* SubtitleLayer removed — Root HUD global layer principle. */}
    </AbsoluteFill>
  );
};

export default SplitQuoteScene;
