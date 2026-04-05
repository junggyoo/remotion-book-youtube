// ============================================================
// VCL Layout Engine — pyramid
// Elements stacked in narrowing tiers (wide base → narrow top).
// For hierarchical concepts (Maslow, priority pyramids).
// ============================================================

import type { VCLElement, FormatConfig } from "@/types";
import type { LayoutFunction, LayoutPosition } from "./types";

interface PyramidConfig {
  /** If true, narrow at bottom (inverted pyramid). Default: false (wide at bottom). */
  inverted?: boolean;
  /** Vertical gap between tiers as ratio of safeHeight. Default: 0.02 */
  gapRatio?: number;
}

export const pyramid: LayoutFunction = (
  elements: VCLElement[],
  formatConfig: FormatConfig,
  config?: Record<string, unknown>,
): LayoutPosition[] => {
  const { inverted = false, gapRatio = 0.02 } = (config ?? {}) as PyramidConfig;

  const { width, height, safeArea } = formatConfig;
  const safeLeft = safeArea.outerMarginX;
  const safeTop = safeArea.outerMarginY;
  const safeWidth = width - safeArea.outerMarginX * 2;
  const safeHeight = height - safeArea.outerMarginY * 2;

  const count = elements.length;
  if (count === 0) return [];

  const gap = safeHeight * gapRatio;
  const totalGap = gap * (count - 1);
  const tierHeight = (safeHeight - totalGap) / count;

  return elements.map((_, i) => {
    // Width narrows from base to apex
    const tierIndex = inverted ? count - 1 - i : i;
    const widthRatio = 1.0 - (tierIndex / count) * 0.6; // base=100%, top=40%
    const tierWidth = safeWidth * widthRatio;
    const tierLeft = safeLeft + (safeWidth - tierWidth) / 2; // centered

    return {
      left: tierLeft,
      top: safeTop + i * (tierHeight + gap),
      width: tierWidth,
      height: tierHeight,
    };
  });
};
