import React from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  spring,
  interpolate,
  interpolateColors,
} from "remotion";
import type { BaseSceneProps, QuoteContent, ElementBeatState } from "@/types";
import { sp } from "@/design/tokens/spacing";
import { sceneInteriorTokens } from "@/design/tokens/shadow";
import { typography } from "@/design/tokens/typography";
import { motionPresets } from "@/design/tokens";
import { resolvePreset } from "@/design/tokens/motion";
import motionPresetsData from "@/design/tokens/motion-presets.json";
import { useFormat } from "@/design/themes/useFormat";
import { SafeArea } from "@/components/layout/SafeArea";
import { BeatElement } from "@/components/motion/BeatElement";
import { useBeatTimeline } from "@/hooks/useBeatTimeline";
import { useCaptions } from "@/hooks/useCaptions";
import { useNarrationSync } from "@/hooks/useNarrationSync";
import { resolveBeats } from "@/pipeline/resolveBeats";
import { matchEmphasisTarget } from "@/utils/matchEmphasisTarget";

const LAYERS = {
  background: 0,
  texture: 5,
  darkOverlay: 8,
  accentLine: 15,
  quoteMark: 20,
  quoteText: 30,
  attribution: 35,
} as const;

/** Line stagger: 18 frames ≈ 0.6s at 30fps — deliberate, contemplative tempo */
const LINE_STAGGER_FRAMES = 18;
/** Quote text starts after marks have scaled in */
const QUOTE_TEXT_DELAY = 14;
/** Accent vertical line starts with quote marks */
const ACCENT_LINE_DELAY = 4;

/**
 * Wildcard stagger — deliberate, contemplative pacing for quote scenes.
 */
