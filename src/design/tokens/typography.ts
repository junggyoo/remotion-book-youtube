import designTokens from "./design-tokens-draft.json";
import type { TypeScale } from "@/types";

export const typography = {
  fontFamily: designTokens.typography.fontFamily,
  fontWeight: designTokens.typography.fontWeight,
  tracking: designTokens.typography.tracking,
  lineHeight: designTokens.typography.lineHeight,
  scale: designTokens.typography.scale as {
    longform: TypeScale;
    shorts: TypeScale;
  },
} as const;

/**
 * Typography hierarchy tokens — semantic { fontSize, fontWeight, lineHeight } tiers.
 * Use for direct style application when a full TypeScale lookup is not needed.
 */
export const typographyHierarchy = {
  headlineXL: { fontSize: 64, fontWeight: 800, lineHeight: 1.15 },
  headlineL: { fontSize: 48, fontWeight: 700, lineHeight: 1.2 },
  headlineM: { fontSize: 36, fontWeight: 700, lineHeight: 1.25 },
  bodyL: { fontSize: 24, fontWeight: 400, lineHeight: 1.5 },
  bodyM: { fontSize: 20, fontWeight: 400, lineHeight: 1.5 },
} as const;
