import React from 'react'
import { AbsoluteFill } from 'remotion'
import type { FormatKey, Theme } from '@/types'
import { useFormat } from '@/design/themes/useFormat'

interface SafeAreaProps {
  format: FormatKey
  theme: Theme
  children: React.ReactNode
  debug?: boolean
}

export const SafeArea: React.FC<SafeAreaProps> = ({
  format,
  theme,
  children,
  debug = false,
}) => {
  const { safeArea } = useFormat(format)

  return (
    <AbsoluteFill
      style={{
        padding: `${safeArea.outerMarginY}px ${safeArea.outerMarginX}px`,
      }}
    >
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          position: 'relative',
          ...(debug
            ? {
                border: `1px solid ${theme.lineSubtle}`,
                boxSizing: 'border-box' as const,
              }
            : {}),
        }}
      >
        <div
          style={{
            width: '100%',
            maxWidth: safeArea.bodyMaxWidth,
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {children}
        </div>
      </div>
    </AbsoluteFill>
  )
}

export default SafeArea
