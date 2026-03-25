import React from "react";
import { AbsoluteFill } from "remotion";
import type {
  BaseSceneProps,
  ChapterDividerContent,
  ElementBeatState,
} from "@/types";
import { useFormat } from "@/design/themes/useFormat";
import { sp } from "@/design/tokens/spacing";
import { typography } from "@/design/tokens/typography";
import { SafeArea } from "@/components/layout/SafeArea";
import { BeatElement } from "@/components/motion/BeatElement";
import { TextBlock } from "@/components/primitives/TextBlock";
import { DividerLine } from "@/components/primitives/DividerLine";
import { useBeatTimeline } from "@/hooks/useBeatTimeline";
import { resolveBeats } from "@/pipeline/resolveBeats";

// zIndex layers from scene-catalog.json → chapterDivider
const LAYERS = {
  background: 0,
  texture: 5,
  baseContent: 20,
  chapterNumber: 30,
  chapterTitle: 35,
} as const;

const WILDCARD_STAGGER: Record<string, ElementBeatState> = {
  chapterNumber: {
    visibility: "entering",
    entryFrame: 0,
    emphasis: false,
    motionPreset: "heavy",
  },
  chapterTitle: {
    visibility: "entering",
    entryFrame: 6,
    emphasis: false,
    motionPreset: "heavy",
  },
  chapterSubtitle: {
    visibility: "entering",
    entryFrame: 12,
    emphasis: false,
    motionPreset: "heavy",
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
  const { typeScale } = useFormat(format);
  const isShorts = format === "shorts";
  const useAltLayout = content.useAltLayout === true;

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

  const chapterNumberEl = (
    <span
      style={{
        fontFamily: typography.fontFamily.mono,
        fontSize: typeScale.headlineL,
        fontWeight: typography.fontWeight.bold,
        color: theme.signal,
        lineHeight: typography.lineHeight.tight,
        letterSpacing: typography.tracking.tight,
        fontVariantNumeric: "tabular-nums",
      }}
    >
      {String(content.chapterNumber).padStart(2, "0")}
    </span>
  );

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
      <div
        style={{
          position: "absolute",
          inset: 0,
          zIndex: LAYERS.baseContent,
        }}
      >
        <SafeArea format={format} theme={theme}>
          {useAltLayout ? (
            /* band-divider mode */
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                height: "100%",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: theme.surfaceMuted,
                  opacity: 1,
                  width: "100%",
                  padding: `${sp(7)}px ${sp(6)}px`,
                  gap: sp(6),
                }}
              >
                <div style={{ zIndex: LAYERS.chapterNumber }}>
                  <BeatElement
                    elementKey="chapterNumber"
                    beatState={getBeatState("chapterNumber")}
                    format={format}
                    theme={theme}
                  >
                    {chapterNumberEl}
                  </BeatElement>
                </div>

                <DividerLine
                  format={format}
                  theme={theme}
                  orientation="vertical"
                />

                <div style={{ zIndex: LAYERS.chapterTitle }}>
                  <BeatElement
                    elementKey="chapterTitle"
                    beatState={getBeatState("chapterTitle")}
                    format={format}
                    theme={theme}
                  >
                    <TextBlock
                      format={format}
                      theme={theme}
                      text={content.chapterTitle}
                      variant="headlineM"
                      weight="bold"
                      maxLines={2}
                    />
                  </BeatElement>
                </div>
              </div>
            </div>
          ) : (
            /* left-anchor mode */
            <div
              style={{
                display: "flex",
                flexDirection: "row",
                alignItems: "stretch",
                justifyContent: "center",
                height: "100%",
                gap: sp(6),
              }}
            >
              {/* Left column: chapter number */}
              <div
                style={{
                  zIndex: LAYERS.chapterNumber,
                  flex: "0 0 30%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "flex-end",
                  paddingRight: sp(5),
                }}
              >
                <BeatElement
                  elementKey="chapterNumber"
                  beatState={getBeatState("chapterNumber")}
                  format={format}
                  theme={theme}
                >
                  {chapterNumberEl}
                </BeatElement>
              </div>

              {/* Vertical divider */}
              <div
                style={{
                  display: "flex",
                  alignItems: "stretch",
                  paddingTop: sp(5),
                  paddingBottom: sp(5),
                }}
              >
                <DividerLine
                  format={format}
                  theme={theme}
                  orientation="vertical"
                />
              </div>

              {/* Right column: title + subtitle */}
              <div
                style={{
                  flex: "1 1 0",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "center",
                  gap: sp(4),
                  paddingLeft: sp(5),
                }}
              >
                <div style={{ zIndex: LAYERS.chapterTitle }}>
                  <BeatElement
                    elementKey="chapterTitle"
                    beatState={getBeatState("chapterTitle")}
                    format={format}
                    theme={theme}
                  >
                    <TextBlock
                      format={format}
                      theme={theme}
                      text={content.chapterTitle}
                      variant="headlineM"
                      weight="bold"
                      maxLines={3}
                    />
                  </BeatElement>
                </div>

                {content.chapterSubtitle && (
                  <BeatElement
                    elementKey="chapterSubtitle"
                    beatState={getBeatState("chapterSubtitle")}
                    format={format}
                    theme={theme}
                  >
                    <TextBlock
                      format={format}
                      theme={theme}
                      text={content.chapterSubtitle}
                      variant="bodyL"
                      color={theme.textMuted}
                      maxLines={2}
                    />
                  </BeatElement>
                )}
              </div>
            </div>
          )}
        </SafeArea>
      </div>

      {/* SubtitleLayer removed — Root HUD global layer principle.
          Subtitles are rendered by LongformComposition's CaptionLayer/SubtitleLayerWrapper. */}
    </AbsoluteFill>
  );
};

export default ChapterDividerScene;
