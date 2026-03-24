import React from 'react'
import type { FormatKey, Theme } from '@/types'
import { typography } from '@/design/tokens/typography'
import { useFormat } from '@/design/themes/useFormat'

interface NumberBadgeProps {
  format: FormatKey
  theme: Theme
  number: number
  variant?: 'default' | 'accent' | 'signal'
}

export const NumberBadge: React.FC<NumberBadgeProps> = ({
  format,
  theme,
  number,
  variant = 'default',
}) => {
  const isShorts = format === 'shorts'
  const size = isShorts ? 32 : 40
  const { typeScale } = useFormat(format)

  const bgMap: Record<NonNullable<NumberBadgeProps['variant']>, string> = {
    default: theme.surface,
    accent: theme.accent,
    signal: theme.signal,
  }

  const bgColor = bgMap[variant]
  const textColor = variant === 'default' ? theme.textStrong : theme.bg

  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: bgColor,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}
    >
      <span
        style={{
          fontFamily: typography.fontFamily.mono,
          fontSize: typeScale.label,
          fontWeight: typography.fontWeight.bold,
          color: textColor,
          lineHeight: 1,
        }}
      >
        {number}
      </span>
    </div>
  )
}

export default NumberBadge
