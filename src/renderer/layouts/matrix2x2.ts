// ============================================================
// VCL Layout Engine — matrix-2x2
// 4 equal quadrants for 2x2 comparison grids.
// (urgent/important, pros/cons matrix, etc.)
// ============================================================

import type { VCLElement, FormatConfig } from "@/types";
import type { LayoutFunction, LayoutPosition } from "./types";

interface Matrix2x2Config {
  /** Gap between quadrants in px. Default: uses formatConfig.gutter */
  gap?: number;
}

export const matrix2x2: LayoutFunction = (
  elements: VCLElement[],
  formatConfig: FormatConfig,
  config?: Record<string, unknown>,
): LayoutPosition[] => {
  const { width, height, safeArea, gutter } = formatConfig;
  const gap = (config as Matrix2x2Config)?.gap ?? gutter;

  const safeLeft = safeArea.outerMarginX;
  const safeTop = safeArea.outerMarginY;
  const safeWidth = width - safeArea.outerMarginX * 2;
  const safeHeight = height - safeArea.outerMarginY * 2;

  const cellWidth = (safeWidth - gap) / 2;
  const cellHeight = (safeHeight - gap) / 2;

  // Grid positions: top-left, top-right, bottom-left, bottom-right
  const gridPositions = [
    { col: 0, row: 0 },
    { col: 1, row: 0 },
    { col: 0, row: 1 },
    { col: 1, row: 1 },
  ];

  return elements.map((_, i) => {
    const pos = gridPositions[i % 4];
    return {
      left: safeLeft + pos.col * (cellWidth + gap),
      top: safeTop + pos.row * (cellHeight + gap),
      width: cellWidth,
      height: cellHeight,
    };
  });
};
