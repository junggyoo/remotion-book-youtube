import React from 'react'
import { AbsoluteFill, useCurrentFrame } from 'remotion'
import type { BaseSceneProps, ClosingContent } from '@/types'
import { useFormat } from '@/design/themes/useFormat'
import { sp } from '@/design/tokens/spacing'
import { SafeArea } from '@/components/layout/SafeArea'
import { ArchitecturalReveal } from '@/components/motion/ArchitecturalReveal'
import { TextBlock } from '@/components/primitives/TextBlock'
import { LabelChip } from '@/components/primitives/LabelChip'
import { DividerLine } from '@/components/primitives/DividerLine'
import { SubtitleLayer } from '@/components/hud/SubtitleLayer'

// zIndex layers from scene-catalog.json → closing
const LAYERS = {
  background: 0,
  texture: 5,
  recapStatement: 30,
  brandLabel: 40,
  cta: 35,
  hud: 70,
} as const

interface ClosingSceneProps extends BaseSceneProps {
  content: ClosingContent
}

export const ClosingScene: React.FC<ClosingSceneProps> = ({
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
  const showBrandLabel = content.showBrandLabel !== false
  const showCta = !isShorts && !!content.ctaText

  return (
    <AbsoluteFill style={{ backgroundColor: theme.bg }}>
      {/* Background layer */}
      <AbsoluteFill
        style={{
          zIndex: LAYERS.background,
          backgroundColor: theme.bg,
        }}
      />

      {/* Texture layer */}
      <AbsoluteFill
        style={{
          zIndex: LAYERS.texture,
          backgroundColor: theme.surfaceMuted,
          opacity: 0.04,
        }}
      />

      {/* Main content */}
      <div style={{ position: 'absolute', inset: 0, zIndex: LAYERS.recapStatement }}>
        <SafeArea format={format} theme={theme}>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              gap: sp(5),
            }}
          >
            {/* Recap statement */}
            <div style={{ zIndex: LAYERS.recapStatement }}>
              <ArchitecturalReveal
                format={format}
                theme={theme}
                preset="heavy"
                delay={0}
              >
                <TextBlock
                  format={format}
                  theme={theme}
                  text={content.recapStatement}
                  variant="headlineM"
                  weight="bold"
                  align="center"
                  maxLines={4}
                />
              </ArchitecturalReveal>
            </div>

            {/* CTA text — longform only */}
            {showCta && (
              <div style={{ zIndex: LAYERS.cta }}>
                <ArchitecturalReveal
                  format={format}
                  theme={theme}
                  preset="heavy"
                  delay={9}
                >
                  <TextBlock
                    format={format}
                    theme={theme}
                    text={content.ctaText!}
                    variant="bodyM"
                    color={theme.textMuted}
                    align="center"
                  />
                </ArchitecturalReveal>
              </div>
            )}

            {/* Divider + Brand label */}
            {showBrandLabel && (
              <div
                style={{
                  zIndex: LAYERS.brandLabel,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: sp(4),
                  width: '100%',
                  maxWidth: sp(10) * 10,
                }}
              >
                <ArchitecturalReveal
                  format={format}
                  theme={theme}
                  preset="heavy"
                  delay={isShorts ? 9 : 15}
                >
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: sp(4),
                      width: '100%',
                    }}
                  >
                    <DividerLine
                      format={format}
                      theme={theme}
                    />
                    <LabelChip
                      format={format}
                      theme={theme}
                      label="Editorial Signal"
                      variant="signal"
                    />
                  </div>
                </ArchitecturalReveal>
              </div>
            )}
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

export default ClosingScene
