import React from "react";
import { useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";
import { motionPresets } from "@/design/tokens";

interface AccentUnderlineProps {
  width: number;
  color: string;
  startFrame: number;
  drawDuration?: number;
  strokeWidth?: number;
}

/**
 * AccentUnderline — SVG line that draws on from left to right.
 * Uses strokeDashoffset animation with snappy preset timing.
 */
export const AccentUnderline: React.FC<AccentUnderlineProps> = ({
  width,
  color,
  startFrame,
  drawDuration = 15,
  strokeWidth = 3,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const localFrame = Math.max(0, frame - startFrame);

  const progress = spring({
    frame: localFrame,
    fps,
    config: motionPresets.presets.snappy.config,
    durationInFrames: drawDuration,
  });

  const dashOffset = interpolate(progress, [0, 1], [width, 0]);

  return (
    <svg
      width={width}
      height={strokeWidth}
      viewBox={`0 0 ${width} ${strokeWidth}`}
      style={{ display: "block", overflow: "visible" }}
    >
      <line
        x1={0}
        y1={strokeWidth / 2}
        x2={width}
        y2={strokeWidth / 2}
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={width}
        strokeDashoffset={dashOffset}
      />
    </svg>
  );
};

export default AccentUnderline;
