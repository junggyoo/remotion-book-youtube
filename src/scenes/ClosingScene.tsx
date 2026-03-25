import React from "react";
import { AbsoluteFill } from "remotion";
import type { BaseSceneProps, ClosingContent, ElementBeatState } from "@/types";
import { sp } from "@/design/tokens/spacing";
import { SafeArea } from "@/components/layout/SafeArea";
import { BeatElement } from "@/components/motion/BeatElement";
import { TextBlock } from "@/components/primitives/TextBlock";
import { LabelChip } from "@/components/primitives/LabelChip";
import { DividerLine } from "@/components/primitives/DividerLine";
import { useBeatTimeline } from "@/hooks/useBeatTimeline";
import { resolveBeats } from "@/pipeline/resolveBeats";

// zIndex layers from scene-catalog.json → closing
const LAYERS = {
  background: 0,
  texture: 5,
  recapStatement: 30,
  brandLabel: 40,
  cta: 35,
} as const;

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
      entryFrame: 9,
      emphasis: false,
      motionPreset: "heavy",
    },
    brandLabel: {
      visibility: "entering",
      entryFrame: isShorts ? 9 : 15,
      emphasis: false,
      motionPreset: "heavy",
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
  const isShorts = format === "shorts";
  const showBrandLabel = content.showBrandLabel !== false;
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
              gap: sp(5),
            }}
          >
            {/* Recap statement */}
            <div style={{ zIndex: LAYERS.recapStatement }}>
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
                  variant="headlineM"
                  weight="bold"
                  align="center"
                  maxLines={4}
                />
              </BeatElement>
            </div>

            {/* CTA text — longform only */}
            {showCta && (
              <div style={{ zIndex: LAYERS.cta }}>
                <BeatElement
                  elementKey="ctaText"
                  beatState={getBeatState("ctaText")}
                  format={format}
                  theme={theme}
                >
                  <TextBlock
                    format={format}
                    theme={theme}
                    text={content.ctaText!}
                    variant="bodyM"
                    color={theme.textMuted}
                    align="center"
                  />
                </BeatElement>
              </div>
            )}

            {/* Divider + Brand label */}
            {showBrandLabel && (
              <div
                style={{
                  zIndex: LAYERS.brandLabel,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: sp(4),
                  width: "100%",
                  maxWidth: sp(10) * 10,
                }}
              >
                <BeatElement
                  elementKey="brandLabel"
                  beatState={getBeatState("brandLabel")}
                  format={format}
                  theme={theme}
                >
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: sp(4),
                      width: "100%",
                    }}
                  >
                    <DividerLine format={format} theme={theme} />
                    <LabelChip
                      format={format}
                      theme={theme}
                      label="Editorial Signal"
                      variant="signal"
                    />
                  </div>
                </BeatElement>
              </div>
            )}
          </div>
        </SafeArea>
      </div>

      {/* SubtitleLayer removed — Root HUD global layer principle. */}
    </AbsoluteFill>
  );
};

export default ClosingScene;
