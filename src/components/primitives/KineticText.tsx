import React from "react";
import { useCurrentFrame, useVideoConfig, interpolate } from "remotion";
import type { FormatKey, MotionPresetKey, Theme, TypeScale } from "@/types";
import { typography } from "@/design/tokens/typography";
import { useFormat } from "@/design/themes/useFormat";
import { applyPreset } from "@/design/tokens/motion";
import motionPresetsData from "@/design/tokens/motion-presets.json";

type TextVariant = keyof TypeScale;

const DEFAULT_STAGGER = motionPresetsData.defaults.staggerFrames; // 3
const MAX_REVEAL_Y = motionPresetsData.defaults.maxRevealYOffset; // 24

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
  /** Words to highlight with background wipe after entrance. */
  highlightWords?: string[];
  /** Frames after word entrance before highlight wipe starts. */
  highlightDelay?: number;
  /** Highlight background color. Defaults to theme.signal. */
  highlightColor?: string;
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
  motionPreset = "smooth",
  delay = 0,
  highlightWords,
  highlightDelay = 18,
  highlightColor,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { typeScale } = useFormat(format);

  const resolvedColor = color ?? theme.textStrong;
  const fontSize = typeScale[variant];
  const fontWeightValue = typography.fontWeight[weight];
  const words = text.split(" ");

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
        const progress = applyPreset(motionPreset, adjustedFrame, fps);

        const opacity = interpolate(progress, [0, 1], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });

        const translateY = interpolate(progress, [0, 1], [MAX_REVEAL_Y, 0], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });

        // Highlight wipe for matching words
        const isHighlighted = highlightWords && highlightWords.includes(word);
        let highlightScaleX = 0;
        if (isHighlighted) {
          const highlightStart = wordDelay + highlightDelay;
          const highlightFrame = Math.max(0, frame - highlightStart);
          highlightScaleX = applyPreset("snappy", highlightFrame, fps);
        }

        return (
          <span
            key={`${word}-${i}`}
            style={{
              display: "inline-block",
              opacity,
              transform: `translateY(${translateY}px)`,
              willChange: "opacity, transform",
              position: "relative",
            }}
          >
            {isHighlighted && (
              <span
                style={{
                  position: "absolute",
                  left: 0,
                  right: 0,
                  top: "50%",
                  height: "1.05em",
                  transform: `translateY(-50%) scaleX(${highlightScaleX})`,
                  transformOrigin: "left center",
                  backgroundColor: highlightColor ?? theme.signal,
                  borderRadius: "0.18em",
                  zIndex: 0,
                }}
              />
            )}
            <span style={{ position: "relative", zIndex: 1 }}>{word}</span>
          </span>
        );
      })}
    </div>
  );
};

export default KineticText;
