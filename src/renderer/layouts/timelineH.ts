// ============================================================
// VCL Layout Engine — timelineH
// Elements evenly spaced along a horizontal timeline axis.
// ============================================================

import type { VCLElement, FormatConfig } from "@/types";
import type { LayoutFunction, LayoutPosition } from "./types";

interface TimelineHConfig {
  axisY?: number;
}

export const timelineH: LayoutFunction = (
  elements: VCLElement[],
  formatConfig: FormatConfig,
  config?: Record<string, unknown>,
): LayoutPosition[] => {
  const { axisY = 0.5 } = (config ?? {}) as TimelineHConfig;

  const { width, height, safeArea, gutter } = formatConfig;
  const safeLeft = safeArea.outerMarginX;
  const safeTop = safeArea.outerMarginY;
  const safeWidth = width - safeArea.outerMarginX * 2;
  const safeHeight = height - safeArea.outerMarginY * 2;

  const count = elements.length;
  if (count === 0) return [];

  const elementHeight = safeHeight * 0.3;
  const totalGap = gutter * (count - 1);
  const elementWidth = (safeWidth - totalGap) / count;

  const axisAbsY = safeTop + safeHeight * axisY;
  const elementTop = axisAbsY - elementHeight / 2;

  return elements.map((_, i) => ({
    left: safeLeft + i * (elementWidth + gutter),
    top: elementTop,
    width: elementWidth,
    height: elementHeight,
  }));
};
