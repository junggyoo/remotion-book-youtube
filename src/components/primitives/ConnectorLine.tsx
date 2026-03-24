import React from 'react'
import type { FormatKey, Theme } from '@/types'

interface ConnectorLineProps {
  format: FormatKey
  theme: Theme
  orientation?: 'horizontal' | 'vertical'
  length: number
  dotted?: boolean
  color?: string
  thickness?: number
}

export const ConnectorLine: React.FC<ConnectorLineProps> = ({
  theme,
  orientation = 'horizontal',
  length,
  dotted = false,
  color,
  thickness = 1,
}) => {
  const isHorizontal = orientation === 'horizontal'
  const resolvedColor = color ?? theme.lineSubtle

  return (
    <div
      style={{
        width: isHorizontal ? length : thickness,
        height: isHorizontal ? thickness : length,
        backgroundColor: dotted ? 'transparent' : resolvedColor,
        borderStyle: dotted ? 'dashed' : 'none',
        borderWidth: dotted ? thickness : 0,
        borderColor: resolvedColor,
        borderTopStyle: dotted && isHorizontal ? 'dashed' : undefined,
        borderLeftStyle: dotted && !isHorizontal ? 'dashed' : undefined,
        flexShrink: 0,
      }}
    />
  )
}

export default ConnectorLine
