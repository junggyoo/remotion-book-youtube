import React from "react";
import type { FormatKey, Theme } from "@/types";
import { typography } from "@/design/tokens/typography";
import { spacing } from "@/design/tokens/spacing";
import { useFormat } from "@/design/themes/useFormat";

interface FlowStepProps {
  format: FormatKey;
  theme: Theme;
  stepNumber: number;
  title: string;
  detail?: string;
  style?: React.CSSProperties;
}

export const FlowStep: React.FC<FlowStepProps> = ({
  format,
  theme,
  stepNumber,
  title,
  detail,
  style,
}) => {
  const { typeScale } = useFormat(format);
  const badgeSize = format === "shorts" ? 32 : 40;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "row",
        alignItems: "flex-start",
        gap: spacing.scale[4],
        backgroundColor: theme.surface,
        padding: spacing.scale[4],
        borderRadius: 8,
        ...style,
      }}
    >
      <div
        style={{
          width: badgeSize,
          height: badgeSize,
          borderRadius: badgeSize / 2,
          backgroundColor: theme.signal,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <span
          style={{
            fontFamily: typography.fontFamily.mono,
            fontSize: typeScale.label,
            fontWeight: typography.fontWeight.bold,
            color: theme.bg,
            lineHeight: 1,
          }}
        >
          {stepNumber}
        </span>
      </div>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: spacing.scale[1],
        }}
      >
        <span
          style={{
            fontFamily: typography.fontFamily.sans,
            fontSize: typeScale.bodyL,
            fontWeight: typography.fontWeight.bold,
            color: theme.textStrong,
            lineHeight: typography.lineHeight.tight,
          }}
        >
          {title}
        </span>
        {detail && (
          <span
            style={{
              fontFamily: typography.fontFamily.sans,
              fontSize: typeScale.bodyS,
              fontWeight: typography.fontWeight.regular,
              color: theme.textMuted,
              lineHeight: typography.lineHeight.normal,
            }}
          >
            {detail}
          </span>
        )}
      </div>
    </div>
  );
};

export default FlowStep;
