import React from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  spring,
  interpolate,
} from "remotion";
import type { BaseSceneProps, ClosingContent, ElementBeatState } from "@/types";
import { sp } from "@/design/tokens/spacing";
import { sceneInteriorTokens } from "@/design/tokens/shadow";
import { motionPresets } from "@/design/tokens";
import { SafeArea } from "@/components/layout/SafeArea";
import { BeatElement } from "@/components/motion/BeatElement";
import { TextBlock } from "@/components/primitives/TextBlock";
import { AccentBar } from "@/components/primitives/AccentBar";
import { useBeatTimeline } from "@/hooks/useBeatTimeline";
import { resolveBeats } from "@/pipeline/resolveBeats";

const LAYERS = {
  background: 0,
  texture: 5,
  recapStatement: 30,
  cta: 35,
  accentBar: 40,
} as const;

/** CTA slide-up delay: 1 second = 30 frames after recap */
const CTA_DELAY_FRAMES = 30;

function buildWildcardStagger(
  isShorts: boolean,
): Record<string, ElementBeatState> {
  return {
    recapStatement: {
      visibility: "entering",
      entryFrame: 0,
      emphasis: false,
      motionPreset: "heavy",
    },
    ctaText: {
      visibility: "entering",
      entryFrame: CTA_DELAY_FRAMES,
      emphasis: false,
      motionPreset: "smooth",
    },
    accentBar: {
      visibility: "entering",
      entryFrame: isShorts ? CTA_DELAY_FRAMES : CTA_DELAY_FRAMES + 6,
      emphasis: false,
      motionPreset: "snappy",
    },
  };
}

interface ClosingSceneProps extends BaseSceneProps {
  content: ClosingContent;
}

export const ClosingScene: React.FC<ClosingSceneProps> = ({
  format,
  theme,
  from,
  durationFrames,
  content,
  beats,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const isShorts = format === "shorts";
  const showCta = !isShorts && !!content.ctaText;

  // Beat resolution
  const resolvedBeats = resolveBeats(
    { id: `closing-${from}`, type: "closing", beats, narrationText: "" },
    format,
  );
  const { elementStates } = useBeatTimeline(resolvedBeats, durationFrames);
  const isWildcard =
    resolvedBeats.length === 1 && resolvedBeats[0].activates.includes("*");

  const wildcardStagger = buildWildcardStagger(isShorts);

  const getBeatState = (key: string): ElementBeatState | undefined => {
    if (isWildcard) return wildcardStagger[key];
    return elementStates.get(key);
  };

  // CTA slide-up animation
  const ctaState = getBeatState("ctaText");
  const ctaEntryFrame = ctaState?.entryFrame ?? CTA_DELAY_FRAMES;
  const ctaLocalFrame = Math.max(0, frame - ctaEntryFrame);
  const ctaProgress = spring({
    frame: ctaLocalFrame,
    fps,
    config: motionPresets.presets.smooth.config,
    durationInFrames: 24,
  });
  const ctaTranslateY = interpolate(ctaProgress, [0, 1], [40, 0]);
  const ctaOpacity = interpolate(ctaProgress, [0, 1], [0, 1]);

  // Accent bar entry
  const accentBarState = getBeatState("accentBar");
  const accentBarEntryFrame =
    accentBarState?.entryFrame ?? CTA_DELAY_FRAMES + 6;

  return (
    <AbsoluteFill style={{ backgroundColor: theme.bg }}>
      {/* Background */}
      <AbsoluteFill
        style={{ zIndex: LAYERS.background, backgroundColor: theme.bg }}
      />

      {/* Texture */}
      <AbsoluteFill
        style={{
          zIndex: LAYERS.texture,
          backgroundColor: theme.surfaceMuted,
          opacity: sceneInteriorTokens.textureOpacity,
        }}
      />

      {/* Main content — centered */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          zIndex: LAYERS.recapStatement,
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
              gap: sp(7),
            }}
          >
            {/* Recap statement — headlineXL, centered */}
            <BeatElement
              elementKey="recapStatement"
              beatState={getBeatState("recapStatement")}
              format={format}
              theme={theme}
            >
              <TextBlock
                format={format}
                theme={theme}
                text={content.recapStatement}
                variant="headlineXL"
                weight="bold"
                align="center"
                maxLines={4}
              />
            </BeatElement>

            {/* CTA — bodyL, slide-up from bottom */}
            {showCta && (
              <div
                style={{
                  zIndex: LAYERS.cta,
                  transform: `translateY(${ctaTranslateY}px)`,
                  opacity: ctaOpacity,
                  willChange: "opacity, transform",
                }}
              >
                <TextBlock
                  format={format}
                  theme={theme}
                  text={content.ctaText!}
                  variant="bodyL"
                  color={theme.textMuted}
                  align="center"
                />
              </div>
            )}
          </div>
        </SafeArea>
      </div>

      {/* Accent bar — bottom */}
      <div
        style={{
          position: "absolute",
          bottom: sp(8),
          left: 0,
          right: 0,
          zIndex: LAYERS.accentBar,
          display: "flex",
          justifyContent: "center",
        }}
      >
        <BeatElement
          elementKey="accentBar"
          beatState={getBeatState("accentBar")}
          format={format}
          theme={theme}
          motionType="none"
        >
          <AccentBar
            direction="horizontal"
            length={120}
            color={theme.accent}
            startFrame={accentBarEntryFrame}
          />
        </BeatElement>
      </div>
    </AbsoluteFill>
  );
};

export default ClosingScene;
