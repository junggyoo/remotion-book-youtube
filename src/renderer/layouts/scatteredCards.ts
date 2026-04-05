// ============================================================
// VCL Layout Engine — scatteredCards
// Grid-based layout with deterministic pseudo-random offsets for organic feel.
// ============================================================

import type { VCLElement, FormatConfig } from "@/types";
import type { LayoutFunction, LayoutPosition } from "./types";

interface ScatteredCardsConfig {
  maxOffsetRatio?: number;
  maxRotationDeg?: number;
}

export const scatteredCards: LayoutFunction = (
  elements: VCLElement[],
  formatConfig: FormatConfig,
  config?: Record<string, unknown>,
): LayoutPosition[] => {
  const { maxOffsetRatio = 0.03, maxRotationDeg = 3 } = (config ??
    {}) as ScatteredCardsConfig;

  const { width, height, safeArea } = formatConfig;
  const safeLeft = safeArea.outerMarginX;
  const safeTop = safeArea.outerMarginY;
  const safeWidth = width - safeArea.outerMarginX * 2;
  const safeHeight = height - safeArea.outerMarginY * 2;

  const count = elements.length;
  const cols = count >= 5 ? 3 : 2;
  const rows = Math.ceil(count / cols);

  const cellWidth = safeWidth / cols;
  const cellHeight = safeHeight / rows;
  const gap = Math.min(cellWidth, cellHeight) * 0.06;
  const cardWidth = cellWidth - gap;
  const cardHeight = cellHeight - gap;

  const maxOffsetX = safeWidth * maxOffsetRatio;
  const maxOffsetY = safeHeight * maxOffsetRatio;

  return elements.map((_, idx) => {
    const col = idx % cols;
    const row = Math.floor(idx / cols);

    const baseLeft = safeLeft + col * cellWidth + gap / 2;
    const baseTop = safeTop + row * cellHeight + gap / 2;

    // Deterministic pseudo-random offsets
    const offsetX = Math.sin(idx * 7.3) * maxOffsetX;
    const offsetY = Math.sin(idx * 7.3 + 1.5) * maxOffsetY;

    // Rotation stored in props context but not used for position calculation
    // maxRotationDeg is available for consumers: Math.sin(idx * 7.3 + 3.0) * maxRotationDeg
    void maxRotationDeg;

    return {
      left: baseLeft + offsetX,
      top: baseTop + offsetY,
      width: cardWidth,
      height: cardHeight,
    };
  });
};
