import React from "react";
import type { FormatKey, Theme } from "@/types";
import { sp } from "@/design/tokens/spacing";

interface MatrixCellProps {
  format: FormatKey;
  theme: Theme;
  label?: string;
  content?: string;
  accent?: boolean;
  children?: React.ReactNode;
  style?: React.CSSProperties;
}

export const MatrixCell: React.FC<MatrixCellProps> = ({
  theme,
  label,
  content,
  accent = false,
  children,
  style,
}) => {
  const borderColor = accent ? theme.accent : theme.lineSubtle;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        padding: sp(4),
        borderRadius: 8,
        border: `1px solid ${borderColor}`,
        backgroundColor: theme.surfaceMuted,
        width: "100%",
        height: "100%",
        ...style,
      }}
    >
      {label && (
        <div
          style={{
            color: accent ? theme.accent : theme.textStrong,
            fontWeight: 700,
            marginBottom: sp(2),
          }}
        >
          {label}
        </div>
      )}
      {content && (
        <div style={{ color: theme.textMuted, textAlign: "center" }}>
          {content}
        </div>
      )}
      {children}
    </div>
  );
};

export default MatrixCell;
