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

  let first: LayoutPosition;
  let second: LayoutPosition;
  let center: LayoutPosition;

  if (isLandscape) {
    // Horizontal split
    const firstWidth = (safeWidth - resolvedGap) * ratio;
    const secondWidth = safeWidth - resolvedGap - firstWidth;

    first = {
      left: safeLeft,
      top: safeTop,
      width: firstWidth,
      height: safeHeight,
    };
    second = {
      left: safeLeft + firstWidth + resolvedGap,
      top: safeTop,
      width: secondWidth,
      height: safeHeight,
    };
    // Center position for dividers/unassigned elements (in the gap)
    center = {
      left: safeLeft + firstWidth,
      top: safeTop,
      width: resolvedGap,
      height: safeHeight,
    };
  } else {
    // Vertical split
    const firstHeight = (safeHeight - resolvedGap) * ratio;
    const secondHeight = safeHeight - resolvedGap - firstHeight;

    first = {
      left: safeLeft,
      top: safeTop,
      width: safeWidth,
      height: firstHeight,
    };
    second = {
      left: safeLeft,
      top: safeTop + firstHeight + resolvedGap,
      width: safeWidth,
      height: secondHeight,
    };
    center = {
      left: safeLeft,
      top: safeTop + firstHeight,
      width: safeWidth,
      height: resolvedGap,
    };
  }

  // Panel-aware positioning: group elements by panel prop
  return elements.map((el, i) => {
    const panel = el.props?.panel as string | undefined;
    if (panel === "left") return first;
    if (panel === "right") return second;
    if (panel === "center") return center;
    // Fallback: alternate between panels by index
    return i % 2 === 0 ? first : second;
  });
};
