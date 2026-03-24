import React from 'react'
import { useCurrentFrame, useVideoConfig, interpolate } from 'remotion'
import { applyPreset } from '@/design/tokens/motion'
import motionPresetsData from '@/design/tokens/motion-presets.json'
import type { FormatKey, Theme, MotionPresetKey } from '@/types'

const MAX_TRANSLATE_X = 40 // from motionRoles.layout.panelSlide

interface SlideRevealProps {
  format: FormatKey
  theme: Theme
  children: React.ReactNode
  preset?: MotionPresetKey
  delay?: number
  direction?: 'left' | 'right'
  translateX?: number
}

export const SlideReveal: React.FC<SlideRevealProps> = ({
  format,
  theme,
  children,
  preset = 'smooth',
  delay = 0,
  direction = 'left',
  translateX: translateXProp,
}) => {
  const frame = useCurrentFrame()
  const { fps, durationInFrames } = useVideoConfig()

  const targetTranslateX = Math.min(
    translateXProp ?? MAX_TRANSLATE_X,
    MAX_TRANSLATE_X,
  )
  const signedTranslateX = direction === 'left' ? -targetTranslateX : targetTranslateX

  const adjustedFrame = Math.max(0, frame - delay)
  const progress = applyPreset(preset, adjustedFrame, fps, durationInFrames)

  const opacity = interpolate(progress, [0, 1], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  })
  const currentTranslateX = interpolate(
    progress,
    [0, 1],
    [signedTranslateX, 0],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    },
  )

  return (
    <div
      style={{
        opacity,
        transform: `translateX(${currentTranslateX}px)`,
        willChange: 'opacity, transform',
      }}
    >
      {children}
    </div>
  )
}

export default SlideReveal
