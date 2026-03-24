import React from 'react'
import type { FormatKey, Theme, SubtitleEntry } from '@/types'
import { useFormat } from '@/design/themes/useFormat'
import { zIndex } from '@/design/tokens/zIndex'
import { typography } from '@/design/tokens/typography'
import { spacing, sp } from '@/design/tokens/spacing'
import { radius } from '@/design/tokens/radius'

interface SubtitleLayerProps {
  format: FormatKey
  theme: Theme
  subtitles: SubtitleEntry[]
  currentFrame: number
}

export const SubtitleLayer: React.FC<SubtitleLayerProps> = ({
  format,
  theme,
  subtitles,
  currentFrame,
}) => {
  const { safeArea, typeScale } = useFormat(format)

  const activeSubtitle = subtitles.find(
    (s) => currentFrame >= s.startFrame && currentFrame <= s.endFrame,
  )

  if (!activeSubtitle) {
    return null
  }

  return (
    <div
      style={{
        position: 'absolute',
        left: safeArea.outerMarginX,
        right: safeArea.outerMarginX,
        bottom: safeArea.outerMarginY + sp(4),
        zIndex: zIndex.hud,
        display: 'flex',
        justifyContent: 'center',
        pointerEvents: 'none',
      }}
    >
      <div
        style={{
          backgroundColor: 'rgba(0, 0, 0, 0.65)',
          borderRadius: radius.md,
          paddingTop: sp(2),
          paddingBottom: sp(2),
          paddingLeft: sp(4),
          paddingRight: sp(4),
          maxWidth: safeArea.bodyMaxWidth,
          textAlign: 'center',
        }}
      >
        {activeSubtitle.lines.map((line, i) => (
          <div
            key={i}
            style={{
              color: theme.textStrong,
              fontSize: typeScale.bodyM,
              fontFamily: typography.fontFamily.sans,
              fontWeight: typography.fontWeight.medium,
              lineHeight: typography.lineHeight.normal,
              letterSpacing: typography.tracking.normal,
            }}
          >
            {line}
          </div>
        ))}
      </div>
    </div>
  )
}

export default SubtitleLayer
