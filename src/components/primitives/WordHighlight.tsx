import React from "react";
import { useCurrentFrame, useVideoConfig, interpolate } from "remotion";
import type { FormatKey, Theme, TypeScale } from "@/types";
import { typography } from "@/design/tokens/typography";
import { useFormat } from "@/design/themes/useFormat";
import { applyPreset } from "@/design/tokens/motion";
import motionPresetsData from "@/design/tokens/motion-presets.json";

type TextVariant = keyof TypeScale;

const DEFAULT_STAGGER = motionPresetsData.defaults.staggerFrames; // 3

interface WordHighlightProps {
  format: FormatKey;
  theme: Theme;
  text: string;
  highlightWords: string[];
  variant?: TextVariant;
  weight?: "regular" | "bold" | "semibold" | "medium";
  color?: string;
  highlightColor?: string;
  delay?: number;
  align?: "left" | "center" | "right";
}

/**
 * Parse text into segments of normal text and highlight words.
 * Matches words by exact space-delimited comparison.
 */
function parseSegments(
  text: string,
  highlightWords: string[],
): Array<{ word: string; highlighted: boolean }> {
  const highlightSet = new Set(highlightWords);
  return text.split(" ").map((word) => ({
    word,
    highlighted: highlightSet.has(word),
  }));
}

export const WordHighlight: React.FC<WordHighlightProps> = ({
  format,
  theme,
  text,
  highlightWords,
  variant = "headlineL",
  weight = "bold",
  color,
  highlightColor,
  delay = 0,
  align = "center",
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { typeScale } = useFormat(format);

  const resolvedColor = color ?? theme.textStrong;
  const resolvedHighlightColor = highlightColor ?? theme.signal;
  const fontSize = typeScale[variant];
  const fontWeightValue = typography.fontWeight[weight];

  const segments = parseSegments(text, highlightWords);

  // Compute staggered highlight index for multiple highlighted words
  let highlightIndex = 0;

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
      }}
    >
      {segments.map((seg, i) => {
        if (!seg.highlighted) {
          return (
            <span key={`${seg.word}-${i}`}>
              {seg.word}
              {i < segments.length - 1 ? " " : ""}
            </span>
          );
        }

        const staggerOffset = highlightIndex * DEFAULT_STAGGER;
        highlightIndex++;

        const adjustedFrame = Math.max(0, frame - delay - staggerOffset);
        const wipeProgress = applyPreset("snappy", adjustedFrame, fps);
        const scaleX = interpolate(wipeProgress, [0, 1], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });

        return (
          <React.Fragment key={`${seg.word}-${i}`}>
            <span style={{ position: "relative", display: "inline-block" }}>
              <span
                style={{
                  position: "absolute",
                  left: 0,
                  right: 0,
                  top: "50%",
                  height: "1.05em",
                  transform: `translateY(-50%) scaleX(${scaleX})`,
                  transformOrigin: "left center",
                  backgroundColor: resolvedHighlightColor,
                  borderRadius: "0.18em",
                  zIndex: 0,
                }}
              />
              <span style={{ position: "relative", zIndex: 1 }}>
                {seg.word}
              </span>
            </span>
            {i < segments.length - 1 ? " " : ""}
          </React.Fragment>
        );
      })}
    </div>
  );
};

export default WordHighlight;
