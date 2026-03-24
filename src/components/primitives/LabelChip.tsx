import React from 'react'
import type { FormatKey, Theme } from '@/types'
import { typography } from '@/design/tokens/typography'
import { spacing } from '@/design/tokens/spacing'
import { useFormat } from '@/design/themes/useFormat'

interface LabelChipProps {
  format: FormatKey
  theme: Theme
  label: string
  variant?: 'default' | 'accent' | 'signal'
}

/**
 * Returns a contrasting text color (light or dark) based on a hex background.
 * Simple relative-luminance check.
 */
function autoContrastColor(hexBg: string, lightColor: string, darkColor: string): string {
  const hex = hexBg.replace('#', '')
  if (hex.length < 6) return darkColor
  const r = parseInt(hex.substring(0, 2), 16)
  const g = parseInt(hex.substring(2, 4), 16)
  const b = parseInt(hex.substring(4, 6), 16)
  // Relative luminance approximation
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return luminance > 0.5 ? darkColor : lightColor
}

export const LabelChip: React.FC<LabelChipProps> = ({
  format,
  theme,
  label,
  variant = 'default',
}) => {
  const { typeScale } = useFormat(format)

  const bgMap: Record<NonNullable<LabelChipProps['variant']>, string> = {
    default: theme.surface,
    accent: theme.accent,
    signal: theme.signal,
  }

  const bgColor = bgMap[variant]

  // For 'default' variant, use theme text. For colored variants, auto-contrast.
  const textColor =
    variant === 'default'
      ? theme.textStrong
      : autoContrastColor(bgColor, theme.textStrong, theme.bg)

  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: bgColor,
        color: textColor,
        fontFamily: typography.fontFamily.sans,
        fontSize: typeScale.label,
        fontWeight: typography.fontWeight.semibold,
        lineHeight: 1,
        letterSpacing: typography.tracking.wide,
        paddingLeft: spacing.scale[4],
        paddingRight: spacing.scale[4],
        paddingTop: spacing.scale[2],
        paddingBottom: spacing.scale[2],
        borderRadius: 999, // radius.pill
        whiteSpace: 'nowrap',
      }}
    >
      {label}
    </div>
  )
}

export default LabelChip
