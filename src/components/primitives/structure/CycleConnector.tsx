import React from "react";
import type { FormatKey, Theme } from "@/types";

interface LayoutPosition {
  left: number;
  top: number;
  width: number;
  height: number;
}

interface CycleConnectorProps {
  format: FormatKey;
  theme: Theme;
  fromPos: LayoutPosition;
  toPos: LayoutPosition;
  centerX: number;
  centerY: number;
  radius: number;
  dotted?: boolean;
  style?: React.CSSProperties;
}

export const CycleConnector: React.FC<CycleConnectorProps> = ({
  theme,
  fromPos,
  toPos,
  radius,
  dotted = false,
  style,
}) => {
  const canvasWidth = (style?.width as number | undefined) ?? 1920;
  const canvasHeight = (style?.height as number | undefined) ?? 1080;

  const startX = fromPos.left + fromPos.width / 2;
  const startY = fromPos.top + fromPos.height / 2;
  const endX = toPos.left + toPos.width / 2;
  const endY = toPos.top + toPos.height / 2;

  const d = `M ${startX} ${startY} A ${radius} ${radius} 0 0 1 ${endX} ${endY}`;

  return (
    <svg
      viewBox={`0 0 ${canvasWidth} ${canvasHeight}`}
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
      }}
    >
      <path
        d={d}
        stroke={theme.lineSubtle}
        strokeWidth={2}
        strokeDasharray={dotted ? "6 4" : undefined}
        fill="none"
      />
    </svg>
  );
};

export default CycleConnector;
