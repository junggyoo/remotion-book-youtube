import { spring, interpolate, Easing } from 'remotion'
import motionPresetsData from './motion-presets.json'
import type { MotionPresetKey, ResolvedMotionConfig } from '@/types'

export type { MotionPresetKey, ResolvedMotionConfig }

/** Direct access to the raw motion presets JSON data. */
export const motionPresets = motionPresetsData

/**
 * Resolve a preset key into a normalized ResolvedMotionConfig.
 * For 'hybrid' type (dramatic): returns spring config with easingBezier as fallback.
 */
export function resolvePreset(key: MotionPresetKey): ResolvedMotionConfig {
  const raw = motionPresetsData.presets[key] as Record<string, unknown>
  const rawType = raw.type as string
  const durationRange = raw.durationRange as [number, number]
  const overshootClamping = raw.overshootClamping as boolean

  if (rawType === 'hybrid') {
    return {
      type: 'spring',
      springConfig: raw.springConfig as {
        stiffness: number
        damping: number
        mass: number
      },
      easingBezier: raw.easing as [number, number, number, number],
      durationRange,
      overshootClamping,
    }
  }

  if (rawType === 'spring') {
    return {
      type: 'spring',
      springConfig: raw.config as {
        stiffness: number
        damping: number
        mass: number
      },
      durationRange,
      overshootClamping,
    }
  }

  // interpolate type
  return {
    type: 'interpolate',
    easingBezier: raw.easing as [number, number, number, number],
    durationRange,
    overshootClamping,
  }
}

/**
 * Apply a motion preset and return a 0-1 progress value for the given frame.
 *
 * - spring type: uses remotion `spring()` with springConfig
 * - interpolate type: uses remotion `interpolate()` with `Easing.bezier()`
 */
export function applyPreset(
  key: MotionPresetKey,
  frame: number,
  fps: number,
  durationInFrames?: number,
): number {
  const config = resolvePreset(key)

  if (config.type === 'spring' && config.springConfig) {
    return spring({
      frame,
      fps,
      config: {
        stiffness: config.springConfig.stiffness,
        damping: config.springConfig.damping,
        mass: config.springConfig.mass,
      },
      durationInFrames,
    })
  }

  // interpolate type
  const duration = durationInFrames ?? config.durationRange[1]
  const [x1, y1, x2, y2] = config.easingBezier!

  return interpolate(frame, [0, duration], [0, 1], {
    easing: Easing.bezier(x1, y1, x2, y2),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  })
}

/**
 * Returns a suggested duration (in frames) for Shorts format.
 * Calculated as `Math.floor(durationRange[0] * 1.2)`.
 */
export function shortsPresetDuration(key: MotionPresetKey): number {
  const config = resolvePreset(key)
  return Math.floor(config.durationRange[0] * 1.2)
}
