import React from "react";
import { AbsoluteFill } from "remotion";
import type {
  BaseSceneProps,
  HighlightContent,
  ElementBeatState,
} from "@/types";
import { sp } from "@/design/tokens/spacing";
import { SafeArea } from "@/components/layout/SafeArea";
import { BeatElement } from "@/components/motion/BeatElement";
import { PulseEmphasis } from "@/components/motion/PulseEmphasis";
import { TextBlock } from "@/components/primitives/TextBlock";
import { SignalBar } from "@/components/primitives/SignalBar";
import { useBeatTimeline } from "@/hooks/useBeatTimeline";
import { resolveBeats } from "@/pipeline/resolveBeats";

// Custom layers for HighlightScene
const LAYERS = {
  background: 0,
  texture: 5,
  signalBar: 20,
  subText: 25,
  mainText: 30,
} as const;

const WILDCARD_STAGGER: Record<string, ElementBeatState> = {
  mainText: {
    visibility: "entering",
    entryFrame: 0,
    emphasis: false,
    motionPreset: "dramatic",
  },
  subText: {
    visibility: "entering",
    entryFrame: 12,
    emphasis: false,
    motionPreset: "heavy",
  },
  signalBar: {
    visibility: "entering",
    entryFrame: 18,
    emphasis: false,
    motionPreset: "smooth",
  },
};

interface HighlightSceneProps extends BaseSceneProps {
  content: HighlightContent;
}

export const HighlightScene: React.FC<HighlightSceneProps> = ({
  format,
  theme,
  from,
  durationFrames,
  content,
  beats,
}) => {
  const colorKey = content.highlightColor ?? "signal";
  const mainTextColor =
    colorKey === "accent"
      ? theme.accent
      : colorKey === "premium"
        ? theme.premium
        : theme.signal;

  const showPulse = content.showPulse === true;

  // Beat resolution
  const resolvedBeats = resolveBeats(
    { id: `highlight-${from}`, type: "highlight", beats, narrationText: "" },
    format,
  );
  const { elementStates } = useBeatTimeline(resolvedBeats, durationFrames);
  const isWildcard =
    resolvedBeats.length === 1 && resolvedBeats[0].activates.includes("*");

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

      {/* Texture layer — slightly stronger for HighlightScene */}
      <AbsoluteFill
        style={{
          zIndex: LAYERS.texture,
          backgroundColor: theme.surfaceMuted,
          opacity: 0.06,
        }}
      />

      {/* Main content */}
      <div style={{ position: "absolute", inset: 0, zIndex: LAYERS.mainText }}>
        <SafeArea format={format} theme={theme}>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              height: "100%",
              gap: sp(4),
            }}
          >
            {/* Main text */}
            <div
              style={{
                zIndex: LAYERS.mainText,
                textAlign: "center",
                width: "100%",
              }}
            >
              <BeatElement
                elementKey="mainText"
                beatState={getBeatState("mainText")}
                format={format}
                theme={theme}
              >
                {showPulse ? (
                  <PulseEmphasis
                    format={format}
                    theme={theme}
                    cycles={2}
                    delay={30}
                  >
                    <TextBlock
                      format={format}
                      theme={theme}
                      text={content.mainText}
                      variant="headlineL"
                      weight="bold"
                      color={mainTextColor}
                      align="center"
                      maxLines={3}
                    />
                  </PulseEmphasis>
                ) : (
                  <TextBlock
                    format={format}
                    theme={theme}
                    text={content.mainText}
                    variant="headlineL"
                    weight="bold"
                    color={mainTextColor}
                    align="center"
                    maxLines={3}
                  />
                )}
              </BeatElement>
            </div>

            {/* Sub text */}
            {content.subText && (
              <div
                style={{
                  zIndex: LAYERS.subText,
                  textAlign: "center",
                  width: "100%",
                }}
              >
                <BeatElement
                  elementKey="subText"
                  beatState={getBeatState("subText")}
                  format={format}
                  theme={theme}
                >
                  <TextBlock
                    format={format}
                    theme={theme}
                    text={content.subText}
                    variant="bodyL"
                    color={theme.textMuted}
                    align="center"
                    maxLines={3}
                  />
                </BeatElement>
              </div>
            )}

            {/* Bottom signal bar */}
            <div style={{ zIndex: LAYERS.signalBar, marginTop: sp(2) }}>
              <BeatElement
                elementKey="signalBar"
                beatState={getBeatState("signalBar")}
                format={format}
                theme={theme}
              >
                <SignalBar
                  format={format}
                  theme={theme}
                  width={120}
                  height={3}
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

export default HighlightScene;
