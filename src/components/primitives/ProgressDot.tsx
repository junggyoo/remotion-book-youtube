import React from 'react'
import type { FormatKey, Theme } from '@/types'

interface ProgressDotProps {
  format: FormatKey
  theme: Theme
  active?: boolean
  size?: number
  color?: string
}

export const ProgressDot: React.FC<ProgressDotProps> = ({
  format,
  theme,
  active = false,
  size = 12,
  color,
}) => {
  const resolvedColor = color ?? (active ? theme.signal : theme.lineSubtle)

  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: resolvedColor,
        flexShrink: 0,
      }}
    />
  )
}

export default ProgressDot
