import React from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
} from "remotion";
import type {
  BaseSceneProps,
  HighlightContent,
  ElementBeatState,
} from "@/types";
import { sp } from "@/design/tokens/spacing";
import { typography } from "@/design/tokens/typography";
import { useFormat } from "@/design/themes/useFormat";
import { SafeArea } from "@/components/layout/SafeArea";
import { BeatElement } from "@/components/motion/BeatElement";
import { KineticText } from "@/components/primitives/KineticText";
import { AccentUnderline } from "@/components/primitives/AccentUnderline";
import { useBeatTimeline } from "@/hooks/useBeatTimeline";
import { resolveBeats } from "@/pipeline/resolveBeats";
import motionPresetsData from "@/design/tokens/motion-presets.json";

const LAYERS = {
  bgPulse: 5,
  signalBar: 20,
  subText: 25,
  mainText: 30,
  emphasisWipe: 32,
  underline: 35,
} as const;

const WILDCARD_STAGGER: Record<string, ElementBeatState> = {
  mainText: {
    visibility: "entering",
    entryFrame: 0,
    emphasis: false,
    motionPreset: "punchy",
  },
  subText: {
    visibility: "entering",
    entryFrame: 12,
    emphasis: false,
    motionPreset: "smooth",
  },
};

// --- Choreography timing (frames) ---
const SIGNAL_BAR_START = 3; // Signal bar wipes in early
const SIGNAL_BAR_DURATION = 14;
const MAIN_TEXT_START = 8; // Main text starts shortly after signal bar
const STAGGER_DELAY = 5; // Slightly wider stagger for dramatic word-by-word
const SUB_TEXT_GAP = 18; // Gap after main text settles before subText
const UNDERLINE_GAP = 8; // Gap after subText before underline
const EMPHASIS_WIPE_DELAY = 6; // Accent wipe starts after all words land
const BG_PULSE_DELAY = 4; // Background pulse trails emphasis

