import React from 'react'
import { AbsoluteFill, Sequence, useCurrentFrame } from 'remotion'
import type { BaseSceneProps, CoverContent } from '@/types'
import { useFormat } from '@/design/themes/useFormat'
import { spacing, sp } from '@/design/tokens/spacing'
import { radius } from '@/design/tokens/radius'
import { SafeArea } from '@/components/layout/SafeArea'
import { ArchitecturalReveal } from '@/components/motion/ArchitecturalReveal'
import { StaggerContainer } from '@/components/motion/StaggerContainer'
import { TextBlock } from '@/components/primitives/TextBlock'
import { LabelChip } from '@/components/primitives/LabelChip'
import { ImageMask } from '@/components/primitives/ImageMask'
import { SubtitleLayer } from '@/components/hud/SubtitleLayer'

// zIndex layers from scene-catalog.json → cover
const LAYERS = {
  background: 0,
  texture: 5,
  baseContent: 20,
  coverImage: 25,
  title: 30,
  brandLabel: 40,
  hud: 70,
} as const

interface CoverSceneProps extends BaseSceneProps {
  content: CoverContent
}

export const CoverScene: React.FC<CoverSceneProps> = ({
  format,
  theme,
  from,
  durationFrames,
  tts,
  subtitles,
  content,
}) => {
  const frame = useCurrentFrame()
  const { typeScale } = useFormat(format)
  const isShorts = format === 'shorts'

  const bgOpacity = content.backgroundVariant === 'light' ? 0.6 : 0.85
  const imageSize = isShorts
    ? { width: 200, height: 280 }
    : { width: 280, height: 400 }

  return (
    <AbsoluteFill style={{ backgroundColor: theme.bg }}>
      {/* Background overlay layer */}
      <AbsoluteFill
        style={{
          zIndex: LAYERS.background,
          backgroundColor: theme.bg,
          opacity: bgOpacity,
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
      <div style={{ position: 'absolute', inset: 0, zIndex: LAYERS.baseContent }}>
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
            {/* Cover image */}
            <div style={{ zIndex: LAYERS.coverImage }}>
              <ArchitecturalReveal
                format={format}
                theme={theme}
                preset="dramatic"
                delay={0}
              >
                <ImageMask
                  format={format}
                  theme={theme}
                  src={content.coverImageUrl}
                  alt={content.title}
                  width={imageSize.width}
                  height={imageSize.height}
                  borderRadius={radius.lg}
                />
              </ArchitecturalReveal>
            </div>

            {/* Title block */}
            <div
              style={{
                zIndex: LAYERS.title,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: sp(3),
                maxWidth: '100%',
              }}
            >
              <ArchitecturalReveal
                format={format}
                theme={theme}
                preset="dramatic"
                delay={6}
              >
                <TextBlock
                  format={format}
                  theme={theme}
                  text={content.title}
                  variant="headlineL"
                  weight="bold"
                  align="center"
                  maxLines={3}
                />
              </ArchitecturalReveal>

              {/* Subtitle — longform only */}
              {!isShorts && content.subtitle && (
                <ArchitecturalReveal
                  format={format}
                  theme={theme}
                  preset="dramatic"
                  delay={12}
                >
                  <TextBlock
                    format={format}
                    theme={theme}
                    text={content.subtitle}
                    variant="bodyL"
                    color={theme.textMuted}
                    align="center"
                    maxLines={2}
                  />
                </ArchitecturalReveal>
              )}

              {/* Author */}
              <ArchitecturalReveal
                format={format}
                theme={theme}
                preset="dramatic"
                delay={isShorts ? 12 : 18}
              >
                <TextBlock
                  format={format}
                  theme={theme}
                  text={content.author}
                  variant="bodyM"
                  color={theme.textMuted}
                  align="center"
                />
              </ArchitecturalReveal>
            </div>

            {/* Brand label */}
            <div style={{ zIndex: LAYERS.brandLabel }}>
              <ArchitecturalReveal
                format={format}
                theme={theme}
                preset="dramatic"
                delay={isShorts ? 18 : 24}
              >
                <LabelChip
                  format={format}
                  theme={theme}
                  label={content.brandLabel ?? 'Editorial Signal'}
                  variant="signal"
                />
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

export default CoverScene
