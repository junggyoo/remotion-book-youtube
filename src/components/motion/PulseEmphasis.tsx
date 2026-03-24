import React from 'react'
import { useCurrentFrame, interpolate } from 'remotion'
import motionPresetsData from '@/design/tokens/motion-presets.json'
import type { FormatKey, Theme } from '@/types'

const MAX_SCALE_EMPHASIS = motionPresetsData.defaults.maxScaleEmphasis // 1.06
const PULSE_SCALE = 1.04 // from motionRoles.typography.keywordEmphasis

interface PulseEmphasisProps {
  format: FormatKey
  theme: Theme
  children: React.ReactNode
  delay?: number
  cycles?: number
  cycleDurationFrames?: number
}

export const PulseEmphasis: React.FC<PulseEmphasisProps> = ({
  format,
  theme,
  children,
  delay = 0,
  cycles = 2,
  cycleDurationFrames = 20,
}) => {
  const frame = useCurrentFrame()
  const adjustedFrame = Math.max(0, frame - delay)

  const totalPulseFrames = cycles * cycleDurationFrames
  if (adjustedFrame >= totalPulseFrames) {
    return <div>{children}</div>
  }

  const cycleFrame = adjustedFrame % cycleDurationFrames
  const halfCycle = cycleDurationFrames / 2

  const scale = cycleFrame < halfCycle
    ? interpolate(cycleFrame, [0, halfCycle], [1.0, PULSE_SCALE], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
      })
    : interpolate(cycleFrame, [halfCycle, cycleDurationFrames], [PULSE_SCALE, 1.0], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
      })

  return (
    <div
      style={{
        transform: `scale(${scale})`,
        willChange: 'transform',
      }}
    >
      {children}
    </div>
  )
}

export default PulseEmphasis
