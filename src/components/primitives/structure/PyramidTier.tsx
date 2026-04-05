import React from "react";
import type { FormatKey, Theme } from "@/types";
import { sp } from "@/design/tokens/spacing";

interface PyramidTierProps {
  format: FormatKey;
  theme: Theme;
  label: string;
  tierIndex: number;
  totalTiers: number;
  accent?: boolean;
  children?: React.ReactNode;
  style?: React.CSSProperties;
}

export const PyramidTier: React.FC<PyramidTierProps> = ({
  theme,
  label,
  tierIndex,
  totalTiers,
  accent = false,
  children,
  style,
}) => {
  // Opacity gradient: top tier is strongest, bottom is lightest
  const opacityBase = 0.06;
  const opacityStep = 0.03;
  const bgOpacity = opacityBase + (totalTiers - 1 - tierIndex) * opacityStep;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        padding: sp(3),
        borderRadius: 6,
        backgroundColor: accent ? theme.accent : theme.surfaceMuted,
        opacity: accent ? 1 : undefined,
        width: "100%",
        height: "100%",
        position: "relative",
        ...style,
      }}
    >
      {/* Background tint layer */}
      {!accent && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: 6,
            backgroundColor: theme.accent,
            opacity: bgOpacity,
            pointerEvents: "none",
          }}
        />
      )}
      <div
        style={{
          color: accent ? theme.bg : theme.textStrong,
          fontWeight: 700,
          textAlign: "center",
          position: "relative",
          zIndex: 1,
        }}
      >
        {label}
      </div>
      {children}
    </div>
  );
};

export default PyramidTier;