// --- Visual constants ---
const SIGNAL_BAR_HEIGHT = 3;
const UNDERLINE_WIDTH = 240;

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
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { typeScale } = useFormat(format);

  const colorKey = content.highlightColor ?? "signal";
  const accentColor =
    colorKey === "accent"
      ? theme.accent
      : colorKey === "premium"
        ? theme.premium
        : theme.signal;

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

  // --- Choreography: compute timing anchors ---
  const mainTextWords = content.mainText.split(" ");
  const mainTextLastWordDelay =
    MAIN_TEXT_START + (mainTextWords.length - 1) * STAGGER_DELAY;
  const mainTextSettleFrame =
    mainTextLastWordDelay + motionPresetsData.presets.punchy.durationRange[1];
  const emphasisWipeStart = mainTextSettleFrame + EMPHASIS_WIPE_DELAY;
  const subTextStartFrame = mainTextSettleFrame + SUB_TEXT_GAP;
  const underlineStartFrame = subTextStartFrame + UNDERLINE_GAP;
  const bgPulseFrame = emphasisWipeStart + BG_PULSE_DELAY;

  // --- Signal bar wipe-in (left→right) ---
  const signalBarProgress = spring({
    frame: Math.max(0, frame - SIGNAL_BAR_START),
    fps,
    config: motionPresetsData.presets.punchy.config,
    durationInFrames: SIGNAL_BAR_DURATION,
  });

  // --- Emphasis word accent wipe (scaleX 0→1 behind keyword) ---
  const emphasisWipeProgress = spring({
    frame: Math.max(0, frame - emphasisWipeStart),
    fps,
    config: motionPresetsData.presets.snappy.config,
  });

  // --- SubText entrance (wildcard mode) ---
  const subTextSpring = isWildcard
    ? spring({
        frame: Math.max(0, frame - subTextStartFrame),
        fps,
        config: motionPresetsData.presets.smooth.config,
      })
    : 1;
  const subTextOpacity = interpolate(subTextSpring, [0, 1], [0, 1]);
  const subTextTranslateY = interpolate(subTextSpring, [0, 1], [24, 0]);
  const subTextBlur = interpolate(subTextSpring, [0, 1], [8, 0]);

  // --- Background radial pulse on emphasis ---
  const bgPulseProgress = interpolate(
    frame,
    [bgPulseFrame, bgPulseFrame + 20, bgPulseFrame + 50],
    [0, 0.12, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  // Extract emphasis keyword from mainText
  const emphasisKeyword = extractEmphasisKeyword(content.mainText);

  // hex → rgb for rgba()
  const ar = parseInt(accentColor.slice(1, 3), 16);
  const ag = parseInt(accentColor.slice(3, 5), 16);
  const ab = parseInt(accentColor.slice(5, 7), 16);

  return (
    <AbsoluteFill style={{ backgroundColor: "transparent" }}>
      {/* Background radial pulse — subtle accent glow on emphasis moment */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          zIndex: LAYERS.bgPulse,
          background: `radial-gradient(ellipse 70% 50% at 35% 50%, rgba(${ar},${ag},${ab},${bgPulseProgress}) 0%, transparent 70%)`,
          pointerEvents: "none",
        }}
      />

      {/* Signal bar — horizontal accent line wipe-in before text */}
      <div
        style={{
          position: "absolute",
          left: "8%",
          top: "42%",
          zIndex: LAYERS.signalBar,
          width: format === "shorts" ? "60%" : "40%",
          height: SIGNAL_BAR_HEIGHT,
          borderRadius: SIGNAL_BAR_HEIGHT / 2,
          backgroundColor: accentColor,
          transform: `scaleX(${signalBarProgress})`,
          transformOrigin: "left center",
          opacity: interpolate(signalBarProgress, [0, 0.1], [0, 0.7], {
            extrapolateRight: "clamp",
          }),
          boxShadow: `0 0 ${sp(3)}px rgba(${ar},${ag},${ab},${interpolate(signalBarProgress, [0.5, 1], [0.3, 0.08], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })})`,
        }}
      />

      <div style={{ position: "absolute", inset: 0, zIndex: LAYERS.mainText }}>
        <SafeArea format={format} theme={theme}>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-start",
              justifyContent: "center",
              height: "100%",
              paddingLeft: "8%",
              paddingRight: format === "shorts" ? "8%" : "25%",
              gap: sp(4),
            }}
          >
            {/* Main text — headlineXL, punchy word-by-word reveal */}
            <BeatElement
              elementKey="mainText"
              beatState={getBeatState("mainText")}
              format={format}
              theme={theme}
              motionType="none"
            >
              <KineticText
                format={format}
                theme={theme}
                text={content.mainText}
                variant="headlineXL"
                weight="bold"
                color={theme.textStrong}
                align="left"
                staggerDelay={STAGGER_DELAY}
                motionPreset="punchy"
                delay={isWildcard ? MAIN_TEXT_START : 0}
                emphasisWord={emphasisKeyword}
              />
            </BeatElement>

            {/* Emphasis accent wipe — colored bar behind emphasis keyword */}
            {emphasisKeyword && (
              <div
                style={{
                  position: "absolute",
                  left: "8%",
                  top: "50%",
                  zIndex: LAYERS.emphasisWipe,
                  height: "0.2em",
                  width: `${Math.min(emphasisKeyword.length * 2.5, 30)}%`,
                  transform: `translateY(${sp(2)}px) scaleX(${emphasisWipeProgress})`,
                  transformOrigin: "left center",
                  backgroundColor: `rgba(${ar},${ag},${ab},0.2)`,
                  borderRadius: sp(1),
                  pointerEvents: "none",
                }}
              />
            )}

            {/* Sub text — bodyL, blur-in + translateY entrance */}
            {content.subText && (
              <div
                style={{
                  zIndex: LAYERS.subText,
                  opacity: subTextOpacity,
                  transform: `translateY(${subTextTranslateY}px)`,
                  filter: `blur(${subTextBlur}px)`,
                  willChange: "opacity, transform, filter",
                }}
              >
                <BeatElement
                  elementKey="subText"
                  beatState={getBeatState("subText")}
                  format={format}
                  theme={theme}
                >
                  <div
                    style={{
                      fontFamily: typography.fontFamily.sans,
                      fontSize: typeScale.bodyL,
                      fontWeight: typography.fontWeight.regular,
                      lineHeight: typography.lineHeight.normal,
                      color: theme.textMuted,
                      textAlign: "left",
                    }}
                  >
                    {content.subText}
                  </div>
                </BeatElement>
              </div>
            )}

            {/* Accent underline — wider, with glow */}
            <div
              style={{
                zIndex: LAYERS.underline,
                marginTop: sp(2),
                opacity: isWildcard
                  ? interpolate(
                      frame,
                      [underlineStartFrame, underlineStartFrame + 10],
                      [0, 1],
                      { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
                    )
                  : getBeatState("subText")?.visibility !== "hidden"
                    ? 1
                    : 0,
                filter: `drop-shadow(0 0 ${sp(2)}px rgba(${ar},${ag},${ab},0.3))`,
              }}
            >
              <AccentUnderline
                width={UNDERLINE_WIDTH}
                color={accentColor}
                startFrame={
                  isWildcard
                    ? underlineStartFrame
                    : (getBeatState("subText")?.entryFrame ?? 0)
                }
                strokeWidth={3}
              />
            </div>
          </div>
        </SafeArea>
      </div>
    </AbsoluteFill>
  );
};

/**
 * Extracts the most impactful keyword from mainText for accent emphasis.
 * Heuristic: pick the longest noun-like word (Korean >= 2 chars).
 * For short phrases, pick the last content word for punch.
 */
function extractEmphasisKeyword(text: string): string {
  const words = text.split(" ").filter((w) => w.length > 0);
  if (words.length === 0) return "";
  if (words.length <= 2) return words[words.length - 1];
  // Pick the longest meaningful word (Korean: >= 2 chars)
  const candidates = words.filter((w) => w.length >= 2);
  if (candidates.length === 0) return words[0];
  return candidates.reduce((a, b) => (b.length > a.length ? b : a));
}

export default HighlightScene;
