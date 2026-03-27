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
  KeyInsightContent,
  ElementBeatState,
} from "@/types";
import { useFormat } from "@/design/themes/useFormat";
import { sp } from "@/design/tokens/spacing";
import { typography, typographyHierarchy } from "@/design/tokens/typography";
import { sceneInteriorTokens } from "@/design/tokens/shadow";
import { SafeArea } from "@/components/layout/SafeArea";
import { BeatElement } from "@/components/motion/BeatElement";
import { KineticText } from "@/components/primitives/KineticText";
import { AccentBar } from "@/components/primitives/AccentBar";
import { useBeatTimeline } from "@/hooks/useBeatTimeline";
import { resolveBeats } from "@/pipeline/resolveBeats";
import { motionPresets } from "@/design/tokens";

// zIndex layers
const LAYERS = {
  background: 0,
  texture: 5,
  accentBar: 20,
  headline: 30,
  supportText: 25,
  evidenceBar: 35,
} as const;

// Wildcard stagger — sequential entrance when no explicit beats
const WILDCARD_STAGGER: Record<string, ElementBeatState> = {
  accentBar: {
    visibility: "entering",
    entryFrame: 0,
    emphasis: false,
    motionPreset: "snappy",
  },
  headline: {
    visibility: "entering",
    entryFrame: 9, // ~0.3s after AccentBar
    emphasis: false,
    motionPreset: "wordReveal",
  },
  supportText: {
    visibility: "entering",
    entryFrame: 24, // ~0.3s after headline start + stagger
    emphasis: false,
    motionPreset: "heavy",
  },
  evidenceCard: {
    visibility: "entering",
    entryFrame: 39, // ~0.5s after supportText
    emphasis: false,
    motionPreset: "smooth",
  },
};

interface KeyInsightSceneProps extends BaseSceneProps {
  content: KeyInsightContent;
}

/**
 * EvidenceBar — full-width bottom bar with accent background.
 * Replaces the old card-style EvidenceCard.
 */
const EvidenceBar: React.FC<{
  value: string;
  source?: string;
  caption?: string;
  accentColor: string;
  textColor: string;
  mutedColor: string;
  startFrame: number;
  format: BaseSceneProps["format"];
}> = ({
  value,
  source,
  caption,
  accentColor,
  textColor,
  mutedColor,
  startFrame,
  format,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { typeScale } = useFormat(format);

  const localFrame = Math.max(0, frame - startFrame);
  const progress = spring({
    frame: localFrame,
    fps,
    config: motionPresets.presets.smooth.config,
    durationInFrames: 24,
  });

  const translateY = interpolate(progress, [0, 1], [60, 0]);
  const opacity = interpolate(progress, [0, 1], [0, 1]);

  return (
    <div
      style={{
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        transform: `translateY(${translateY}px)`,
        opacity,
        willChange: "opacity, transform",
      }}
    >
      <div
        style={{
          backgroundColor: accentColor,
          opacity: 0.15,
          position: "absolute",
          inset: 0,
        }}
      />
      <div
        style={{
          position: "relative",
          padding: `${sp(5)}px ${sp(8)}px`,
          display: "flex",
          alignItems: "center",
          gap: sp(3),
        }}
      >
        <span
          style={{
            fontFamily: typography.fontFamily.sans,
            fontSize: typeScale.bodyM,
            fontWeight: typography.fontWeight.bold,
            color: textColor,
            letterSpacing: typography.tracking.normal,
          }}
        >
          {value}
        </span>
        {(caption || source) && (
          <span
            style={{
              fontFamily: typography.fontFamily.sans,
              fontSize: typeScale.caption,
              fontWeight: typography.fontWeight.regular,
              color: mutedColor,
              letterSpacing: typography.tracking.normal,
              opacity: 0.7,
            }}
          >
            {caption ? `${caption}` : ""}
            {source ? ` — ${source}` : ""}
          </span>
        )}
      </div>
    </div>
  );
};

export const KeyInsightScene: React.FC<KeyInsightSceneProps> = ({
  format,
  theme,
  from,
  durationFrames,
  content,
  beats,
}) => {
  const isShorts = format === "shorts";
  const showSupportText = !isShorts && !!content.supportText;

  // Beat resolution
  const resolvedBeats = resolveBeats(
    {
      id: `keyInsight-${from}`,
      type: "keyInsight",
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

  // AccentBar entry frame for self-animated draw-on
  const accentBarState = getBeatState("accentBar");
  const accentBarEntryFrame = accentBarState?.entryFrame ?? 0;

  // Evidence bar entry frame
  const evidenceState = getBeatState("evidenceCard");
  const evidenceEntryFrame = evidenceState?.entryFrame ?? 39;

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

      {/* Main content */}
      <div style={{ position: "absolute", inset: 0, zIndex: LAYERS.headline }}>
        <SafeArea format={format} theme={theme}>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              justifyContent: "flex-start",
              height: "100%",
              width: isShorts ? "100%" : "80%",
              paddingTop: isShorts ? sp(6) : sp(10),
            }}
          >
            {/* Vertical AccentBar — top-left anchor */}
            <div style={{ zIndex: LAYERS.accentBar, marginBottom: sp(5) }}>
              <BeatElement
                elementKey="accentBar"
                beatState={getBeatState("accentBar")}
                format={format}
                theme={theme}
                motionType="none"
              >
                <AccentBar
                  direction="vertical"
                  length={48}
                  color={theme.accent}
                  startFrame={accentBarEntryFrame}
                />
              </BeatElement>
            </div>

            {/* Headline — KineticText word stagger, left-aligned */}
            <div style={{ zIndex: LAYERS.headline, marginBottom: sp(5) }}>
              <BeatElement
                elementKey="headline"
                beatState={getBeatState("headline")}
                format={format}
                theme={theme}
                motionType="none"
              >
                <KineticText
                  format={format}
                  theme={theme}
                  text={content.headline}
                  variant="headlineXL"
                  weight="bold"
                  align="left"
                  motionPreset="wordReveal"
                  delay={getBeatState("headline")?.entryFrame ?? 9}
                  emphasisWord={content.underlineKeyword}
                />
              </BeatElement>
            </div>

            {/* Support text — bodyL, muted, left-aligned */}
            {showSupportText && (
              <div style={{ zIndex: LAYERS.supportText }}>
                <BeatElement
                  elementKey="supportText"
                  beatState={getBeatState("supportText")}
                  format={format}
                  theme={theme}
                >
                  <div
                    style={{
                      fontFamily: typography.fontFamily.sans,
                      fontSize: typographyHierarchy.bodyL.fontSize,
                      fontWeight: typography.fontWeight.regular,
                      color: theme.textMuted,
                      lineHeight: typography.lineHeight.relaxed,
                      letterSpacing: typography.tracking.normal,
                      maxWidth: "90%",
                    }}
                  >
                    {content.supportText}
                  </div>
                </BeatElement>
              </div>
            )}
          </div>
        </SafeArea>
      </div>

      {/* Evidence bar — full-width bottom accent bar */}
      {content.evidenceCard && (
        <div
          style={{ position: "absolute", inset: 0, zIndex: LAYERS.evidenceBar }}
        >
          <EvidenceBar
            value={content.evidenceCard.value}
            source={content.evidenceCard.source}
            caption={content.evidenceCard.caption}
            accentColor={theme.accent}
            textColor={theme.textStrong}
            mutedColor={theme.textMuted}
            startFrame={evidenceEntryFrame}
            format={format}
          />
        </div>
      )}
    </AbsoluteFill>
  );
};

export default KeyInsightScene;
