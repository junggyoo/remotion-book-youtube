import React from "react";
import { AbsoluteFill } from "remotion";
import type { BaseSceneProps, ClosingContent, ElementBeatState } from "@/types";
import { sp } from "@/design/tokens/spacing";
import { radius } from "@/design/tokens/radius";
import { sceneInteriorTokens } from "@/design/tokens/shadow";
import { SafeArea } from "@/components/layout/SafeArea";
import { BeatElement } from "@/components/motion/BeatElement";
import { TextBlock } from "@/components/primitives/TextBlock";
import { LabelChip } from "@/components/primitives/LabelChip";
import { DividerLine } from "@/components/primitives/DividerLine";
import { AccentLine } from "@/components/primitives/AccentLine";
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
  const modeKey = theme.mode === "dark" ? "dark" : "light";
  const containerBgOpacity = sceneInteriorTokens.containerBgOpacity[modeKey];

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
          opacity: sceneInteriorTokens.textureOpacity,
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
              gap: sp(7),
            }}
          >
            {/* Recap statement — upgraded to headlineL */}
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
                  variant="headlineL"
                  weight="bold"
                  align="center"
                  maxLines={4}
                />
              </BeatElement>
            </div>

            {/* CTA text with container bg — longform only */}
            {showCta && (
              <div
                style={{
                  zIndex: LAYERS.cta,
                  backgroundColor: `rgba(${theme.mode === "dark" ? "255,255,255" : "0,0,0"}, ${containerBgOpacity})`,
                  borderRadius: radius.md,
                  padding: `${sp(4)}px ${sp(6)}px`,
                }}
              >
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
                    variant="bodyL"
                    color={theme.textMuted}
                    align="center"
                  />
                </BeatElement>
              </div>
            )}

            {/* Accent line + Divider + Brand label */}
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
                    <AccentLine format={format} theme={theme} />
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
