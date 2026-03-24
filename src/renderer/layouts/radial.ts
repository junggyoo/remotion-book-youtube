// ============================================================
// VCL Layout Engine — radial
// Center element + remaining elements distributed in a circle.
// Critical for SAVERS wheel and similar radial visualizations.
// ============================================================

import type { VCLElement, FormatConfig } from "@/types";
import type { LayoutFunction, LayoutPosition } from "./types";

interface RadialConfig {
  centerIndex?: number;
  radiusRatio?: number;
  startAngleDeg?: number;
}

export const radial: LayoutFunction = (
  elements: VCLElement[],
  formatConfig: FormatConfig,
  config?: Record<string, unknown>,
): LayoutPosition[] => {
  const {
    centerIndex = 0,
    radiusRatio = 0.35,
    startAngleDeg = -90,
  } = (config ?? {}) as RadialConfig;

  const { width, height, safeArea } = formatConfig;
  const safeLeft = safeArea.outerMarginX;
  const safeTop = safeArea.outerMarginY;
  const safeWidth = width - safeArea.outerMarginX * 2;
  const safeHeight = height - safeArea.outerMarginY * 2;

  const centerX = safeLeft + safeWidth / 2;
  const centerY = safeTop + safeHeight / 2;

  const radius = Math.min(safeWidth, safeHeight) * radiusRatio;
  const elementSize = radius * 0.4;

  const radialElements = elements.filter((_, i) => i !== centerIndex);
  const count = radialElements.length;

  const positions: LayoutPosition[] = new Array(elements.length);

  // Place center element
  positions[centerIndex] = {
    left: centerX - elementSize / 2,
    top: centerY - elementSize / 2,
    width: elementSize,
    height: elementSize,
  };

  // Place radial elements evenly around circle
  const startAngleRad = (startAngleDeg * Math.PI) / 180;

  radialElements.forEach((_, idx) => {
    const angle = startAngleRad + (idx / Math.max(count, 1)) * 2 * Math.PI;
    const x = centerX + radius * Math.cos(angle);
    const y = centerY + radius * Math.sin(angle);

    // Map back to original element index (skip centerIndex)
    const originalIndex = idx < centerIndex ? idx : idx + 1;
    positions[originalIndex] = {
      left: x - elementSize / 2,
      top: y - elementSize / 2,
      width: elementSize,
      height: elementSize,
    };
  });

  return positions;
};
