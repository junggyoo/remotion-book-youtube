import React from 'react'
import { AbsoluteFill, useCurrentFrame, interpolate } from 'remotion'
import type { BaseSceneProps, TransitionContent } from '@/types'
import { useFormat } from '@/design/themes/useFormat'
import { sp } from '@/design/tokens/spacing'
import { SafeArea } from '@/components/layout/SafeArea'
import { ArchitecturalReveal } from '@/components/motion/ArchitecturalReveal'
import { ScaleReveal } from '@/components/motion/ScaleReveal'
import { LabelChip } from '@/components/primitives/LabelChip'
import { TextBlock } from '@/components/primitives/TextBlock'
import { SubtitleLayer } from '@/components/hud/SubtitleLayer'

// zIndex layers
const LAYERS = {
  background: 0,
  transition: 80,
  label: 85,
  hud: 70,
} as const

interface TransitionSceneProps extends BaseSceneProps {
  content: TransitionContent
}

export const TransitionScene: React.FC<TransitionSceneProps> = ({
  format,
  theme,
  from,
  durationFrames,
  tts,
  subtitles,
  content,
}) => {
  const frame = useCurrentFrame()
  const isShorts = format === 'shorts'
  const style = content.style ?? 'fade'

  // --- Fade overlay opacity: enter 25%, hold 50%, exit 25% ---
  const fadeOpacity = interpolate(
    frame,
    [
      0,
      durationFrames * 0.25,
      durationFrames * 0.75,
      durationFrames,
    ],
    [0, 1, 1, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
  )

  // --- Wipe: left-to-right clip progress ---
  const wipeProgress = interpolate(
    frame,
    [0, durationFrames * 0.6],
    [0, 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
  )

  // --- Zoom: circle expand progress ---
  const zoomProgress = interpolate(
    frame,
    [0, durationFrames * 0.5],
    [0, 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
  )

  const overlayStyle: React.CSSProperties = (() => {
    if (style === 'wipe') {
      return {
        position: 'absolute',
        inset: 0,
        zIndex: LAYERS.transition,
        backgroundColor: theme.surfaceMuted,
        clipPath: `inset(0 ${100 - wipeProgress * 100}% 0 0)`,
      }
    }
    if (style === 'zoom') {
      return {
        position: 'absolute',
        inset: 0,
        zIndex: LAYERS.transition,
        backgroundColor: theme.surfaceMuted,
        clipPath: `circle(${zoomProgress * 100}% at 50% 50%)`,
      }
    }
    // fade (default)
    return {
      position: 'absolute',
      inset: 0,
      zIndex: LAYERS.transition,
      backgroundColor: theme.surfaceMuted,
      opacity: fadeOpacity,
    }
  })()

  const labelContent = (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: sp(3),
      }}
    >
      {content.label && (
        <ArchitecturalReveal
          format={format}
          theme={theme}
          preset="dramatic"
          delay={6}
        >
          <TextBlock
            format={format}
            theme={theme}
            text={content.label}
            variant="bodyM"
            color={theme.textMuted}
            align="center"
          />
        </ArchitecturalReveal>
      )}

      {content.showBrandMark && (
        <ArchitecturalReveal
          format={format}
          theme={theme}
          preset="dramatic"
          delay={content.label ? 12 : 6}
        >
          <LabelChip
            format={format}
            theme={theme}
            label="Editorial Signal"
            variant="signal"
          />
        </ArchitecturalReveal>
      )}
    </div>
  )

  return (
    <AbsoluteFill style={{ backgroundColor: theme.bg }}>
      {/* Background layer */}
      <AbsoluteFill
        style={{
          zIndex: LAYERS.background,
          backgroundColor: theme.bg,
        }}
      />

      {/* Transition overlay */}
      <div style={overlayStyle} />

      {/* Label + brand mark */}
      {(content.label || content.showBrandMark) && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: LAYERS.label,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <SafeArea format={format} theme={theme}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100%',
              }}
            >
              {style === 'zoom' ? (
                <ScaleReveal
                  format={format}
                  theme={theme}
                  preset="dramatic"
                  delay={0}
                  scaleFrom={0.95}
                >
                  {labelContent}
                </ScaleReveal>
              ) : (
                labelContent
              )}
            </div>
          </SafeArea>
        </div>
      )}

      {/* HUD: Subtitles */}
      {subtitles && subtitles.length > 0 && (
        <div style={{ position: 'absolute', inset: 0, zIndex: LAYERS.hud }}>
          <SubtitleLayer
            format={format}
            theme={theme}
            subtitles={subtitles}
            currentFrame={frame}
          />
        </div>
      )}
    </AbsoluteFill>
  )
}

export default TransitionScene
