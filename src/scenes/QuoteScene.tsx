import React from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  spring,
  interpolate,
} from "remotion";
import type { BaseSceneProps, QuoteContent, ElementBeatState } from "@/types";
import { sp } from "@/design/tokens/spacing";
import { sceneInteriorTokens } from "@/design/tokens/shadow";
import { typography } from "@/design/tokens/typography";
import { resolvePreset } from "@/design/tokens/motion";
import { useFormat } from "@/design/themes/useFormat";
import { SafeArea } from "@/components/layout/SafeArea";
import { BeatElement } from "@/components/motion/BeatElement";
import { useBeatTimeline } from "@/hooks/useBeatTimeline";
import { resolveBeats } from "@/pipeline/resolveBeats";

// zIndex layers
const LAYERS = {
  background: 0,
  texture: 5,
  darkOverlay: 8,
  quoteMark: 20,
  quoteText: 30,
  attribution: 35,
} as const;

/** Line-by-line interval: 15 frames = 0.5s at 30fps */
const LINE_STAGGER_FRAMES = 15;

/** Quotation mark entrance delay */
const QUOTE_MARK_DELAY = 0;
/** First line starts after marks have scaled in */
const FIRST_LINE_DELAY = 12;

/**
 * Wildcard stagger for quote scenes without explicit beats.
 * quoteMarks appear first, then lines stagger, then attribution last.
 */
function buildWildcardStagger(
  lineCount: number,
): Record<string, ElementBeatState> {
  const stagger: Record<string, ElementBeatState> = {
    quoteMarks: {
      visibility: "entering",
      entryFrame: QUOTE_MARK_DELAY,
      emphasis: false,
      motionPreset: "dramatic",
    },
  };

  for (let i = 0; i < lineCount; i++) {
    stagger[`line-${i}`] = {
      visibility: "entering",
      entryFrame: FIRST_LINE_DELAY + i * LINE_STAGGER_FRAMES,
      emphasis: false,
      motionPreset: "heavy",
    };
  }

  stagger.attribution = {
    visibility: "entering",
    entryFrame: FIRST_LINE_DELAY + lineCount * LINE_STAGGER_FRAMES,
    emphasis: false,
    motionPreset: "heavy",
  };

  return stagger;
}

/**
 * Split quote text into display lines.
 * If the text contains explicit newlines, use those.
 * Otherwise treat the whole text as a single line.
 */
function splitQuoteLines(text: string): string[] {
  const lines = text.split("\n").filter((l) => l.trim().length > 0);
  return lines.length > 0 ? lines : [text];
}

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
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { typeScale } = useFormat(format);
  const isShorts = format === "shorts";

  const textureOpacity = content.showTexture
    ? sceneInteriorTokens.textureOpacity * 2
    : sceneInteriorTokens.textureOpacity;

  const quoteLines = splitQuoteLines(content.quoteText);

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

  const wildcardStagger = buildWildcardStagger(quoteLines.length);

  const getBeatState = (key: string): ElementBeatState | undefined => {
    if (isWildcard) return wildcardStagger[key];
    return elementStates.get(key);
  };

  // Large quotation mark scale animation (scale 0→1 spring)
  const quoteMarkState = getBeatState("quoteMarks");
  const quoteMarkEntry = quoteMarkState?.entryFrame ?? QUOTE_MARK_DELAY;
  const dramaticConfig = resolvePreset("dramatic");
  const quoteMarkScale = spring({
    frame: Math.max(0, frame - quoteMarkEntry),
    fps,
    config: dramaticConfig.springConfig!,
    durationInFrames: 36,
  });

  const quoteFontFamily = content.useSerif
    ? typography.fontFamily.serif
    : typography.fontFamily.sans;

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
          opacity: textureOpacity,
        }}
      />

      {/* Dark overlay — quote scenes are slightly darker */}
      <AbsoluteFill
        style={{
          zIndex: LAYERS.darkOverlay,
          backgroundColor: "rgba(0,0,0,0.1)",
        }}
      />

      {/* Main content */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          zIndex: LAYERS.quoteText,
        }}
      >
        <SafeArea format={format} theme={theme}>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: isShorts ? "center" : "flex-start",
              justifyContent: "center",
              height: "100%",
              gap: sp(5),
              maxWidth: isShorts ? "100%" : 800,
              marginLeft: "auto",
              marginRight: "auto",
              position: "relative",
            }}
          >
            {/* Large opening quotation mark ❝ */}
            <span
              style={{
                fontFamily: typography.fontFamily.serif,
                fontSize: typeScale.headlineL * 3,
                lineHeight: 0.7,
                color: theme.accent,
                opacity: 0.3 * quoteMarkScale,
                transform: `scale(${quoteMarkScale})`,
                transformOrigin: "left top",
                userSelect: "none",
                zIndex: LAYERS.quoteMark,
              }}
              aria-hidden="true"
            >
              {"\u275D"}
            </span>

            {/* Quote text — line by line fade-in */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: sp(3),
                width: "100%",
                paddingLeft: sp(4),
                paddingRight: sp(4),
              }}
            >
              {quoteLines.map((line, i) => {
                const lineState = getBeatState(`line-${i}`);
                return (
                  <BeatElement
                    key={`line-${i}`}
                    elementKey={`line-${i}`}
                    beatState={lineState}
                    format={format}
                    theme={theme}
                  >
                    <p
                      style={{
                        fontFamily: quoteFontFamily,
                        fontSize: typeScale.headlineS,
                        fontWeight: typography.fontWeight.medium,
                        lineHeight: typography.lineHeight.relaxed,
                        letterSpacing: typography.tracking.normal,
                        color: theme.textStrong,
                        margin: 0,
                        textShadow: "0 2px 12px rgba(0,0,0,0.5)",
                      }}
                    >
                      {line}
                    </p>
                  </BeatElement>
                );
              })}
            </div>

            {/* Large closing quotation mark ❞ */}
            <span
              style={{
                fontFamily: typography.fontFamily.serif,
                fontSize: typeScale.headlineL * 3,
                lineHeight: 0.7,
                color: theme.accent,
                opacity: 0.3 * quoteMarkScale,
                transform: `scale(${quoteMarkScale})`,
                transformOrigin: "right bottom",
                alignSelf: "flex-end",
                userSelect: "none",
                zIndex: LAYERS.quoteMark,
              }}
              aria-hidden="true"
            >
              {"\u275E"}
            </span>

            {/* Attribution — fades in last */}
            <BeatElement
              elementKey="attribution"
              beatState={getBeatState("attribution")}
              format={format}
              theme={theme}
            >
              <span
                style={{
                  fontFamily: typography.fontFamily.sans,
                  fontSize: typeScale.bodyM,
                  fontWeight: typography.fontWeight.medium,
                  letterSpacing: typography.tracking.wide,
                  color: theme.textMuted,
                  alignSelf: isShorts ? "center" : "flex-end",
                  paddingRight: sp(4),
                }}
              >
                {"\u2014 "}
                {content.attribution}
              </span>
            </BeatElement>
          </div>
        </SafeArea>
      </div>
    </AbsoluteFill>
  );
};

export default QuoteScene;
