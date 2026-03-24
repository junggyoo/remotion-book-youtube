import designTokens from './design-tokens-draft.json'

export const spacing = {
  base: designTokens.spacing.base,
  scale: designTokens.spacing.scale,
} as const

/**
 * Helper to retrieve a spacing value by index.
 * `sp(4)` → `spacing.scale[4]` → 16
 */
export function sp(index: number): number {
  return spacing.scale[index]
}
