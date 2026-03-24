import React, { useMemo } from 'react'
import type { FormatKey, Theme, TypeScale } from '@/types'
import { typography } from '@/design/tokens/typography'
import { useFormat } from '@/design/themes/useFormat'

type TextVariant = keyof TypeScale

interface TextBlockProps {
  format: FormatKey
  theme: Theme
  text: string
  variant: TextVariant
  weight?: keyof typeof typography.fontWeight
  color?: string
  align?: 'left' | 'center' | 'right'
  maxLines?: number
}

const VARIANT_ORDER: TextVariant[] = [
  'headlineL',
  'headlineM',
  'headlineS',
  'bodyL',
  'bodyM',
  'bodyS',
]

function getReducedVariant(current: TextVariant): TextVariant {
  const idx = VARIANT_ORDER.indexOf(current)
  if (idx === -1 || idx >= VARIANT_ORDER.length - 1) {
    return 'bodyS'
  }
  return VARIANT_ORDER[idx + 1]
}

export const TextBlock: React.FC<TextBlockProps> = ({
  format,
  theme,
  text,
  variant,
  weight = 'regular',
  color,
  align = 'left',
  maxLines,
}) => {
  const { typeScale } = useFormat(format)

  const resolvedColor = color ?? theme.textStrong
  const fontSize = typeScale[variant]
  const fontWeightValue = typography.fontWeight[weight]

  const lineClampStyles: React.CSSProperties = useMemo(() => {
    if (!maxLines) return {}
    return {
      display: '-webkit-box',
      WebkitLineClamp: maxLines,
      WebkitBoxOrient: 'vertical' as const,
      overflow: 'hidden',
      textOverflow: 'ellipsis',
    }
  }, [maxLines])

  const reducedFontSize = useMemo(() => {
    if (!maxLines) return undefined
    const reduced = getReducedVariant(variant)
    return typeScale[reduced]
  }, [maxLines, variant, typeScale])

  return (
    <div
      style={{
        fontFamily: typography.fontFamily.sans,
        fontSize,
        fontWeight: fontWeightValue,
        color: resolvedColor,
        textAlign: align,
        lineHeight: typography.lineHeight.normal,
        letterSpacing: typography.tracking.normal,
        ...lineClampStyles,
      }}
      data-fallback-font-size={reducedFontSize}
    >
      {text}
    </div>
  )
}

export default TextBlock
