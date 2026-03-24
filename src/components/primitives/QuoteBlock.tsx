import React from 'react'
import type { FormatKey, Theme } from '@/types'
import { typography } from '@/design/tokens/typography'
import { spacing } from '@/design/tokens/spacing'
import { useFormat } from '@/design/themes/useFormat'

interface QuoteBlockProps {
  format: FormatKey
  theme: Theme
  quoteText: string
  attribution?: string
  useSerif?: boolean
}

export const QuoteBlock: React.FC<QuoteBlockProps> = ({
  format,
  theme,
  quoteText,
  attribution,
  useSerif = false,
}) => {
  const { typeScale } = useFormat(format)

  const quoteFontFamily = useSerif
    ? typography.fontFamily.serif
    : typography.fontFamily.sans

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: spacing.scale[4],
      }}
    >
      {/* Decorative quote mark */}
      <span
        style={{
          fontFamily: typography.fontFamily.serif,
          fontSize: typeScale.headlineL * 1.5,
          lineHeight: 0.8,
          color: theme.signal,
          userSelect: 'none',
        }}
        aria-hidden="true"
      >
        {'\u201C'}
      </span>

      {/* Quote text */}
      <p
        style={{
          fontFamily: quoteFontFamily,
          fontSize: typeScale.headlineS,
          fontWeight: typography.fontWeight.medium,
          lineHeight: typography.lineHeight.relaxed,
          letterSpacing: typography.tracking.normal,
          color: theme.textStrong,
          margin: 0,
          paddingLeft: spacing.scale[3],
        }}
      >
        {quoteText}
      </p>

      {/* Attribution */}
      {attribution && (
        <span
          style={{
            fontFamily: typography.fontFamily.sans,
            fontSize: typeScale.bodyS,
            fontWeight: typography.fontWeight.regular,
            color: theme.textMuted,
            paddingLeft: spacing.scale[3],
          }}
        >
          {'\u2014 '}
          {attribution}
        </span>
      )}
    </div>
  )
}

export default QuoteBlock
