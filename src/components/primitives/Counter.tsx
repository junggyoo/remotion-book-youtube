import React from 'react'
import { useCurrentFrame, interpolate } from 'remotion'
import type { FormatKey, Theme } from '@/types'
import { typography } from '@/design/tokens/typography'
import { useFormat } from '@/design/themes/useFormat'

interface CounterProps {
  format: FormatKey
  theme: Theme
  value: number
  suffix?: string
  animated?: boolean
}

export const Counter: React.FC<CounterProps> = ({
  format,
  theme,
  value,
  suffix = '',
  animated = false,
}) => {
  const frame = useCurrentFrame()
  const { typeScale } = useFormat(format)

  const displayValue = animated
    ? Math.round(
        interpolate(frame, [0, 30], [0, value], {
          extrapolateRight: 'clamp',
        }),
      )
    : value

  return (
    <span
      style={{
        fontFamily: typography.fontFamily.mono,
        fontSize: typeScale.headlineM,
        fontWeight: typography.fontWeight.bold,
        color: theme.textStrong,
        lineHeight: typography.lineHeight.tight,
        letterSpacing: typography.tracking.tight,
        fontVariantNumeric: 'tabular-nums',
      }}
    >
      {displayValue.toLocaleString()}
      {suffix && (
        <span
          style={{
            fontSize: typeScale.bodyM,
            fontWeight: typography.fontWeight.medium,
            marginLeft: 4,
          }}
        >
          {suffix}
        </span>
      )}
    </span>
  )
}

export default Counter
