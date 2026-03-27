import React from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  spring,
  interpolate,
} from "remotion";
import type {
  BaseSceneProps,
  ChapterDividerContent,
  ElementBeatState,
} from "@/types";
import { useFormat } from "@/design/themes/useFormat";
import { sp } from "@/design/tokens/spacing";
import { typography } from "@/design/tokens/typography";
import { sceneInteriorTokens } from "@/design/tokens/shadow";
import { motionPresets } from "@/design/tokens";
import { SafeArea } from "@/components/layout/SafeArea";
import { BeatElement } from "@/components/motion/BeatElement";
import { AccentUnderline } from "@/components/primitives/AccentUnderline";
import { useBeatTimeline } from "@/hooks/useBeatTimeline";
import { resolveBeats } from "@/pipeline/resolveBeats";

const LAYERS = {
  background: 0,
  darkenOverlay: 3,
  texture: 5,
  baseContent: 20,
  chapterTitle: 30,
  underline: 35,
} as const;

/** Darker background overlay opacity for chapter divider */
const DARKEN_OVERLAY_OPACITY = 0.08;
const UNDERLINE_WIDTH = 120;

const WILDCARD_STAGGER: Record<string, ElementBeatState> = {
  chapterTitle: {
    visibility: "entering",
    entryFrame: 0,
    emphasis: false,
    motionPreset: "heavy",
  },
  underline: {
    visibility: "entering",
    entryFrame: 12,
    emphasis: false,
    motionPreset: "snappy",
  },
};

interface ChapterDividerSceneProps extends BaseSceneProps {
  content: ChapterDividerContent;
}

export const ChapterDividerScene: React.FC<ChapterDividerSceneProps> = ({
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

  // Beat resolution
  const resolvedBeats = resolveBeats(
    {
      id: `chapterDivider-${from}`,
      type: "chapterDivider",
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

  // Title scale 0.8→1 spring animation
  const titleState = getBeatState("chapterTitle");
  const titleEntryFrame = titleState?.entryFrame ?? 0;
  const titleLocalFrame = Math.max(0, frame - titleEntryFrame);
  const titleScale = spring({
    frame: titleLocalFrame,
    fps,
    config: motionPresets.presets.heavy.config,
    durationInFrames: 36,
  });
  const scaleValue = interpolate(titleScale, [0, 1], [0.8, 1]);
  const titleOpacity = interpolate(titleScale, [0, 1], [0, 1]);

  // Underline entry
  const underlineState = getBeatState("underline");
  const underlineEntryFrame = underlineState?.entryFrame ?? 12;

  // Darken overlay uses theme-relative darkening
  const darkenBg =
    theme.mode === "dark"
      ? `rgba(0,0,0,${DARKEN_OVERLAY_OPACITY})`
      : `rgba(0,0,0,${DARKEN_OVERLAY_OPACITY * 0.5})`;

  return (
    <AbsoluteFill style={{ backgroundColor: theme.bg }}>
      {/* Background — slightly darker than other scenes */}
      <AbsoluteFill
        style={{ zIndex: LAYERS.background, backgroundColor: theme.bg }}
      />

      {/* Darken overlay — makes this scene feel distinct */}
      <AbsoluteFill
        style={{
          zIndex: LAYERS.darkenOverlay,
          backgroundColor: darkenBg,
        }}
      />

      {/* Texture */}
      <AbsoluteFill
        style={{
          zIndex: LAYERS.texture,
          backgroundColor: theme.surfaceMuted,
          opacity: sceneInteriorTokens.textureOpacity,
        }}
      />

      {/* Centered content */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          zIndex: LAYERS.baseContent,
        }}
      >
        <SafeArea format={format} theme={theme}>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              height: "100%",
              gap: sp(5),
            }}
          >
            {/* Chapter title — headlineXL, accent, scale 0.8→1 */}
            <div
              style={{
                zIndex: LAYERS.chapterTitle,
                transform: `scale(${scaleValue})`,
                opacity: titleOpacity,
                willChange: "transform, opacity",
                textAlign: "center",
              }}
            >
              <span
                style={{
                  fontFamily: typography.fontFamily.sans,
                  fontSize: typeScale.headlineXL,
                  fontWeight: typography.fontWeight.bold,
                  color: theme.accent,
                  lineHeight: typography.lineHeight.tight,
                  letterSpacing: typography.tracking.tight,
                }}
              >
                {content.chapterTitle}
              </span>
            </div>

            {/* Accent underline below */}
            <div style={{ zIndex: LAYERS.underline }}>
              <BeatElement
                elementKey="underline"
                beatState={getBeatState("underline")}
                format={format}
                theme={theme}
                motionType="none"
              >
                <AccentUnderline
                  width={UNDERLINE_WIDTH}
                  color={theme.accent}
                  startFrame={underlineEntryFrame}
                  strokeWidth={3}
                />
              </BeatElement>
            </div>
          </div>
        </SafeArea>
      </div>
    </AbsoluteFill>
  );
};

export default ChapterDividerScene;
