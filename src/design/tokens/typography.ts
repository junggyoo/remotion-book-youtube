import designTokens from './design-tokens-draft.json'
import type { TypeScale } from '@/types'

export const typography = {
  fontFamily: designTokens.typography.fontFamily,
  fontWeight: designTokens.typography.fontWeight,
  tracking: designTokens.typography.tracking,
  lineHeight: designTokens.typography.lineHeight,
  scale: designTokens.typography.scale as {
    longform: TypeScale
    shorts: TypeScale
  },
} as const
