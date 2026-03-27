import React from "react";
import { useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";
import { motionPresets } from "@/design/tokens";

interface AccentBarProps {
  direction: "horizontal" | "vertical";
  length: number;
  color: string;
  startFrame: number;
}

/**
 * AccentBar — short accent-colored bar that scales in from zero.
 * Visual anchor signaling scene start or section break.
 */
export const AccentBar: React.FC<AccentBarProps> = ({
  direction,
  length,
  color,
  startFrame,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const THICKNESS = 3;

  const localFrame = Math.max(0, frame - startFrame);

  const progress = spring({
    frame: localFrame,
    fps,
    config: motionPresets.presets.snappy.config,
    durationInFrames: 12,
  });

  const scale = interpolate(progress, [0, 1], [0, 1]);
  const isHorizontal = direction === "horizontal";

  return (
    <div
      style={{
        width: isHorizontal ? length : THICKNESS,
        height: isHorizontal ? THICKNESS : length,
        backgroundColor: color,
        borderRadius: THICKNESS,
        transform: isHorizontal ? `scaleX(${scale})` : `scaleY(${scale})`,
        transformOrigin: isHorizontal ? "left center" : "center top",
      }}
    />
  );
};

export default AccentBar;
