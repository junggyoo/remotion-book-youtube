// ============================================================
// VCL Layout Engine — gridN
// N-column grid with evenly sized cells within the safe area.
// ============================================================

import type { VCLElement, FormatConfig } from "@/types";
import type { LayoutFunction, LayoutPosition } from "./types";

interface GridNConfig {
  columns?: number;
  gap?: number;
}

export const gridN: LayoutFunction = (
  elements: VCLElement[],
  formatConfig: FormatConfig,
  config?: Record<string, unknown>,
): LayoutPosition[] => {
  const count = elements.length;
  if (count === 0) return [];

  const { columns, gap } = (config ?? {}) as GridNConfig;

  const resolvedColumns = columns ?? Math.ceil(Math.sqrt(count));
  const resolvedGap = gap ?? formatConfig.gutter;
  const rows = Math.ceil(count / resolvedColumns);

  const { width, height, safeArea } = formatConfig;
  const safeLeft = safeArea.outerMarginX;
  const safeTop = safeArea.outerMarginY;
  const safeWidth = width - safeArea.outerMarginX * 2;
  const safeHeight = height - safeArea.outerMarginY * 2;

  const cellWidth =
    (safeWidth - resolvedGap * (resolvedColumns - 1)) / resolvedColumns;
  const cellHeight = (safeHeight - resolvedGap * (rows - 1)) / rows;

  return elements.map((_, i) => {
    const col = i % resolvedColumns;
    const row = Math.floor(i / resolvedColumns);
    return {
      left: safeLeft + col * (cellWidth + resolvedGap),
      top: safeTop + row * (cellHeight + resolvedGap),
      width: cellWidth,
      height: cellHeight,
    };
  });
};
