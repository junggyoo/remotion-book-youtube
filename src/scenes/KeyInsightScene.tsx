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
import { TextBlock } from "@/components/primitives/TextBlock";
import { useBeatTimeline } from "@/hooks/useBeatTimeline";
import { resolveBeats } from "@/pipeline/resolveBeats";
import { motionPresets } from "@/design/tokens";
import motionPresetsData from "@/design/tokens/motion-presets.json";
import { useCaptions } from "@/hooks/useCaptions";
import { useNarrationSync } from "@/hooks/useNarrationSync";
import { useEmphasisGate } from "@/hooks/useEmphasisGate";

// zIndex layers
const LAYERS = {
  background: 0,
  bgPulse: 2,
  texture: 5,
  accentBar: 20,
  headline: 30,
  supportText: 25,
  evidenceBar: 35,
} as const;

// --- Choreography timing ---
const ACCENT_BAR_LENGTH = 64;
const HEADLINE_STAGGER = 5;

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
    entryFrame: 6,
    emphasis: false,
    motionPreset: "punchy",
  },
  supportText: {
    visibility: "entering",
    entryFrame: 28,
    emphasis: false,
    motionPreset: "smooth",
  },
  evidenceCard: {
    visibility: "entering",
    entryFrame: 42,
    emphasis: false,
    motionPreset: "smooth",
  },
};

interface KeyInsightSceneProps extends BaseSceneProps {
  content: KeyInsightContent;
}

