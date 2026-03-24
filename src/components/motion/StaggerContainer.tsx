import React from 'react'
import { useCurrentFrame, useVideoConfig, interpolate } from 'remotion'
import { applyPreset } from '@/design/tokens/motion'
import motionPresetsData from '@/design/tokens/motion-presets.json'
import type { FormatKey, Theme, MotionPresetKey } from '@/types'

const DEFAULT_STAGGER_FRAMES = motionPresetsData.defaults.staggerFrames // 3
const MAX_REVEAL_Y_OFFSET = motionPresetsData.defaults.maxRevealYOffset // 24
const CHILD_TRANSLATE_Y = 12 // small offset, well within maxRevealYOffset

interface StaggerContainerProps {
  format: FormatKey
  theme: Theme
  children: React.ReactNode[]
  staggerFrames?: number
  preset?: MotionPresetKey
}

export const StaggerContainer: React.FC<StaggerContainerProps> = ({
  format,
  theme,
  children,
  staggerFrames = DEFAULT_STAGGER_FRAMES,
  preset = 'smooth',
}) => {
  const frame = useCurrentFrame()
  const { fps, durationInFrames } = useVideoConfig()

  return (
    <>
      {React.Children.map(children, (child, i) => {
        const childDelay = i * staggerFrames
        const adjustedFrame = Math.max(0, frame - childDelay)
        const progress = applyPreset(
          preset,
          adjustedFrame,
          fps,
          durationInFrames,
        )

        const opacity = interpolate(progress, [0, 1], [0, 1], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
        })
        const translateY = interpolate(
          progress,
          [0, 1],
          [CHILD_TRANSLATE_Y, 0],
          {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
          },
        )

        return (
          <div
            key={i}
            style={{
              opacity,
              transform: `translateY(${translateY}px)`,
              willChange: 'opacity, transform',
            }}
          >
            {child}
          </div>
        )
      })}
    </>
  )
}

export default StaggerContainer
