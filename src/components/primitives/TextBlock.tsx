import React, { useMemo } from "react";
import type { FormatKey, Theme, TypeScale } from "@/types";
import { typography } from "@/design/tokens/typography";
import { useFormat } from "@/design/themes/useFormat";
import { matchEmphasisTarget } from "@/utils/matchEmphasisTarget";

type TextVariant = keyof TypeScale;

interface TextBlockProps {
  format: FormatKey;
  theme: Theme;
  text: string;
  variant: TextVariant;
  weight?: keyof typeof typography.fontWeight;
  color?: string;
  align?: "left" | "center" | "right";
  maxLines?: number;
  /** P2-3: Words to highlight when spoken */
  emphasisWords?: string[];
  /** P2-3: Emphasis intensity 0~1 (from useNarrationSync) */
  emphasisProgress?: number;
}

const VARIANT_ORDER: TextVariant[] = [
  "headlineL",
  "headlineM",
  "headlineS",
  "bodyL",
  "bodyM",
  "bodyS",
];

function getReducedVariant(current: TextVariant): TextVariant {
  const idx = VARIANT_ORDER.indexOf(current);
  if (idx === -1 || idx >= VARIANT_ORDER.length - 1) {
    return "bodyS";
  }
  return VARIANT_ORDER[idx + 1];
}

export const TextBlock: React.FC<TextBlockProps> = ({
  format,
  theme,
  text,
  variant,
  weight = "regular",
  color,
  align = "left",
  maxLines,
  emphasisWords,
  emphasisProgress = 0,
}) => {
  const { typeScale } = useFormat(format);

  const resolvedColor = color ?? theme.textStrong;
  const fontSize = typeScale[variant];
  const fontWeightValue = typography.fontWeight[weight];

  const lineClampStyles: React.CSSProperties = useMemo(() => {
    if (!maxLines) return {};
    return {
      display: "-webkit-box",
      WebkitLineClamp: maxLines,
      WebkitBoxOrient: "vertical" as const,
      overflow: "hidden",
      textOverflow: "ellipsis",
    };
  }, [maxLines]);

  const reducedFontSize = useMemo(() => {
    if (!maxLines) return undefined;
    const reduced = getReducedVariant(variant);
    return typeScale[reduced];
  }, [maxLines, variant, typeScale]);

  // P2-3: emphasis active — split text and highlight matching words
  const hasEmphasis =
    emphasisWords && emphasisWords.length > 0 && emphasisProgress > 0;

  // hex → rgb for accent glow
  const accentGlow = useMemo(() => {
    if (!hasEmphasis) return "";
    const r = parseInt(theme.accent.slice(1, 3), 16);
    const g = parseInt(theme.accent.slice(3, 5), 16);
    const b = parseInt(theme.accent.slice(5, 7), 16);
    const glowOpacity = emphasisProgress * 0.5;
    return `0 0 ${8 * emphasisProgress}px rgba(${r},${g},${b},${glowOpacity})`;
  }, [hasEmphasis, theme.accent, emphasisProgress]);

  // Split text into segments for word-level emphasis rendering
  const segments = useMemo(() => {
    if (!hasEmphasis || !emphasisWords) return null;
    // Split preserving spaces
    return text.split(/(\s+)/).map((segment, i) => {
      if (/^\s+$/.test(segment))
        return { text: segment, isEmphasis: false, key: i };
      const matched = matchEmphasisTarget(segment, emphasisWords);
      return { text: segment, isEmphasis: matched !== null, key: i };
    });
  }, [text, emphasisWords, hasEmphasis]);

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
        ...lineClampStyles,
      }}
      data-fallback-font-size={reducedFontSize}
    >
      {segments
        ? segments.map((seg) =>
            seg.isEmphasis ? (
              <span
                key={seg.key}
                style={{
                  color: interpolateColor(
                    resolvedColor,
                    theme.accent,
                    emphasisProgress,
                  ),
                  textShadow: accentGlow,
                  transition: "color 0.1s, text-shadow 0.1s",
                }}
              >
                {seg.text}
              </span>
            ) : (
              <React.Fragment key={seg.key}>{seg.text}</React.Fragment>
            ),
          )
        : text}
    </div>
  );
};

/** Linear color interpolation between two hex colors */
function interpolateColor(from: string, to: string, t: number): string {
  const fr = parseInt(from.slice(1, 3), 16);
  const fg = parseInt(from.slice(3, 5), 16);
  const fb = parseInt(from.slice(5, 7), 16);
  const tr = parseInt(to.slice(1, 3), 16);
  const tg = parseInt(to.slice(3, 5), 16);
  const tb = parseInt(to.slice(5, 7), 16);
  const r = Math.round(fr + (tr - fr) * t);
  const g = Math.round(fg + (tg - fg) * t);
  const b = Math.round(fb + (tb - fb) * t);
  return `rgb(${r},${g},${b})`;
}

export default TextBlock;
