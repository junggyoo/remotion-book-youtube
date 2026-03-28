// ============================================================
// VCL Layout Engine — timelineV
// Mirror of timelineH: elements stacked vertically along configurable axisX.
// ============================================================

import type { VCLElement, FormatConfig } from "@/types";
import type { LayoutFunction, LayoutPosition } from "./types";

interface TimelineVConfig {
  axisX?: number;
}

export const timelineV: LayoutFunction = (
  elements: VCLElement[],
  formatConfig: FormatConfig,
  config?: Record<string, unknown>,
): LayoutPosition[] => {
  const { axisX = 0.5 } = (config ?? {}) as TimelineVConfig;

  const { width, height, safeArea, gutter } = formatConfig;
  const safeLeft = safeArea.outerMarginX;
  const safeTop = safeArea.outerMarginY;
  const safeWidth = width - safeArea.outerMarginX * 2;
  const safeHeight = height - safeArea.outerMarginY * 2;

  const count = elements.length;
  if (count === 0) return [];

  const elementWidth = safeWidth * 0.3;
  const totalGap = gutter * (count - 1);
  const elementHeight = (safeHeight - totalGap) / count;

  const axisAbsX = safeLeft + safeWidth * axisX;
  const elementLeft = axisAbsX - elementWidth / 2;

  return elements.map((_, i) => ({
    left: elementLeft,
    top: safeTop + i * (elementHeight + gutter),
    width: elementWidth,
    height: elementHeight,
  }));
};
