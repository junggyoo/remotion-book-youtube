import React from 'react'
import { AbsoluteFill, useCurrentFrame } from 'remotion'
import type { BaseSceneProps, KeyInsightContent } from '@/types'
import { useFormat } from '@/design/themes/useFormat'
import { spacing, sp } from '@/design/tokens/spacing'
import { SafeArea } from '@/components/layout/SafeArea'
import { ArchitecturalReveal } from '@/components/motion/ArchitecturalReveal'
import { TextBlock } from '@/components/primitives/TextBlock'
import { SignalBar } from '@/components/primitives/SignalBar'
import { SubtitleLayer } from '@/components/hud/SubtitleLayer'
import { typography } from '@/design/tokens/typography'

// zIndex layers from scene-catalog.json → keyInsight
const LAYERS = {
  background: 0,
  texture: 5,
  signalBar: 20,
  headline: 30,
  supportText: 25,
  emphasis: 40,
  hud: 70,
} as const

interface KeyInsightSceneProps extends BaseSceneProps {
  content: KeyInsightContent
}

/**
 * Renders headline text with optional keyword emphasis.
 * If underlineKeyword is set, the matching word is rendered in signal color with bold weight.
 */
const HeadlineWithEmphasis: React.FC<{
  text: string
  keyword?: string
  theme: KeyInsightSceneProps['theme']
  format: KeyInsightSceneProps['format']
}> = ({ text, keyword, theme, format }) => {
  const { typeScale } = useFormat(format)

  if (!keyword) {
    return (
      <TextBlock
        format={format}
        theme={theme}
        text={text}
        variant="headlineL"
        weight="bold"
        maxLines={3}
      />
    )
  }

  // Split text around the keyword for emphasis rendering
  const keywordIndex = text.indexOf(keyword)
  if (keywordIndex === -1) {
    return (
      <TextBlock
        format={format}
        theme={theme}
        text={text}
        variant="headlineL"
        weight="bold"
        maxLines={3}
      />
    )
  }

  const before = text.slice(0, keywordIndex)
  const after = text.slice(keywordIndex + keyword.length)

  return (
    <div
      style={{
        fontFamily: typography.fontFamily.sans,
        fontSize: typeScale.headlineL,
        fontWeight: typography.fontWeight.bold,
        color: theme.textStrong,
        lineHeight: typography.lineHeight.normal,
        letterSpacing: typography.tracking.normal,
      }}
    >
      {before}
      <span
        style={{
          color: theme.signal,
          fontWeight: typography.fontWeight.bold,
        }}
      >
        {keyword}
      </span>
      {after}
    </div>
  )
}

export const KeyInsightScene: React.FC<KeyInsightSceneProps> = ({
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
  const showSignalBar = content.useSignalBar !== false
  const showSupportText = !isShorts && !!content.supportText

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
      <div style={{ position: 'absolute', inset: 0, zIndex: LAYERS.headline }}>
        <SafeArea format={format} theme={theme}>
          <div
            style={{
              display: 'flex',
              flexDirection: 'row',
              alignItems: isShorts ? 'center' : 'flex-start',
              justifyContent: 'center',
              height: '100%',
              gap: sp(5),
            }}
          >
            {/* Signal bar */}
            {showSignalBar && (
              <div
                style={{
                  zIndex: LAYERS.signalBar,
                  alignSelf: 'stretch',
                  display: 'flex',
                  paddingTop: isShorts ? sp(6) : 0,
                  paddingBottom: isShorts ? sp(6) : 0,
                }}
              >
                <ArchitecturalReveal
                  format={format}
                  theme={theme}
                  preset="heavy"
                  delay={0}
                >
                  <SignalBar
                    format={format}
                    theme={theme}
                  />
                </ArchitecturalReveal>
              </div>
            )}

            {/* Text content column */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                flex: 1,
                gap: sp(4),
              }}
            >
              {/* Headline */}
              <div style={{ zIndex: LAYERS.headline }}>
                <ArchitecturalReveal
                  format={format}
                  theme={theme}
                  preset="heavy"
                  delay={3}
                >
                  <HeadlineWithEmphasis
                    text={content.headline}
                    keyword={content.underlineKeyword}
                    theme={theme}
                    format={format}
                  />
                </ArchitecturalReveal>
              </div>

              {/* Support text — longform only */}
              {showSupportText && (
                <div style={{ zIndex: LAYERS.supportText }}>
                  <ArchitecturalReveal
                    format={format}
                    theme={theme}
                    preset="heavy"
                    delay={12}
                  >
                    <TextBlock
                      format={format}
                      theme={theme}
                      text={content.supportText!}
                      variant="bodyL"
                      color={theme.textMuted}
                      maxLines={4}
                    />
                  </ArchitecturalReveal>
                </div>
              )}
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

export default KeyInsightScene
