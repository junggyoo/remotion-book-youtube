import React from "react";
import { useCurrentFrame, useVideoConfig, interpolate } from "remotion";
import { applyPreset } from "@/design/tokens/motion";
import motionPresetsData from "@/design/tokens/motion-presets.json";
import type { FormatKey, Theme, MotionPresetKey } from "@/types";

const MAX_REVEAL_Y_OFFSET = motionPresetsData.defaults.maxRevealYOffset; // 24

interface ArchitecturalRevealProps {
  format: FormatKey;
  theme: Theme;
  children: React.ReactNode;
  preset?: MotionPresetKey;
  delay?: number;
  translateY?: number;
}

export const ArchitecturalReveal: React.FC<ArchitecturalRevealProps> = ({
  format,
  theme,
  children,
  preset = "heavy",
  delay = 0,
  translateY: translateYProp,
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  const defaultTranslateY =
    motionPresetsData.motionRoles.typography.architecturalReveal.translateY; // 22
  const targetTranslateY = Math.min(
    translateYProp ?? defaultTranslateY,
    MAX_REVEAL_Y_OFFSET,
  );

  const adjustedFrame = Math.max(0, frame - delay);
  const progress = applyPreset(preset, adjustedFrame, fps, durationInFrames);

  const opacity = interpolate(progress, [0, 1], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const currentTranslateY = interpolate(
    progress,
    [0, 1],
    [targetTranslateY, 0],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    },
  );
  const blur = interpolate(progress, [0, 0.6], [6, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <div
      style={{
        opacity,
        transform: `translateY(${currentTranslateY}px)`,
        filter: blur > 0.1 ? `blur(${blur}px)` : undefined,
        willChange: "opacity, transform, filter",
      }}
    >
      {children}
    </div>
  );
};

export default ArchitecturalReveal;
