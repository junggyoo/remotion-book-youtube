// ============================================================
// VCL Layout Engine — quoteHold
// Quote-focused layout: quote element gets priority width at 35% from top,
// attribution (caption) below with gutter, other elements stacked below.
// ============================================================

import type { VCLElement, FormatConfig } from "@/types";
import type { LayoutFunction, LayoutPosition } from "./types";

export const quoteHold: LayoutFunction = (
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

  const bodyMaxWidth = safeArea.bodyMaxWidth ?? safeWidth;

  // Find quote element by role
  const quoteIndex = elements.findIndex(
    (el) => (el.props as Record<string, unknown>)?.role === "quote",
  );
  const attributionIndex = elements.findIndex((el) => el.type === "caption");

  // If no role-based detection, fall back to center-focus-like stacking
  const hasQuoteElement = quoteIndex !== -1;

  if (!hasQuoteElement) {
    // Center-focus fallback: stack all elements centered
    const stackWidth = bodyMaxWidth;
    const stackLeft = safeLeft + (safeWidth - stackWidth) / 2;
    const elementHeight = safeHeight * 0.2;
    let offset = safeTop + safeHeight * 0.3;
    return elements.map(() => {
      const pos = {
        left: stackLeft,
        top: offset,
        width: stackWidth,
        height: elementHeight,
      };
      offset += elementHeight + gutter;
      return pos;
    });
  }

  const quoteWidth = bodyMaxWidth;
  const quoteHeight = safeHeight * 0.35;
  const quoteLeft = safeLeft + (safeWidth - quoteWidth) / 2;
  const quoteTop = safeTop + safeHeight * 0.35 - quoteHeight / 2;

  const attributionWidth = bodyMaxWidth * 0.6;
  const attributionHeight = safeHeight * 0.1;
  const attributionLeft = safeLeft + (safeWidth - attributionWidth) / 2;
  const attributionTop = quoteTop + quoteHeight + gutter;

  const otherHeight = safeHeight * 0.1;
  let otherOffset = attributionTop + attributionHeight + gutter;

  const positions: LayoutPosition[] = [];

  for (let i = 0; i < elements.length; i++) {
    if (i === quoteIndex) {
      positions.push({
        left: quoteLeft,
        top: quoteTop,
        width: quoteWidth,
        height: quoteHeight,
      });
    } else if (i === attributionIndex) {
      positions.push({
        left: attributionLeft,
        top: attributionTop,
        width: attributionWidth,
        height: attributionHeight,
      });
    } else {
      const otherWidth = bodyMaxWidth * 0.8;
      const otherLeft = safeLeft + (safeWidth - otherWidth) / 2;
      positions.push({
        left: otherLeft,
        top: otherOffset,
        width: otherWidth,
        height: otherHeight,
      });
      otherOffset += otherHeight + gutter;
    }
  }

  return positions;
};
