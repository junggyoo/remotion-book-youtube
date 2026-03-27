import React from "react";
import { useCurrentFrame, useVideoConfig, interpolate, spring } from "remotion";
import type { FormatKey, MotionPresetKey, Theme, TypeScale } from "@/types";
import { typography } from "@/design/tokens/typography";
import { useFormat } from "@/design/themes/useFormat";
import { resolvePreset } from "@/design/tokens/motion";
import motionPresetsData from "@/design/tokens/motion-presets.json";

type TextVariant = keyof TypeScale;

const DEFAULT_STAGGER = motionPresetsData.defaults.staggerFrames; // 3
const EMPHASIS_SCALE = 1.05;

interface KineticTextProps {
  format: FormatKey;
  theme: Theme;
  text: string;
  variant: TextVariant;
  weight?: "regular" | "bold" | "semibold" | "medium";
  color?: string;
  align?: "left" | "center" | "right";
  staggerDelay?: number;
  motionPreset?: MotionPresetKey;
  delay?: number;
  /** Words to emphasize with accent color + scale. Exact match per word. */
  emphasisWord?: string | string[];
}

export const KineticText: React.FC<KineticTextProps> = ({
  format,
  theme,
  text,
  variant,
  weight = "bold",
  color,
  align = "center",
  staggerDelay = DEFAULT_STAGGER,
  motionPreset = "wordReveal",
  delay = 0,
  emphasisWord,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { typeScale } = useFormat(format);

  const resolvedColor = color ?? theme.textStrong;
  const fontSize = typeScale[variant];
  const fontWeightValue = typography.fontWeight[weight];
  const words = text.split(" ");

  // Read revealY from preset if available, otherwise use global default
  const presetRaw = motionPresetsData.presets[
    motionPreset as keyof typeof motionPresetsData.presets
  ] as Record<string, unknown> | undefined;
  const revealY =
    (presetRaw?.revealY as number) ??
    motionPresetsData.defaults.maxRevealYOffset;

  // Resolve spring config for the preset
  const resolvedConfig = resolvePreset(motionPreset);

  // Build emphasis set for O(1) lookup
  const emphasisSet = new Set(
    emphasisWord == null
      ? []
      : typeof emphasisWord === "string"
        ? [emphasisWord]
        : emphasisWord,
  );

  return (
    <div
      style={{
        fontFamily: typography.fontFamily.sans,
        fontSize,
        fontWeight: fontWeightValue,
        color: resolvedColor,
        textAlign: align,
        lineHeight: typography.lineHeight.normal,
        letterSpacing: typography.tracking.normal,
        display: "flex",
        flexWrap: "wrap",
        justifyContent:
          align === "center"
            ? "center"
            : align === "right"
              ? "flex-end"
              : "flex-start",
        gap: `0 ${fontSize * 0.3}px`,
      }}
    >
      {words.map((word, i) => {
        const wordDelay = delay + i * staggerDelay;
        const adjustedFrame = Math.max(0, frame - wordDelay);

        // Use spring directly with resolved config for consistent word entrance
        const progress =
          resolvedConfig.type === "spring" && resolvedConfig.springConfig
            ? spring({
                frame: adjustedFrame,
                fps,
                config: resolvedConfig.springConfig,
              })
            : interpolate(
                adjustedFrame,
                [0, resolvedConfig.durationRange[1]],
                [0, 1],
                {
                  extrapolateLeft: "clamp",
                  extrapolateRight: "clamp",
                },
              );

        const opacity = interpolate(progress, [0, 1], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });

        const translateY = interpolate(progress, [0, 1], [revealY, 0], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });

        const isEmphasis = emphasisSet.has(word);
        const scale = isEmphasis
          ? interpolate(progress, [0, 1], [1, EMPHASIS_SCALE], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            })
          : 1;

        return (
          <span
            key={`${word}-${i}`}
            style={{
              display: "inline-block",
              opacity,
              transform: `translateY(${translateY}px) scale(${scale})`,
              willChange: "opacity, transform",
              color: isEmphasis ? theme.accent : undefined,
              fontWeight: isEmphasis ? typography.fontWeight.bold : undefined,
            }}
          >
            {word}
          </span>
        );
      })}
    </div>
  );
};

export default KineticText;
