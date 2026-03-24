import React from 'react'
import { AbsoluteFill, useCurrentFrame } from 'remotion'
import type { BaseSceneProps, ChapterDividerContent } from '@/types'
import { useFormat } from '@/design/themes/useFormat'
import { sp } from '@/design/tokens/spacing'
import { typography } from '@/design/tokens/typography'
import { SafeArea } from '@/components/layout/SafeArea'
import { ArchitecturalReveal } from '@/components/motion/ArchitecturalReveal'
import { TextBlock } from '@/components/primitives/TextBlock'
import { DividerLine } from '@/components/primitives/DividerLine'
import { Counter } from '@/components/primitives/Counter'
import { SubtitleLayer } from '@/components/hud/SubtitleLayer'

// zIndex layers from scene-catalog.json → chapterDivider
const LAYERS = {
  background: 0,
  texture: 5,
  baseContent: 20,
  chapterNumber: 30,
  chapterTitle: 35,
  hud: 70,
} as const

interface ChapterDividerSceneProps extends BaseSceneProps {
  content: ChapterDividerContent
}

export const ChapterDividerScene: React.FC<ChapterDividerSceneProps> = ({
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
  const useAltLayout = content.useAltLayout === true

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
      <div style={{ position: 'absolute', inset: 0, zIndex: LAYERS.baseContent }}>
        <SafeArea format={format} theme={theme}>
          {useAltLayout ? (
            /* band-divider mode: full-width band, centered horizontal layout */
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100%',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: theme.surfaceMuted,
                  opacity: 1,
                  width: '100%',
                  padding: `${sp(7)}px ${sp(6)}px`,
                  gap: sp(6),
                }}
              >
                {/* Chapter number */}
                <div style={{ zIndex: LAYERS.chapterNumber }}>
                  <ArchitecturalReveal
                    format={format}
                    theme={theme}
                    preset="heavy"
                    delay={0}
                  >
                    <span
                      style={{
                        fontFamily: typography.fontFamily.mono,
                        fontSize: typeScale.headlineL,
                        fontWeight: typography.fontWeight.bold,
                        color: theme.signal,
                        lineHeight: typography.lineHeight.tight,
                        letterSpacing: typography.tracking.tight,
                        fontVariantNumeric: 'tabular-nums',
                      }}
                    >
                      {String(content.chapterNumber).padStart(2, '0')}
                    </span>
                  </ArchitecturalReveal>
                </div>

                {/* Divider */}
                <DividerLine
                  format={format}
                  theme={theme}
                  orientation="vertical"
                />

                {/* Chapter title */}
                <div style={{ zIndex: LAYERS.chapterTitle }}>
                  <ArchitecturalReveal
                    format={format}
                    theme={theme}
                    preset="heavy"
                    delay={6}
                  >
                    <TextBlock
                      format={format}
                      theme={theme}
                      text={content.chapterTitle}
                      variant="headlineM"
                      weight="bold"
                      maxLines={2}
                    />
                  </ArchitecturalReveal>
                </div>
              </div>
            </div>
          ) : (
            /* left-anchor mode: left 1/3 number, right 2/3 title + subtitle */
            <div
              style={{
                display: 'flex',
                flexDirection: 'row',
                alignItems: 'stretch',
                justifyContent: 'center',
                height: '100%',
                gap: sp(6),
              }}
            >
              {/* Left column: chapter number */}
              <div
                style={{
                  zIndex: LAYERS.chapterNumber,
                  flex: '0 0 30%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'flex-end',
                  paddingRight: sp(5),
                }}
              >
                <ArchitecturalReveal
                  format={format}
                  theme={theme}
                  preset="heavy"
                  delay={0}
                >
                  <span
                    style={{
                      fontFamily: typography.fontFamily.mono,
                      fontSize: typeScale.headlineL,
                      fontWeight: typography.fontWeight.bold,
                      color: theme.signal,
                      lineHeight: typography.lineHeight.tight,
                      letterSpacing: typography.tracking.tight,
                      fontVariantNumeric: 'tabular-nums',
                    }}
                  >
                    {String(content.chapterNumber).padStart(2, '0')}
                  </span>
                </ArchitecturalReveal>
              </div>

              {/* Vertical divider */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'stretch',
                  paddingTop: sp(5),
                  paddingBottom: sp(5),
                }}
              >
                <DividerLine
                  format={format}
                  theme={theme}
                  orientation="vertical"
                />
              </div>

              {/* Right column: title + subtitle */}
              <div
                style={{
                  flex: '1 1 0',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  gap: sp(4),
                  paddingLeft: sp(5),
                }}
              >
                <div style={{ zIndex: LAYERS.chapterTitle }}>
                  <ArchitecturalReveal
                    format={format}
                    theme={theme}
                    preset="heavy"
                    delay={6}
                  >
                    <TextBlock
                      format={format}
                      theme={theme}
                      text={content.chapterTitle}
                      variant="headlineM"
                      weight="bold"
                      maxLines={3}
                    />
                  </ArchitecturalReveal>
                </div>

                {content.chapterSubtitle && (
                  <ArchitecturalReveal
                    format={format}
                    theme={theme}
                    preset="heavy"
                    delay={12}
                  >
                    <TextBlock
                      format={format}
                      theme={theme}
                      text={content.chapterSubtitle}
                      variant="bodyL"
                      color={theme.textMuted}
                      maxLines={2}
                    />
                  </ArchitecturalReveal>
                )}
              </div>
            </div>
          )}
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

export default ChapterDividerScene
