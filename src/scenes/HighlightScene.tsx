import React from "react";
import { AbsoluteFill, useCurrentFrame, interpolate } from "remotion";
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
  subText: 25,
  mainText: 30,
  underline: 35,
} as const;

const WILDCARD_STAGGER: Record<string, ElementBeatState> = {
  mainText: {
    visibility: "entering",
    entryFrame: 0,
    emphasis: false,
    motionPreset: "heavy",
  },
  subText: {
    visibility: "entering",
    entryFrame: 12,
    emphasis: false,
    motionPreset: "smooth",
  },
};

const STAGGER_DELAY = 4;
const SUB_TEXT_DELAY_FRAMES = 15; // 0.5s at 30fps
const UNDERLINE_WIDTH = 160;

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

  // Manual fade-in timing for wildcard/no-beat mode
  // When beats explicitly control subText activation, BeatElement handles visibility
  const mainTextWords = content.mainText.split(" ");
  const mainTextLastWordDelay = (mainTextWords.length - 1) * STAGGER_DELAY;
  const mainTextSettleFrame =
    mainTextLastWordDelay + motionPresetsData.presets.heavy.durationRange[0];
  const subTextStartFrame = mainTextSettleFrame + SUB_TEXT_DELAY_FRAMES;
  const underlineStartFrame = subTextStartFrame + 6;

  // Only apply manual fade-in for wildcard mode; beat-driven mode defers to BeatElement
  const subTextProgress = isWildcard
    ? interpolate(frame, [subTextStartFrame, subTextStartFrame + 18], [0, 1], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      })
    : 1;

  // Extract emphasis keyword from mainText
  // Use the first word that thematically matches or fallback to a strong word
  const emphasisKeyword = extractEmphasisKeyword(content.mainText);

  return (
    <AbsoluteFill style={{ backgroundColor: "transparent" }}>
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
              paddingRight: "30%",
              gap: sp(4),
            }}
          >
            {/* Main text — headlineXL, left-aligned, KineticText with word stagger */}
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
                motionPreset="heavy"
                emphasisWord={emphasisKeyword}
              />
            </BeatElement>

            {/* Sub text — bodyL, grey, delayed fade-in */}
            {content.subText && (
              <div
                style={{
                  zIndex: LAYERS.subText,
                  opacity: subTextProgress,
                  transform: `translateY(${interpolate(subTextProgress, [0, 1], [12, 0])}px)`,
                  willChange: "opacity, transform",
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

            {/* Accent underline — follows subText timing */}
            <div
              style={{
                zIndex: LAYERS.underline,
                marginTop: sp(3),
                opacity: isWildcard
                  ? interpolate(
                      frame,
                      [underlineStartFrame, underlineStartFrame + 6],
                      [0, 1],
                      { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
                    )
                  : getBeatState("subText")?.visibility !== "hidden"
                    ? 1
                    : 0,
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
 * Heuristic: pick the first noun-like word that is >= 2 chars (Korean)
 * or the last word for short phrases.
 */
function extractEmphasisKeyword(text: string): string {
  const words = text.split(" ").filter((w) => w.length > 0);
  if (words.length === 0) return "";
  // For Korean text, pick the first word with strong meaning (>= 2 chars)
  // Typically the first or last content word carries the punch
  const candidate = words.find((w) => w.length >= 2);
  return candidate ?? words[0];
}

export default HighlightScene;
