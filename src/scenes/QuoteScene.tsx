import React from "react";
import { AbsoluteFill } from "remotion";
import type { BaseSceneProps, QuoteContent, ElementBeatState } from "@/types";
import { sp } from "@/design/tokens/spacing";
import { radius } from "@/design/tokens/radius";
import { sceneInteriorTokens } from "@/design/tokens/shadow";
import { SafeArea } from "@/components/layout/SafeArea";
import { BeatElement } from "@/components/motion/BeatElement";
import { TextBlock } from "@/components/primitives/TextBlock";
import { QuoteBlock } from "@/components/primitives/QuoteBlock";
import { AccentLine } from "@/components/primitives/AccentLine";
import { useBeatTimeline } from "@/hooks/useBeatTimeline";
import { resolveBeats } from "@/pipeline/resolveBeats";

// zIndex layers from scene-catalog.json → quote
const LAYERS = {
  background: 0,
  texture: 5,
  quoteMark: 20,
  attribution: 25,
  quoteText: 30,
} as const;

/**
 * Wildcard stagger — preserve existing ArchitecturalReveal delays:
 * quoteText: delay=6, attribution: delay=15, accentDivider: delay=18
 */
const WILDCARD_STAGGER: Record<string, ElementBeatState> = {
  quoteText: {
    visibility: "entering",
    entryFrame: 6,
    emphasis: false,
    motionPreset: "heavy",
  },
  attribution: {
    visibility: "entering",
    entryFrame: 15,
    emphasis: false,
    motionPreset: "heavy",
  },
  accentDivider: {
    visibility: "entering",
    entryFrame: 18,
    emphasis: false,
    motionPreset: "heavy",
  },
};

interface QuoteSceneProps extends BaseSceneProps {
  content: QuoteContent;
}

export const QuoteScene: React.FC<QuoteSceneProps> = ({
  format,
  theme,
  from,
  durationFrames,
  content,
  beats,
}) => {
  const isShorts = format === "shorts";
  const modeKey = theme.mode === "dark" ? "dark" : "light";
  const containerBgOpacity = sceneInteriorTokens.containerBgOpacity[modeKey];
  const textureOpacity = content.showTexture
    ? sceneInteriorTokens.textureOpacity * 2
    : sceneInteriorTokens.textureOpacity;

  // Beat resolution
  const resolvedBeats = resolveBeats(
    {
      id: `quote-${from}`,
      type: "quote",
      beats,
      narrationText: "",
    },
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

      {/* Texture layer — stronger when showTexture=true */}
      <AbsoluteFill
        style={{
          zIndex: LAYERS.texture,
          backgroundColor: theme.surfaceMuted,
          opacity: textureOpacity,
        }}
      />

      {/* Main content */}
      <div style={{ position: "absolute", inset: 0, zIndex: LAYERS.quoteText }}>
        <SafeArea format={format} theme={theme}>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              height: "100%",
              gap: sp(6),
              maxWidth: isShorts ? "100%" : 760,
              marginLeft: "auto",
              marginRight: "auto",
            }}
          >
            {/* Quote block with container background */}
            <div
              style={{
                zIndex: LAYERS.quoteText,
                width: "100%",
                backgroundColor: `rgba(${theme.mode === "dark" ? "255,255,255" : "0,0,0"}, ${containerBgOpacity})`,
                borderRadius: radius.lg,
                padding: `${sp(6)}px ${sp(6)}px`,
              }}
            >
              <BeatElement
                elementKey="quoteText"
                beatState={getBeatState("quoteText")}
                format={format}
                theme={theme}
              >
                <QuoteBlock
                  format={format}
                  theme={theme}
                  quoteText={content.quoteText}
                  useSerif={content.useSerif}
                />
              </BeatElement>
            </div>

            {/* Attribution */}
            <div style={{ zIndex: LAYERS.attribution, width: "100%" }}>
              <BeatElement
                elementKey="attribution"
                beatState={getBeatState("attribution")}
                format={format}
                theme={theme}
              >
                <TextBlock
                  format={format}
                  theme={theme}
                  text={content.attribution}
                  variant="bodyS"
                  color={theme.textMuted}
                  align="center"
                />
              </BeatElement>
            </div>

            {/* Bottom accent line (replaces hardcoded divider) */}
            <BeatElement
              elementKey="accentDivider"
              beatState={getBeatState("accentDivider")}
              format={format}
              theme={theme}
            >
              <AccentLine format={format} theme={theme} color={theme.accent} />
            </BeatElement>
          </div>
        </SafeArea>
      </div>

      {/* SubtitleLayer removed — Root HUD global layer principle.
          Subtitles are rendered by LongformComposition's CaptionLayer/SubtitleLayerWrapper. */}
    </AbsoluteFill>
  );
};

export default QuoteScene;
