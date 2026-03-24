import React from 'react'
import { AbsoluteFill, useCurrentFrame } from 'remotion'
import type { BaseSceneProps, SplitQuoteContent } from '@/types'
import { useFormat } from '@/design/themes/useFormat'
import { sp } from '@/design/tokens/spacing'
import { SafeArea } from '@/components/layout/SafeArea'
import { SlideReveal } from '@/components/motion/SlideReveal'
import { ScaleReveal } from '@/components/motion/ScaleReveal'
import { QuoteBlock } from '@/components/primitives/QuoteBlock'
import { LabelChip } from '@/components/primitives/LabelChip'
import { DividerLine } from '@/components/primitives/DividerLine'
import { SubtitleLayer } from '@/components/hud/SubtitleLayer'

// zIndex layers
const LAYERS = {
  background: 0,
  texture: 5,
  leftQuote: 20,
  rightQuote: 20,
  divider: 30,
  vsLabel: 35,
  hud: 70,
} as const

interface SplitQuoteSceneProps extends BaseSceneProps {
  content: SplitQuoteContent
}

export const SplitQuoteScene: React.FC<SplitQuoteSceneProps> = ({
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
  const vsLabel = content.vsLabel ?? 'VS'

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
      <div style={{ position: 'absolute', inset: 0, zIndex: LAYERS.leftQuote }}>
        <SafeArea format={format} theme={theme}>
          <div
            style={{
              display: 'flex',
              flexDirection: isShorts ? 'column' : 'row',
              alignItems: isShorts ? 'stretch' : 'center',
              justifyContent: 'center',
              height: '100%',
              position: 'relative',
            }}
          >
            {/* Left / Top quote */}
            <div
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                paddingRight: isShorts ? 0 : sp(5),
                paddingBottom: isShorts ? sp(4) : 0,
              }}
            >
              <SlideReveal
                format={format}
                theme={theme}
                preset="heavy"
                delay={0}
                direction="left"
              >
                <QuoteBlock
                  format={format}
                  theme={theme}
                  quoteText={content.leftQuote}
                  attribution={content.leftAttribution}
                  useSerif
                />
              </SlideReveal>
            </div>

            {/* Center / Horizontal divider + VS label */}
            <div
              style={{
                zIndex: LAYERS.divider,
                display: 'flex',
                flexDirection: isShorts ? 'row' : 'column',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                position: 'relative',
              }}
            >
              <DividerLine
                format={format}
                theme={theme}
                orientation={isShorts ? 'horizontal' : 'vertical'}
              />

              {/* VS label centered on divider */}
              <div
                style={{
                  position: 'absolute',
                  zIndex: LAYERS.vsLabel,
                }}
              >
                <ScaleReveal
                  format={format}
                  theme={theme}
                  preset="heavy"
                  delay={18}
                  scaleFrom={0.92}
                >
                  <LabelChip
                    format={format}
                    theme={theme}
                    label={vsLabel}
                    variant="signal"
                  />
                </ScaleReveal>
              </div>
            </div>

            {/* Right / Bottom quote */}
            <div
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                paddingLeft: isShorts ? 0 : sp(5),
                paddingTop: isShorts ? sp(4) : 0,
              }}
            >
              <SlideReveal
                format={format}
                theme={theme}
                preset="heavy"
                delay={9}
                direction="right"
              >
                <QuoteBlock
                  format={format}
                  theme={theme}
                  quoteText={content.rightQuote}
                  attribution={content.rightAttribution}
                  useSerif
                />
              </SlideReveal>
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

export default SplitQuoteScene
