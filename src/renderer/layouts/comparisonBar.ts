// ============================================================
// VCL Layout Engine — comparisonBar
// Horizontal bar chart layout.
// First element = headline at top, rest = horizontal bars below.
// ============================================================

import type { VCLElement, FormatConfig } from "@/types";
import type { LayoutFunction, LayoutPosition } from "./types";

interface ComparisonBarConfig {
  barMaxWidthRatio?: number;
}

export const comparisonBar: LayoutFunction = (
  elements: VCLElement[],
  formatConfig: FormatConfig,
  config?: Record<string, unknown>,
): LayoutPosition[] => {
  const { barMaxWidthRatio = 0.85 } = (config ?? {}) as ComparisonBarConfig;

  const { width, height, safeArea } = formatConfig;
  const safeLeft = safeArea.outerMarginX;
  const safeTop = safeArea.outerMarginY;
  const safeWidth = width - safeArea.outerMarginX * 2;
  const safeHeight = height - safeArea.outerMarginY * 2;

  if (elements.length === 0) return [];

  const positions: LayoutPosition[] = [];

  // First element: headline — full width, top 18% of safe area
  const headlineHeight = safeHeight * 0.18;
  positions.push({
    left: safeLeft,
    top: safeTop,
    width: safeWidth,
    height: headlineHeight,
  });

  // Remaining elements: horizontal bars in the bottom 75% of safe area
  const barCount = elements.length - 1;
  if (barCount === 0) return positions;

  const barsTop = safeTop + safeHeight * 0.25;
  const barsHeight = safeHeight * 0.75;
  const barHeight = barsHeight / barCount;
  const barWidth = safeWidth * barMaxWidthRatio;

  for (let i = 0; i < barCount; i++) {
    positions.push({
      left: safeLeft,
      top: barsTop + i * barHeight,
      width: barWidth,
      height: barHeight,
    });
  }

  return positions;
};
