import React from "react";
import { AbsoluteFill } from "remotion";
import type {
  BaseSceneProps,
  CompareContrastContent,
  ElementBeatState,
} from "@/types";
import { sp } from "@/design/tokens/spacing";
import { typography } from "@/design/tokens/typography";
import { SafeArea } from "@/components/layout/SafeArea";
import { BeatElement } from "@/components/motion/BeatElement";
import { TextBlock } from "@/components/primitives/TextBlock";
import { LabelChip } from "@/components/primitives/LabelChip";
import { DividerLine } from "@/components/primitives/DividerLine";
import { useBeatTimeline } from "@/hooks/useBeatTimeline";
import { resolveBeats } from "@/pipeline/resolveBeats";

// zIndex layers from scene-catalog.json → compareContrast
const LAYERS = {
  background: 0,
  texture: 5,
  leftPanel: 20,
  rightPanel: 20,
  divider: 30,
  labels: 35,
  emphasis: 40,
} as const;

interface CompareContrastSceneProps extends BaseSceneProps {
  content: CompareContrastContent;
}

/**
 * Wildcard stagger — preserve existing revealOrder delays.
 * Returns per-element beat states based on revealOrder when no explicit beats.
 */
function buildWildcardStagger(
  revealOrder: "simultaneous" | "left-first" | "right-first",
): Record<string, ElementBeatState> {
  const leftDelay = revealOrder === "right-first" ? 12 : 0;
  const rightDelay = revealOrder === "left-first" ? 12 : 0;
  const connectorDelay = Math.max(leftDelay, rightDelay) + 12;

  return {
    leftPanel: {
      visibility: "entering",
      entryFrame: leftDelay,
      emphasis: false,
      motionPreset: "smooth",
    },
    rightPanel: {
      visibility: "entering",
      entryFrame: rightDelay,
      emphasis: false,
      motionPreset: "smooth",
    },
    connector: {
      visibility: "entering",
      entryFrame: connectorDelay,
      emphasis: false,
      motionPreset: "smooth",
    },
  };
}

export const CompareContrastScene: React.FC<CompareContrastSceneProps> = ({
  format,
  theme,
  from,
  durationFrames,
  content,
  beats,
}) => {
  const isShorts = format === "shorts";
  const revealOrder = content.revealOrder ?? "simultaneous";

  // Beat resolution
  const resolvedBeats = resolveBeats(
    {
      id: `compareContrast-${from}`,
      type: "compareContrast",
      beats,
      narrationText: "",
    },
    format,
  );
  const { elementStates } = useBeatTimeline(resolvedBeats, durationFrames);
  const isWildcard =
    resolvedBeats.length === 1 && resolvedBeats[0].activates.includes("*");

  const wildcardStagger = buildWildcardStagger(revealOrder);

  const getBeatState = (key: string): ElementBeatState | undefined => {
    if (isWildcard) return wildcardStagger[key];
    return elementStates.get(key);
  };

  // Tag label variant mapping
  const leftTagVariant = ((): "default" | "accent" | "signal" => {
    if (!content.leftTag) return "default";
    if (
      content.leftTag === "wrong" ||
      content.leftTag === "myth" ||
      content.leftTag === "before"
    )
      return "accent";
    return "default";
  })();

  const rightTagVariant = ((): "default" | "accent" | "signal" => {
    if (!content.rightTag) return "signal";
    if (
      content.rightTag === "fact" ||
      content.rightTag === "right" ||
      content.rightTag === "after"
    )
      return "signal";
    return "default";
  })();

  const leftPanel = (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: sp(4),
        flex: 1,
        paddingRight: isShorts ? 0 : sp(5),
        paddingBottom: isShorts ? sp(4) : 0,
      }}
    >
      {content.leftTag && (
        <div style={{ zIndex: LAYERS.labels }}>
          <LabelChip
            format={format}
            theme={theme}
            label={content.leftTag}
            variant={leftTagVariant}
          />
        </div>
      )}
      <div style={{ zIndex: LAYERS.labels }}>
        <LabelChip
          format={format}
          theme={theme}
          label={content.leftLabel}
          variant="accent"
        />
      </div>
      <TextBlock
        format={format}
        theme={theme}
        text={content.leftContent}
        variant="bodyL"
        maxLines={6}
      />
    </div>
  );

  const rightPanel = (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: sp(4),
        flex: 1,
        paddingLeft: isShorts ? 0 : sp(5),
        paddingTop: isShorts ? sp(4) : 0,
      }}
    >
      {content.rightTag && (
        <div style={{ zIndex: LAYERS.labels }}>
          <LabelChip
            format={format}
            theme={theme}
            label={content.rightTag}
            variant={rightTagVariant}
          />
        </div>
      )}
      <div style={{ zIndex: LAYERS.labels }}>
        <LabelChip
          format={format}
          theme={theme}
          label={content.rightLabel}
          variant="signal"
        />
      </div>
      <TextBlock
        format={format}
        theme={theme}
        text={content.rightContent}
        variant="bodyL"
        maxLines={6}
      />
    </div>
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
      <div style={{ position: "absolute", inset: 0, zIndex: LAYERS.leftPanel }}>
        <SafeArea format={format} theme={theme}>
          <div
            style={{
              display: "flex",
              flexDirection: isShorts ? "column" : "row",
              alignItems: isShorts ? "stretch" : "center",
              justifyContent: "center",
              height: "100%",
              position: "relative",
            }}
          >
            {/* Left panel */}
            <div style={{ flex: 1, display: "flex", alignItems: "center" }}>
              <BeatElement
                elementKey="leftPanel"
                beatState={getBeatState("leftPanel")}
                format={format}
                theme={theme}
                motionType="slide"
                slideDirection="left"
              >
                {leftPanel}
              </BeatElement>
            </div>

            {/* Center divider */}
            <BeatElement
              elementKey="connector"
              beatState={getBeatState("connector")}
              format={format}
              theme={theme}
            >
              <div
                style={{
                  zIndex: LAYERS.divider,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  gap: sp(3),
                }}
              >
                <DividerLine
                  format={format}
                  theme={theme}
                  orientation={isShorts ? "horizontal" : "vertical"}
                />
                {content.showConnector && !isShorts && (
                  <div
                    style={{
                      position: "absolute",
                      fontFamily: typography.fontFamily.sans,
                      fontSize: 14,
                      fontWeight: typography.fontWeight.bold,
                      color: theme.textMuted,
                      letterSpacing: typography.tracking.wide,
                      backgroundColor: theme.bg,
                      padding: `${sp(2)}px ${sp(3)}px`,
                    }}
                  >
                    VS
                  </div>
                )}
              </div>
            </BeatElement>

            {/* Right panel */}
            <div style={{ flex: 1, display: "flex", alignItems: "center" }}>
              <BeatElement
                elementKey="rightPanel"
                beatState={getBeatState("rightPanel")}
                format={format}
                theme={theme}
                motionType="slide"
                slideDirection="right"
              >
                {rightPanel}
              </BeatElement>
            </div>
          </div>
        </SafeArea>
      </div>

      {/* SubtitleLayer removed — Root HUD global layer principle.
          Subtitles are rendered by LongformComposition's CaptionLayer/SubtitleLayerWrapper. */}
    </AbsoluteFill>
  );
};

export default CompareContrastScene;
