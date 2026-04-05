// ============================================================
// VCL Layout Engine — orbit
// All elements evenly distributed on an elliptical orbit (no center element).
// ============================================================

import type { VCLElement, FormatConfig } from "@/types";
import type { LayoutFunction, LayoutPosition } from "./types";

interface OrbitConfig {
  radiusXRatio?: number;
  radiusYRatio?: number;
  startAngleDeg?: number;
}

export const orbit: LayoutFunction = (
  elements: VCLElement[],
  formatConfig: FormatConfig,
  config?: Record<string, unknown>,
): LayoutPosition[] => {
  const {
    radiusXRatio = 0.38,
    radiusYRatio = 0.32,
    startAngleDeg = -90,
  } = (config ?? {}) as OrbitConfig;

  const { width, height, safeArea } = formatConfig;
  const safeLeft = safeArea.outerMarginX;
  const safeTop = safeArea.outerMarginY;
  const safeWidth = width - safeArea.outerMarginX * 2;
  const safeHeight = height - safeArea.outerMarginY * 2;

  const centerX = safeLeft + safeWidth / 2;
  const centerY = safeTop + safeHeight / 2;

  const radiusX = safeWidth * radiusXRatio;
  const radiusY = safeHeight * radiusYRatio;

  const count = elements.length;
  // Element size proportional to available space / count, capped
  const elementSize = Math.min(
    Math.min(safeWidth, safeHeight) / Math.max(count, 1),
    120,
  );

  const startAngleRad = (startAngleDeg * Math.PI) / 180;

  return elements.map((_, idx) => {
    const angle = startAngleRad + (idx / Math.max(count, 1)) * 2 * Math.PI;
    const x = centerX + radiusX * Math.cos(angle);
    const y = centerY + radiusY * Math.sin(angle);

    return {
      left: x - elementSize / 2,
      top: y - elementSize / 2,
      width: elementSize,
      height: elementSize,
    };
  });
};
