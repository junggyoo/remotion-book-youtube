import React from "react";
import type {
  FormatKey,
  Theme,
  EvidenceCard as EvidenceCardData,
} from "@/types";
import { typography } from "@/design/tokens/typography";
import { spacing } from "@/design/tokens/spacing";
import { useFormat } from "@/design/themes/useFormat";
import { LabelChip } from "@/components/primitives/LabelChip";

const TYPE_LABELS: Record<EvidenceCardData["type"], string> = {
  statistic: "STATISTIC",
  quote: "QUOTE",
  case: "CASE STUDY",
  research: "RESEARCH",
};

const TYPE_CHIP_VARIANT: Record<EvidenceCardData["type"], "signal" | "accent"> =
  {
    statistic: "signal",
    quote: "accent",
    case: "accent",
    research: "signal",
  };

interface EvidenceCardProps {
  format: FormatKey;
  theme: Theme;
  data: EvidenceCardData;
}

export const EvidenceCard: React.FC<EvidenceCardProps> = ({
  format,
  theme,
  data,
}) => {
  const { typeScale } = useFormat(format);
  const isShorts = format === "shorts";

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: spacing.scale[3],
        backgroundColor: theme.surface,
        borderLeft: `3px solid ${theme.signal}`,
        borderRadius: spacing.scale[2],
        padding: isShorts ? spacing.scale[4] : spacing.scale[5],
      }}
    >
      {/* Type label chip */}
      <LabelChip
        format={format}
        theme={theme}
        label={TYPE_LABELS[data.type]}
        variant={TYPE_CHIP_VARIANT[data.type]}
      />

      {/* Main value */}
      <div
        style={{
          fontFamily: typography.fontFamily.sans,
          fontSize: isShorts ? typeScale.bodyL : typeScale.headlineS,
          fontWeight: typography.fontWeight.bold,
          color: theme.textStrong,
          lineHeight: typography.lineHeight.normal,
          letterSpacing: typography.tracking.normal,
        }}
      >
        {data.value}
      </div>

      {/* Caption */}
      {data.caption && (
        <div
          style={{
            fontFamily: typography.fontFamily.sans,
            fontSize: typeScale.bodyS,
            fontWeight: typography.fontWeight.regular,
            color: theme.textMuted,
            lineHeight: typography.lineHeight.normal,
            letterSpacing: typography.tracking.normal,
          }}
        >
          {data.caption}
        </div>
      )}

      {/* Source */}
      {data.source && (
        <div
          style={{
            fontFamily: typography.fontFamily.sans,
            fontSize: typeScale.caption,
            fontWeight: typography.fontWeight.regular,
            color: theme.textMuted,
            lineHeight: typography.lineHeight.normal,
            letterSpacing: typography.tracking.normal,
            opacity: 0.7,
          }}
        >
          {data.source}
        </div>
      )}
    </div>
  );
};

export default EvidenceCard;
