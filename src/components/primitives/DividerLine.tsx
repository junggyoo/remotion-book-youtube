import React from 'react'
import type { FormatKey, Theme } from '@/types'

interface DividerLineProps {
  format: FormatKey
  theme: Theme
  orientation?: 'horizontal' | 'vertical'
  thickness?: number
}

export const DividerLine: React.FC<DividerLineProps> = ({
  theme,
  orientation = 'horizontal',
  thickness = 1,
}) => {
  const isHorizontal = orientation === 'horizontal'

  return (
    <div
      style={{
        width: isHorizontal ? '100%' : thickness,
        height: isHorizontal ? thickness : '100%',
        backgroundColor: theme.lineSubtle,
        flexShrink: 0,
      }}
    />
  )
}

export default DividerLine
