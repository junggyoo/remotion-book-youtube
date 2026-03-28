// ============================================================
// VCL Layout Engine — Registry + Factory
// ============================================================

import type { VCLElement, FormatConfig, ChoreographyType } from "@/types";
import type { LayoutPosition, LayoutRegistration } from "./types";
import { centerFocus } from "./centerFocus";
import { splitTwo } from "./splitTwo";
import { radial } from "./radial";
import { timelineH } from "./timelineH";
import { gridN } from "./gridN";
import { timelineV } from "./timelineV";
import { quoteHold } from "./quoteHold";
import { bandDivider } from "./bandDivider";

export type {
  LayoutPosition,
  LayoutFunction,
  LayoutRegistration,
} from "./types";
export { centerFocus } from "./centerFocus";
export { splitTwo } from "./splitTwo";
export { radial } from "./radial";
export { timelineH } from "./timelineH";
export { gridN } from "./gridN";
export { timelineV } from "./timelineV";
export { quoteHold } from "./quoteHold";
export { bandDivider } from "./bandDivider";

// ---------------------------------------------------------------------------
// Layout Registry
// ---------------------------------------------------------------------------

export const layoutRegistry: Record<string, LayoutRegistration> = {
  "center-focus": {
    fn: centerFocus,
    compatibleChoreographies: ["reveal-sequence"],
  },
  "split-two": {
    fn: splitTwo,
    compatibleChoreographies: ["reveal-sequence", "split-reveal"],
  },
  "split-compare": {
    fn: splitTwo,
    compatibleChoreographies: ["reveal-sequence", "split-reveal"],
  },
  radial: {
    fn: radial,
    compatibleChoreographies: ["stagger-clockwise", "reveal-sequence"],
  },
  "timeline-h": {
    fn: timelineH,
    compatibleChoreographies: ["reveal-sequence", "path-trace"],
  },
  "grid-n": {
    fn: gridN,
    compatibleChoreographies: ["reveal-sequence", "stagger-clockwise"],
  },
  "grid-expand": {
    fn: gridN,
    compatibleChoreographies: ["reveal-sequence", "stagger-clockwise"],
  },
  "timeline-v": {
    fn: timelineV,
    compatibleChoreographies: ["reveal-sequence", "path-trace"],
  },
  "quote-hold": {
    fn: quoteHold,
    compatibleChoreographies: ["reveal-sequence"],
  },
  "band-divider": {
    fn: bandDivider,
    compatibleChoreographies: ["reveal-sequence"],
  },
};

// ---------------------------------------------------------------------------
// useLayoutEngine Factory
// ---------------------------------------------------------------------------

export interface LayoutEngine {
  resolve(elements: VCLElement[], formatConfig: FormatConfig): LayoutPosition[];
}

export function useLayoutEngine(
  layout: string,
  layoutConfig?: Record<string, unknown>,
  choreography?: string,
): LayoutEngine {
  const registration = layoutRegistry[layout];

  if (!registration) {
    console.warn(
      `[LayoutEngine] Unknown layout "${layout}". Falling back to "center-focus".`,
    );
    const fallback = layoutRegistry["center-focus"];
    return {
      resolve(elements, formatConfig) {
        return fallback.fn(elements, formatConfig, layoutConfig);
      },
    };
  }

  if (
    choreography &&
    registration.compatibleChoreographies &&
    !registration.compatibleChoreographies.includes(
      choreography as ChoreographyType,
    )
  ) {
    console.warn(
      `[LayoutEngine] Choreography "${choreography}" is not in the compatible list for layout "${layout}". ` +
        `Compatible: [${registration.compatibleChoreographies.join(", ")}]`,
    );
  }

  return {
    resolve(elements, formatConfig) {
      return registration.fn(elements, formatConfig, layoutConfig);
    },
  };
}
