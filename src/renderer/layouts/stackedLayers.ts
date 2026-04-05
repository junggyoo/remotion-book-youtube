// ============================================================
// VCL Layout Engine — stacked-layers
// Full-width horizontal bands stacked vertically.
// For layered concepts (tech stacks, abstraction layers).
// ============================================================

import type { VCLElement, FormatConfig } from "@/types";
import type { LayoutFunction, LayoutPosition } from "./types";

interface StackedLayersConfig {
  /** Vertical overlap between layers as ratio of layer height. Default: 0.05 */
  overlapRatio?: number;
}

export const stackedLayers: LayoutFunction = (
  elements: VCLElement[],
  formatConfig: FormatConfig,
  config?: Record<string, unknown>,
): LayoutPosition[] => {
  const { overlapRatio = 0.05 } = (config ?? {}) as StackedLayersConfig;

  const { width, safeArea, height } = formatConfig;
  const safeLeft = safeArea.outerMarginX;
  const safeTop = safeArea.outerMarginY;
  const safeWidth = width - safeArea.outerMarginX * 2;
  const safeHeight = height - safeArea.outerMarginY * 2;

  const count = elements.length;
  if (count === 0) return [];

  // Each layer's height, accounting for overlap
  const layerHeight = safeHeight / (count - (count - 1) * overlapRatio);
  const step = layerHeight * (1 - overlapRatio);

  return elements.map((_, i) => ({
    left: safeLeft,
    top: safeTop + i * step,
    width: safeWidth,
    height: layerHeight,
  }));
};