/**
 * EvidenceBar — full-width bottom bar with accent background + glow.
 * Slide-up entrance with accent glow pulse.
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

  // Slide-up with punchy spring
  const progress = spring({
    frame: localFrame,
    fps,
    config: motionPresetsData.presets.punchy.config,
  });

  const translateY = interpolate(progress, [0, 1], [40, 0]);
  const opacity = interpolate(progress, [0, 1], [0, 1]);
  const blur = interpolate(progress, [0, 1], [4, 0]);

  // Accent glow pulse after entrance
  const glowProgress = interpolate(localFrame, [10, 20, 40], [0, 0.25, 0.08], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // hex → rgb
  const ar = parseInt(accentColor.slice(1, 3), 16);
  const ag = parseInt(accentColor.slice(3, 5), 16);
  const ab = parseInt(accentColor.slice(5, 7), 16);

  return (
    <div
      style={{
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        transform: `translateY(${translateY}px)`,
        opacity,
        filter: `blur(${blur}px)`,
        willChange: "opacity, transform, filter",
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
      {/* Accent glow line at top edge */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 2,
          backgroundColor: accentColor,
          boxShadow: `0 0 ${sp(4)}px rgba(${ar},${ag},${ab},${glowProgress})`,
          opacity: interpolate(progress, [0, 1], [0, 0.8]),
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
  captionsFile,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const isShorts = format === "shorts";
  const showSupportText = !isShorts && !!content.supportText;

  // P2-3: Load captions for narration sync
  const captions = useCaptions(captionsFile);

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
  const { elementStates, activeBeat, activeChannels, isInRecoveryWindow } =
    useBeatTimeline(resolvedBeats, durationFrames, "heavy", {
      sceneType: "keyInsight",
      format,
    });
  const isWildcard =
    resolvedBeats.length === 1 && resolvedBeats[0].activates.includes("*");

  // P2-3: Narration sync — emphasis words glow in scene text
  const narrationSync = useNarrationSync({
    captions,
    emphasisTargets: activeBeat?.emphasisTargets ?? [],
    sceneType: "keyInsight",
    format,
  });

  // P2-4: Gate sceneText channel
  const { isChannelActive: sceneTextActive } = useEmphasisGate({
    channelKey: "sceneText",
    sceneType: "keyInsight",
    format,
    beatTimeline: { activeChannels, isInRecoveryWindow },
  });
  const gatedEmphasisProgress = sceneTextActive
    ? narrationSync.emphasisProgress
    : 0;

  // P2-4: Gate background channel
  const { isChannelActive: bgActive } = useEmphasisGate({
    channelKey: "background",
    sceneType: "keyInsight",
    format,
    beatTimeline: { activeChannels, isInRecoveryWindow },
  });

  const getBeatState = (key: string): ElementBeatState | undefined => {
    if (isWildcard) return WILDCARD_STAGGER[key];
    return elementStates.get(key);
  };

  // AccentBar entry frame for self-animated draw-on
  const accentBarState = getBeatState("accentBar");
  const accentBarEntryFrame = accentBarState?.entryFrame ?? 0;

  // Evidence bar entry frame
  const evidenceState = getBeatState("evidenceCard");
  const evidenceEntryFrame = evidenceState?.entryFrame ?? 42;

  // P2-2: slow-zoom is now handled by CameraLayer wrapper in SceneRenderer

  // --- Background radial pulse on headline entrance ---
  const headlineEntryFrame = getBeatState("headline")?.entryFrame ?? 6;
  const bgPulseStart = headlineEntryFrame + 8;
  const bgPulseRaw = interpolate(
    frame,
    [bgPulseStart, bgPulseStart + 15, bgPulseStart + 45],
    [0, 0.1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );
  // P2-4: suppress background pulse when background channel is gated
  const bgPulseProgress = bgActive ? bgPulseRaw : 0;

  // hex → rgb for accent color
  const ar = parseInt(theme.accent.slice(1, 3), 16);
  const ag = parseInt(theme.accent.slice(3, 5), 16);
  const ab = parseInt(theme.accent.slice(5, 7), 16);

  // --- SupportText entrance (wildcard mode) ---
  const supportTextState = getBeatState("supportText");
  const supportTextEntry = supportTextState?.entryFrame ?? 28;
  const supportTextSpring = isWildcard
    ? spring({
        frame: Math.max(0, frame - supportTextEntry),
        fps,
        config: motionPresetsData.presets.smooth.config,
      })
    : 1;
  const supportTextBlur = interpolate(supportTextSpring, [0, 1], [6, 0]);
  const supportTextTranslateY = interpolate(supportTextSpring, [0, 1], [20, 0]);

  return (
    <AbsoluteFill style={{ backgroundColor: theme.bg }}>
      {/* Background */}
      <AbsoluteFill
        style={{ zIndex: LAYERS.background, backgroundColor: theme.bg }}
      />

      {/* Background radial pulse */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          zIndex: LAYERS.bgPulse,
          background: `radial-gradient(ellipse 60% 45% at 30% 35%, rgba(${ar},${ag},${ab},${bgPulseProgress}) 0%, transparent 70%)`,
          pointerEvents: "none",
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

      {/* Main content */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          zIndex: LAYERS.headline,
        }}
      >
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
            {/* Vertical AccentBar — top-left anchor, extended + glow */}
            <div style={{ zIndex: LAYERS.accentBar, marginBottom: sp(5) }}>
              <BeatElement
                elementKey="accentBar"
                beatState={getBeatState("accentBar")}
                format={format}
                theme={theme}
                motionType="none"
              >
                <div
                  style={{
                    filter: `drop-shadow(0 0 ${sp(2)}px rgba(${ar},${ag},${ab},0.3))`,
                  }}
                >
                  <AccentBar
                    direction="vertical"
                    length={ACCENT_BAR_LENGTH}
                    color={theme.accent}
                    startFrame={accentBarEntryFrame}
                  />
                </div>
              </BeatElement>
            </div>

            {/* Headline — punchy word-by-word reveal */}
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
                  motionPreset="punchy"
                  staggerDelay={HEADLINE_STAGGER}
                  delay={getBeatState("headline")?.entryFrame ?? 6}
                  emphasisWord={content.underlineKeyword}
                />
              </BeatElement>
            </div>

            {/* Support text — blur-in + translateY spring entrance */}
            {showSupportText && (
              <div
                style={{
                  zIndex: LAYERS.supportText,
                  opacity: interpolate(supportTextSpring, [0, 1], [0, 1]),
                  transform: `translateY(${supportTextTranslateY}px)`,
                  filter: `blur(${supportTextBlur}px)`,
                  willChange: "opacity, transform, filter",
                }}
              >
                <BeatElement
                  elementKey="supportText"
                  beatState={getBeatState("supportText")}
                  format={format}
                  theme={theme}
                >
                  <div style={{ maxWidth: "90%" }}>
                    <TextBlock
                      format={format}
                      theme={theme}
                      text={content.supportText!}
                      variant="bodyL"
                      color={theme.textMuted}
                      emphasisWords={narrationSync.activeEmphasisTargets}
                      emphasisProgress={gatedEmphasisProgress}
                    />
                  </div>
                </BeatElement>
              </div>
            )}
          </div>
        </SafeArea>
      </div>

      {/* Evidence bar — full-width bottom accent bar with glow */}
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
