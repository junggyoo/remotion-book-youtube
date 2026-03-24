// ============================================================
// VCL Layout Engine — splitTwo
// Horizontal split for longform, vertical split for shorts.
// ============================================================

import type { VCLElement, FormatConfig } from "@/types";
import type { LayoutFunction, LayoutPosition } from "./types";

interface SplitTwoConfig {
  ratio?: number;
  gap?: number;
}

export const splitTwo: LayoutFunction = (
  elements: VCLElement[],
  formatConfig: FormatConfig,
  config?: Record<string, unknown>,
): LayoutPosition[] => {
  const { ratio = 0.5, gap } = (config ?? {}) as SplitTwoConfig;
  const resolvedGap = gap ?? formatConfig.gutter;

  const { width, height, safeArea } = formatConfig;
  const safeLeft = safeArea.outerMarginX;
  const safeTop = safeArea.outerMarginY;
  const safeWidth = width - safeArea.outerMarginX * 2;
  const safeHeight = height - safeArea.outerMarginY * 2;

  const isLandscape = width >= height;

  const positions: LayoutPosition[] = [];

  if (isLandscape) {
    // Horizontal split
    const firstWidth = (safeWidth - resolvedGap) * ratio;
    const secondWidth = safeWidth - resolvedGap - firstWidth;

    const first: LayoutPosition = {
      left: safeLeft,
      top: safeTop,
      width: firstWidth,
      height: safeHeight,
    };
    const second: LayoutPosition = {
      left: safeLeft + firstWidth + resolvedGap,
      top: safeTop,
      width: secondWidth,
      height: safeHeight,
    };
    positions.push(first, second);
  } else {
    // Vertical split
    const firstHeight = (safeHeight - resolvedGap) * ratio;
    const secondHeight = safeHeight - resolvedGap - firstHeight;

    const first: LayoutPosition = {
      left: safeLeft,
      top: safeTop,
      width: safeWidth,
      height: firstHeight,
    };
    const second: LayoutPosition = {
      left: safeLeft,
      top: safeTop + firstHeight + resolvedGap,
      width: safeWidth,
      height: secondHeight,
    };
    positions.push(first, second);
  }

  // Clamp to actual element count (if fewer than 2 elements provided)
  return positions.slice(0, elements.length);
};
