import React from "react";
import { AbsoluteFill } from "remotion";
import type {
  BaseSceneProps,
  KeyInsightContent,
  ElementBeatState,
} from "@/types";
import { useFormat } from "@/design/themes/useFormat";
import { sp } from "@/design/tokens/spacing";
import { typography } from "@/design/tokens/typography";
import { SafeArea } from "@/components/layout/SafeArea";
import { BeatElement } from "@/components/motion/BeatElement";
import { TextBlock } from "@/components/primitives/TextBlock";
import { SignalBar } from "@/components/primitives/SignalBar";
import { EvidenceCard } from "@/components/primitives/EvidenceCard";
import { useBeatTimeline } from "@/hooks/useBeatTimeline";
import { resolveBeats } from "@/pipeline/resolveBeats";

// zIndex layers from scene-catalog.json → keyInsight
const LAYERS = {
  background: 0,
  texture: 5,
  signalBar: 20,
  supportText: 25,
  headline: 30,
  evidenceCard: 35,
  emphasis: 40,
} as const;

/**
 * Wildcard stagger states — preserve existing ArchitecturalReveal delay={0,3,12}
 * animation for scenes without explicit beats.
 * BeatElement's "entering" path delegates to ArchitecturalReveal with delay={entryFrame}.
 */
const WILDCARD_STAGGER: Record<string, ElementBeatState> = {
  signalBar: {
    visibility: "entering",
    entryFrame: 0,
    emphasis: false,
    motionPreset: "heavy",
  },
  headline: {
    visibility: "entering",
    entryFrame: 3,
    emphasis: false,
    motionPreset: "heavy",
  },
  supportText: {
    visibility: "entering",
    entryFrame: 12,
    emphasis: false,
    motionPreset: "heavy",
  },
};

interface KeyInsightSceneProps extends BaseSceneProps {
  content: KeyInsightContent;
}

/**
 * Renders headline text with optional keyword emphasis.
 * If underlineKeyword is set, the matching word is rendered in signal color with bold weight.
 */
const HeadlineWithEmphasis: React.FC<{
  text: string;
  keyword?: string;
  theme: KeyInsightSceneProps["theme"];
  format: KeyInsightSceneProps["format"];
}> = ({ text, keyword, theme, format }) => {
  const { typeScale } = useFormat(format);

  if (!keyword) {
    return (
      <TextBlock
        format={format}
        theme={theme}
        text={text}
        variant="headlineL"
        weight="bold"
        maxLines={3}
      />
    );
  }

  const keywordIndex = text.indexOf(keyword);
  if (keywordIndex === -1) {
    return (
      <TextBlock
        format={format}
        theme={theme}
        text={text}
        variant="headlineL"
        weight="bold"
        maxLines={3}
      />
    );
  }

  const before = text.slice(0, keywordIndex);
  const after = text.slice(keywordIndex + keyword.length);

  return (
    <div
      style={{
        fontFamily: typography.fontFamily.sans,
        fontSize: typeScale.headlineL,
        fontWeight: typography.fontWeight.bold,
        color: theme.textStrong,
        lineHeight: typography.lineHeight.normal,
        letterSpacing: typography.tracking.normal,
      }}
    >
      {before}
      <span
        style={{
          color: theme.signal,
          fontWeight: typography.fontWeight.bold,
        }}
      >
        {keyword}
      </span>
      {after}
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
  const showSignalBar = content.useSignalBar !== false;
  const showSupportText = !isShorts && !!content.supportText;

  // Beat resolution: explicit beats or implicit single beat (backward compat)
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

  // Helper: get beat state per element
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

      {/* Texture layer */}
      <AbsoluteFill
        style={{
          zIndex: LAYERS.texture,
          backgroundColor: theme.surfaceMuted,
          opacity: 0.04,
        }}
      />

      {/* Main content */}
      <div style={{ position: "absolute", inset: 0, zIndex: LAYERS.headline }}>
        <SafeArea format={format} theme={theme}>
          <div
            style={{
              display: "flex",
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              height: "100%",
              gap: sp(5),
            }}
          >
            {/* Signal bar */}
            {showSignalBar && (
              <div
                style={{
                  zIndex: LAYERS.signalBar,
                  alignSelf: "stretch",
                  display: "flex",
                  paddingTop: isShorts ? sp(6) : 0,
                  paddingBottom: isShorts ? sp(6) : 0,
                }}
              >
                <BeatElement
                  elementKey="signalBar"
                  beatState={getBeatState("signalBar")}
                  format={format}
                  theme={theme}
                >
                  <SignalBar format={format} theme={theme} />
                </BeatElement>
              </div>
            )}

            {/* Text content column */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                flex: 1,
                gap: sp(4),
                maxWidth: isShorts ? "100%" : "760px",
              }}
            >
              {/* Headline */}
              <div style={{ zIndex: LAYERS.headline }}>
                <BeatElement
                  elementKey="headline"
                  beatState={getBeatState("headline")}
                  format={format}
                  theme={theme}
                >
                  <HeadlineWithEmphasis
                    text={content.headline}
                    keyword={content.underlineKeyword}
                    theme={theme}
                    format={format}
                  />
                </BeatElement>
              </div>

              {/* Support text — longform only */}
              {showSupportText && (
                <div style={{ zIndex: LAYERS.supportText }}>
                  <BeatElement
                    elementKey="supportText"
                    beatState={getBeatState("supportText")}
                    format={format}
                    theme={theme}
                  >
                    <TextBlock
                      format={format}
                      theme={theme}
                      text={content.supportText!}
                      variant="bodyL"
                      color={theme.textMuted}
                      maxLines={4}
                    />
                  </BeatElement>
                </div>
              )}

              {/* Evidence Card — only visible when explicit beats activate it */}
              {content.evidenceCard && (
                <div style={{ zIndex: LAYERS.evidenceCard }}>
                  <BeatElement
                    elementKey="evidenceCard"
                    beatState={elementStates.get("evidenceCard")}
                    format={format}
                    theme={theme}
                  >
                    <EvidenceCard
                      data={content.evidenceCard}
                      theme={theme}
                      format={format}
                    />
                  </BeatElement>
                </div>
              )}
            </div>
          </div>
        </SafeArea>
      </div>

      {/* SubtitleLayer removed — Root HUD global layer principle.
          Subtitles are rendered by LongformComposition's CaptionLayer/SubtitleLayerWrapper. */}
    </AbsoluteFill>
  );
};

export default KeyInsightScene;
