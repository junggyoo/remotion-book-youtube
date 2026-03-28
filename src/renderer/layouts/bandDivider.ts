// ============================================================
// VCL Layout Engine — bandDivider
// Chapter divider layout: first element is a thin full-width band at 30% from
// top; remaining elements stack below in a narrower centered column.
// ============================================================

import type { VCLElement, FormatConfig } from "@/types";
import type { LayoutFunction, LayoutPosition } from "./types";

export const bandDivider: LayoutFunction = (
  elements: VCLElement[],
  formatConfig: FormatConfig,
  _config?: Record<string, unknown>,
): LayoutPosition[] => {
  if (elements.length === 0) return [];

  const { width, height, safeArea, gutter } = formatConfig;
  const safeLeft = safeArea.outerMarginX;
  const safeTop = safeArea.outerMarginY;
  const safeWidth = width - safeArea.outerMarginX * 2;
  const safeHeight = height - safeArea.outerMarginY * 2;

  const positions: LayoutPosition[] = [];

  // First element: full-width thin divider band at 30% from top
  const dividerHeight = safeHeight * 0.04;
  const dividerTop = safeTop + safeHeight * 0.3;
  positions.push({
    left: safeLeft,
    top: dividerTop,
    width: safeWidth,
    height: dividerHeight,
  });

  if (elements.length === 1) return positions;

  // Remaining elements: narrower column (70% of safeWidth), centered, stacked below
  const columnWidth = safeWidth * 0.7;
  const columnLeft = safeLeft + (safeWidth - columnWidth) / 2;
  const elementHeight = safeHeight * 0.2;
  let offset = dividerTop + dividerHeight + gutter;

  for (let i = 1; i < elements.length; i++) {
    positions.push({
      left: columnLeft,
      top: offset,
      width: columnWidth,
      height: elementHeight,
    });
    offset += elementHeight + gutter;
  }

  return positions;
};