function buildWildcardStagger(): Record<string, ElementBeatState> {
  return {
    quoteMarks: {
      visibility: "entering",
      entryFrame: 0,
      emphasis: false,
      motionPreset: "dramatic",
    },
    quoteText: {
      visibility: "entering",
      entryFrame: QUOTE_TEXT_DELAY,
      emphasis: false,
      motionPreset: "heavy",
    },
    attribution: {
      visibility: "entering",
      entryFrame: QUOTE_TEXT_DELAY + 30,
      emphasis: false,
      motionPreset: "heavy",
    },
  };
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
  captionsFile,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { typeScale } = useFormat(format);
  const isShorts = format === "shorts";

  // P2-3: Load captions for narration sync
  const captions = useCaptions(captionsFile);

  const textureOpacity = content.showTexture
    ? sceneInteriorTokens.textureOpacity * 2
    : sceneInteriorTokens.textureOpacity;

  const quoteLines = splitQuoteLines(content.quoteText);

  // Beat resolution
  const resolvedBeats = resolveBeats(
    { id: `quote-${from}`, type: "quote", beats, narrationText: "" },
    format,
  );
  const { elementStates, activeBeat } = useBeatTimeline(
    resolvedBeats,
    durationFrames,
  );

  // P2-3: Narration sync — emphasis words glow in quote text
  const narrationSync = useNarrationSync({
    captions,
    emphasisTargets: activeBeat?.emphasisTargets ?? [],
    sceneType: "quote",
    format,
  });
  const isWildcard =
    resolvedBeats.length === 1 && resolvedBeats[0].activates.includes("*");

  const wildcardStagger = buildWildcardStagger();

  const getBeatState = (key: string): ElementBeatState | undefined => {
    if (isWildcard) return wildcardStagger[key];
    return elementStates.get(key);
  };

  // --- Quotation mark animation: scale + subtle rotation + glow ---
  const quoteMarkState = getBeatState("quoteMarks");
  const quoteMarkEntry = quoteMarkState?.entryFrame ?? 0;
  const dramaticConfig = resolvePreset("dramatic");
  const quoteMarkProgress = spring({
    frame: Math.max(0, frame - quoteMarkEntry),
    fps,
    config: dramaticConfig.springConfig!,
    durationInFrames: 40,
  });
  const quoteMarkScale = interpolate(quoteMarkProgress, [0, 1], [0.6, 1]);
  const quoteMarkRotation = interpolate(quoteMarkProgress, [0, 1], [-8, 0]);
  const quoteMarkOpacity = interpolate(quoteMarkProgress, [0, 1], [0, 0.3]);

  // Per-line stagger
  const quoteTextState = getBeatState("quoteText");
  const quoteTextEntry = quoteTextState?.entryFrame ?? QUOTE_TEXT_DELAY;

  const quoteFontFamily = content.useSerif
    ? typography.fontFamily.serif
    : typography.fontFamily.sans;

  // Dark overlay via theme-relative approach
  const darkOverlayOpacity = theme.mode === "dark" ? 0.1 : 0.05;

  // P2-2: slow-zoom is now handled by CameraLayer wrapper in SceneRenderer

  // --- Accent vertical line: draw-on from top (left side quote bar) ---
  const accentLineProgress = spring({
    frame: Math.max(0, frame - ACCENT_LINE_DELAY),
    fps,
    config: motionPresetsData.presets.heavy.config,
  });

  // --- Attribution entrance: blur-in + underline wipe ---
  const attrState = getBeatState("attribution");
  const attrEntry = attrState?.entryFrame ?? QUOTE_TEXT_DELAY + 30;
  const attrSpring = spring({
    frame: Math.max(0, frame - attrEntry),
    fps,
    config: motionPresetsData.presets.heavy.config,
  });
  const attrBlur = interpolate(attrSpring, [0, 1], [6, 0]);
  const attrTranslateY = interpolate(attrSpring, [0, 1], [12, 0]);
  // Underline wipe starts after text appears
  const attrUnderlineProgress = spring({
    frame: Math.max(0, frame - attrEntry - 10),
    fps,
    config: motionPresetsData.presets.snappy.config,
  });

  // hex → rgb for accent glow
  const ar = parseInt(theme.accent.slice(1, 3), 16);
  const ag = parseInt(theme.accent.slice(3, 5), 16);
  const ab = parseInt(theme.accent.slice(5, 7), 16);

  // --- Darken pulse when quote lines appear ---
  const darkenPulse = interpolate(
    frame,
    [quoteTextEntry, quoteTextEntry + 10, quoteTextEntry + 40],
    [0, 0.04, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  return (
    <AbsoluteFill style={{ backgroundColor: theme.bg }}>
      {/* Background layer */}
      <AbsoluteFill
        style={{ zIndex: LAYERS.background, backgroundColor: theme.bg }}
      />

      {/* Texture layer */}
      <AbsoluteFill
        style={{
          zIndex: LAYERS.texture,
          backgroundColor: theme.surfaceMuted,
          opacity: textureOpacity,
        }}
      />

      {/* Dark overlay — quote scenes are slightly darker + darken pulse */}
      <AbsoluteFill
        style={{
          zIndex: LAYERS.darkOverlay,
          backgroundColor: theme.surfaceMuted,
          opacity: darkOverlayOpacity + darkenPulse,
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
            {/* Accent vertical line — left side quote bar */}
            {!isShorts && (
              <div
                style={{
                  position: "absolute",
                  left: -sp(2),
                  top: "20%",
                  width: 3,
                  height: "60%",
                  zIndex: LAYERS.accentLine,
                  backgroundColor: theme.accent,
                  borderRadius: 2,
                  transform: `scaleY(${accentLineProgress})`,
                  transformOrigin: "center top",
                  opacity: interpolate(accentLineProgress, [0, 0.3], [0, 0.5], {
                    extrapolateRight: "clamp",
                  }),
                  boxShadow: `0 0 ${sp(2)}px rgba(${ar},${ag},${ab},${interpolate(accentLineProgress, [0, 1], [0, 0.2])})`,
                }}
              />
            )}

            {/* Large opening quotation mark ❝ — scale + rotation + glow */}
            <span
              style={{
                fontFamily: typography.fontFamily.serif,
                fontSize: typeScale.headlineL * 3,
                lineHeight: 0.7,
                color: theme.accent,
                opacity: quoteMarkOpacity,
                transform: `scale(${quoteMarkScale}) rotate(${quoteMarkRotation}deg)`,
                transformOrigin: "left top",
                userSelect: "none",
                zIndex: LAYERS.quoteMark,
                filter: `drop-shadow(0 0 ${sp(2)}px rgba(${ar},${ag},${ab},${interpolate(quoteMarkProgress, [0, 1], [0, 0.15])}))`,
              }}
              aria-hidden="true"
            >
              {"\u275D"}
            </span>

            {/* Quote text — per-line stagger with blur-in */}
            <BeatElement
              elementKey="quoteText"
              beatState={getBeatState("quoteText")}
              format={format}
              theme={theme}
              motionType="none"
            >
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
                  const lineDelay = quoteTextEntry + i * LINE_STAGGER_FRAMES;
                  const lineLocalFrame = Math.max(0, frame - lineDelay);
                  const lineProgress = spring({
                    frame: lineLocalFrame,
                    fps,
                    config: motionPresets.presets.heavy.config,
                    durationInFrames: 36,
                  });
                  const lineOpacity = interpolate(lineProgress, [0, 1], [0, 1]);
                  const lineTranslateY = interpolate(
                    lineProgress,
                    [0, 1],
                    [28, 0],
                  );
                  const lineBlur = interpolate(lineProgress, [0, 1], [6, 0]);

                  // P2-3: Split line into word segments for emphasis
                  const hasEmphasis =
                    narrationSync.activeEmphasisTargets.length > 0 &&
                    narrationSync.emphasisProgress > 0;
                  const segments = line.split(/(\s+)/).map((seg, j) => {
                    if (/^\s+$/.test(seg))
                      return { text: seg, isEmphasis: false, key: j };
                    const matched = hasEmphasis
                      ? matchEmphasisTarget(
                          seg,
                          narrationSync.activeEmphasisTargets,
                        )
                      : null;
                    return { text: seg, isEmphasis: matched !== null, key: j };
                  });

                  const emphasisGlowOpacity =
                    narrationSync.emphasisProgress * 0.5;
                  const emphasisGlow = `0 0 ${8 * narrationSync.emphasisProgress}px rgba(${ar},${ag},${ab},${emphasisGlowOpacity})`;

                  return (
                    <p
                      key={i}
                      style={{
                        fontFamily: quoteFontFamily,
                        fontSize: typeScale.headlineS,
                        fontWeight: typography.fontWeight.medium,
                        lineHeight: typography.lineHeight.relaxed,
                        letterSpacing: typography.tracking.normal,
                        color: theme.textStrong,
                        margin: 0,
                        opacity: lineOpacity,
                        transform: `translateY(${lineTranslateY}px)`,
                        filter: `blur(${lineBlur}px)`,
                        willChange: "opacity, transform, filter",
                      }}
                    >
                      {hasEmphasis
                        ? segments.map((seg) =>
                            seg.isEmphasis ? (
                              <span
                                key={seg.key}
                                style={{
                                  color: interpolateColors(
                                    narrationSync.emphasisProgress,
                                    [0, 1],
                                    [theme.textStrong, theme.accent],
                                  ),
                                  textShadow: emphasisGlow,
                                  transition: "color 0.05s, text-shadow 0.05s",
                                }}
                              >
                                {seg.text}
                              </span>
                            ) : (
                              <span key={seg.key}>{seg.text}</span>
                            ),
                          )
                        : line}
                    </p>
                  );
                })}
              </div>
            </BeatElement>

            {/* Large closing quotation mark ❞ — mirrors opening */}
            <span
              style={{
                fontFamily: typography.fontFamily.serif,
                fontSize: typeScale.headlineL * 3,
                lineHeight: 0.7,
                color: theme.accent,
                opacity: quoteMarkOpacity,
                transform: `scale(${quoteMarkScale}) rotate(${-quoteMarkRotation}deg)`,
                transformOrigin: "right bottom",
                alignSelf: "flex-end",
                userSelect: "none",
                zIndex: LAYERS.quoteMark,
                filter: `drop-shadow(0 0 ${sp(2)}px rgba(${ar},${ag},${ab},${interpolate(quoteMarkProgress, [0, 1], [0, 0.15])}))`,
              }}
              aria-hidden="true"
            >
              {"\u275E"}
            </span>

            {/* Attribution — blur-in + underline wipe */}
            <BeatElement
              elementKey="attribution"
              beatState={getBeatState("attribution")}
              format={format}
              theme={theme}
              motionType="none"
            >
              <div
                style={{
                  alignSelf: isShorts ? "center" : "flex-end",
                  paddingRight: sp(4),
                  opacity: interpolate(attrSpring, [0, 1], [0, 1]),
                  transform: `translateY(${attrTranslateY}px)`,
                  filter: `blur(${attrBlur}px)`,
                  willChange: "opacity, transform, filter",
                }}
              >
                <span
                  style={{
                    fontFamily: typography.fontFamily.sans,
                    fontSize: typeScale.bodyM,
                    fontWeight: typography.fontWeight.medium,
                    letterSpacing: typography.tracking.wide,
                    color: theme.textMuted,
                  }}
                >
                  {"\u2014 "}
                  {content.attribution}
                </span>
                {/* Underline wipe */}
                <div
                  style={{
                    height: 1.5,
                    marginTop: sp(1),
                    backgroundColor: theme.accent,
                    opacity: 0.4,
                    borderRadius: 1,
                    transform: `scaleX(${attrUnderlineProgress})`,
                    transformOrigin: "left center",
                  }}
                />
              </div>
            </BeatElement>
          </div>
        </SafeArea>
      </div>
    </AbsoluteFill>
  );
};

export default QuoteScene;
