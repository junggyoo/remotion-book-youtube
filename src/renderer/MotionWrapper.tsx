// ============================================================
// MotionWrapper — VCL engine motion layer
// Wraps each VCL element with timing-based animation.
// Distinct from ArchitecturalReveal (preset scene path).
// ============================================================

import React from "react";
import { useCurrentFrame, useVideoConfig, interpolate } from "remotion";
import { applyPreset } from "@/design/tokens/motion";
import motionPresetsData from "@/design/tokens/motion-presets.json";
import type { MotionPresetKey } from "@/types";

const MAX_REVEAL_Y_OFFSET = motionPresetsData.defaults.maxRevealYOffset; // 24

export interface MotionTiming {
  delayFrames: number;
  durationFrames: number;
}

interface MotionWrapperProps {
  timing: MotionTiming;
  preset: MotionPresetKey;
  children: React.ReactNode;
}

export const MotionWrapper: React.FC<MotionWrapperProps> = ({
  timing,
  preset,
  children,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const adjustedFrame = Math.max(0, frame - timing.delayFrames);
  const progress = applyPreset(
    preset,
    adjustedFrame,
    fps,
    timing.durationFrames,
  );

  const opacity = interpolate(progress, [0, 1], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const translateY = interpolate(progress, [0, 1], [MAX_REVEAL_Y_OFFSET, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <div
      style={{
        opacity,
        transform: `translateY(${translateY}px)`,
        willChange: "opacity, transform",
      }}
    >
      {children}
    </div>
  );
};

export default MotionWrapper;
