// ============================================================
// VCL Layout Engine — splitTwo
// Horizontal split for longform, vertical split for shorts.
// ============================================================

import type { VCLElement, FormatConfig } from "@/types";
import type { LayoutFunction, LayoutPosition } from "./types";

interface SplitTwoConfig {
  ratio?: number;
  gap?: number;
}

export const splitTwo: LayoutFunction = (
  elements: VCLElement[],
  formatConfig: FormatConfig,
  config?: Record<string, unknown>,
): LayoutPosition[] => {
  const { ratio = 0.5, gap } = (config ?? {}) as SplitTwoConfig;
  const resolvedGap = gap ?? formatConfig.gutter;

  const { width, height, safeArea } = formatConfig;
  const safeLeft = safeArea.outerMarginX;
  const safeTop = safeArea.outerMarginY;
  const safeWidth = width - safeArea.outerMarginX * 2;
  const safeHeight = height - safeArea.outerMarginY * 2;

  const isLandscape = width >= height;

  let first: LayoutPosition;
  let second: LayoutPosition;
  let center: LayoutPosition;

  if (isLandscape) {
    // Horizontal split
    const firstWidth = (safeWidth - resolvedGap) * ratio;
    const secondWidth = safeWidth - resolvedGap - firstWidth;

    first = {
      left: safeLeft,
      top: safeTop,
      width: firstWidth,
      height: safeHeight,
    };
    second = {
      left: safeLeft + firstWidth + resolvedGap,
      top: safeTop,
      width: secondWidth,
      height: safeHeight,
    };
    // Center position for dividers/unassigned elements (in the gap)
    center = {
      left: safeLeft + firstWidth,
      top: safeTop,
      width: resolvedGap,
      height: safeHeight,
    };
  } else {
    // Vertical split
    const firstHeight = (safeHeight - resolvedGap) * ratio;
    const secondHeight = safeHeight - resolvedGap - firstHeight;

    first = {
      left: safeLeft,
      top: safeTop,
      width: safeWidth,
      height: firstHeight,
    };
    second = {
      left: safeLeft,
      top: safeTop + firstHeight + resolvedGap,
      width: safeWidth,
      height: secondHeight,
    };
    center = {
      left: safeLeft,
      top: safeTop + firstHeight,
      width: safeWidth,
      height: resolvedGap,
    };
  }

  // Group element indices by panel
  const leftIndices: number[] = [];
  const rightIndices: number[] = [];
  const centerIndices: number[] = [];
  const unassigned: number[] = [];

  elements.forEach((el, i) => {
    const panel = el.props?.panel as string | undefined;
    if (panel === "left") leftIndices.push(i);
    else if (panel === "right") rightIndices.push(i);
    else if (panel === "center") centerIndices.push(i);
    else unassigned.push(i);
  });

  // Distribute elements vertically within each panel (centered)
  const distributeInPanel = (
    panel: LayoutPosition,
    indices: number[],
  ): Map<number, LayoutPosition> => {
    const result = new Map<number, LayoutPosition>();
    const count = indices.length;
    if (count === 0) return result;

    const elementHeight = 80;
    const gap = 16;
    const totalHeight = count * elementHeight + (count - 1) * gap;
    const startY = panel.top + (panel.height - totalHeight) / 2;

    indices.forEach((idx, order) => {
      result.set(idx, {
        left: panel.left,
        top: startY + order * (elementHeight + gap),
        width: panel.width,
        height: elementHeight,
      });
    });

    return result;
  };

  const leftPositions = distributeInPanel(first, leftIndices);
  const rightPositions = distributeInPanel(second, rightIndices);
  const centerPositions = distributeInPanel(center, centerIndices);

  return elements.map((el, i) => {
    if (leftPositions.has(i)) return leftPositions.get(i)!;
    if (rightPositions.has(i)) return rightPositions.get(i)!;
    if (centerPositions.has(i)) return centerPositions.get(i)!;
    // Fallback: alternate between panels by index
    return i % 2 === 0 ? first : second;
  });
};
