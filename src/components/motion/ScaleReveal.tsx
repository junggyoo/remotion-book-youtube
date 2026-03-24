import React from 'react'
import { useCurrentFrame, useVideoConfig, interpolate } from 'remotion'
import { applyPreset } from '@/design/tokens/motion'
import type { FormatKey, Theme, MotionPresetKey } from '@/types'

interface ScaleRevealProps {
  format: FormatKey
  theme: Theme
  children: React.ReactNode
  preset?: MotionPresetKey
  delay?: number
  scaleFrom?: number
}

export const ScaleReveal: React.FC<ScaleRevealProps> = ({
  format,
  theme,
  children,
  preset = 'smooth',
  delay = 0,
  scaleFrom = 0.95,
}) => {
  const frame = useCurrentFrame()
  const { fps, durationInFrames } = useVideoConfig()

  const clampedScaleFrom = Math.max(0.92, scaleFrom)

  const adjustedFrame = Math.max(0, frame - delay)
  const progress = applyPreset(preset, adjustedFrame, fps, durationInFrames)

  const opacity = interpolate(progress, [0, 1], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  })
  const scale = interpolate(progress, [0, 1], [clampedScaleFrom, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  })

  return (
    <div
      style={{
        opacity,
        transform: `scale(${scale})`,
        willChange: 'opacity, transform',
      }}
    >
      {children}
    </div>
  )
}

export default ScaleReveal
