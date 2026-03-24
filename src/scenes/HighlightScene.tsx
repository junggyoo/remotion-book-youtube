import React from 'react'
import { AbsoluteFill, useCurrentFrame } from 'remotion'
import type { BaseSceneProps, HighlightContent } from '@/types'
import { sp } from '@/design/tokens/spacing'
import { SafeArea } from '@/components/layout/SafeArea'
import { ArchitecturalReveal } from '@/components/motion/ArchitecturalReveal'
import { PulseEmphasis } from '@/components/motion/PulseEmphasis'
import { TextBlock } from '@/components/primitives/TextBlock'
import { SignalBar } from '@/components/primitives/SignalBar'
import { SubtitleLayer } from '@/components/hud/SubtitleLayer'

// Custom layers for HighlightScene
const LAYERS = {
  background: 0,
  texture: 5,
  signalBar: 20,
  subText: 25,
  mainText: 30,
  hud: 70,
} as const

interface HighlightSceneProps extends BaseSceneProps {
  content: HighlightContent
}

export const HighlightScene: React.FC<HighlightSceneProps> = ({
  format,
  theme,
  from,
  durationFrames,
  tts,
  subtitles,
  content,
}) => {
  const frame = useCurrentFrame()

  // Resolve highlight color from theme
  const colorKey = content.highlightColor ?? 'signal'
  const mainTextColor =
    colorKey === 'accent' ? theme.accent
    : colorKey === 'premium' ? theme.premium
    : theme.signal

  const showPulse = content.showPulse === true

  return (
    <AbsoluteFill style={{ backgroundColor: theme.bg }}>
      {/* Background layer */}
      <AbsoluteFill
        style={{
          zIndex: LAYERS.background,
          backgroundColor: theme.bg,
        }}
      />

      {/* Texture layer — slightly stronger for HighlightScene */}
      <AbsoluteFill
        style={{
          zIndex: LAYERS.texture,
          backgroundColor: theme.surfaceMuted,
          opacity: 0.06,
        }}
      />

      {/* Main content */}
      <div style={{ position: 'absolute', inset: 0, zIndex: LAYERS.mainText }}>
        <SafeArea format={format} theme={theme}>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              gap: sp(4),
            }}
          >
            {/* Main text */}
            <div style={{ zIndex: LAYERS.mainText, textAlign: 'center', width: '100%' }}>
              <ArchitecturalReveal format={format} theme={theme} preset="dramatic" delay={0}>
                {showPulse ? (
                  <PulseEmphasis format={format} theme={theme} cycles={2} delay={30}>
                    <TextBlock
                      format={format}
                      theme={theme}
                      text={content.mainText}
                      variant="headlineL"
                      weight="bold"
                      color={mainTextColor}
                      align="center"
                      maxLines={3}
                    />
                  </PulseEmphasis>
                ) : (
                  <TextBlock
                    format={format}
                    theme={theme}
                    text={content.mainText}
                    variant="headlineL"
                    weight="bold"
                    color={mainTextColor}
                    align="center"
                    maxLines={3}
                  />
                )}
              </ArchitecturalReveal>
            </div>

            {/* Sub text */}
            {content.subText && (
              <div style={{ zIndex: LAYERS.subText, textAlign: 'center', width: '100%' }}>
                <ArchitecturalReveal format={format} theme={theme} preset="heavy" delay={12}>
                  <TextBlock
                    format={format}
                    theme={theme}
                    text={content.subText}
                    variant="bodyL"
                    color={theme.textMuted}
                    align="center"
                    maxLines={3}
                  />
                </ArchitecturalReveal>
              </div>
            )}

            {/* Bottom signal bar */}
            <div style={{ zIndex: LAYERS.signalBar, marginTop: sp(2) }}>
              <ArchitecturalReveal format={format} theme={theme} preset="smooth" delay={18}>
                <SignalBar format={format} theme={theme} width={120} height={3} />
              </ArchitecturalReveal>
            </div>
          </div>
        </SafeArea>
      </div>

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

export default HighlightScene
