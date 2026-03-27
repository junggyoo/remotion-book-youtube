import React from "react";
import type { FormatKey, Theme } from "@/types";
import { typography } from "@/design/tokens/typography";
import { spacing } from "@/design/tokens/spacing";
import { useFormat } from "@/design/themes/useFormat";

interface QuoteBlockProps {
  format: FormatKey;
  theme: Theme;
  quoteText: string;
  attribution?: string;
  useSerif?: boolean;
}

export const QuoteBlock: React.FC<QuoteBlockProps> = ({
  format,
  theme,
  quoteText,
  attribution,
  useSerif = false,
}) => {
  const { typeScale } = useFormat(format);

  const quoteFontFamily = useSerif
    ? typography.fontFamily.serif
    : typography.fontFamily.sans;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: spacing.scale[4],
      }}
    >
      {/* Decorative opening quote mark */}
      <span
        style={{
          fontFamily: typography.fontFamily.serif,
          fontSize: typeScale.headlineL * 2,
          lineHeight: 0.6,
          color: theme.signal,
          userSelect: "none",
        }}
        aria-hidden="true"
      >
        {"\u201C"}
      </span>

      {/* Quote text */}
      <p
        style={{
          fontFamily: quoteFontFamily,
          fontSize: typeScale.headlineS,
          fontWeight: typography.fontWeight.medium,
          lineHeight: typography.lineHeight.relaxed,
          letterSpacing: typography.tracking.normal,
          color: theme.textStrong,
          margin: 0,
          paddingLeft: spacing.scale[4],
          paddingRight: spacing.scale[4],
        }}
      >
        {quoteText}
      </p>

      {/* Decorative closing quote mark */}
      <span
        style={{
          fontFamily: typography.fontFamily.serif,
          fontSize: typeScale.headlineL * 2,
          lineHeight: 0.6,
          color: theme.textMuted,
          userSelect: "none",
          alignSelf: "flex-end",
        }}
        aria-hidden="true"
      >
        {"\u201D"}
      </span>

      {/* Attribution */}
      {attribution && (
        <span
          style={{
            fontFamily: typography.fontFamily.sans,
            fontSize: typeScale.bodyS,
            fontWeight: typography.fontWeight.medium,
            letterSpacing: typography.tracking.wide,
            color: theme.textMuted,
            paddingLeft: spacing.scale[4],
          }}
        >
          {"\u2014 "}
          {attribution}
        </span>
      )}
    </div>
  );
};

export default QuoteBlock;
