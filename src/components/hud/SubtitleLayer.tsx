import React from "react";
import { interpolate } from "remotion";
import type { FormatKey, Theme, SubtitleEntry } from "@/types";
import { useFormat } from "@/design/themes/useFormat";
import { zIndex } from "@/design/tokens/zIndex";
import { typography } from "@/design/tokens/typography";
import { spacing, sp } from "@/design/tokens/spacing";
import { radius } from "@/design/tokens/radius";

interface SubtitleLayerProps {
  format: FormatKey;
  theme: Theme;
  subtitles: SubtitleEntry[];
  currentFrame: number;
  transitionStyle?: "fade-slide" | "hard-cut";
}

export const SubtitleLayer: React.FC<SubtitleLayerProps> = ({
  format,
  theme,
  subtitles,
  currentFrame,
  transitionStyle = "fade-slide",
}) => {
  const { safeArea, typeScale } = useFormat(format);

  const activeSubtitle = subtitles.find(
    (s) => currentFrame >= s.startFrame && currentFrame <= s.endFrame,
  );

  if (!activeSubtitle) {
    return null;
  }

  // Animation: fade-slide (default) or hard-cut
  const useFadeSlide = transitionStyle !== "hard-cut";

  let opacity = 1;
  let translateY = 0;

  if (useFadeSlide && activeSubtitle) {
    const ENTER_FRAMES = 3; // matches LEAD_FRAMES from subtitleGen
    const EXIT_FRAMES = 6; // matches TRAIL_FRAMES from subtitleGen

    const framesIntoSubtitle = currentFrame - activeSubtitle.startFrame;
    const framesUntilEnd = activeSubtitle.endFrame - currentFrame;

    const enterProgress = Math.min(
      1,
      Math.max(0, framesIntoSubtitle / ENTER_FRAMES),
    );
    const exitProgress = Math.min(1, Math.max(0, framesUntilEnd / EXIT_FRAMES));
    const progress = Math.min(enterProgress, exitProgress);

    opacity = interpolate(progress, [0, 1], [0, 1], {
      extrapolateRight: "clamp",
    });
    translateY = interpolate(progress, [0, 1], [12, 0], {
      extrapolateRight: "clamp",
    });
  }

  return (
    <div
      style={{
        position: "absolute",
        left: safeArea.outerMarginX,
        right: safeArea.outerMarginX,
        bottom: safeArea.outerMarginY + sp(4),
        zIndex: zIndex.hud,
        display: "flex",
        justifyContent: "center",
        pointerEvents: "none",
        opacity,
        transform: `translateY(${translateY}px)`,
      }}
    >
      <div
        style={{
          backgroundColor: "rgba(0, 0, 0, 0.65)",
          borderRadius: radius.md,
          paddingTop: sp(2),
          paddingBottom: sp(2),
          paddingLeft: sp(4),
          paddingRight: sp(4),
          maxWidth: safeArea.bodyMaxWidth,
          textAlign: "center",
        }}
      >
        {activeSubtitle.lines.map((line, i) => (
          <div
            key={i}
            style={{
              color: theme.textStrong,
              fontSize: typeScale.bodyM,
              fontFamily: typography.fontFamily.sans,
              fontWeight: typography.fontWeight.medium,
              lineHeight: typography.lineHeight.normal,
              letterSpacing: typography.tracking.normal,
            }}
          >
            {line}
          </div>
        ))}
      </div>
    </div>
  );
};

export default SubtitleLayer;
