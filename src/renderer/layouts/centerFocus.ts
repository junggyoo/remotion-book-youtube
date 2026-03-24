// ============================================================
// VCL Layout Engine — centerFocus
// Primary element centered (~40% from top), secondaries stacked below.
// ============================================================

import type { VCLElement, FormatConfig } from "@/types";
import type { LayoutFunction, LayoutPosition } from "./types";

interface CenterFocusConfig {
  primaryIndex?: number;
}

export const centerFocus: LayoutFunction = (
  elements: VCLElement[],
  formatConfig: FormatConfig,
  config?: Record<string, unknown>,
): LayoutPosition[] => {
  const { primaryIndex = 0 } = (config ?? {}) as CenterFocusConfig;

  const { width, height, safeArea, gutter } = formatConfig;
  const safeLeft = safeArea.outerMarginX;
  const safeTop = safeArea.outerMarginY;
  const safeWidth = width - safeArea.outerMarginX * 2;
  const safeHeight = height - safeArea.outerMarginY * 2;

  const primaryWidth = safeWidth * 0.6;
  const primaryHeight = safeHeight * 0.3;
  // slightly above center — 40% from top of safe area
  const primaryTop = safeTop + safeHeight * 0.4 - primaryHeight / 2;
  const primaryLeft = safeLeft + (safeWidth - primaryWidth) / 2;

  const secondaryWidth = safeWidth * 0.5;
  const secondaryHeight = safeHeight * 0.12;

  const positions: LayoutPosition[] = [];
  let secondaryOffset = 0;

  for (let i = 0; i < elements.length; i++) {
    if (i === primaryIndex) {
      positions.push({
        left: primaryLeft,
        top: primaryTop,
        width: primaryWidth,
        height: primaryHeight,
      });
    } else {
      const secondaryLeft = safeLeft + (safeWidth - secondaryWidth) / 2;
      const secondaryTop =
        primaryTop + primaryHeight + gutter + secondaryOffset;
      positions.push({
        left: secondaryLeft,
        top: secondaryTop,
        width: secondaryWidth,
        height: secondaryHeight,
      });
      secondaryOffset += secondaryHeight + gutter;
    }
  }

  return positions;
};
