import React from "react";
import type { FormatKey, Theme } from "@/types";
import { typography } from "@/design/tokens/typography";
import { spacing } from "@/design/tokens/spacing";
import { useFormat } from "@/design/themes/useFormat";

interface TimelineNodeProps {
  format: FormatKey;
  theme: Theme;
  label: string;
  description?: string;
  highlighted?: boolean;
  index: number;
  style?: React.CSSProperties;
}

export const TimelineNode: React.FC<TimelineNodeProps> = ({
  format,
  theme,
  label,
  description,
  highlighted = false,
  style,
}) => {
  const { typeScale } = useFormat(format);
  const dotSize = 12;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: spacing.scale[2],
        ...style,
      }}
    >
      <div
        style={{
          width: dotSize,
          height: dotSize,
          borderRadius: dotSize / 2,
          backgroundColor: highlighted ? theme.accent : theme.signal,
          flexShrink: 0,
        }}
      />
      <span
        style={{
          fontFamily: typography.fontFamily.sans,
          fontSize: typeScale.bodyM,
          fontWeight: typography.fontWeight.semibold,
          color: theme.textStrong,
          textAlign: "center",
          lineHeight: typography.lineHeight.tight,
        }}
      >
        {label}
      </span>
      {description && (
        <span
          style={{
            fontFamily: typography.fontFamily.sans,
            fontSize: typeScale.bodyS,
            fontWeight: typography.fontWeight.regular,
            color: theme.textMuted,
            textAlign: "center",
            lineHeight: typography.lineHeight.normal,
          }}
        >
          {description}
        </span>
      )}
    </div>
  );
};

export default TimelineNode;
