import React from "react";
import { AbsoluteFill, useCurrentFrame, interpolate } from "remotion";
import type {
  BaseSceneProps,
  TransitionContent,
  ElementBeatState,
} from "@/types";
import { sp } from "@/design/tokens/spacing";
import { SafeArea } from "@/components/layout/SafeArea";
import { BeatElement } from "@/components/motion/BeatElement";
import { LabelChip } from "@/components/primitives/LabelChip";
import { TextBlock } from "@/components/primitives/TextBlock";
import { useBeatTimeline } from "@/hooks/useBeatTimeline";
import { resolveBeats } from "@/pipeline/resolveBeats";

// zIndex layers
const LAYERS = {
  background: 0,
  transition: 80,
  label: 85,
} as const;

function buildWildcardStagger(
  hasLabel: boolean,
): Record<string, ElementBeatState> {
  return {
    label: {
      visibility: "entering",
      entryFrame: 6,
      emphasis: false,
      motionPreset: "dramatic",
    },
    brandMark: {
      visibility: "entering",
      entryFrame: hasLabel ? 12 : 6,
      emphasis: false,
      motionPreset: "dramatic",
    },
    labelContainer: {
      visibility: "entering",
      entryFrame: 0,
      emphasis: false,
      motionPreset: "dramatic",
    },
  };
}

interface TransitionSceneProps extends BaseSceneProps {
  content: TransitionContent;
}

export const TransitionScene: React.FC<TransitionSceneProps> = ({
  format,
  theme,
  from,
  durationFrames,
  content,
  beats,
}) => {
  const frame = useCurrentFrame();
  const isShorts = format === "shorts";
  const style = content.style ?? "fade";

  // Beat resolution
  const resolvedBeats = resolveBeats(
    {
      id: `transition-${from}`,
      type: "transition",
      beats,
      narrationText: "",
    },
    format,
  );
  const { elementStates } = useBeatTimeline(resolvedBeats, durationFrames);
  const isWildcard =
    resolvedBeats.length === 1 && resolvedBeats[0].activates.includes("*");

  const wildcardStagger = buildWildcardStagger(!!content.label);

  const getBeatState = (key: string): ElementBeatState | undefined => {
    if (isWildcard) return wildcardStagger[key];
    return elementStates.get(key);
  };

  // --- Overlay animations (NOT beat-controlled — scene-level continuous transitions) ---

  const fadeOpacity = interpolate(
    frame,
    [0, durationFrames * 0.25, durationFrames * 0.75, durationFrames],
    [0, 1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  const wipeProgress = interpolate(frame, [0, durationFrames * 0.6], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const zoomProgress = interpolate(frame, [0, durationFrames * 0.5], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const overlayStyle: React.CSSProperties = (() => {
    if (style === "wipe") {
      return {
        position: "absolute",
        inset: 0,
        zIndex: LAYERS.transition,
        backgroundColor: theme.surfaceMuted,
        clipPath: `inset(0 ${100 - wipeProgress * 100}% 0 0)`,
      };
    }
    if (style === "zoom") {
      return {
        position: "absolute",
        inset: 0,
        zIndex: LAYERS.transition,
        backgroundColor: theme.surfaceMuted,
        clipPath: `circle(${zoomProgress * 100}% at 50% 50%)`,
      };
    }
    // fade (default)
    return {
      position: "absolute",
      inset: 0,
      zIndex: LAYERS.transition,
      backgroundColor: theme.surfaceMuted,
      opacity: fadeOpacity,
    };
  })();

  const labelContent = (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: sp(3),
      }}
    >
      {content.label && (
        <BeatElement
          elementKey="label"
          beatState={getBeatState("label")}
          format={format}
          theme={theme}
        >
          <TextBlock
            format={format}
            theme={theme}
            text={content.label}
            variant="bodyM"
            color={theme.textMuted}
            align="center"
          />
        </BeatElement>
      )}

      {content.showBrandMark && (
        <BeatElement
          elementKey="brandMark"
          beatState={getBeatState("brandMark")}
          format={format}
          theme={theme}
        >
          <LabelChip
            format={format}
            theme={theme}
            label="Editorial Signal"
            variant="signal"
          />
        </BeatElement>
      )}
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

      {/* Transition overlay — scene-level animation, NOT beat-controlled */}
      <div style={overlayStyle} />

      {/* Label + brand mark */}
      {(content.label || content.showBrandMark) && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            zIndex: LAYERS.label,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <SafeArea format={format} theme={theme}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                height: "100%",
              }}
            >
              {style === "zoom" ? (
                <BeatElement
                  elementKey="labelContainer"
                  beatState={getBeatState("labelContainer")}
                  format={format}
                  theme={theme}
                  motionType="scale"
                  scaleFrom={0.95}
                >
                  {labelContent}
                </BeatElement>
              ) : (
                labelContent
              )}
            </div>
          </SafeArea>
        </div>
      )}

      {/* SubtitleLayer removed — Root HUD global layer principle. */}
    </AbsoluteFill>
  );
};

export default TransitionScene;
