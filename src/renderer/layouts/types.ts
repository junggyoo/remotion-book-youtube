// ============================================================
// VCL Layout Engine — Shared Types
// ============================================================

import type { VCLElement, FormatConfig, ChoreographyType } from "@/types";

export interface LayoutPosition {
  left: number;
  top: number;
  width: number;
  height: number;
}

export type LayoutFunction = (
  elements: VCLElement[],
  formatConfig: FormatConfig,
  config?: Record<string, unknown>,
) => LayoutPosition[];

export interface LayoutRegistration {
  fn: LayoutFunction;
  compatibleChoreographies?: ChoreographyType[];
}
