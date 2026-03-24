import React from 'react'
import { AbsoluteFill, useCurrentFrame } from 'remotion'
import type { BaseSceneProps, QuoteContent } from '@/types'
import { useFormat } from '@/design/themes/useFormat'
import { sp } from '@/design/tokens/spacing'
import { SafeArea } from '@/components/layout/SafeArea'
import { ArchitecturalReveal } from '@/components/motion/ArchitecturalReveal'
import { TextBlock } from '@/components/primitives/TextBlock'
import { QuoteBlock } from '@/components/primitives/QuoteBlock'
import { SubtitleLayer } from '@/components/hud/SubtitleLayer'

// zIndex layers from scene-catalog.json → quote
const LAYERS = {
  background: 0,
  texture: 5,
  quoteMark: 20,
  attribution: 25,
  quoteText: 30,
  hud: 70,
} as const

interface QuoteSceneProps extends BaseSceneProps {
  content: QuoteContent
}

export const QuoteScene: React.FC<QuoteSceneProps> = ({
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
  const textureOpacity = content.showTexture ? 0.08 : 0.04

  return (
    <AbsoluteFill style={{ backgroundColor: theme.bg }}>
      {/* Background layer */}
      <AbsoluteFill
        style={{
          zIndex: LAYERS.background,
          backgroundColor: theme.bg,
        }}
      />

      {/* Texture layer — stronger when showTexture=true */}
      <AbsoluteFill
        style={{
          zIndex: LAYERS.texture,
          backgroundColor: theme.surfaceMuted,
          opacity: textureOpacity,
        }}
      />

      {/* Main content */}
      <div style={{ position: 'absolute', inset: 0, zIndex: LAYERS.quoteText }}>
        <SafeArea format={format} theme={theme}>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              gap: sp(5),
              maxWidth: isShorts ? '100%' : 760,
              marginLeft: 'auto',
              marginRight: 'auto',
            }}
          >
            {/* Quote block (includes decorative mark + text) */}
            <div style={{ zIndex: LAYERS.quoteText, width: '100%' }}>
              <ArchitecturalReveal
                format={format}
                theme={theme}
                preset="heavy"
                delay={6}
              >
                <QuoteBlock
                  format={format}
                  theme={theme}
                  quoteText={content.quoteText}
                  useSerif={content.useSerif}
                />
              </ArchitecturalReveal>
            </div>

            {/* Attribution */}
            <div style={{ zIndex: LAYERS.attribution, width: '100%' }}>
              <ArchitecturalReveal
                format={format}
                theme={theme}
                preset="heavy"
                delay={15}
              >
                <TextBlock
                  format={format}
                  theme={theme}
                  text={content.attribution}
                  variant="bodyS"
                  color={theme.textMuted}
                  align="center"
                />
              </ArchitecturalReveal>
            </div>

            {/* Bottom accent divider — 120px wide, accent color via wrapper override */}
            <ArchitecturalReveal
              format={format}
              theme={theme}
              preset="heavy"
              delay={18}
            >
              <div
                style={{
                  width: 120,
                  height: 2,
                  backgroundColor: theme.accent,
                }}
              />
            </ArchitecturalReveal>
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

export default QuoteScene
