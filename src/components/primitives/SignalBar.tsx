import React from 'react'
import type { FormatKey, Theme } from '@/types'
import { spacing } from '@/design/tokens/spacing'

interface SignalBarProps {
  format: FormatKey
  theme: Theme
  width?: number
  height?: number
}

export const SignalBar: React.FC<SignalBarProps> = ({
  theme,
  width,
  height,
}) => {
  // Default width from spacing token index 1 = 4px
  const resolvedWidth = width ?? spacing.scale[1]

  return (
    <div
      style={{
        width: resolvedWidth,
        height: height ?? '100%',
        backgroundColor: theme.signal,
        borderRadius: resolvedWidth / 2,
        flexShrink: 0,
      }}
    />
  )
}

export default SignalBar
